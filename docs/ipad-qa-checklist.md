# iPad QA: portrait, landscape и Split View

Ручной чеклист для **iPad Air** и **iPad Pro** (симулятор или устройство).

## Режимы

| Режим | Как проверить |
| --- | --- |
| Portrait | Обычная ориентация |
| Landscape | Повернуть симулятор ⌘← / ⌘→ |
| Split View (~50%) | Slide Over / Split View, ширина приложения < 768 pt |

## Матрица сценариев

| Сценарий | Portrait | Landscape | Split View (~50%) |
| --- | --- | --- | --- |
| Onboarding → home | ✓ | ✓ | ✓ compact (phone layout) |
| Создание альбома (каждая категория) | ✓ | ✓ | ✓ |
| Wizard: select-celebration → cover → action | ✓ centered shell | ✓ grid 2 col | ✓ phone layout |
| Заполнение страницы (text + photo) | ✓ | ✓ | ✓ |
| Preview страницы (album-page-preview) | ✓ | ✓ split layout | ✓ compact |
| Список страниц (album-pages) | ✓ | ✓ grid 3–4 col | ✓ single column |
| Export PDF (electronic) | ✓ | ✓ | ✓ |
| Profile / notifications | ✓ max-width ~640 | ✓ | ✓ |
| Modals / bottom sheets | centered on tablet | ✓ | phone-style sheet |
| Tab bar | стандарт | ✓ уменьшен padding | ✓ phone height |

## Критичные проверки

1. **Editor coordinates** — на iPad viewport редактора остаётся **390 px**; экспорт PDF совпадает с превью.
2. **Split View** — при ширине < 768 pt UI как на телефоне (`isCompactTablet`), без растянутых форм.
3. **Rotation** — после поворота layout пересчитывается (нет «замороженных» размеров).
4. **Export overlay** — прогресс PDF не растягивается на всю ширину iPad.

## Вторичные экраны

- [ ] help
- [ ] reminders-list
- [ ] export-history
- [ ] export-subscription
- [ ] paper-album-notifications
- [ ] album-template-library
- [ ] edit-project (sidebar stacked в portrait / narrow)

## Регрессия

- [ ] iPhone — layout без изменений
- [ ] Android — orientation lock не затронут

## Заметки по прогону

_Дата / устройство / билд:_

_Найденные проблемы:_
