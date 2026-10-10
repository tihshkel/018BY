# Иллюстрации авторизации и опрос после регистрации

Созданы три изображения встроенным `image_gen` в режиме `illustration-story`, с прозрачным фоном. Референсы: `assets/images/logo.png` и `assets/images/illustrations/print-memories-unicorn.png`.

Файлы в проекте:

- [login-welcome-unicorn.png](/Users/tihonshkel/Documents/018BY/assets/images/illustrations/login-welcome-unicorn.png)
- [register-create-unicorn.png](/Users/tihonshkel/Documents/018BY/assets/images/illustrations/register-create-unicorn.png)
- [referral-discovery-unicorn.png](/Users/tihonshkel/Documents/018BY/assets/images/illustrations/referral-discovery-unicorn.png)

Изображения размещены над приветствием. По просьбе пользователя увеличены: ширина контейнера 320 px вместо 220, максимальная высота 180 px вместо 112. На небольших экранах и при крупном системном шрифте высота уменьшается с учётом места под форму и безопасных отступов; при открытой клавиатуре изображения скрываются. Google и Apple расположены в одной строке с полными названиями действия для VoiceOver. Поля и кнопки имеют высоту минимум 52 px. При крупном системном шрифте и ошибках форма остаётся прокручиваемой.

После регистрации по email пользователь проходит опрос перед вводом имени. Общий переход после Google/Apple и подтверждения email учитывает текущий профиль: завершённые аккаунты открывают приложение, новые — опрос, прошедшие или пропустившие опрос — ввод имени. Можно выбрать Instagram, «Из альбома» или «Другое». Пропуск не заполняет источник выдуманным значением.

Выбранный источник обновляется только в `profiles.referral_source` текущего пользователя с RLS; имя и аватар не перезаписываются. Маркер прохождения или пропуска хранится отдельно для UUID аккаунта; metadata Auth обновляется в фоне. Ошибка необязательного ответа позволяет пропустить шаг. Изменений схемы базы не требуется.

## Проверка

- `npm run test:auth`: сценарии авторизации и опроса, выбранный источник, пропуск, ошибки сохранения, повторные нажатия, смена аккаунта, скрытие иллюстрации при открытии клавиатуры. Отдельно проверяются переходы после email-регистрации и нового/существующего Google/Apple аккаунта.
- `npm run test:iap`: существующие проверки покупки проходят.
- ESLint для изменённых экранов, layout, social buttons и утилиты проходит. TypeScript не сообщает ошибок в этих файлах; общая проверка проекта остаётся с прежними ошибками в других компонентах и e2e.
- Production iOS JS собирается в Hermes bytecode (3150 модулей). Новые нативные зависимости не добавлены.

Иллюстрации проверены визуально. Само расположение новых экранов на физическом iPhone пока не проверено. Превью localhost через инструмент браузера заблокировано политикой URL.

## Промпты генерации

### login-welcome-unicorn

```text
Use case: illustration-story. Create a small transparent hero asset for the 018BY family photo album app. Image 1 is a character and drawing-style reference; image 2 is an illustration-style reference. Preserve the friendly white unicorn, curly blush pink mane, muted slate-blue hand drawn outlines, warm ivory and blush pink colors, soft editorial drawing with subtle pastel texture. Charming, clean and expressive, polished and readable as a small 180x110 pixel illustration on a white mobile login page. Compact horizontal composition, centered, with minimal transparent margin, no full background scene. No words, numbers, logo, branding, watermark, UI, badges, or realistic photography. Scene: the unicorn's cheerful head and upper body peeking from behind a single small blush-pink photo frame, one hoof raised in a friendly hello wave, a tiny heart near the frame. A playful welcoming expression. Keep the silhouette wide and low rather than tall, with horn fully visible.
```

### register-create-unicorn

```text
Use case: illustration-story. Create a small transparent hero asset for the 018BY family photo album app. Image 1 is a character and drawing-style reference; image 2 is an illustration-style reference. Preserve the friendly white unicorn, curly blush pink mane, muted slate-blue hand drawn outlines, warm ivory and blush pink colors, soft editorial drawing with subtle pastel texture. Charming, clean and expressive, polished and readable as a small 180x110 pixel illustration on a white mobile login page. Compact horizontal composition, centered, with minimal transparent margin, no full background scene. No words, numbers, logo, branding, watermark, UI, badges, or realistic photography. Scene: the curious unicorn's head and upper body leaning over a small open ivory memory journal, drawing one little heart with a rose-colored pencil held by its hoof, one small blank photo frame on the page. A playful look of concentration and invitation to start creating. Keep the silhouette wide and low rather than tall, with horn fully visible.
```

### referral-discovery-unicorn

```text
Use case: illustration-story. Create a small transparent hero asset for the 018BY family photo album app. Image 1 is a character and drawing-style reference; image 2 is an illustration-style reference. Preserve the friendly white unicorn, curly blush pink mane, muted slate-blue hand drawn outlines, warm ivory and blush pink colors, soft editorial drawing with subtle pastel texture. Charming, clean and expressive, polished and readable as a small 180x110 pixel illustration on a white mobile login page. Compact horizontal composition, centered, with minimal transparent margin, no full background scene. No words, numbers, logo, branding, watermark, UI, badges, or realistic photography. Scene: the curious unicorn holding a small magnifying glass in front of three tiny keepsake cards: a phone-shaped pink card, a blush pink closed photo album, and a little heart photo card. It looks delighted to have discovered something. Keep this composition compact and wide, with only these few clearly readable objects and the horn fully visible.
```
