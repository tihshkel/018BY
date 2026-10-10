/* eslint-disable no-console */
// Exercise the real provider with React, mocked expo-iap/AsyncStorage/AppState and a virtual clock.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
// React 19 deprecates this renderer but it still exercises hooks without a device.
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].startsWith('react-test-renderer is deprecated.')) return;
  originalConsoleError(...args);
};
global.IS_REACT_ACT_ENVIRONMENT = true;
const root = path.resolve(__dirname, '..');
const SKU = 'com.tihshkel.x018BY.export_print_unlock';
const ACCOUNT_A = '550e8400-e29b-41d4-a716-446655440000';
const ACCOUNT_B = 'a50e8400-e29b-41d4-a716-446655440001';
const cacheKey = (account) => `iap:${SKU}:v2:${account.toLowerCase()}`;
const item = { id: SKU, type: 'in-app', displayPrice: '4,99 $' };
const owned = { id: 'transaction-1', productId: SKU, purchaseState: 'purchased', platform: 'ios', appAccountToken: ACCOUNT_A };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let n = 0; n < 40; n++) await Promise.resolve(); };

async function setup(options = {}) {
  const calls = { fetch: [], request: [], finish: [], available: [], restore: 0, sync: 0, reconnect: 0, alerts: [], writes: [] };
  let now = 0, nextTimer = 0, callbacks, current, appListener, renderer, authListener;
  const timers = new Map();
  const auth = { account: options.account === undefined ? ACCOUNT_A : options.account };
  const values = new Map([[cacheKey(ACCOUNT_A), options.cache ?? null], [`iap:${SKU}:v1`, options.legacyCache ?? null]]);
  const storage = { values, get value() { return values.get(cacheKey(auth.account ?? ACCOUNT_A)); } };
  const native = {
    catalogue: [item], purchases: [], connected: options.connected ?? true,
    ...options.native,
  };
  const api = {
    connected: native.connected,
    requestPurchase: async (params) => { calls.request.push(params); return native.request?.(params); },
    finishTransaction: async (params) => { calls.finish.push(params); return native.finish?.(params); },
    restorePurchases: async () => { calls.restore++; return native.restore?.(); },
    reconnect: async () => { calls.reconnect++; return native.reconnect ? native.reconnect() : api.connected; },
  };
  const constants = { executionEnvironment: options.expoGo ? 'storeClient' : 'bare' };
  const reactNative = {
    Platform: { OS: options.platform ?? 'ios' },
    StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
    View: 'View',
    Alert: { alert: (...args) => calls.alerts.push(args) },
    AppState: { currentState: 'active', addEventListener: (_, fn) => { appListener = fn; return { remove: () => { appListener = null; } }; } },
  };
  const iap = {
    useIAP: (listeners) => { callbacks = listeners; return api; },
    fetchProducts: async (params) => { calls.fetch.push(params); return native.fetch ? native.fetch() : native.catalogue; },
    getAvailablePurchases: async (params) => { calls.available.push(params); return native.available ? native.available() : native.purchases; },
    syncIOS: async () => { calls.sync++; return native.sync ? native.sync() : true; },
    ErrorCode: Object.fromEntries(['UserCancelled', 'NetworkError', 'ItemUnavailable', 'SkuNotFound', 'Pending', 'DeferredPayment', 'AlreadyOwned', 'DuplicatePurchase'].map((key) => [key, key.replace(/[A-Z]/g, (s, i) => (i ? '-' : '') + s.toLowerCase())])),
  };
  const mocks = {
    '@expo/vector-icons': { Ionicons: () => null },
    'expo-linking': { openURL: async (url) => calls.alerts.push(['open-url', url]) },
    'expo-router': { router: { push: (route) => calls.alerts.push(['navigate', route]) } },
    '@/constants/design-tokens': { colors: {}, spacing: {} },
    '@/components/ui': {
      AppButton: 'AppButton', AppText: 'AppText',
      AppCenterModal: ({ visible, children, footer }) => visible ? React.createElement('Modal', null, children, footer) : null,
    },
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': reactNative,
    'expo-iap': iap,
    '@/lib/supabase': { getSupabase: () => ({ auth: {
      getSession: async () => options.session ? options.session() : { data: { session: auth.account ? { user: { id: auth.account } } : null }, error: null },
      onAuthStateChange: (fn) => { authListener = fn; return { data: { subscription: { unsubscribe: () => { authListener = null; } } } }; },
    } }) },
    'expo-constants': { __esModule: true, default: constants, ExecutionEnvironment: { StoreClient: 'storeClient' } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: {
      getItem: async (key) => options.readCache ? options.readCache(key) : values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); calls.writes.push([key, value]); },
    } },
  };
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: file,
    }).outputText;
    const localRequire = (id) => {
      if (mocks[id]) return mocks[id];
      const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(file), id);
      const resolved = ['.ts', '.tsx'].map((ext) => base + ext).find(fs.existsSync);
      if (!resolved) throw new Error(`Unexpected import: ${id}`);
      return load(resolved);
    };
    const execute = vm.runInNewContext(`(function(require, module, exports) { ${output}\n})`, {
      console, setTimeout: (fn, ms) => { const id = ++nextTimer; timers.set(id, { fn, at: now + ms }); return id; },
      clearTimeout: (id) => timers.delete(id),
    }, { filename: file });
    execute(localRequire, module, module.exports);
    return module.exports;
  }
  const context = load(path.join(root, 'contexts/export-subscription-context.tsx'));
  const Paywall = options.paywall ? load(path.join(root, 'components/subscription-paywall-modal.tsx')).SubscriptionPaywallModal : null;
  const modalEvents = [];
  function Consumer() {
    current = context.useExportSubscription();
    const [visible, setVisible] = React.useState(true);
    return Paywall ? React.createElement(Paywall, {
      visible,
      onSubscribed: () => modalEvents.push('select-pending-format'),
      onClose: () => { modalEvents.push('close'); setVisible(false); },
    }) : null;
  }
  const tree = () => React.createElement(context.ExportSubscriptionProvider, null, React.createElement(Consumer));
  await act(async () => { renderer = create(tree()); await flush(); });
  return {
    calls, native, storage, api, context, modalEvents, get value() { return current; },
    get root() { return renderer.root; },
    async run(fn) { let result; await act(async () => { result = await fn(); await flush(); }); return result; },
    async startPurchase() { let promise; await act(async () => { promise = current.purchase(); await flush(); }); return { promise }; },
    async success(purchase = owned) { await act(async () => { await callbacks.onPurchaseSuccess(purchase); await flush(); }); },
    async startSuccess(purchase = owned) { let promise; await act(async () => { promise = callbacks.onPurchaseSuccess(purchase); await flush(); }); return { promise }; },
    async error(code) { await act(async () => { callbacks.onPurchaseError({ code }); await flush(); }); },
    async tick(ms) {
      await act(async () => {
        now += ms;
        for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
        await flush();
      });
    },
    async foreground() { await act(async () => { appListener('background'); appListener('active'); await flush(); }); },
    async rerender() { await act(async () => { renderer.update(tree()); await flush(); }); },
    async switchAccount(id) { await act(async () => { auth.account = id; authListener(id ? 'SIGNED_IN' : 'SIGNED_OUT', id ? { user: { id } } : null); await flush(); }); },
    async authEvent(event, id) { await act(async () => { authListener(event, id ? { user: { id } } : null); await flush(); }); },
    async close() { await act(async () => { renderer.unmount(); await flush(); }); assert.equal(timers.size, 0, 'provider timers cleaned up'); },
  };
}

const cases = [];
const test = (name, fn) => cases.push([name, fn]);
const same = (a, b) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b);

test('catalogue uses in-app SKU and localized displayPrice', async (h) => {
  same(h.calls.fetch[0], { skus: [SKU], type: 'in-app' });
  assert.equal(h.value.priceLabel, '4,99 $');
  assert.equal(h.value.isLoading, false);
  assert.equal(h.value.isUnlocked, false);
});
test('successful non-consumable is unlocked, cached and finished once', async (h) => {
  const p = await h.startPurchase();
  same(h.calls.request[0], { type: 'in-app', request: { apple: { sku: SKU, appAccountToken: ACCOUNT_A } } });
  await h.success();
  assert.equal(await p.promise, true);
  assert.equal(h.value.isUnlocked, true);
  assert.equal(h.value.isSubscribed, true);
  assert.equal(h.storage.value, '1');
  assert.equal(h.calls.finish[0].isConsumable, false);
  assert.equal(await h.run(() => h.value.purchase()), true);
  assert.equal(h.calls.request.length, 1);
});
test('double buy and simultaneous restore cannot start a second operation', async (h) => {
  const p = await h.startPurchase();
  assert.equal(await h.run(() => h.value.purchase()), false);
  assert.equal(await h.run(() => h.value.restore()), false);
  await h.foreground();
  assert.equal(h.calls.request.length, 1);
  assert.equal(h.calls.restore, 0);
  assert.equal(h.calls.available.length, 2);
  await h.success();
  assert.equal(await p.promise, true);
});
test('Apple sheet cancellation is silent', async (h) => {
  const p = await h.startPurchase();
  await h.error('user-cancelled');
  assert.equal(await p.promise, false);
  assert.equal(h.calls.alerts.length, 0);
  assert.equal(h.value.isLoading, false);
});
test('request rejection reports offline error', async (h) => {
  h.native.request = async () => { throw { code: 'network-error' }; };
  const p = await h.startPurchase();
  assert.equal(await p.promise, false);
  assert.match(h.calls.alerts[0][1], /интернет/);
});
test('callback errors report an alert, deferred payment stays locked', async (h) => {
  const p = await h.startPurchase();
  await h.error('deferred-payment');
  assert.equal(await p.promise, false);
  assert.equal(h.value.isUnlocked, false);
  assert.match(h.calls.alerts[0][1], /ожидает подтверждения/);
});
test('unrelated transaction cannot unlock, revoke, finish, or resolve our purchase', async (h) => {
  const p = await h.startPurchase();
  await h.success({ ...owned, productId: 'other' });
  assert.equal(h.value.isLoading, true);
  assert.equal(h.calls.finish.length, 0);
  await h.success();
  await h.success({ ...owned, productId: 'other' });
  assert.equal(await p.promise, true);
  assert.equal(h.value.isUnlocked, true);
});
test('missing callback times out; a late success still grants access', async (h) => {
  h.native.request = () => new Promise(() => {});
  const p = await h.startPurchase();
  await h.tick(90_000);
  assert.equal(await p.promise, false);
  assert.equal(h.value.isLoading, false);
  assert.match(h.calls.alerts[0][0], /Ожидание/);
  await h.success();
  assert.equal(h.value.isUnlocked, true);
});
test('already-owned callback reconciles entitlements', async (h) => {
  const p = await h.startPurchase();
  h.native.purchases = [owned];
  await h.error('already-owned');
  assert.equal(await p.promise, true);
  assert.equal(h.value.isUnlocked, true);
  assert.equal(h.calls.alerts.length, 0);
});
test('restore reports done and requests active entitlements', async (h) => {
  h.native.purchases = [owned];
  assert.equal(await h.run(() => h.value.restore()), true);
  assert.equal(h.calls.sync, 1);
  assert.equal(h.calls.restore, 1);
  assert.equal(h.calls.alerts[0][0], 'Готово');
  assert.equal(h.storage.value, '1');
  same(h.calls.available.at(-1), { onlyIncludeActiveItemsIOS: true, alsoPublishToEventListenerIOS: false });
});
test('empty restore is different from a network failure', async (h) => {
  assert.equal(await h.run(() => h.value.restore()), false);
  assert.equal(h.calls.alerts[0][0], 'Покупки не найдены');
  h.native.sync = async () => { throw { code: 'network-error' }; };
  assert.equal(await h.run(() => h.value.restore()), false);
  assert.equal(h.calls.alerts[1][0], 'Не удалось восстановить покупки');
  assert.equal(h.calls.restore, 1);
});
test('cancelled restore authentication is silent', async (h) => {
  h.native.sync = async () => { throw { code: 'user-cancelled' }; };
  await h.run(() => h.value.restore());
  assert.equal(h.calls.alerts.length, 0);
});
test('restore remains available with a missing catalogue', async (h) => {
  h.native.catalogue = [];
  await h.run(() => h.value.refresh());
  assert.equal(h.value.priceLabel, null);
  assert.match(h.value.storeError, /Продукт недоступен/);
  assert.equal(await h.run(() => h.value.purchase()), false);
  assert.equal(h.calls.request.length, 0);
  h.native.purchases = [owned];
  assert.equal(await h.run(() => h.value.restore()), true);
});
test('foreground revocation clears cache; transient failures preserve ownership', async (h) => {
  await h.success();
  h.native.available = async () => { throw new Error('offline'); };
  await h.foreground();
  assert.equal(h.value.isUnlocked, true);
  h.native.available = undefined;
  h.native.purchases = [{ ...owned, revocationDateIOS: 123 }];
  await h.foreground();
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.storage.value, '0');
});
test('stale in-flight entitlement query cannot erase a new transaction', async (h) => {
  const query = deferred();
  h.native.available = () => query.promise;
  let refresh;
  await h.run(() => { refresh = h.value.refresh(); });
  await h.success();
  await h.run(() => query.resolve([]));
  await refresh;
  assert.equal(h.value.isUnlocked, true);
  assert.equal(h.storage.value, '1');
});
test('finish failure keeps entitlement and exposes a retry notice', async (h) => {
  h.native.finish = async () => { throw new Error('finish failed'); };
  const p = await h.startPurchase();
  await h.success();
  assert.equal(await p.promise, true);
  assert.equal(h.value.isUnlocked, true);
  assert.match(h.value.storeError, /Доступ открыт/);
});
test('hanging restore releases loading and does not report no purchases', async (h) => {
  h.native.restore = () => new Promise(() => {});
  let restore;
  await h.run(() => { restore = h.value.restore(); });
  await h.tick(15_000);
  assert.equal(await restore, false);
  assert.equal(h.value.isLoading, false);
  assert.equal(h.calls.alerts.at(-1)[0], 'Не удалось восстановить покупки');
});
test('pending and revoked success events never grant entitlement', async (h) => {
  const p = await h.startPurchase();
  await h.success({ ...owned, purchaseState: 'pending' });
  assert.equal(await p.promise, false);
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.calls.finish.length, 0);
  await h.success();
  await h.success({ ...owned, revocationDateIOS: 123 });
  assert.equal(h.value.isUnlocked, false);
});
test('restore accepts the SKU in id when productId is absent', async (h) => {
  h.native.purchases = [{ ...owned, productId: undefined, id: SKU }];
  assert.equal(await h.run(() => h.value.restore()), true);
});
test('updated catalogue replaces the displayed price', async (h) => {
  h.native.catalogue = [{ ...item, displayPrice: '5,99 €' }];
  await h.run(() => h.value.refresh());
  assert.equal(h.value.priceLabel, '5,99 €');
});
test('unmount resolves the waiting buyer and removes the timer', async (h) => {
  const p = await h.startPurchase();
  await h.close();
  h.closed = true;
  assert.equal(await p.promise, false);
});

test('new account never inherits the previous account cache or Apple entitlement', async (h) => {
  await h.success();
  h.native.purchases = [owned];
  await h.switchAccount(ACCOUNT_B);
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.storage.values.get(cacheKey(ACCOUNT_A)), '1');
  assert.equal(h.storage.values.get(cacheKey(ACCOUNT_B)), '0');
  assert.match(h.value.storeError, /другим аккаунтом/);
  assert.equal(h.value.purchaseBlocked, true);
  assert.equal(await h.run(() => h.value.restore()), false);
  assert.equal(h.calls.alerts.at(-1)[0], 'Доступ не открыт');
  assert.equal(await h.run(() => h.value.purchase()), false);
  assert.equal(h.calls.request.length, 0, 'an existing non-consumable cannot charge a second app account');
  await h.switchAccount(ACCOUNT_A);
  assert.equal(h.value.isUnlocked, true);
  assert.equal(h.value.purchaseBlocked, false);
});
test('sign out clears access immediately and requires authentication to purchase', async (h) => {
  await h.success();
  await h.switchAccount(null);
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.value.isLoading, false);
  assert.equal(await h.run(() => h.value.purchase()), false);
  assert.equal(await h.run(() => h.value.restore()), false);
  assert.equal(h.calls.request.length, 0);
  assert.match(h.calls.alerts.at(-1)[0], /Нужен вход/);
});
test('account switch cancels the old pending request; its late result cannot unlock the new account', async (h) => {
  const pending = await h.startPurchase();
  await h.switchAccount(ACCOUNT_B);
  assert.equal(await pending.promise, false);
  await h.success(owned);
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.calls.finish.length, 0);
  assert.notEqual(h.storage.values.get(cacheKey(ACCOUNT_B)), '1');
  await h.success({ ...owned, appAccountToken: ACCOUNT_B, transactionId: 'transaction-2' });
  assert.equal(h.value.isUnlocked, true);
});
test('account token is case insensitive, foreign revocation cannot revoke current access', async (h) => {
  await h.success({ ...owned, appAccountToken: ACCOUNT_A.toUpperCase() });
  await h.success({ ...owned, appAccountToken: ACCOUNT_B, revocationDateIOS: 123 });
  assert.equal(h.value.isUnlocked, true);
  assert.equal(h.calls.finish.length, 1);
});
test('duplicate callbacks finish a verified transaction once; failed finish can retry', async (h) => {
  const finish = deferred();
  h.native.finish = () => finish.promise;
  const first = await h.startSuccess();
  await h.success();
  assert.equal(h.calls.finish.length, 1);
  await h.run(() => finish.resolve());
  await first.promise;
  await h.success();
  assert.equal(h.calls.finish.length, 1);
  const second = { ...owned, id: 'transaction-2' };
  h.native.finish = async () => { throw new Error('offline'); };
  await h.success(second);
  h.native.finish = undefined;
  await h.success(second);
  assert.equal(h.calls.finish.length, 3);
});
test('unbound old transaction never automatically grants access or gets finished', async (h) => {
  const legacy = { ...owned, appAccountToken: null };
  h.native.purchases = [legacy];
  await h.run(() => h.value.refresh());
  assert.equal(h.value.isUnlocked, false);
  assert.match(h.value.storeError, /прежней версии/);
  assert.equal(await h.run(() => h.value.restore()), false);
  assert.match(h.calls.alerts.at(-1)[1], /повторно оплачивать/i);
  assert.equal(await h.run(() => h.value.purchase()), false);
  await h.success(legacy);
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.calls.request.length, 0);
  assert.equal(h.calls.finish.length, 0);
});

(async () => {
  for (const [name, fn] of cases) {
    const h = await setup();
    try { await fn(h); console.log(`ok - ${name}`); }
    finally { if (!h.closed) await h.close(); }
  }
  let h = await setup({ connected: false, cache: '1' });
  assert.equal(h.value.isUnlocked, true);
  await h.tick(15_000);
  assert.equal(h.value.isLoading, false);
  assert.match(h.value.storeError, /подключиться/);
  h.api.connected = true;
  h.native.purchases = [owned];
  await h.rerender();
  assert.equal(h.value.priceLabel, item.displayPrice);
  await h.close();
  console.log('ok - cold cache, disconnected timeout and reconnection');

  h = await setup({ cache: '1', native: { purchases: [] } });
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.storage.value, '0');
  await h.close();
  console.log('ok - authoritative empty StoreKit result supersedes cache');

  h = await setup({ connected: false, legacyCache: '1' });
  assert.equal(h.value.isUnlocked, false, 'unscoped v1 cache must not become a new account purchase');
  await h.tick(15_000);
  await h.close();
  console.log('ok - legacy device cache never unlocks a new account offline');

  h = await setup({ cache: '1', connected: false });
  await h.switchAccount(ACCOUNT_B);
  assert.equal(h.value.isUnlocked, false, 'offline switch must not read account A cache');
  await h.tick(15_000);
  await h.switchAccount(ACCOUNT_A);
  assert.equal(h.value.isUnlocked, true, 'original account retains its own confirmed offline access');
  await h.close();
  console.log('ok - account caches remain isolated offline');

  const oldSession = deferred();
  h = await setup({ session: () => oldSession.promise });
  assert.equal(h.value.isLoading, true);
  await h.switchAccount(ACCOUNT_B);
  await h.run(() => oldSession.resolve({ data: { session: { user: { id: ACCOUNT_A } } }, error: null }));
  await h.authEvent('INITIAL_SESSION', ACCOUNT_A);
  const newPurchase = await h.startPurchase();
  assert.equal(h.calls.request[0].request.apple.appAccountToken, ACCOUNT_B);
  await h.success({ ...owned, appAccountToken: ACCOUNT_B });
  assert.equal(await newPurchase.promise, true);
  await h.close();
  console.log('ok - stale initial session cannot replace the new authenticated account');

  h = await setup({ account: null });
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.calls.fetch.length, 0);
  assert.equal(await h.run(() => h.value.purchase()), false);
  assert.equal(h.calls.request.length, 0);
  await h.close();
  console.log('ok - signed-out launch never starts StoreKit purchase or restores another account');

  h = await setup({ session: async () => { throw new Error('session unavailable'); } });
  assert.equal(h.value.isUnlocked, false);
  assert.equal(h.value.isLoading, false);
  assert.equal(h.calls.available.length, 0);
  assert.equal(await h.run(() => h.value.purchase()), false);
  await h.close();
  console.log('ok - failed session read cannot grant access from StoreKit or cache');

  h = await setup({ native: { fetch: () => new Promise(() => {}) } });
  await h.tick(15_000);
  assert.equal(h.value.isLoading, false);
  assert.match(h.value.storeError, /Продукт недоступен/);
  await h.close();
  console.log('ok - hanging catalogue is bounded');

  for (const platform of ['android', 'web']) {
    h = await setup({ platform });
    assert.equal(h.value.isIapEnabled, false);
    assert.equal(h.value.isUnlocked, true);
    assert.equal(h.calls.fetch.length, 0);
    await h.close();
  }
  console.log('ok - Android and web remain free');
  h = await setup({ expoGo: true });
  assert.equal(h.value.isUnlocked, false);
  assert.match(h.value.storeError, /Expo Go/);
  assert.equal(h.calls.fetch.length, 0);
  await h.close();
  console.log('ok - Expo Go explains the required native build');
  h = await setup({ paywall: true });
  const purchase = await h.startPurchase();
  await h.success();
  assert.equal(await purchase.promise, true);
  assert.deepEqual(h.modalEvents, ['select-pending-format', 'close']);
  await h.success();
  assert.equal(h.modalEvents.length, 2, 'no duplicate format selection');
  await h.close();
  console.log('ok - paywall selects pending format once before closing on unlock');
  h = await setup({ paywall: true });
  h.native.purchases = [owned];
  await h.run(() => h.value.restore());
  assert.deepEqual(h.modalEvents, ['select-pending-format', 'close']);
  await h.close();
  console.log('ok - restore closes paywall and resumes format selection');
  h = await setup({ paywall: true });
  assert.match(h.root.findByProps({ testID: 'print-unlock-purchase' }).props.title, /4,99 \$/);
  const buy = h.root.findByProps({ testID: 'print-unlock-purchase' }).props.onPress;
  await h.run(() => { buy(); buy(); });
  assert.equal(h.calls.request.length, 1, 'the modal submits a purchase only once');
  assert.equal(h.root.findByProps({ testID: 'print-unlock-restore' }).props.disabled, true);
  await h.run(() => h.root.findByProps({ testID: 'print-unlock-later' }).props.onPress());
  assert.equal(h.modalEvents.length, 0, 'the modal cannot close while the purchase is pending');
  await h.success();
  assert.deepEqual(h.modalEvents, ['select-pending-format', 'close']);
  await h.close();
  console.log('ok - Pro modal localized CTA, rapid presses and purchase completion');
  h = await setup({ paywall: true, native: { purchases: [{ ...owned, appAccountToken: undefined }] } });
  assert.equal(h.value.purchaseBlockReason, 'legacy-purchase');
  assert.equal(h.root.findAllByProps({ testID: 'print-unlock-purchase' }).length, 0);
  assert.equal(h.root.findAllByProps({ testID: 'print-unlock-retry' }).length, 0);
  await h.run(() => h.root.findByProps({ testID: 'print-unlock-support' }).props.onPress());
  await flush();
  assert.deepEqual(h.calls.alerts.at(-1), ['open-url', 'https://rastr.by/']);
  assert.equal(h.calls.request.length, 0, 'legacy users get support instead of another payment');
  await h.close();
  console.log('ok - legacy purchase shows support, opens rastr.by and never requests another payment');
  h = await setup({ paywall: true, native: { purchases: [{ ...owned, appAccountToken: ACCOUNT_B }] } });
  assert.equal(h.value.purchaseBlockReason, 'other-account');
  assert.equal(h.root.findAllByProps({ testID: 'print-unlock-purchase' }).length, 0);
  await h.run(() => h.root.findByProps({ testID: 'print-unlock-login' }).props.onPress());
  assert.deepEqual(h.calls.alerts.at(-1), ['navigate', '/login']);
  assert.deepEqual(h.modalEvents, ['close']);
  await h.close();
  console.log('ok - purchase in another account directs to login');
  h = await setup({ paywall: true, account: null });
  assert.equal(h.value.purchaseBlockReason, 'sign-in-required');
  await h.run(() => h.root.findByProps({ testID: 'print-unlock-login' }).props.onPress());
  assert.deepEqual(h.calls.alerts.at(-1), ['navigate', '/login']);
  assert.equal(h.calls.request.length, 0);
  await h.close();
  console.log('ok - signed-out Pro modal directs to login');
  h = await setup({ paywall: true, native: { catalogue: [] } });
  assert.equal(h.root.findAllByProps({ testID: 'print-unlock-purchase' }).length, 0);
  h.native.catalogue = [item];
  await h.run(() => h.root.findByProps({ testID: 'print-unlock-retry' }).props.onPress());
  assert.equal(h.root.findAllByProps({ testID: 'print-unlock-purchase' }).length, 1);
  await h.close();
  console.log('ok - missing catalogue retries and returns to purchase when the price loads');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'ios/ExportPrintUnlock.storekit'), 'utf8'));
  assert.equal(config.products.length, 1);
  assert.equal(config.products[0].productID, SKU);
  assert.equal(config.products[0].type, 'NonConsumable');
  assert.equal(config.subscriptionGroups.length, 0);
  const constantsSource = fs.readFileSync(path.join(root, 'constants/subscription.ts'), 'utf8');
  const constantsModule = { exports: {} };
  const compiled = ts.transpileModule(constantsSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, { exports: constantsModule.exports });
  assert.equal(constantsModule.exports.EXPORT_PRINT_UNLOCK_SKU, SKU);
  for (const format of ['hard', 'soft', 'electronic']) {
    assert.equal(constantsModule.exports.requiresPrintUnlock(format), format !== 'electronic');
  }
  console.log('ok - StoreKit SKU/type and free electronic export contract');
  console.log('All IAP provider checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
