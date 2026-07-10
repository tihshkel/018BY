#!/usr/bin/env node
/* eslint-disable no-console */

const assert = require('node:assert/strict');

function resolveFieldAnnotationTextAlign(field, fieldStyle, slotDefault = 'left') {
  if (fieldStyle?.textAlign) return fieldStyle.textAlign;
  if (field.fieldId.endsWith('_title') || field.label === 'Заголовок') return 'center';
  return slotDefault;
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

test('user textAlign overrides slot default', () => {
  assert.equal(
    resolveFieldAnnotationTextAlign(
      { fieldId: 'note', label: 'Заметка' },
      { textAlign: 'right' },
      'left',
    ),
    'right',
  );
});

test('title defaults to center without style', () => {
  assert.equal(
    resolveFieldAnnotationTextAlign(
      { fieldId: 'page_title', label: 'Заголовок' },
      undefined,
      'left',
    ),
    'center',
  );
});

test('empty style falls back to slot default', () => {
  assert.equal(
    resolveFieldAnnotationTextAlign({ fieldId: 'body', label: 'Текст' }, {}, 'center'),
    'center',
  );
});

console.log('All field text align tests passed.');
