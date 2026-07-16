#!/usr/bin/env node
/**
 * Shared day-count helpers + iOS pregnancy empty-state deep link.
 * node scripts/test-home-widget-stats.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
    return;
  }
  console.log(`OK: ${message}`);
}

function daysUntil(isoDate, now = new Date()) {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return 0;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDaysCountLabel(count) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} дня`;
  }
  return `${count} дней`;
}

function formatProjectsCountLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} проект`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} проекта`;
  }
  return `${count} проектов`;
}

const snapshotSource = fs.readFileSync(path.join(root, 'utils/widgetSnapshot.ts'), 'utf8');
assert(snapshotSource.includes('export function daysUntil'), 'widgetSnapshot exports daysUntil');

const homeSource = fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8');
assert(!homeSource.includes('HomeWidgetsStrip'), 'home screen does not mount in-app widgets strip');

const now = new Date(2026, 6, 15, 12, 0, 0); // 15 Jul 2026
const due = new Date(2026, 6, 25, 12, 0, 0); // 25 Jul 2026
assert(daysUntil(due.toISOString(), now) === 10, `daysUntil=10 (got ${daysUntil(due.toISOString(), now)})`);
assert(formatDaysCountLabel(1) === '1 день', 'formatDaysCountLabel 1');
assert(formatDaysCountLabel(2) === '2 дня', 'formatDaysCountLabel 2');
assert(formatDaysCountLabel(5) === '5 дней', 'formatDaysCountLabel 5');
assert(formatDaysCountLabel(21) === '21 день', 'formatDaysCountLabel 21');
assert(formatDaysCountLabel(11) === '11 дней', 'formatDaysCountLabel 11');
assert(formatProjectsCountLabel(1) === '1 проект', 'albums label 1');
assert(formatProjectsCountLabel(3) === '3 проекта', 'albums label 3');
assert(formatProjectsCountLabel(5) === '5 проектов', 'albums label 5');

const pregnancySwift = fs.readFileSync(
  path.join(root, 'ios-widgets/Pregnancy/PregnancyWidget.swift'),
  'utf8',
);
assert(pregnancySwift.includes('WidgetDeepLinks.setPdr'), 'Pregnancy empty links to setPdr');
assert(
  pregnancySwift.includes('Укажите дату') || pregnancySwift.includes('Укажите предварительную'),
  'Pregnancy empty CTA copy',
);
assert(pregnancySwift.includes('daysUntilPdrLabel'), 'Pregnancy hero uses daysUntilPdrLabel');

const sharedSwift = fs.readFileSync(
  path.join(root, 'ios-widgets/Shared/WidgetSnapshot.swift'),
  'utf8',
);
assert(sharedSwift.includes('static let setPdr'), 'WidgetDeepLinks.setPdr defined');
assert(
  sharedSwift.includes('paper-album-notifications'),
  'setPdr deep link points to paper-album-notifications',
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll home widget stats checks passed.');
