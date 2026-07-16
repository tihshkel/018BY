#!/usr/bin/env node
/**
 * Regression checks for widget snapshot schema (TS + Swift) and pure helpers.
 * node scripts/test-widget-snapshot-payload.js
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

const TOTAL_PREGNANCY_DAYS = 280;

function getPregnancyWeek(dueDate, now = new Date()) {
  const daysUntilDue = Math.floor(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weeksUntilDue = Math.floor(daysUntilDue / 7);
  const currentWeek = 40 - weeksUntilDue;
  return Math.max(1, Math.min(42, currentWeek));
}

function getTrimester(week) {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

function getPregnancyDay(dueDate, now = new Date()) {
  const lmp = new Date(dueDate);
  lmp.setDate(lmp.getDate() - TOTAL_PREGNANCY_DAYS);
  lmp.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const rawDay =
    Math.floor((today.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const day = Math.max(1, Math.min(TOTAL_PREGNANCY_DAYS + 14, rawDay));
  const week = getPregnancyWeek(dueDate, now);
  const dayInWeek = ((day - 1) % 7) + 1;

  return {
    day,
    dayInWeek,
    week,
    trimester: getTrimester(week),
  };
}

function isSameLocalDay(isoDate, reference = new Date()) {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getFullYear() === reference.getFullYear() &&
    parsed.getMonth() === reference.getMonth() &&
    parsed.getDate() === reference.getDate()
  );
}

function buildNotificationSnapshot(inbox, reference = new Date()) {
  const sorted = [...inbox].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
  const todayNotifications = sorted
    .filter((item) => isSameLocalDay(item.receivedAt, reference))
    .slice(0, 3);

  const latestNotification = todayNotifications[0] ?? sorted[0] ?? undefined;

  return {
    todayNotifications,
    latestNotification,
    unreadTodayCount: todayNotifications.length,
  };
}

// --- TypeScript source checks ---
const widgetSnapshotTs = fs.readFileSync(
  path.join(root, 'utils/widgetSnapshot.ts'),
  'utf8',
);
const pregnancyTs = fs.readFileSync(
  path.join(root, 'utils/pregnancyNotificationScheduler.ts'),
  'utf8',
);

for (const field of [
  'day: number',
  'dayInWeek: number',
  'trimester: number',
  'weeklyInsight',
  'instanceId: string',
  'unfinishedPages',
  'albumsCount',
  'todayNotifications',
  'latestNotification',
  'unreadTodayCount',
  'WidgetInboxNotification',
]) {
  assert(widgetSnapshotTs.includes(field), `widgetSnapshot.ts exports ${field}`);
}

assert(
  pregnancyTs.includes('export function getPregnancyDay'),
  'pregnancyNotificationScheduler exports getPregnancyDay',
);
assert(
  pregnancyTs.includes('export function getWeeklyInsightForWeek'),
  'pregnancyNotificationScheduler exports getWeeklyInsightForWeek',
);
assert(
  pregnancyTs.includes('syncWidgetSnapshot'),
  'savePregnancyInfo triggers syncWidgetSnapshot',
);

// --- Swift struct parity ---
const swiftPaths = [
  'ios-widgets/Shared/WidgetSnapshot.swift',
  'ios/018BYWidgetExtension/Shared/WidgetSnapshot.swift',
];

for (const rel of swiftPaths) {
  const swift = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const field of [
    'let day: Int',
    'let dayInWeek: Int',
    'let trimester: Int',
    'let weeklyInsight: String?',
    'let instanceId: String',
    'let unfinishedPages: Int?',
    'albumsCount',
    'todayNotifications',
    'latestNotification',
    'unreadTodayCount',
    'static let notifications',
    'static let setPdr',
    'daysUntilPdrLabel',
    'albumsCountLabel',
    'album-page-form',
    'app018by://my-stories',
    'paper-album-notifications',
  ]) {
    assert(swift.includes(field), `${rel}: contains ${field}`);
  }
  assert(
    swift.includes('startOfTomorrow') && swift.includes('.minute, value: 30'),
    `${rel}: timeline refreshes at midnight and every 30 min`,
  );
}

// --- Notifications widget registered ---
const bundle = fs.readFileSync(
  path.join(root, 'ios-widgets/WidgetBundle.swift'),
  'utf8',
);
assert(bundle.includes('NotificationsWidget()'), 'WidgetBundle registers NotificationsWidget');

const pbx = fs.readFileSync(
  path.join(root, 'ios/018BY.xcodeproj/project.pbxproj'),
  'utf8',
);
assert(
  pbx.includes('NotificationsWidget.swift in Sources'),
  'Xcode project includes NotificationsWidget.swift',
);

// --- Deep link screen ---
const notificationsRoute = fs.readFileSync(
  path.join(root, 'app/notifications.tsx'),
  'utf8',
);
assert(
  notificationsRoute.includes("router.replace('/(tabs)/notifications'"),
  'app/notifications.tsx navigates to notifications tab',
);
assert(
  notificationsRoute.includes('activateNotificationTab'),
  'app/notifications.tsx activates notification tab',
);

const myStoriesRoute = fs.readFileSync(path.join(root, 'app/my-stories.tsx'), 'utf8');
assert(
  myStoriesRoute.includes("router.replace('/(tabs)/projects'"),
  'app/my-stories.tsx navigates to Мои истории tab',
);

const legacyCelebration = fs.readFileSync(path.join(root, 'app/select-celebration.tsx'), 'utf8');
assert(
  legacyCelebration.includes("router.replace('/(tabs)/projects'"),
  'select-celebration legacy redirect goes to projects tab',
);

// --- Sync triggers ---
const syncFiles = [
  ['hooks/use-notification-handlers.ts', 'syncWidgetSnapshot'],
  ['app/_layout.tsx', 'syncWidgetSnapshot'],
  ['app/(tabs)/notifications.tsx', 'syncWidgetSnapshot'],
];
for (const [rel, needle] of syncFiles) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  assert(source.includes(needle), `${rel} calls syncWidgetSnapshot`);
}

// --- Unit: getPregnancyDay fixed due date ---
const reference = new Date(2026, 5, 28, 12, 0, 0); // 28 Jun 2026 local
const dueDate = new Date(2026, 11, 1, 12, 0, 0); // 1 Dec 2026 local
const dayInfo = getPregnancyDay(dueDate, reference);

assert(dayInfo.day === 125, `getPregnancyDay: day=125 (got ${dayInfo.day})`);
assert(dayInfo.week === 18, `getPregnancyDay: week=18 (got ${dayInfo.week})`);
assert(dayInfo.dayInWeek === 6, `getPregnancyDay: dayInWeek=6 (got ${dayInfo.dayInWeek})`);
assert(dayInfo.trimester === 2, `getPregnancyDay: trimester=2 (got ${dayInfo.trimester})`);

// --- Unit: inbox today filter ---
const todayMorning = new Date(2026, 5, 28, 10, 0, 0);
const yesterdayMorning = new Date(2026, 5, 27, 10, 0, 0);
const inbox = [
  { id: '1', title: 'Сегодня 1', body: 'A', receivedAt: todayMorning.toISOString() },
  { id: '2', title: 'Вчера', body: 'B', receivedAt: yesterdayMorning.toISOString() },
  { id: '3', title: 'Сегодня 2', body: 'C', receivedAt: todayMorning.toISOString() },
];
const snapshot = buildNotificationSnapshot(inbox, reference);
assert(snapshot.todayNotifications.length === 2, 'inbox filter: two items today');
assert(snapshot.unreadTodayCount === 2, 'inbox filter: unreadTodayCount=2');
assert(snapshot.latestNotification?.id === '1', 'inbox filter: latest is most recent today');

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll widget snapshot payload checks passed.');
