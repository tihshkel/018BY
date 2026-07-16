/**
 * Безопасное слияние локальных и облачных @project_* ключей при pull.
 * Plain JS — импортируется из TypeScript и из node test script.
 */

const PROJECT_PREFIX = '@project_';

const PROJECT_KEY_SUBPREFIXES = [
  'images_',
  'annotations_',
  'cover_annotations_',
  'pdf_',
  'viewport_',
  'cover_viewport_',
  'last_text_style_',
  'sections_',
  'page_instances_',
  'page_values_',
  'schema_version_',
  'form_migration_',
  'pv_',
];

const META_MERGE_FIELDS = [
  'coverType',
  'category',
  'albumId',
  'interiorType',
  'title',
  'thumbnailPath',
  'pagesCount',
];

function pageValuesUpdatedAt(values) {
  return values?.updatedAt ?? '';
}

function countFilledFields(values) {
  if (!values || typeof values !== 'object') return 0;
  let count = 0;
  for (const text of Object.values(values.fields ?? {})) {
    if (String(text ?? '').trim()) count += 1;
  }
  for (const block of Object.values(values.photoBlocks ?? {})) {
    if ((block?.slots ?? []).some((uri) => String(uri ?? '').trim())) count += 1;
  }
  if (String(values.caption ?? '').trim()) count += 1;
  return count;
}

function mergePageValueEntryContent(local, cloud) {
  if (!local || typeof local !== 'object') return cloud;
  if (!cloud || typeof cloud !== 'object') return local;

  const mergedFields = { ...(cloud.fields ?? {}) };
  for (const [fieldId, localValue] of Object.entries(local.fields ?? {})) {
    const localTrim = String(localValue ?? '').trim();
    const cloudTrim = String(mergedFields[fieldId] ?? '').trim();
    if (localTrim && !cloudTrim) {
      mergedFields[fieldId] = localValue;
      continue;
    }
    if (localTrim && cloudTrim) {
      const preferLocal =
        pageValuesUpdatedAt(local) >= pageValuesUpdatedAt(cloud) ||
        localTrim.length >= cloudTrim.length;
      if (preferLocal) mergedFields[fieldId] = localValue;
    }
  }

  const mergedPhotoBlocks = { ...(cloud.photoBlocks ?? {}) };
  for (const [blockId, localBlock] of Object.entries(local.photoBlocks ?? {})) {
    const cloudBlock = mergedPhotoBlocks[blockId];
    const localSlots = localBlock?.slots ?? [];
    const cloudSlots = cloudBlock?.slots ?? [];
    const localHasPhoto = localSlots.some((uri) => String(uri ?? '').trim());
    const cloudHasPhoto = cloudSlots.some((uri) => String(uri ?? '').trim());
    if (localHasPhoto && !cloudHasPhoto) {
      mergedPhotoBlocks[blockId] = localBlock;
      continue;
    }
    if (localHasPhoto && cloudHasPhoto) {
      const preferLocal =
        pageValuesUpdatedAt(local) >= pageValuesUpdatedAt(cloud) ||
        countFilledFields(local) >= countFilledFields(cloud);
      if (preferLocal) mergedPhotoBlocks[blockId] = localBlock;
    }
  }

  const localAt = pageValuesUpdatedAt(local);
  const cloudAt = pageValuesUpdatedAt(cloud);
  const updatedAt =
    localAt && cloudAt
      ? localAt >= cloudAt
        ? localAt
        : cloudAt
      : localAt || cloudAt || new Date().toISOString();

  return {
    ...cloud,
    ...local,
    fields: mergedFields,
    photoBlocks: mergedPhotoBlocks,
    caption: String(local.caption ?? '').trim()
      ? local.caption
      : cloud.caption,
    updatedAt,
  };
}

function mergePageValuesMaps(...maps) {
  const merged = {};
  for (const map of maps) {
    if (!map || typeof map !== 'object') continue;
    for (const [instanceId, values] of Object.entries(map)) {
      const existing = merged[instanceId];
      if (!existing) {
        merged[instanceId] = values;
        continue;
      }
      merged[instanceId] = mergePageValueEntryContent(existing, values);
    }
  }
  return merged;
}

function safeParseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeParseArray(raw) {
  const parsed = safeParseJson(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function safeParseObject(raw) {
  const parsed = safeParseJson(raw);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function isEmptyString(value) {
  return value == null || String(value).trim() === '';
}

function isProjectMetaKey(key) {
  const rest = key.slice(PROJECT_PREFIX.length);
  return !PROJECT_KEY_SUBPREFIXES.some((sub) => rest.startsWith(sub));
}

function isPageValuesKey(key) {
  return key.includes('page_values_');
}

function isJsonArrayKey(key) {
  return (
    key.includes('images_') ||
    key.includes('page_instances_') ||
    key.includes('annotations_') ||
    key.includes('cover_annotations_') ||
    key.includes('sections_')
  );
}

function mergeProjectMeta(localRaw, cloudRaw) {
  const local = safeParseObject(localRaw);
  const cloud = safeParseObject(cloudRaw);
  if (!Object.keys(local).length && !Object.keys(cloud).length) {
    return cloudRaw ?? localRaw ?? '{}';
  }
  const merged = { ...cloud, ...local };
  for (const field of META_MERGE_FIELDS) {
    const localVal = local[field];
    const cloudVal = cloud[field];
    if (!isEmptyString(localVal) && isEmptyString(cloudVal)) {
      merged[field] = localVal;
    } else if (!isEmptyString(cloudVal) && isEmptyString(localVal)) {
      merged[field] = cloudVal;
    } else if (!isEmptyString(localVal)) {
      merged[field] = localVal;
    }
  }
  const id = local.id ?? cloud.id;
  if (id != null) merged.id = id;
  return JSON.stringify(merged);
}

function pickRicherJsonArray(localRaw, cloudRaw) {
  const localArr = safeParseArray(localRaw);
  const cloudArr = safeParseArray(cloudRaw);
  if (cloudArr.length > localArr.length) return cloudRaw ?? '[]';
  return localRaw ?? cloudRaw ?? '[]';
}

function isPageValueEntryKey(key) {
  return key.includes('@project_pv_');
}

function countNonEmptyPageValueEntry(value) {
  const entry = safeParseObject(value);
  if (!entry || typeof entry !== 'object') return 0;
  return countNonEmptyPageValues({ entry: entry });
}

function mergePageValueEntry(localRaw, cloudRaw) {
  if (!localRaw) return cloudRaw;
  if (!cloudRaw) return localRaw;
  const merged = mergePageValueEntryContent(
    safeParseObject(localRaw),
    safeParseObject(cloudRaw),
  );
  return JSON.stringify(merged);
}

function countNonEmptyPageValues(map) {
  if (!map || typeof map !== 'object') return 0;
  return Object.values(map).filter((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const fields = Object.values(entry.fields ?? {}).some((v) => String(v ?? '').trim());
    const photos = Object.values(entry.photoBlocks ?? {}).some((block) =>
      (block?.slots ?? []).some((uri) => String(uri ?? '').trim()),
    );
    return fields || photos || String(entry.caption ?? '').trim();
  }).length;
}

function projectSnapshotRichness(data) {
  if (!data || typeof data !== 'object') return 0;
  let score = 0;
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') continue;
    if (key.includes('page_instances_')) score += safeParseArray(value).length * 2;
    else if (key.includes('images_')) score += safeParseArray(value).length * 2;
    else if (key.includes('page_values_')) {
      score += countNonEmptyPageValues(safeParseObject(value)) * 100;
    } else if (isPageValueEntryKey(key)) {
      score += countNonEmptyPageValueEntry(value) * 100;
    } else if (isProjectMetaKey(key)) {
      const meta = safeParseObject(value);
      for (const field of META_MERGE_FIELDS) {
        if (!isEmptyString(meta[field])) score += 1;
      }
    }
  }
  return score;
}

/**
 * @param {string} key
 * @param {string | null} localRaw
 * @param {string} cloudRaw
 * @returns {string}
 */
function mergeProjectKeyFromCloud(key, localRaw, cloudRaw) {
  if (!localRaw) return cloudRaw;
  if (!cloudRaw) return localRaw;

  if (isProjectMetaKey(key)) {
    return mergeProjectMeta(localRaw, cloudRaw);
  }

  if (isPageValuesKey(key)) {
    const merged = mergePageValuesMaps(safeParseObject(localRaw), safeParseObject(cloudRaw));
    return JSON.stringify(merged);
  }

  if (isPageValueEntryKey(key)) {
    return mergePageValueEntry(localRaw, cloudRaw);
  }

  if (isJsonArrayKey(key)) {
    return pickRicherJsonArray(localRaw, cloudRaw);
  }

  const localTrim = localRaw.trim();
  const cloudTrim = cloudRaw.trim();
  if (!cloudTrim) return localRaw;
  if (!localTrim) return cloudRaw;
  if (cloudTrim.length < localTrim.length) return localRaw;
  return cloudRaw;
}

function mergeUserProjectEntry(cloudEntry, localEntry) {
  if (!localEntry) return cloudEntry;
  if (!cloudEntry) return localEntry;
  const merged = { ...cloudEntry, ...localEntry };
  for (const field of META_MERGE_FIELDS) {
    const localVal = localEntry[field];
    const cloudVal = cloudEntry[field];
    if (!isEmptyString(localVal) && isEmptyString(cloudVal)) {
      merged[field] = localVal;
    } else if (!isEmptyString(cloudVal) && isEmptyString(localVal)) {
      merged[field] = cloudVal;
    } else if (!isEmptyString(localVal)) {
      merged[field] = localVal;
    }
  }
  const id = localEntry.id ?? cloudEntry.id;
  if (id != null) merged.id = id;
  return merged;
}

module.exports = {
  META_MERGE_FIELDS,
  mergePageValuesMaps,
  mergeProjectKeyFromCloud,
  mergeProjectMeta,
  mergeUserProjectEntry,
  pickRicherJsonArray,
  projectSnapshotRichness,
  safeParseArray,
  safeParseObject,
};
