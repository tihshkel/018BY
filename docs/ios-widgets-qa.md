# iOS Widgets QA — 018BY

## Предусловия

- **Не Expo Go** — виджеты работают только в нативной сборке (`npx expo run:ios` / EAS)
- Сборка с plugin `@bittingz/expo-widgets`
- App Group: `group.com.tihshkel.x018BY.expowidgets`
- Provisioning profile включает App Groups для main app и widget extension
- После установки: **откройте приложение** хотя бы раз — данные попадут в виджеты
- После обновления Swift: удалить виджеты с Home Screen и добавить заново

## Виджеты в галерее

| Виджет | Small | Medium | Large | Extra Large | Lock Screen |
|--------|-------|--------|-------|-------------|-------------|
| Быстрый доступ | ✓ | ✓ | — | — | Inline |
| Мои проекты | ✓ | ✓ | ✓ | ✓ (iPad) | — |
| Продолжить | ✓ | ✓ | ✓ | — | Rectangular |
| Важные даты | ✓ | ✓ | ✓ | — | Inline + Circular |
| Беременность | ✓ | ✓ | ✓ | — | Circular + Rectangular |
| Уведомления | ✓ | ✓ | ✓ | — | Inline + Rectangular |

## Сценарии

1. **Пустое состояние** — без проектов: tap → вкладка **«Мои истории»** (`app018by://my-stories`)
2. **Мои проекты** — после создания альбома: % прогресса и «осталось N стр.» (если есть незаполненные страницы)
3. **Продолжить** — частично заполненный альбом: «Страница N · …» + %; tap → **форма страницы** (`album-page-form?id=…&instanceId=…`)
4. **Важные даты** — пользовательское напоминание из календаря; tap → `reminders-list`
5. **Беременность** — проект с ПДР: **день** (крупно), неделя, триместр, weekly insight; tap → альбом беременности
6. **Уведомления** — push за сегодня попадает в inbox → виджет показывает заголовок и текст; tap → **История уведомлений**
7. **Быстрый доступ** — tap → вкладка «Мои истории» (категории и шаблоны с правильными обложками)
8. **Выход из аккаунта** — виджеты показывают empty state
9. **Dark Mode** — читаемость текста и розового акцента
10. **Полночь** — день беременности и блок «сегодня» в уведомлениях обновляются без открытия приложения (timeline до полуночи)

## Синхронизация snapshot

Snapshot обновляется при:

- возврате приложения на передний план (`AppState` → active)
- получении / тапе по push-уведомлению
- фокусе экрана «История уведомлений»
- сохранении ПДР беременности
- главной, списке напоминаний, сохранении альбома

## Deep links

- `app018by://my-stories` (вкладка «Мои истории»; legacy: `app018by://select-celebration` → туда же)
- `app018by://album-pages?id=...`
- `app018by://album-page-form?id=...&instanceId=...`
- `app018by://reminders-list`
- `app018by://notifications`
- `app018by://`

## Автотесты

```bash
node scripts/test-widget-snapshot-payload.js
node scripts/test-widget-visual-design.js
npm run test:project-sync
```

## Регрессия

- [ ] iPhone 15 / 16 simulator
- [ ] iPad (Extra Large grid)
- [ ] Lock Screen widgets (iOS 16+)
- [ ] EAS production build

## Заметки

_Дата / билд / устройство:_

_Проблемы:_
