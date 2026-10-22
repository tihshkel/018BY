# Разовая покупка экспорта для печати — iOS

## Проверка App Store Connect — 21.10.2026

Проверено через открытую консоль Apple, без запуска тестов и без проведения оплаты:

- Приложение: `018BY`, App Store ID `6761551531`, Bundle ID `com.tihshkel.x018BY`, Team ID `3JY55YHULX`. Идентификаторы совпадают с Expo/native-проектом.
- В Apple Developer у основного explicit App ID включён **In-App Purchase**.
- Продукт `018BY Print Export`: Apple ID `6775805789`, SKU `com.tihshkel.x018BY.export_print_unlock`, тип **Non-Consumable**. SKU совпадает с кодом; менять его или создавать дубликат не требуется.
- В начале проверки продукт имел статус **Prepare for Submission**: создан, но не отправлен на review и не одобрен для production. Пользователь подтвердил, что ошибка получена в приложении из App Store.
- Availability: все **175 стран/регионов**, Remove from Sale выключен. База США — **USD 4.99**, Беларусь — **USD 5.99**, Россия — **RUB 449.00**. Цены прочитаны из действующего расписания, не изменялись. Storefront определяется Apple Account, а не IP/VPN.
- Русская локализация: «Экспорт для печати», «PDF для твёрдой и мягкой обложки. Разовая покупка.»
- Paid Apps Agreement, банковский счёт, обе налоговые формы США и Digital Services Act имеют статус **Active**. Проверен статус готовности, корректность самих банковских/налоговых реквизитов не удостоверялась.
- Есть предупреждение о новом **Apple Developer Program License Agreement**: принять его должен Account Holder **Dzianis Butkevich** до **29.10.2026**. Текущая сессия — **Admin**; принять договор от имени владельца через неё нельзя. Это отдельный вопрос от действующего Paid Apps Agreement.
- Кнопка Add for Review первоначально возвращала **You must add a Review Information screenshot**. С разрешения пользователя его исходный скриншот оплаты передан в поле Review Information; Apple начала обработку файла. Примечания описывают реальный экран до первого одобрения продукта, без подмены цены или выдуманного успешного платежа.
- Первая загрузка изображения завершилась сообщением Apple **Something went wrong. Delete the assets and try again.** Повторно передана побайтовая копия того же изображения под именем `print-export-paywall.png` (локально `/tmp/018by-app-review/print-export-paywall.png`). На момент передачи задачи обратно пользователю Apple показывает **Processing**; успешная обработка скриншота и добавление покупки в submission **ещё не подтверждены**. Карточка покупки оставлена открытой. Перед отправкой дождаться принятия изображения; если Apple вновь откажет, повторно загрузить его в Review Information и сохранить.
- Создан черновик версии **1.2.1** с описанием изменения и инструкцией отправить её вместе с этой первой Non-Consumable покупкой. Само создание черновика не отправляет продукт на review и не открывает продажи.
- Для самостоятельной сборки пользователя Expo-конфиг, native приложение и widget extension подготовлены как **1.2.1 (49)**; iOS Expo Updates runtime обновлён на `1.2.1`. В EAS остаются `appVersionSource: remote` и `autoIncrement: true`: окончательный номер облачной сборки назначает EAS. Сборку и её отправку пользователь выполняет сам.

В коде уточнены сообщения: успешный пустой каталог отличается от ошибки запроса; кнопка после ошибки больше не продолжает показывать «Загрузка цены…». Paywall сохраняет конкретную причину из провайдера. Инструкция восстановления указывает и тот же Apple ID, и исходный аккаунт 018BY.

Для завершения выпуска:

1. Владелец аккаунта должен ознакомиться с обновлённым лицензионным соглашением и принять его в Apple Developer Account.
2. Подготовить и загрузить **новую сборку с версией 1.2.1**, увеличив build number; привязать её к созданному черновику. Сборка 1.2.0 (48) не заменяет бинарник новой версии. В этой сессии сборка и загрузка бинарника не запускались.
3. После обработки скриншота сохранить продукт, добавить **IAP и версию 1.2.1 в одну draft submission**, затем отправить её на review. У новой версии проверить релизные настройки перед отправкой.
4. Дождаться одобрения IAP для production. Публикация одного приложения без одобрения покупки не решает проблему каталога.
5. На реальном iPhone подтвердить получение цены, покупку, открытие обоих форматов и восстановление доступа. Реальный платёж пользователь подтверждает сам. Эти операции в данной сессии не выполнялись; успешная оплата пока не подтверждена.

Документация Apple: [первую покупку каждого типа отправляют вместе с новой версией](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/), [значение статусов IAP](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-statuses/).

## Скриншоты и журнал от 22.10.2026

Пользователь подтвердил, что новые скриншоты сделаны в App Store версии. На экране уже есть цена €5,99 и сообщение о транзакции без `appAccountToken`. Это отдельный случай от пустого каталога 21 октября; новый статус IAP в ASC по скриншотам не установлен. Отсутствие токена не доказывает возраст покупки и не подтверждает её владельца в 018BY. Нельзя автоматически назначать её текущему аккаунту или требовать повторной оплаты.

Пользователь также подтвердил отсутствие реального списания. Поэтому наличие оплаченной production покупки не установлено. Провайдер теперь сохраняет `environmentIOS` из проверенной транзакции: при `Sandbox`/`Xcode` интерфейс явно называет её тестовой, без списания денег. Среда не угадывается по цене или способу установки. Для следующего журнала добавлена диагностика `[PrintUnlock] Purchase ownership unresolved` только со средой и признаком наличия токена, без Apple ID, чека, UUID аккаунта и подписанной транзакции. До получения этих данных источник записи неизвестен; тестовая история автоматически не удалялась.

Восстановление сначала читает проверенные активные StoreKit entitlements. Если доступ уже принадлежит аккаунту либо найдена покупка без привязки/другого аккаунта, повторная авторизация Apple не требуется. При отсутствии покупки выполняется один `syncIOS`, затем повторное чтение entitlements. Убран второй sync внутри `useIAP.restorePurchases` версии 4.3.1. Для системной авторизации больше нет таймера 15 секунд, который освобождал блокировку, оставляя окно Apple открытым. Ошибка синхронизации сохраняется на экране; отмена пользователем не выдаётся за отсутствие покупок.

Экран и paywall различают проверку, оплату и восстановление. При восстановлении индикатор показывается у соответствующего действия; цена и кнопка оплаты больше не превращаются одновременно в индикаторы. Покупка без привязки отображается как требующая подтверждения, с действием поддержки вместо неактивной кнопки повторной оплаты. Изоляция аккаунтов через `appAccountToken` сохранена. Реальная миграция неподписанной токеном покупки по-прежнему требует подтверждения владельца и серверной реализации (см. ниже); эти UI изменения её не выполняют.

В присланном журнале есть HTTP 400 EAS Update с отсутствующим `expo-channel-name`; сообщения об ошибке проверки пароля StoreKit в нём нет. Добавлен `production` в `updates.requestHeaders` и native `EXUpdatesRequestHeaders` для самостоятельной Release сборки через Xcode. EAS profiles продолжают выбирать свой канал при сборке. Это исправление доставки обновлений, не исправление пароля Apple. Предупреждения UIScene/клавиатуры и сетевые отладочные сообщения не устанавливают причину отказа оплаты.

Пароль проверяет системный App Store; приложение его не получает. Для App Store версии используется обычный аккаунт «Медиаматериалы и покупки», а не Sandbox тестер. Если вход отклоняется и вне приложения, проблему авторизации нужно решать с Apple. Тесты, сборка, реальный платёж и восстановление на устройстве в этой сессии не запускались.

Источники: [StoreKit AppStore.sync](https://developer.apple.com/documentation/storekit/appstore/sync()), [StoreKit currentEntitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements), [EAS build channels](https://docs.expo.dev/build/updates/).

## Запуск схемы StoreKit без Metro — 22.10.2026

На скриншоте IMG_0075 открыт Expo Development Build launcher. В журнале — `Connection refused` / `NSURLErrorDomain -1004` для `/status` на портах Metro, включая `127.0.0.1:8081` и `192.168.1.1:8081`. Это сбой подключения development client до загрузки JavaScript приложения, а не отказ покупки StoreKit. Предупреждение UIScene не объясняет показанный launcher.

У схемы `018BY-StoreKit` действие Run переключено с Debug на Release. Native bundle phase включает JavaScript в Release, AppDelegate читает `main.jsbundle`. Ссылка на `ExportPrintUnlock.storekit` сохранена в LaunchAction. Поэтому после новой сборки и запуска этой схемы из Xcode Metro не требуется. Это локальная среда Xcode StoreKit, платежи в ней тестовые; обычный пароль Apple ID для локальной покупки не нужен. Такой запуск проверяет клиентскую логику, но не подтверждает готовность production продукта App Store Connect.

Для запуска уже установленного Debug development client без пересборки: в корне проекта выполнить `npx expo start --dev-client --lan`, подключить Mac и iPhone к одной локальной сети и открыть сервер с экрана launcher (либо QR из терминала). Это инструкция пользователю: сервер, сборка и тесты в этой сессии не запускались.

Порядок самостоятельной проверки: открыть `ios/018BY.xcworkspace`, выбрать `018BY-StoreKit` и iPhone, запустить Run; для повторения новой локальной покупки удалить только её тестовую транзакцию через Xcode → Debug → StoreKit → Manage Transactions. Для App Store/TestFlight использовать обычную схему `018BY`, без локальной конфигурации StoreKit.

Документация: [Expo development client](https://docs.expo.dev/develop/development-builds/use-development-builds/), [Expo Release configuration](https://docs.expo.dev/guides/local-app-development/), [Apple StoreKit testing in Xcode](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode).

## Контракт продукта

- Bundle ID: `com.tihshkel.x018BY`, ASC app ID: `6761551531`.
- SKU: **`com.tihshkel.x018BY.export_print_unlock`**.
- Apple type: **Non-Consumable**, одна покупка без ежемесячных списаний. Оплата принадлежит Apple ID, доступ в приложении — конкретному аккаунту 018BY через `appAccountToken`.
- Покупка открывает PDF для `hard` и `soft`. `electronic` бесплатен. На Android/web `isIapEnabled: false`, доступны все форматы.
- В UI используется `isUnlocked`. Старые имена контекста, маршрута и `isSubscribed` оставлены для совместимости.

## App Store Connect — проверяет владелец аккаунта

**На 02.10.2026 фактическое состояние ASC не подтверждено. Пользователь взял проверку ASC на себя.** Файл StoreKit не создаёт продукт в ASC. Перед Sandbox/релизом заполнить:

- [ ] Apps → 018BY → Monetization → In-App Purchases: создан **Non-Consumable** с SKU выше, без пробелов и изменения регистра.
- [ ] Reference Name: `Print PDF Export Unlock`.
- [ ] Русское название: `Экспорт для печати`.
- [ ] Русское описание: `Разовая покупка: PDF для печати в твёрдой и мягкой обложке навсегда.`
- [ ] Базовая цена США: **$4.99** либо согласованная актуальная цена; проверены региональные цены и доступность в storefront тестера. Приложение показывает только `displayPrice` Apple, цена в коде не подменяется.
- [ ] Заполнены обязательные метаданные, screenshot для review и availability; статус **Ready to Submit** для подготовки тестов либо **Approved**. Для продажи в production требуется одобрение Apple.
- [ ] Первая IAP приложена к версии приложения при отправке на review.
- [ ] Business → Agreements: **Paid Applications Agreement — Active**, приняты актуальные условия владельцем аккаунта.
- [ ] Banking и Tax: обязательные банковские/налоговые формы заполнены, нет pending/action required.
- [ ] Users and Access → Sandbox: создан тестовый Apple Account.

Дата проверки: ______. Статус продукта: ______. Цена/storefront: ______. Agreements/Banking/Tax: ______.

Apple: [создание Non-Consumable](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-consumable-or-non-consumable-in-app-purchases/), [договоры](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/). Изменения метаданных могут появляться в Sandbox до часа.

## Native и локальный StoreKit

Проверено в репозитории: `expo-iap` установлен и зафиксирован в lockfile как **4.3.1**, plugin присутствует в `app.json`, `ios/Podfile.lock` содержит `ExpoIap 4.3.1`, bundle ID в native target совпадает. При изменении native dependencies нужен новый бинарник, OTA недостаточно.

**Expo Go не поддерживает IAP.** На iOS в Expo Go показывается объяснение и печать остаётся заблокированной.

- iPhone dev-client: `npx eas-cli build --profile development-device --platform ios`, затем `npx expo start --dev-client`.
- EAS `development` оставлен для Simulator; новый `development-device` наследует его с `simulator: false`.
- TestFlight: `npm run build:ios`, затем обычная отправка сборки в ASC/TestFlight.
- EAS profiles явно выбирают схему `018BY` без локальной подмены StoreKit.

Локальная отладка:

1. Открыть `ios/018BY.xcworkspace` в Xcode; запустить Metro: `npx expo start --dev-client`.
2. Выбрать **018BY-StoreKit**, Simulator/iPhone, Run (Debug). Схема ссылается на `ios/ExportPrintUnlock.storekit`: NonConsumable, тот же SKU, тестовая цена 4.99, русская локализация.
3. В Edit Scheme → Run → Options проверить выбранный StoreKit Configuration. Файл добавлен в navigator, в ресурсы release-приложения не копируется.
4. Debug → StoreKit → Manage Transactions: проверить purchase, cancel, Ask to Buy/deferred, refund/revoke, повторное открытие приложения. Сброс локальных тестовых транзакций делать здесь; переустановка приложения сама по себе не сбрасывает владение.
5. Для проверки настоящего каталога Apple использовать схему **018BY** с StoreKit Configuration **None** либо TestFlight. Локальная конфигурация не проверяет ASC, договоры, реальную цену или Sandbox-аккаунт.

После `expo prebuild --clean` вручную восстановить StoreKit-файл/схему из репозитория: они находятся в native ios, а не в config plugin.

[Apple: StoreKit Testing в Xcode](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode).

## Поток и границы реализации

API сверены с исходниками установленного пакета `node_modules/expo-iap/src/{useIAP,index,types}.ts` и [OpenIAP requestPurchase](https://www.openiap.dev/docs/apis/request-purchase), [finishTransaction](https://www.openiap.dev/docs/apis/finish-transaction).

- Каталог: прямой `fetchProducts({ skus, type: 'in-app' })` возвращает результат именно текущего запроса. Hook `fetchProducts` возвращает `void`, а `products` объединяет старые результаты; поэтому каталог читается прямым API.
- Покупка: `requestPurchase({ type: 'in-app', request: { apple: { sku, appAccountToken: session.user.id } } })`; результат обрабатывается в `useIAP.onPurchaseSuccess/onPurchaseError`, затем `finishTransaction({ purchase, isConsumable: false })`. Promise отправки запроса сам по себе не означает покупку. До открытия Apple sheet проверяется существующая покупка; если она относится к другому аккаунту, повторная оплата не предлагается.
- Слушатель принимает только наш SKU, состояние `purchased`, без `revocationDateIOS`, с `appAccountToken` текущего аккаунта (сравнение UUID без учёта регистра). Чужая покупка не открывает доступ и не завершается. OpenIAP проверяет StoreKit 2 `VerificationResult` в native коде перед выдачей покупки; отдельного сервера/RevenueCat нет. Успешно завершённая транзакция не завершается повторно при дублирующем событии; ошибка завершения допускает повтор.
- Restore: явный `syncIOS`, затем `restorePurchases` и прямой `getAvailablePurchases({ onlyIncludeActiveItemsIOS: true, alsoPublishToEventListenerIOS: false })`. В **4.3.1** библиотека подавляет ошибку внутреннего `syncIOS`; дополнительная синхронизация намеренно нужна, чтобы offline/auth error не выглядел как «Покупки не найдены».
- Отмена пользователем проходит без Alert. Ошибки покупки/restore показываются в Alert; ошибка каталога — в экране/paywall с «Повторить». Пустой успешный restore отдельно сообщает «Покупки не найдены».
- Подключение/каждый вызов StoreKit ограничены 15 сек., ожидание колбэка покупки — 90 сек., чтение/запись кэша — 1 сек. Restore может включать несколько последовательных вызовов. Поздний успех покупки всё равно открывает доступ.
- AsyncStorage key: `iap:com.tihshkel.x018BY.export_print_unlock:v2:<Supabase user UUID>`. Старый общий ключ `v1` игнорируется. Сначала читается кэш только текущего аккаунта, затем StoreKit. Успешный ответ без покупки этого аккаунта снимает доступ; сетевая ошибка оставляет подтверждённый статус только этого пользователя. Кэш не синхронизируется через облако приложения.
- Провайдер подписан на Supabase Auth; смена аккаунта или выход размонтирует старое состояние StoreKit и отменяет ожидание оплаты. Поздний callback предыдущего аккаунта не открывает доступ новому. Без сессии покупка и восстановление недоступны. Начальное чтение сессии не может перезаписать более новое событие входа.
- После смены Apple ID статус меняется при следующем успешном ответе StoreKit. Offline может временно сохраняться кэш текущего аккаунта 018BY; кэш другого аккаунта не используется.
- Общая блокировка операций защищает двойные нажатия и не допускает foreground-проверку поверх Apple sheet. Номер ревизии защищает новый unlock от устаревшего ответа StoreKit. При ошибке `finishTransaction` доступ остаётся, показывается уведомление, незавершённую транзакцию StoreKit повторит при следующем запуске.
- Paywall следит за `isUnlocked`: покупка, restore и поздний callback автоматически выбирают ожидавший hard/soft. PDF pipeline и геометрия не изменены.

## Проверки

Автоматически: `npm run test:iap` — настоящий React-провайдер с моками expo-iap/AsyncStorage/AppState и виртуальными таймерами. Покрываются цена, purchase/finish, отмена, offline, deferred, already-owned, таймаут/поздний успех, restore, пустой каталог, кэш, revoke, гонки, foreground, unmount, Android/web и Expo Go.

Maestro (требует установленный Maestro и native iOS build):

```sh
maestro test e2e/maestro/flows/02-profile/profile-subscription.yaml
maestro test e2e/maestro/flows/05-export/export-print-gated.yaml
```

Второй flow требует Apple ID без этой покупки / сброшенных локальных StoreKit-транзакций. Проверяет оба платных формата с обязательными assertions, restore в paywall и завершение бесплатного electronic. Системную покупку Apple подтверждают вручную.

Результат локальной проверки 02.10.2026:

- `npm run test:iap`: **29 проверок прошли**, включая взаимодействие настоящего paywall с провайдером.
- `npx expo export --platform ios --output-dir /tmp/018by-iap-export`: **успешно**, Hermes-бандл собран.
- ESLint изменённых TS/TSX-файлов: **0 ошибок**, 34 предупреждения в существующем коде export/profile.
- `xcodebuild -list -project ios/018BY.xcodeproj`: видны схемы `018BY` и `018BY-StoreKit`; JSON конфигурации и совпадение SKU/type проверены тестом.
- `npx tsc --noEmit`: **не прошёл** из-за ошибок вне изменённых IAP-файлов (в том числе `app/(tabs)/_layout.tsx`, `components/draggable-photo.tsx`, `utils/pageValuesAdapter.ts`). В изменённых файлах диагностик нет.
- Maestro не установлен, flows не запускались. Native build, запуск `.storekit` в Simulator и реальный iPhone/Sandbox ещё требуют ручной проверки.

## Приёмка на реальном iPhone — ещё не выполнена

Использовать native development build + Sandbox Apple Account либо TestFlight. Для dev build включить Developer Mode и войти в Sandbox Apple Account в настройках разработчика iPhone. TestFlight работает в Sandbox; настройка тестового аккаунта описана [Apple](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testing-subscriptions-and-in-app-purchases-in-testflight/). Убедиться, что платёжный sheet обозначен как тестовый.

- [ ] На чистом тестовом Apple ID в профиле «Не куплено», цена совпадает с Apple sheet/storefront.
- [ ] После покупки в аккаунте A выйти и зарегистрировать B: «Не куплено», hard/soft закрыты, electronic бесплатен. Restore не переносит покупку A в B. Войти снова в A — доступ восстановлен.
- [ ] Сменить аккаунт во время ожидания подтверждения Apple: поздняя транзакция A не открывает доступ B.
- [ ] Electronic экспортируется до покупки; hard и soft показывают paywall.
- [ ] Нажать «Купить доступ», подтвердить один раз. Нужный формат выбирается сразу; hard/soft создают PDF. Профиль показывает «Куплено».
- [ ] Вернуться в экспорт и перезапустить приложение: повторная оплата не требуется.
- [ ] **Удалить и переустановить приложение**, оставить тот же Sandbox Apple ID, нажать **«Восстановить покупки»**: «Готово», оба формата доступны. StoreKit может восстановить статус автоматически ещё до нажатия — это допустимо.
- [ ] На другом устройстве с тем же Apple ID восстановить доступ.
- [ ] На Apple ID без покупки restore даёт «Покупки не найдены».
- [ ] Отменить Apple sheet: Alert об ошибке отсутствует, кнопки снова активны.
- [ ] Проверить offline, запрет покупок, отказ оплаты, отложенное подтверждение, таймаут: нет вечного спиннера, есть понятное сообщение/повтор.
- [ ] Быстро нажать buy/restore дважды, свернуть/развернуть во время sheet: одна операция, без потери результата.
- [ ] Refund/revoke и возврат в foreground снимают доступ после успешной сверки StoreKit; electronic остаётся доступен.
- [ ] Нет текстов об ежемесячной подписке; нет подписочных API или стороннего биллинга.

Устройство/iOS: ______. Build: ______. Storefront: ______. Дата и результат: ______.

## Исправление наследования покупки — 05.10.2026

Причина: провайдер жил над всей навигацией, использовал общий boolean кэш `v1` и открывал печать по любой активной транзакции SKU на Apple ID. Регистрация другого аккаунта 018BY не меняла его состояние. Теперь кэш и транзакции проверяются для UUID сессии, который передаётся Apple как `appAccountToken`. Связь токена и транзакции описана [Apple](https://developer.apple.com/documentation/storekit/product/purchaseoption/appaccounttoken(_:)) и [OpenIAP](https://www.openiap.dev/docs/apis/request-purchase).

Ограничение Non-Consumable: один Apple ID не может купить тот же SKU повторно для другого аккаунта приложения. Покупка остаётся у исходного аккаунта 018BY; другому предлагается вернуться в исходный аккаунт. Если нужен отдельный платёж за каждый аккаунт на одном Apple ID, понадобится другой контракт продукта и сервер учёта платежей.

Покупки прежних версий без `appAccountToken` автоматически не назначаются текущему пользователю: это снова создало бы исходный баг. Они показывают сообщение о необходимости привязки через поддержку. Для действительных оплаченных покупок миграция требует сверки владельца и [Set App Account Token](https://developer.apple.com/documentation/appstoreserverapi/set-app-account-token) на доверенном сервере с ключом App Store Server API. Такого сервера/ключа в проекте нет; миграция старых покупок не выполнена. Для локальных тестов можно использовать чистого Sandbox тестера или вручную удалить только тестовые транзакции в Xcode StoreKit Transaction Manager.

Проверки `npm run test:iap` дополнены сменой аккаунтов, выходом, поздней транзакцией, изоляцией кэша offline, игнорированием старого общего кэша, сравнением UUID, дублирующими callback и восстановлением только в исходном аккаунте. `npm run test:auth` проходит. ESLint обновлённых файлов без ошибок; общая проверка TypeScript всё ещё имеет ошибки вне изменённых файлов.

Результат 05.10.2026: **40 проверок IAP прошли**. Подписанная Debug сборка arm64 для подключённого iPhone 14 Pro завершилась успешно и установлена на него без удаления данных приложения (`/tmp/018by-iap-iphone-build.log`, `/tmp/018by-iap-iphone-install.log`). Сборка запускается через Metro как development client. Hermes-бандл проверен через `expo export:embed --platform ios --dev false --bytecode`, результат `/tmp/018by-iap-account.hbc`. Полный export с копированием всех ресурсов прервался из-за нехватки диска; компилятор JavaScript и отдельная генерация bytecode завершились успешно. Реальная покупка, каталог ASC и восстановление через Apple sheet ещё не подтверждены: пользователь выбрал самостоятельную проверку на iPhone.
