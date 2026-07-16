/**
 * Голосовой ввод / мобильные клавиатуры часто вставляют Unicode-пробелы
 * (особенно U+202F narrow NBSP), которых нет в Amatic SC и др. album-шрифтах.
 * В RN они выглядят как обычный пробел, в pdf-lib — как прямоугольник (.notdef).
 */

/** Разделители Zs / типографские пробелы → обычный U+0020. */
const UNICODE_SPACE_RE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

/** Невидимые / служебные символы без глифа в album-шрифтах. */
const INVISIBLE_FORMAT_RE = /[\u200B-\u200D\u2060\uFEFF\uFFFC\uFFFD]/g;

/** Неразрывный дефис — в Amatic нет глифа. */
const NON_BREAKING_HYPHEN_RE = /\u2011/g;

export function normalizeAlbumUserText(text: string): string {
  if (!text) return text;
  return text
    .replace(UNICODE_SPACE_RE, ' ')
    .replace(INVISIBLE_FORMAT_RE, '')
    .replace(NON_BREAKING_HYPHEN_RE, '-');
}
