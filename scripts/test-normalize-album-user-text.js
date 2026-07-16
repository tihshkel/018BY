#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Unicode spaces from voice input must become regular spaces for album fonts.
 * node scripts/test-normalize-album-user-text.js
 */
const assert = require('assert');
const path = require('path');

// Mirror of utils/normalizeAlbumUserText.ts for Node without TS transpile.
const UNICODE_SPACE_RE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;
const INVISIBLE_FORMAT_RE = /[\u200B-\u200D\u2060\uFEFF\uFFFC\uFFFD]/g;
const NON_BREAKING_HYPHEN_RE = /\u2011/g;

function normalizeAlbumUserText(text) {
  if (!text) return text;
  return text
    .replace(UNICODE_SPACE_RE, ' ')
    .replace(INVISIBLE_FORMAT_RE, '')
    .replace(NON_BREAKING_HYPHEN_RE, '-');
}

const sample = `ПОЕХАЛИ\u202FНА\u00A0КУРГАН\u202FСЛАВЫ\u200B`;
const out = normalizeAlbumUserText(sample);
assert.strictEqual(out, 'ПОЕХАЛИ НА КУРГАН СЛАВЫ');
assert.strictEqual(out.includes('\u202F'), false);
assert.strictEqual(normalizeAlbumUserText('a\u2011b'), 'a-b');
assert.strictEqual(normalizeAlbumUserText(''), '');

// Source must wire normalize into input + export.
const root = path.join(__dirname, '..');
const fs = require('fs');
const fieldInput = fs.readFileSync(path.join(root, 'utils/albumFieldInput.ts'), 'utf8');
const exportText = fs.readFileSync(path.join(root, 'utils/exportTemplateText.ts'), 'utf8');
const exportPdf = fs.readFileSync(path.join(root, 'app/export-pdf.tsx'), 'utf8');
assert.ok(fieldInput.includes('normalizeAlbumUserText'), 'albumFieldInput uses normalize');
assert.ok(exportText.includes('normalizeAlbumUserText'), 'exportTemplateText uses normalize');
assert.ok(exportPdf.includes('normalizeAlbumUserText'), 'export-pdf uses normalize');

console.log('OK: normalizeAlbumUserText strips voice-input Unicode spaces');
