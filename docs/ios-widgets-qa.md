# iOS Widgets QA — 018BY

## Предусловия

- Сборка через `npx expo prebuild --platform ios` (или EAS) с plugin `@bittingz/expo-widgets`
- App Group: `group.com.tihshkel.x018BY.expowidgets`
- Provisioning profile включает App Groups для main app и widget extension

## Виджеты в галерее

| Виджет | Small | Medium | Large | Extra Large | Lock Screen |
|--------|-------|--------|-------|-------------|-------------|
| Быстрый доступ | ✓ | ✓ | — | — | Inline |
| Мои проекты | ✓ | ✓ | ✓ | ✓ (iPad) | — |
| Продолжить | ✓ | ✓ | ✓ | — | Rectangular |
| Напоминания | ✓ | ✓ | ✓ | — | Inline + Circular |
| Беременность | ✓ | ✓ | ✓ | — | Circular + Rectangular |

## Сценарии

1. **Пустое состояние** — без проектов: «Создайте первый альбом», tap → `select-celebration`
2. **Мои проекты** — после создания альбома на главной: виджет показывает прогресс %
3. **Продолжить** — частично заполненный альбом: название страницы + %; tap → `album-pages`
4. **Напоминания** — добавить напоминание в приложении → виджет обновляется (или после возврата на главную)
5. **Беременность** — проект с PDR: неделя и countdown; tap → альбом
6. **Быстрый доступ** — tap → создание альбома
7. **Выход из аккаунта** — виджеты показывают empty state
8. **Dark Mode** — читаемость текста и розового акцента

## Deep links

- `018by://select-celebration`
- `018by://album-pages?id=...`
- `018by://reminders-list`
- `018by://`

## Регрессия

- [ ] iPhone 15 / 16 simulator
- [ ] iPad (Extra Large grid)
- [ ] Lock Screen widgets (iOS 16+)
- [ ] EAS production build

## Заметки

_Дата / билд / устройство:_

_Проблемы:_
