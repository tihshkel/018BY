import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createId } from '@/utils/id';

const ACCOUNT_DEVICE_ID_KEY = '@account_device_id';
const ACCOUNT_DEVICES_KEY = '@account_devices_v1';
const ACCOUNT_DEVICES_BY_CODE_KEY = '@account_devices_by_code_v1'; // Хранит устройства по коду доступа

export interface AccountDevice {
  deviceId: string;
  deviceName: string;
  addedAtIso: string;
  expiresAtIso: string;
}

export interface AccountTransferPayloadV1 {
  schema: 1;
  createdAtIso: string;
  accessCode: string;
  devices: AccountDevice[];
  data: Record<string, string>;
}

export interface AccountTransferChunk {
  id: string;
  index: number;
  total: number;
  content: string;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function parseIsoDate(value: string) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function pruneExpiredDevices(devices: AccountDevice[], now: Date) {
  // Бесконечная сессия - возвращаем все устройства без проверки срока действия
  return devices;
}

export function getDefaultDeviceName() {
  return Platform.OS === 'ios' ? 'iPhone/iPad' : Platform.OS === 'android' ? 'Android' : 'Устройство';
}

export async function getOrCreateDeviceId() {
  const existing = await AsyncStorage.getItem(ACCOUNT_DEVICE_ID_KEY);
  if (existing) return existing;
  const next = createId('device');
  await AsyncStorage.setItem(ACCOUNT_DEVICE_ID_KEY, next);
  return next;
}

export async function getStoredDevices() {
  const raw = await AsyncStorage.getItem(ACCOUNT_DEVICES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AccountDevice[]) : [];
  } catch {
    return [];
  }
}

export async function setStoredDevices(devices: AccountDevice[]) {
  await AsyncStorage.setItem(ACCOUNT_DEVICES_KEY, JSON.stringify(devices));
}

/**
 * Получает все устройства для конкретного кода доступа
 */
export async function getDevicesByAccessCode(accessCode: string): Promise<AccountDevice[]> {
  const raw = await AsyncStorage.getItem(ACCOUNT_DEVICES_BY_CODE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    return Array.isArray(parsed[accessCode]) ? (parsed[accessCode] as AccountDevice[]) : [];
  } catch {
    return [];
  }
}

/**
 * Сохраняет устройства для конкретного кода доступа
 */
export async function setDevicesByAccessCode(accessCode: string, devices: AccountDevice[]) {
  const raw = await AsyncStorage.getItem(ACCOUNT_DEVICES_BY_CODE_KEY);
  let allDevicesByCode: Record<string, AccountDevice[]> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        allDevicesByCode = parsed;
      }
    } catch {
      // Игнорируем ошибку парсинга
    }
  }
  allDevicesByCode[accessCode] = devices;
  await AsyncStorage.setItem(ACCOUNT_DEVICES_BY_CODE_KEY, JSON.stringify(allDevicesByCode));
}

export async function ensureDeviceRegistered(params: {
  accessCode: string;
  maxDevices: number;
  validityMonths: number;
}) {
  const { accessCode, maxDevices, validityMonths } = params;
  if (!accessCode) return { ok: false as const, error: 'NO_ACCESS_CODE' as const };

  const deviceId = await getOrCreateDeviceId();
  const now = new Date();
  
  // Получаем устройства для этого кода доступа (глобально для всех устройств с этим кодом)
  const devicesByCode = await getDevicesByAccessCode(accessCode);
  const active = pruneExpiredDevices(devicesByCode, now);

  // Проверяем, не зарегистрировано ли уже это устройство
  const already = active.find((d) => d.deviceId === deviceId);
  if (already) {
    // Бесконечная сессия - устанавливаем дату истечения через 100 лет
    const addedAt = parseIsoDate(already.addedAtIso) ?? now;
    const farFuture = new Date(now);
    farFuture.setFullYear(farFuture.getFullYear() + 100);
    const updated: AccountDevice = { ...already, expiresAtIso: farFuture.toISOString() };
    const next = active.map((d) => (d.deviceId === deviceId ? updated : d));
    await setDevicesByAccessCode(accessCode, next);
    
    // Также обновляем локальное хранилище для обратной совместимости
    await setStoredDevices(next);
    return { ok: true as const, deviceId, devices: next };
  }

  // Проверяем лимит устройств для этого кода доступа
  if (active.length >= maxDevices) {
    return { ok: false as const, error: 'DEVICE_LIMIT' as const, deviceId, devices: active };
  }

  // Регистрируем новое устройство
  const addedAt = now;
  // Бесконечная сессия - устанавливаем дату истечения через 100 лет
  const farFuture = new Date(now);
  farFuture.setFullYear(farFuture.getFullYear() + 100);
  const nextDevice: AccountDevice = {
    deviceId,
    deviceName: getDefaultDeviceName(),
    addedAtIso: addedAt.toISOString(),
    expiresAtIso: farFuture.toISOString(),
  };
  const next = [...active, nextDevice];
  
  // Сохраняем устройства для этого кода доступа
  await setDevicesByAccessCode(accessCode, next);
  
  // Также обновляем локальное хранилище для обратной совместимости
  await setStoredDevices(next);
  return { ok: true as const, deviceId, devices: next };
}

export async function exportAccountData(params: { allowPrefixes: string[] }) {
  const keys = await AsyncStorage.getAllKeys();
  const allowed = keys.filter((k) => params.allowPrefixes.some((p) => k === p || k.startsWith(p)));
  if (allowed.length === 0) return {};
  const pairs = await AsyncStorage.multiGet(allowed);
  const data: Record<string, string> = {};
  for (const [k, v] of pairs) {
    if (!k) continue;
    if (typeof v !== 'string') continue;
    data[k] = v;
  }
  return data;
}

export function encodeTransferChunks(payloadJson: string, chunkSize: number) {
  const safeChunkSize = Math.max(200, Math.min(chunkSize, 1500));
  const id = createId('transfer');
  const total = Math.max(1, Math.ceil(payloadJson.length / safeChunkSize));
  const chunks: AccountTransferChunk[] = [];
  for (let index = 0; index < total; index++) {
    const start = index * safeChunkSize;
    const end = Math.min(payloadJson.length, start + safeChunkSize);
    chunks.push({ id, index: index + 1, total, content: payloadJson.slice(start, end) });
  }
  return chunks;
}

export function buildQrString(chunk: AccountTransferChunk) {
  return `018BY_TRANSFER_V1\nid:${chunk.id}\npart:${chunk.index}/${chunk.total}\n${chunk.content}`;
}

export function tryParseQrString(value: string) {
  if (!value) return null;
  const lines = value.split('\n');
  if (lines.length < 4) return null;
  if (lines[0].trim() !== '018BY_TRANSFER_V1') return null;

  const idLine = lines[1] || '';
  const partLine = lines[2] || '';
  const id = idLine.startsWith('id:') ? idLine.slice(3).trim() : null;
  const partRaw = partLine.startsWith('part:') ? partLine.slice(5).trim() : null;
  if (!id || !partRaw) return null;
  const [indexRaw, totalRaw] = partRaw.split('/');
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!Number.isFinite(index) || !Number.isFinite(total) || index < 1 || total < 1 || index > total) return null;

  const content = lines.slice(3).join('\n');
  return { id, index, total, content };
}

export function buildPayload(params: { accessCode: string; devices: AccountDevice[]; data: Record<string, string> }) {
  const payload: AccountTransferPayloadV1 = {
    schema: 1,
    createdAtIso: new Date().toISOString(),
    accessCode: params.accessCode,
    devices: params.devices,
    data: params.data,
  };
  return payload;
}

export function validatePayload(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const v = value as any;
  if (v.schema !== 1) return null;
  if (typeof v.accessCode !== 'string') return null;
  if (!Array.isArray(v.devices)) return null;
  if (!v.data || typeof v.data !== 'object') return null;
  return v as AccountTransferPayloadV1;
}



