#!/usr/bin/env node
/**
 * Merge constants/generated/photo-slot-overrides.json into constants/photo-slots.ts
 * node scripts/merge-photo-slots.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const overridesPath = path.join(root, 'constants/generated/photo-slot-overrides.json');
const photoSlotsPath = path.join(root, 'constants/photo-slots.ts');

if (!fs.existsSync(overridesPath)) {
  console.error('Missing photo-slot-overrides.json — run extract-photo-slots-from-variants.py first');
  process.exit(1);
}

const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
let source = fs.readFileSync(photoSlotsPath, 'utf8');

function formatSlot(slot) {
  const ar = slot.aspectRatio ? `, aspectRatio: [${slot.aspectRatio.join(', ')}]` : '';
  return `{ x: ${slot.x}, y: ${slot.y}, width: ${slot.width}, height: ${slot.height}${ar} }`;
}

function formatVariant(variant) {
  const slots = variant.slots.map(formatSlot).join(',\n      ');
  return `    {\n      variantId: '${variant.variantId}',\n      slots: [\n      ${slots},\n      ],\n    }`;
}

function formatPageLayouts(pageData) {
  const variants = pageData.variants.map(formatVariant).join(',\n');
  return `{\n    variants: [\n${variants},\n    ],\n  }`;
}

function buildAlbumBlock(albumId, pages) {
  const entries = Object.keys(pages)
    .sort((a, b) => Number(a) - Number(b))
    .map((pageKey) => `    '${pageKey}': ${formatPageLayouts(pages[pageKey])},`)
    .join('\n');
  return `  ${albumId}: {\n${entries}\n  }`;
}

for (const [albumId, pages] of Object.entries(overrides)) {
  if (!pages || Object.keys(pages).length === 0) continue;

  const albumRe = new RegExp(`(${albumId}:\\s*\\{)([\\s\\S]*?)(\\n  \\},)`, 'm');
  const match = source.match(albumRe);
  const newBlock = buildAlbumBlock(albumId, pages);

  if (match) {
    source = source.replace(albumRe, `${newBlock},`);
  } else {
    const insertRe = /(export const PHOTO_SLOTS[^=]*=\s*\{)/;
    source = source.replace(insertRe, `$1\n${newBlock},`);
  }
}

// kids_48 page 21 godparents — preserve if overrides don't include it
if (!overrides.kids_48?.['21'] && source.includes('GODPARENTS_VARIANTS')) {
  // keep existing godparents entry
}

fs.writeFileSync(photoSlotsPath, source);
console.log(`Updated ${photoSlotsPath}`);
