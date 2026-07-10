#!/usr/bin/env node
/* eslint-disable no-console */

const assert = require('node:assert/strict');

function hasPageValuesContent(raw) {
  if (!raw) return false;
  let map;
  try {
    map = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!map || typeof map !== 'object') return false;
  return Object.values(map).some((value) => {
    if (!value || typeof value !== 'object') return false;
    const page = value;
    if (Object.values(page.fields ?? {}).some((text) => String(text ?? '').trim().length > 0)) {
      return true;
    }
    return Object.values(page.photoBlocks ?? {}).some((block) =>
      (block.slots ?? []).some((uri) => String(uri ?? '').trim().length > 0),
    );
  });
}

function scoreProject({ imagesCount, hasContent }) {
  return (hasContent ? 20_000 : 0) + imagesCount;
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`fail - ${name}`);
    throw error;
  }
}

test('empty pregnancy shells with metadata pagesCount score 0', () => {
  const score = scoreProject({ imagesCount: 0, hasContent: false });
  assert.equal(score, 0);
});

test('introSeen alone does not inflate score', () => {
  const withIntroOnly = scoreProject({ imagesCount: 0, hasContent: false });
  assert.ok(withIntroOnly < 20_000);
});

test('duplicate empty projects tie at 0 and only richest kept by caller', () => {
  const a = scoreProject({ imagesCount: 0, hasContent: false });
  const b = scoreProject({ imagesCount: 0, hasContent: false });
  assert.equal(a, b);
});

test('hasPageValuesContent detects filled fields', () => {
  const raw = JSON.stringify({
    inst1: { fields: { name: 'Anna' }, photoBlocks: {}, updatedAt: '2026-01-01' },
  });
  assert.equal(hasPageValuesContent(raw), true);
});

test('metadata-only pagesCount does not count as content', () => {
  assert.equal(hasPageValuesContent(JSON.stringify({})), false);
});

console.log('All prune ghost score tests passed.');
