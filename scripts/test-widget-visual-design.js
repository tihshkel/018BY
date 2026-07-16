#!/usr/bin/env node
/**
 * node scripts/test-widget-visual-design.js
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

const components = fs.readFileSync(
  path.join(root, 'ios-widgets/Design/WidgetComponents.swift'),
  'utf8',
);

assert(components.includes('struct WidgetPalette'), 'WidgetPalette adaptive palette exists');
assert(components.includes('WidgetBackgroundStyle.canvas'), 'widget canvas background');
assert(components.includes('widgetPalette'), 'widgets use environment palette');
assert(components.includes('WidgetActionOrb'), 'WidgetActionOrb still defined');
assert(components.includes('WidgetHeroNumber'), 'info-first hero number component');
assert(components.includes('WidgetMetricLabel'), 'metric label component');
assert(
  components.includes('Clean flat canvas') ||
    !components.includes('offset(x: 78, y: -52)'),
  'background avoids decorative glow circles',
);
assert(components.includes('containerBackground(for: .widget)'), 'iOS 17 container background');

const overview = fs.readFileSync(
  path.join(root, 'ios-widgets/QuickAccess/QuickAccessWidget.swift'),
  'utf8',
);
assert(overview.includes('Сводка'), 'QuickAccess renamed to overview/сводка');
assert(overview.includes('albumsCount'), 'overview shows albumsCount');
assert(overview.includes('daysLeft'), 'overview shows PDR days');
assert(!overview.includes('WidgetActionOrb'), 'overview is not CTA-orb focused');

const widgetFiles = [
  'ios-widgets/QuickAccess/QuickAccessWidget.swift',
  'ios-widgets/Continue/ContinueWidget.swift',
  'ios-widgets/MyProjects/MyProjectsWidget.swift',
  'ios-widgets/Pregnancy/PregnancyWidget.swift',
  'ios-widgets/Reminder/ReminderWidget.swift',
  'ios-widgets/Notifications/NotificationsWidget.swift',
];

for (const rel of widgetFiles) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  assert(source.includes('@Environment(\\.widgetPalette)'), `${rel}: adaptive palette`);
  assert(!source.includes('WidgetColors.textPrimary'), `${rel}: no hardcoded dark text color`);
  assert(source.includes('containerBackgroundRemovable(true)'), `${rel}: removable background`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll widget visual design checks passed.');
