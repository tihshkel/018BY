#!/usr/bin/env node
/* eslint-disable no-console */

const assert = require('node:assert/strict');
const {
  mergePageValuesMaps,
  mergeProjectKeyFromCloud,
  mergeProjectMeta,
  mergeUserProjectEntry,
  pickRicherJsonArray,
  projectSnapshotRichness,
} = require('../utils/projectSyncMerge');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`fail - ${name}`);
    throw error;
  }
}

test('mergePageValuesMaps keeps newer updatedAt', () => {
  const merged = mergePageValuesMaps(
    { a: { updatedAt: '2026-01-01T00:00:00.000Z', fields: { x: 'local' } } },
    { a: { updatedAt: '2026-01-02T00:00:00.000Z', fields: { x: 'cloud' } } },
  );
  assert.equal(merged.a.fields.x, 'cloud');
});

test('pickRicherJsonArray prefers longer local array', () => {
  const local = JSON.stringify([1, 2, 3]);
  const cloud = JSON.stringify([]);
  assert.equal(pickRicherJsonArray(local, cloud), local);
});

test('pickRicherJsonArray prefers longer cloud array', () => {
  const local = JSON.stringify([]);
  const cloud = JSON.stringify([1, 2]);
  assert.equal(pickRicherJsonArray(local, cloud), cloud);
});

test('mergeProjectMeta keeps local coverType when cloud is empty', () => {
  const local = JSON.stringify({
    id: '1',
    coverType: 'pregnancy_soft',
    category: 'pregnancy',
  });
  const cloud = JSON.stringify({ id: '1', coverType: '', category: '' });
  const merged = JSON.parse(mergeProjectMeta(local, cloud));
  assert.equal(merged.coverType, 'pregnancy_soft');
  assert.equal(merged.category, 'pregnancy');
});

test('mergeProjectKeyFromCloud does not replace filled instances with empty cloud', () => {
  const key = '@project_page_instances_123';
  const local = JSON.stringify([{ instanceId: 'page_1' }, { instanceId: 'page_2' }]);
  const cloud = JSON.stringify([]);
  const merged = JSON.parse(mergeProjectKeyFromCloud(key, local, cloud));
  assert.equal(merged.length, 2);
});

test('mergeProjectKeyFromCloud merges page values by updatedAt', () => {
  const key = '@project_page_values_123';
  const local = JSON.stringify({
    a: { updatedAt: '2026-01-03T00:00:00.000Z', fields: { title: 'local' } },
  });
  const cloud = JSON.stringify({
    a: { updatedAt: '2026-01-01T00:00:00.000Z', fields: { title: 'cloud' } },
    b: { updatedAt: '2026-01-02T00:00:00.000Z', fields: { title: 'only-cloud' } },
  });
  const merged = JSON.parse(mergeProjectKeyFromCloud(key, local, cloud));
  assert.equal(merged.a.fields.title, 'local');
  assert.equal(merged.b.fields.title, 'only-cloud');
});

test('projectSnapshotRichness ranks filled local higher than empty cloud', () => {
  const local = {
    '@project_images_1': JSON.stringify(['a', 'b', 'c']),
    '@project_page_instances_1': JSON.stringify([{ id: 1 }, { id: 2 }]),
  };
  const cloud = {
    '@project_1': JSON.stringify({ id: '1', pagesCount: 60 }),
  };
  assert.ok(projectSnapshotRichness(local) > projectSnapshotRichness(cloud));
});

test('mergeUserProjectEntry merges list objects by id', () => {
  const merged = mergeUserProjectEntry(
    { id: '1', title: 'cloud', category: '' },
    { id: '1', title: '', category: 'pregnancy', coverType: 'soft' },
  );
  assert.equal(merged.category, 'pregnancy');
  assert.equal(merged.coverType, 'soft');
});

test('mergeProjectKeyFromCloud merges incremental pv entry by updatedAt', () => {
  const key = '@project_pv_123_page_abc';
  const local = JSON.stringify({
    updatedAt: '2026-01-03T00:00:00.000Z',
    photoBlocks: { main: { slots: ['file:///local.jpg'] } },
  });
  const cloud = JSON.stringify({
    updatedAt: '2026-01-01T00:00:00.000Z',
    photoBlocks: { main: { slots: ['file:///cloud.jpg'] } },
  });
  const merged = JSON.parse(mergeProjectKeyFromCloud(key, local, cloud));
  assert.equal(merged.photoBlocks.main.slots[0], 'file:///local.jpg');
});

test('projectSnapshotRichness counts incremental pv photo entries', () => {
  const local = {
    '@project_pv_1_page_a': JSON.stringify({
      updatedAt: '2026-01-01T00:00:00.000Z',
      photoBlocks: { block: { slots: ['file:///photo.jpg'] } },
    }),
  };
  assert.ok(projectSnapshotRichness(local) >= 20);
});

console.log('All project sync merge tests passed.');
