import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument, type PDFDocument as PDFDocumentType } from 'pdf-lib';

/** Максимально совместимый PDF: без object streams (Android PDF-вьюеры). */
export const EXPORT_PDF_SAVE_OPTIONS = {
  useObjectStreams: false,
  addDefaultPage: false,
  updateFieldAppearances: false,
} as const;

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Без Function.apply / btoa на мегабайтных буферах — иначе stack overflow на Android. */
function encodeBase64Manual(bytes: Uint8Array): string {
  const len = bytes.length;
  const parts: string[] = [];
  const lineChunk = 24576; // кратно 3

  for (let offset = 0; offset < len; offset += lineChunk) {
    const end = Math.min(offset + lineChunk, len);
    let chunk = '';
    for (let i = offset; i < end; i += 3) {
      const a = bytes[i];
      const b = i + 1 < end ? bytes[i + 1] : 0;
      const c = i + 2 < end ? bytes[i + 2] : 0;
      const triple = (a << 16) | (b << 8) | c;
      chunk += BASE64_ALPHABET[(triple >> 18) & 63];
      chunk += BASE64_ALPHABET[(triple >> 12) & 63];
      chunk += i + 1 < end ? BASE64_ALPHABET[(triple >> 6) & 63] : '=';
      chunk += i + 2 < end ? BASE64_ALPHABET[triple & 63] : '=';
    }
    parts.push(chunk);
  }
  return parts.join('');
}

export async function uint8ArrayToBase64Async(bytes: Uint8Array): Promise<string> {
  await new Promise<void>((r) => setImmediate(r));

  // eslint-disable-next-line no-undef
  if (typeof Buffer !== 'undefined') {
    // eslint-disable-next-line no-undef
    return Buffer.from(bytes).toString('base64');
  }

  const segmentSize = 768 * 1024; // ~1 MB base64 за сегмент
  if (bytes.length <= segmentSize) {
    return encodeBase64Manual(bytes);
  }

  const segments: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += segmentSize) {
    const slice = bytes.subarray(offset, Math.min(offset + segmentSize, bytes.length));
    segments.push(encodeBase64Manual(slice));
    if (segments.length % 2 === 0) {
      await new Promise<void>((r) => setImmediate(r));
    }
  }
  return segments.join('');
}

async function writePdfBytesNative(fileUri: string, bytes: Uint8Array): Promise<boolean> {
  try {
    const { File } = await import('expo-file-system');
    const file = new File(fileUri);
    file.create({ overwrite: true });
    file.write(bytes);
    return true;
  } catch {
    return false;
  }
}

export async function serializePdfForExport(
  pdfDoc: PDFDocumentType,
  expectedPageCount: number,
): Promise<Uint8Array> {
  const inMemoryCount = pdfDoc.getPageCount();
  if (inMemoryCount !== expectedPageCount) {
    throw new Error(
      `Проверка PDF не пройдена: ожидалось ${expectedPageCount} стр., в документе ${inMemoryCount}`,
    );
  }

  const bytes = await pdfDoc.save(EXPORT_PDF_SAVE_OPTIONS);

  // Полный PDFDocument.load на 50+ стр. тяжёл для RN; для небольших файлов — доп. проверка.
  if (bytes.length <= 6 * 1024 * 1024 && expectedPageCount <= 16) {
    const loaded = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const parsedCount = loaded.getPageCount();
    if (parsedCount !== expectedPageCount) {
      throw new Error(
        `Проверка PDF после save: ожидалось ${expectedPageCount} стр., распарсено ${parsedCount}`,
      );
    }
  }

  return bytes;
}

export async function writeVerifiedPdfFile(
  fileUri: string,
  bytes: Uint8Array,
  expectedPageCount: number,
): Promise<void> {
  const wroteNative = await writePdfBytesNative(fileUri, bytes);
  if (!wroteNative) {
    const base64 = await uint8ArrayToBase64Async(bytes);
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error('PDF не записан на диск');
  }

  const minExpectedSize = Math.max(1024, Math.floor(bytes.length * 0.85));
  if (typeof info.size === 'number' && info.size < minExpectedSize) {
    throw new Error(
      `PDF записан не полностью: на диске ${info.size} байт, ожидалось ≥${minExpectedSize}`,
    );
  }

  // Не читаем весь файл обратно в память (base64 + parse) — на больших PDF это stack overflow.
  void expectedPageCount;
}
