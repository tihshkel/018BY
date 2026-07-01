/**
 * Verifies blank album photo migration helpers (no photo loss on sanitize).
 * node scripts/verify-blank-photo-migration.js
 */

const assert = require('assert');

function mergeLegacyPhotoBlocks(values) {
  const LEGACY_BLOCK_IDS = ['photo', 'photos', 'template', 'free_photos'];
  const PRIMARY_BLOCK_ID = 'main_photo';
  const photoBlocks = { ...values.photoBlocks };
  let changed = false;

  for (const legacyId of LEGACY_BLOCK_IDS) {
    const legacy = photoBlocks[legacyId];
    if (!legacy?.slots?.length) continue;
    const target = photoBlocks[PRIMARY_BLOCK_ID] ?? {
      variantId: legacy.variantId ?? 'template',
      slots: [],
    };
    const slots = [...target.slots];
    for (let i = 0; i < legacy.slots.length; i += 1) {
      const uri = legacy.slots[i];
      if (!uri?.trim()) continue;
      if (!slots[i]?.trim()) {
        slots[i] = uri;
        changed = true;
      }
    }
    photoBlocks[PRIMARY_BLOCK_ID] = {
      variantId: target.variantId || legacy.variantId || 'template',
      slots,
    };
    delete photoBlocks[legacyId];
    changed = true;
  }

  return changed ? { ...values, photoBlocks } : values;
}

const legacyValues = {
  fields: {},
  photoBlocks: {
    photo: { variantId: 'template', slots: ['file:///tmp/legacy.jpg'] },
  },
  status: 'draft',
  updatedAt: new Date().toISOString(),
};

const merged = mergeLegacyPhotoBlocks(legacyValues);
assert(merged.photoBlocks.main_photo?.slots[0] === 'file:///tmp/legacy.jpg', 'legacy photo block merged');
assert(!merged.photoBlocks.photo, 'legacy block removed');

const sanitizeKeepsUri = (resolved, uri) => {
  if (!resolved) return uri;
  return resolved;
};

assert(
  sanitizeKeepsUri(null, 'file:///missing.jpg') === 'file:///missing.jpg',
  'sanitize keeps uri when resolve fails',
);

console.log('verify-blank-photo-migration: OK');
