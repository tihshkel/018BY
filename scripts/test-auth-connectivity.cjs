/* eslint-disable no-console */
// Run the production auth and network code with provider responses and lifecycle events mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
const root = path.resolve(__dirname, '..');
global.IS_REACT_ACT_ENVIRONMENT = true;
const originalError = console.error;
console.error = (...args) => {
  if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
  originalError(...args);
};
const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const context = {
    exports,
    module: { exports },
    URLSearchParams,
    AbortController,
    __DEV__: false,
    console,
    process: { env: {} },
    setTimeout: () => 1,
    clearTimeout: () => {},
    require: (id) => {
      if (id in mocks) return mocks[id];
      if (id === 'react' || id === 'react/jsx-runtime') return require(id);
      throw new Error(`Unmocked ${id} in ${file}`);
    },
    ...globals,
  };
  vm.runInNewContext(code, context, { filename: file });
  return context.module.exports;
}
function authSetup({ platform = 'ios', native = {}, browser = {}, api = {}, account = {} } = {}) {
  const calls = { browser: 0, native: 0, exchange: [], sessions: [], redirects: [] };
  const client = {
    auth: {
      signInWithOAuth: async () => ({ data: { url: 'https://provider.example/authorize' } }),
      exchangeCodeForSession: async (code) => {
        calls.exchange.push(code);
        return { error: null };
      },
      setSession: async (session) => {
        calls.sessions.push(session);
        return { error: null };
      },
      ...api,
    },
  };
  const mocks = {
    '@react-native-async-storage/async-storage': {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    },
    'expo-constants': { executionEnvironment: 'bare' },
    'expo-linking': { createURL: (p) => `app018by://${p}` },
    'expo-web-browser': {
      maybeCompleteAuthSession: () => {},
      warmUpAsync: async () => {},
      openAuthSessionAsync: async () => {
        calls.browser++;
        return browser.result ?? { type: 'cancel' };
      },
    },
    'react-native': { Platform: { OS: platform } },
    '@/lib/supabase': { getSupabase: () => client },
    '@/utils/account-identity': { setAccountSyncId: async () => {} },
    '@/utils/supabase-account': account,
    '@/utils/widgetSnapshot': {},
    '@/utils/google-native-sign-in': {
      canUseNativeGoogleSignIn: () => native.available !== false,
      signInWithGoogleNative: async () => {
        calls.native++;
        return native.result ?? { success: true };
      },
    },
    '@/utils/apple-native-sign-in': {
      canUseNativeAppleSignIn: async () => native.available !== false,
      signInWithAppleNative: async () => {
        calls.native++;
        return native.result ?? { success: true };
      },
    },
  };
  return {
    calls,
    auth: load('utils/auth-session.ts', mocks, {
      window: { location: { assign: (url) => calls.redirects.push(url) } },
    }),
  };
}
async function authTests() {
  for (const provider of ['google', 'apple']) {
    for (const result of [
      { success: true },
      { success: false, error: 'OAUTH_CANCELLED' },
      { success: false, error: 'network failed' },
    ]) {
      const { auth, calls } = authSetup({ native: { result } });
      assert.equal((await auth.signInWithOAuthProvider(provider)).success, result.success);
      assert.equal(calls.native, 1);
      assert.equal(calls.browser, 0, 'A native attempt must not open a second login UI');
    }
  }
  const fallback = authSetup({ native: { available: false } });
  assert.equal((await fallback.auth.signInWithOAuthProvider('google')).error, 'OAUTH_CANCELLED');
  assert.equal(fallback.calls.browser, 1);
  for (const provider of ['google', 'apple']) {
    const web = authSetup({ platform: 'web' });
    assert.equal((await web.auth.signInWithOAuthProvider(provider)).error, 'OAUTH_REDIRECTING');
    assert.equal(web.calls.redirects.length, 1);
    assert.equal(web.calls.browser, 0);
  }
  const duplicate = authSetup();
  const a = duplicate.auth.completeOAuthFromRedirectUrl(
    'app018by://auth/callback?code=one-time&x=1',
  );
  const b = duplicate.auth.completeOAuthFromRedirectUrl(
    'app018by://auth/callback?x=1&code=one-time',
  );
  assert.equal(a, b);
  assert.equal((await a).success, true);
  assert.equal(duplicate.calls.exchange.length, 1);
  const denied = authSetup();
  const failure = await denied.auth.completeOAuthFromRedirectUrl(
    'app018by://auth/callback?error=access_denied',
  );
  assert.equal(failure.success, false);
  assert.equal(denied.calls.exchange.length, 0);
  assert.equal(denied.calls.sessions.length, 0);
  const oldLink = authSetup();
  assert.equal(
    (
      await oldLink.auth.completeOAuthFromRedirectUrl(
        'app018by://auth/callback#access_token=access&refresh_token=refresh',
      )
    ).success,
    true,
  );
  assert.equal(oldLink.calls.sessions.length, 1);
  const failedExchange = authSetup({
    api: {
      exchangeCodeForSession: async () => {
        throw new Error('fetch failed');
      },
    },
  });
  assert.equal(
    (
      await failedExchange.auth.completeOAuthFromRedirectUrl(
        'app018by://auth/callback?code=expired',
      )
    ).error,
    'OAUTH_NETWORK_ERROR',
  );
  assert.match(
    failedExchange.auth.mapOAuthErrorMessage('invalid login credentials'),
    /Неверный email/,
  );
  assert.match(failedExchange.auth.mapOAuthErrorMessage('Failed to fetch'), /интернет/);
  assert.doesNotMatch(
    failedExchange.auth.mapOAuthErrorMessage('DEVELOPER_ERROR'),
    /SHA|Supabase|client ID/,
  );
  console.log(
    'PASS auth: native success/cancel/error, browser fallback, web redirect, duplicate callback, error and legacy callback',
  );
}
async function signupTests() {
  let metadata, profileOptions;
  const { auth } = authSetup({
    api: { signUp: async (params) => {
      metadata = params.options.data;
      return { data: { session: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } } }, error: null };
    } },
    account: { saveAccountToSupabase: async (_id, _name, _avatar, options) => {
      profileOptions = options;
      return { success: true };
    } },
  });
  assert.equal((await auth.signUpWithEmailPassword({ email: 'person@example.com', password: 'valid-password' })).success, true);
  assert.equal('referral_source' in metadata, false, 'Removing the picker must not invent a referral source');
  assert.equal(profileOptions.referralSource, undefined);
  assert.equal((await auth.signUpWithEmailPassword({ email: 'person@example.com', password: 'valid-password', referralSource: 'organic' })).success, true);
  assert.equal(metadata.referral_source, 'organic');
  console.log('PASS signup: optional referral source preserves registration and never invents attribution');
}

async function profileTests() {
  let writes = 0;
  const api = { getSession: async () => ({ data: { session: { user: { id: 'user-id' } } } }) };
  const failed = authSetup({
    api,
    account: {
      getAccountFromSupabase: async () => {
        throw new Error('PROFILE_NETWORK_ERROR');
      },
      saveAccountToSupabase: async () => {
        writes++;
        return { success: true };
      },
    },
  });
  await assert.rejects(failed.auth.restoreLocalAccountKeysFromSupabase(), /PROFILE_NETWORK_ERROR/);
  assert.equal(writes, 0, 'A failed profile read must not overwrite an existing profile');
  const missing = authSetup({
    api,
    account: {
      getAccountFromSupabase: async () => null,
      saveAccountToSupabase: async () => {
        writes++;
        return { success: true };
      },
    },
  });
  assert.equal(
    (await missing.auth.restoreLocalAccountKeysFromSupabase()).error,
    'PROFILE_ROW_MISSING',
  );
  console.log(
    'PASS profile: failed network reads never create a blank profile; missing saved profile prevents navigation',
  );
}

async function nativeAppleTests() {
  let requested, exchanged;
  const base = {
    'expo-constants': { executionEnvironment: 'bare' },
    'react-native': { Platform: { OS: 'ios' } },
    'expo-crypto': {
      randomUUID: () => 'random-nonce',
      digestStringAsync: async (_, value) => `sha256:${value}`,
      CryptoDigestAlgorithm: { SHA256: 'SHA256' },
    },
    'expo-apple-authentication': {
      isAvailableAsync: async () => true,
      AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
      signInAsync: async (options) => {
        requested = options;
        return { identityToken: 'apple-token', fullName: { givenName: 'Анна' } };
      },
    },
    '@/lib/supabase': {
      getSupabase: () => ({
        auth: {
          signInWithIdToken: async (options) => {
            exchanged = options;
            return { error: null };
          },
          updateUser: async () => {
            throw new Error('optional metadata request failed');
          },
        },
      }),
    },
  };
  const apple = load('utils/apple-native-sign-in.ts', base);
  assert.equal((await apple.signInWithAppleNative()).success, true);
  assert.equal(requested.nonce, 'sha256:random-nonce');
  assert.equal(exchanged.nonce, 'random-nonce');
  const cancelled = load('utils/apple-native-sign-in.ts', {
    ...base,
    'expo-apple-authentication': {
      ...base['expo-apple-authentication'],
      signInAsync: async () => {
        throw { code: 'ERR_REQUEST_CANCELED' };
      },
    },
  });
  assert.equal((await cancelled.signInWithAppleNative()).error, 'OAUTH_CANCELLED');
  console.log(
    'PASS Apple: hashed request nonce, original nonce for server, cancellation, optional metadata failure',
  );
}
async function nativeGoogleTests() {
  let options,
    token,
    tokenFetches = 0;
  const setup = (overrides = {}) =>
    load('utils/google-native-sign-in.ts', {
      'expo-constants': { executionEnvironment: 'bare' },
      'react-native': { Platform: { OS: overrides.platform ?? 'ios' } },
      '@/utils/google-auth-config': {
        isGoogleNativeSignInConfigured: () => true,
        readGoogleAuthConfig: () => ({
          webClientId: 'web-client',
          iosClientId: overrides.iosClientId ?? 'ios-client',
        }),
      },
      '@/lib/supabase': {
        getSupabase: () => ({
          auth: {
            signInWithIdToken: async (value) => {
              token = value;
              return { error: null };
            },
          },
        }),
      },
      '@react-native-google-signin/google-signin': {
        GoogleSignin: {
          configure: (value) => {
            options = value;
          },
          signIn: async () => overrides.result ?? { type: 'success', data: { idToken: null } },
          getTokens: async () => {
            tokenFetches++;
            return { idToken: 'google-token' };
          },
          hasPlayServices: async () => true,
        },
        isErrorWithCode: () => false,
        statusCodes: {},
      },
    });
  assert.equal((await setup().signInWithGoogleNative()).success, true);
  assert.equal(options.webClientId, 'web-client');
  assert.equal(options.iosClientId, 'ios-client');
  assert.equal(token.token, 'google-token');
  assert.equal(token.provider, 'google');
  assert.equal(tokenFetches, 1);
  const cancelled = setup({ result: { type: 'cancelled' } });
  assert.equal((await cancelled.signInWithGoogleNative()).error, 'OAUTH_CANCELLED');
  assert.equal(tokenFetches, 1, 'Cancellation must not request another token');
  assert.equal(setup({ iosClientId: '' }).canUseNativeGoogleSignIn(), false);
  assert.equal(setup({ platform: 'web' }).canUseNativeGoogleSignIn(), false);
  console.log(
    'PASS Google: client IDs, token retrieval, server exchange, cancellation and unavailable configuration',
  );
}

async function accessScreenTests() {
  let renderer;
  const state = {
    isUnlocked: false,
    isLoading: false,
    isIapEnabled: true,
    priceLabel: '4,99 $',
    storeError: null,
    purchase: async () => false,
    restore: async () => false,
    refresh: async () => {},
  };
  const mocks = {
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-image': { Image: 'Image' },
    '@/assets/images/illustrations/print-memories-unicorn.png': 1,
    'expo-haptics': {},
    'expo-linking': {},
    'expo-router': { router: {}, useFocusEffect: (fn) => React.useEffect(fn, [fn]) },
    'react-native': {
      ActivityIndicator: 'Spinner',
      Alert: {},
      Platform: { OS: 'ios' },
      Pressable: 'Pressable',
      View: 'View',
      StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
    },
    '@/components/ui': { AppButton: 'Button', AppScreen: 'Screen', AppText: 'Text' },
    '@/components/auth/auth-error-banner': { AuthErrorBanner: 'ErrorBanner' },
    '@/components/profile-subscription-status-badge': { ProfileSubscriptionStatusBadge: 'Badge' },
    '@/constants/design-tokens': { colors: {} },
    '@/constants/subscription': { APPLE_PURCHASE_HISTORY_URL: 'https://support.apple.com' },
    '@/contexts/export-subscription-context': { useExportSubscription: () => state },
  };
  const Screen = load('app/export-subscription.tsx', mocks).default;
  await act(async () => {
    renderer = create(React.createElement(Screen));
  });
  assert.equal(renderer.root.findAllByProps({ testID: 'print-unlock-purchase' }).length, 1);
  assert.equal(renderer.root.findAllByProps({ testID: 'print-unlock-restore' }).length, 1);
  state.isUnlocked = true;
  await act(async () => {
    renderer.update(React.createElement(Screen));
  });
  assert.equal(renderer.root.findAllByProps({ testID: 'print-unlock-purchase' }).length, 0);
  assert.equal(renderer.root.findAllByProps({ testID: 'print-unlock-restore' }).length, 1);
  assert.equal(renderer.root.findByType('Badge').props.isPremium, true);
  state.isUnlocked = false;
  state.isIapEnabled = false;
  await act(async () => {
    renderer.update(React.createElement(Screen));
  });
  assert.equal(renderer.root.findAllByProps({ testID: 'print-unlock-purchase' }).length, 0);
  assert.equal(renderer.root.findAllByProps({ testID: 'print-unlock-restore' }).length, 0);
  assert.equal(renderer.root.findByType('Badge').props.isPremium, true);
  await act(async () => {
    renderer.unmount();
  });
  console.log(
    'PASS access screen: purchase and restore actions for locked, purchased and free platform states',
  );
}

async function networkTests() {
  let state = {},
    requests = 0,
    rejectFetch = false,
    nativeError = false,
    abort;
  const network = load(
    'utils/network-status.ts',
    {
      'expo-constants': { expoConfig: { extra: { supabaseUrl: 'https://cloud.example' } } },
      'expo-network': {
        getNetworkStateAsync: async () => {
          if (nativeError) throw new Error('missing state');
          return state;
        },
      },
    },
    {
      setTimeout: (fn) => {
        abort = fn;
        return 1;
      },
      fetch: async () => {
        requests++;
        if (rejectFetch) throw new Error('offline');
        return { status: 503 };
      },
    },
  );
  assert.equal(network.isNetworkDisconnected({}), false);
  assert.equal(network.isNetworkDisconnected({ isConnected: false }), true);
  assert.equal(network.isNetworkDisconnected({ isInternetReachable: false }), true);
  assert.equal(
    await network.checkInternetConnection(),
    true,
    'HTTP 503 is not a disconnected device',
  );
  state = { isConnected: false };
  requests = 0;
  assert.equal(await network.checkInternetConnection(), false);
  assert.equal(requests, 0);
  state = {};
  rejectFetch = true;
  assert.equal(await network.checkInternetConnection(), false);
  rejectFetch = false;
  nativeError = true;
  assert.equal(
    await network.checkInternetConnection(),
    true,
    'Reachability can recover from unknown native state',
  );
  assert.equal(typeof abort, 'function');
  console.log(
    'PASS network: disconnected, unknown state, server failure, request failure and native-state fallback',
  );
}
async function offlineGateTests() {
  const queued = [],
    observers = {},
    timers = new Map();
  let renderer;
  const mocks = {
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-image': { Image: 'Image' },
    'expo-network': {
      addNetworkStateListener: (fn) => {
        observers.network = fn;
        return {
          remove() {
            delete observers.network;
          },
        };
      },
    },
    'react-native': {
      AppState: {
        currentState: 'active',
        addEventListener: (_, fn) => {
          observers.app = fn;
          return {
            remove() {
              delete observers.app;
            },
          };
        },
      },
      Modal: 'Modal',
      View: 'View',
      StyleSheet: { create: (s) => s },
    },
    '@/components/ui': { AppButton: 'Button', AppScreen: 'Screen', AppText: 'Text' },
    '@/utils/network-status': {
      isNetworkDisconnected: (s) => s.isConnected === false,
      checkInternetConnection: () => {
        const check = deferred();
        queued.push(check);
        return check.promise;
      },
    },
    '@/assets/images/illustrations/offline-unicorn.png': 1,
  };
  const { OfflineGate } = load('components/offline-gate.tsx', mocks, {
    setInterval: (fn) => {
      timers.set(1, fn);
      return 1;
    },
    clearInterval: (id) => timers.delete(id),
  });
  await act(async () => {
    renderer = create(React.createElement(OfflineGate));
  });
  assert.equal(queued.length, 1);
  // A stale successful request must not hide the gate after disconnecting.
  await act(async () => {
    observers.network({ isConnected: false });
    queued[0].resolve(true);
    await flush();
  });
  assert.equal(renderer.root.findByType('Modal').props.visible, true);
  await act(async () => {
    observers.network({ isConnected: true });
  });
  assert.equal(queued.length, 2);
  await act(async () => {
    queued[1].resolve(true);
    await flush();
  });
  assert.equal(renderer.root.findByType('Modal').props.visible, false);
  await act(async () => {
    observers.network({ isConnected: false });
  });
  await act(async () => {
    const retry = renderer.root.findByType('Button').props.onPress;
    retry();
    retry();
  });
  assert.equal(queued.length, 3, 'Repeated retry presses must share one request');
  await act(async () => {
    queued[2].resolve(false);
    await flush();
  });
  assert.equal(renderer.root.findByType('Modal').props.visible, true);
  await act(async () => {
    renderer.unmount();
  });
  assert.equal(observers.network, undefined);
  assert.equal(observers.app, undefined);
  assert.equal(timers.size, 0);
  console.log(
    'PASS offline gate: stale request, automatic reconnection, retry deduplication and cleanup',
  );
}
async function onboardingTests() {
  const stored = new Map();
  const writes = [];
  const metadata = [];
  let user = { id: 'account-a', user_metadata: {} };
  let saveError = false;
  let metadataError = false;
  let switchDuringWrite = false;
  const client = {
    auth: {
      getSession: async () => ({ data: { session: user ? { user } : null }, error: null }),
      updateUser: async (params) => {
        metadata.push({ id: user.id, ...params.data });
        if (metadataError) throw new Error('offline');
        return { error: null };
      },
    },
    from: (table) => {
      const write = { table };
      const query = {
        update: (values) => { write.values = values; return query; },
        eq: (column, value) => { write.filter = [column, value]; return query; },
        select: () => query,
        abortSignal: () => query,
        maybeSingle: async () => {
          writes.push(write);
          if (switchDuringWrite) user = { id: 'account-b', user_metadata: {} };
          return { data: saveError ? null : { id: write.filter[1] }, error: saveError ? new Error('save failed') : null };
        },
      };
      return query;
    },
  };
  const onboarding = load('utils/auth-onboarding.ts', {
    '@/lib/supabase': { getSupabase: () => client },
    '@react-native-async-storage/async-storage': {
      getItem: async (key) => stored.get(key) ?? null,
      setItem: async (key, value) => stored.set(key, value),
    },
  });
  assert.equal(await onboarding.getPostAuthRoute(), '/referral-survey');
  stored.set('@user_name', 'Анна');
  assert.equal(await onboarding.getPostAuthRoute(), '/(tabs)');
  stored.delete('@user_name');
  user.user_metadata = { referral_source: 'physical_album' };
  assert.equal(await onboarding.getPostAuthRoute(), '/name-input', 'Previously collected sources skip the survey');
  user.user_metadata = {};
  await onboarding.completeReferralSurvey('instagram');
  assert.equal(writes[0].table, 'profiles');
  assert.deepEqual(Array.from(writes[0].filter), ['id', 'account-a']);
  assert.deepEqual(Object.keys(writes[0].values).sort(), ['referral_source', 'updated_at']);
  assert.equal(writes[0].values.referral_source, 'instagram');
  assert.equal(await onboarding.getPostAuthRoute(), '/name-input');
  user = { id: 'account-b', user_metadata: {} };
  assert.equal(await onboarding.getPostAuthRoute(), '/referral-survey', 'Completion must belong to the account');
  metadataError = true;
  await onboarding.completeReferralSurvey();
  assert.equal(writes.length, 1, 'Skip must not create a false source');
  assert.equal(await onboarding.getPostAuthRoute(), '/name-input', 'Skip works even when metadata cannot sync');
  assert.equal(metadata.at(-1).id, 'account-b');
  assert.equal(metadata.at(-1).referral_source, undefined);
  user = { id: 'account-c', user_metadata: {} };
  saveError = true;
  await assert.rejects(onboarding.completeReferralSurvey('physical_album'), /REFERRAL_SAVE_FAILED/);
  assert.equal(await onboarding.getPostAuthRoute(), '/referral-survey');
  await onboarding.completeReferralSurvey();
  assert.equal(await onboarding.getPostAuthRoute(), '/name-input');
  await assert.rejects(onboarding.completeReferralSurvey('invalid'), /INVALID_REFERRAL_SOURCE/);
  saveError = false;
  switchDuringWrite = true;
  user = { id: 'account-d', user_metadata: {} };
  const previousMetadataCount = metadata.length;
  await assert.rejects(onboarding.completeReferralSurvey('organic'), /ACCOUNT_CHANGED/);
  assert.equal(metadata.length, previousMetadataCount, 'Account switch must not mark the new account completed');
  stored.delete('@referral_survey_completed:account-b');
  assert.equal(await onboarding.getPostAuthRoute(), '/referral-survey');
  user = null;
  assert.equal(await onboarding.getPostAuthRoute(), '/login');
  await assert.rejects(onboarding.completeReferralSurvey(), /NO_SESSION/);
  console.log('PASS survey data: routing, existing accounts, scoped completion, source-only update, skip, failure and account switch');
}

async function surveyScreenTests() {
  const saves = [];
  const routes = [];
  let pending;
  let fail = false;
  let route = '/referral-survey';
  const Screen = load('app/referral-survey.tsx', {
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-router': { router: { replace: (target) => routes.push(target) } },
    'react-native': { ActivityIndicator: 'Spinner', Pressable: 'Pressable', View: 'View', StyleSheet: { create: (s) => s } },
    '@/components/auth/auth-error-banner': { AuthErrorBanner: 'ErrorBanner' },
    '@/components/auth/auth-screen-layout': { AuthScreenLayout: 'Layout', authSubmitStyle: {} },
    '@/components/ui': { AppButton: 'Button', AppText: 'Text' },
    '@/constants/design-tokens': { colors: {} },
    '@/assets/images/illustrations/referral-discovery-unicorn.png': 1,
    '@/utils/auth-onboarding': {
      getPostAuthRoute: async () => route,
      completeReferralSurvey: async (source) => {
        saves.push(source);
        if (pending) await pending.promise;
        if (fail) throw new Error('offline');
      },
    },
  }).default;
  let renderer;
  const mount = async () => { await act(async () => { renderer = create(React.createElement(Screen)); await flush(); }); };
  const press = async (id) => { await act(async () => { renderer.root.findByProps({ testID: id }).props.onPress(); await flush(); }); };
  await mount();
  assert.equal(renderer.root.findByProps({ testID: 'referral-continue' }).props.disabled, true);
  await press('referral-instagram');
  pending = deferred();
  await act(async () => {
    const submit = renderer.root.findByProps({ testID: 'referral-continue' }).props.onPress;
    submit(); submit();
  });
  assert.equal(saves.length, 1, 'Rapid presses submit only once');
  assert.equal(saves[0], 'instagram');
  assert.equal(renderer.root.findByProps({ testID: 'referral-skip' }).props.disabled, true);
  await act(async () => { pending.resolve(); await flush(); });
  assert.equal(routes.at(-1), '/name-input');
  await act(async () => renderer.unmount());
  pending = null;
  await mount();
  await press('referral-skip');
  assert.equal(saves.at(-1), undefined);
  assert.equal(routes.at(-1), '/name-input');
  await act(async () => renderer.unmount());
  await mount();
  fail = true;
  await press('referral-physical_album');
  await press('referral-continue');
  assert.equal(renderer.root.findAllByType('ErrorBanner').length, 1);
  assert.equal(renderer.root.findByProps({ testID: 'referral-skip' }).props.disabled, false);
  fail = false;
  await press('referral-skip');
  assert.equal(routes.at(-1), '/name-input');
  await act(async () => renderer.unmount());
  route = '/(tabs)';
  await mount();
  assert.equal(routes.at(-1), '/(tabs)');
  await act(async () => renderer.unmount());
  console.log('PASS survey screen: selection, duplicate presses, direct skip, retry after failure and existing-account redirect');
}

async function authLayoutTests() {
  const listeners = {};
  const Layout = load('components/auth/auth-screen-layout.tsx', {
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'expo-image': { Image: 'Image' },
    'expo-router': { router: {} },
    'react-native': {
      Keyboard: { addListener: (event, callback) => {
        listeners[event] = callback;
        return { remove: () => delete listeners[event] };
      } },
      Platform: { OS: 'ios' }, Pressable: 'Pressable', View: 'View', StyleSheet: { create: (s) => s },
      useWindowDimensions: () => ({ height: 667, fontScale: 1 }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 20, bottom: 0 }) },
    '@/components/ui': { AppScreen: 'Screen', AppText: 'Text' },
    '@/constants/design-tokens': { colors: {} },
  }).AuthScreenLayout;
  let renderer;
  await act(async () => { renderer = create(React.createElement(Layout, { title: 'Привет!', illustration: 1 }, React.createElement('Controls'))); });
  assert.equal(renderer.root.findAllByType('Image').length, 1);
  await act(async () => listeners.keyboardWillShow());
  assert.equal(renderer.root.findAllByType('Image').length, 0);
  assert.equal(renderer.root.findAllByType('Controls').length, 1, 'Keyboard must preserve form controls');
  await act(async () => listeners.keyboardWillHide());
  assert.equal(renderer.root.findAllByType('Image').length, 1);
  await act(async () => renderer.unmount());
  assert.equal(Object.keys(listeners).length, 0);
  console.log('PASS auth layout: keyboard frees illustration space, preserves controls and removes listeners');
}

async function authOnboardingFlowTests() {
  const routes = [];
  const providers = [];
  let nextRoute = '/referral-survey';
  let signupResult = { success: true };
  const mocks = {
    '@/utils/auth-onboarding': { getPostAuthRoute: async () => nextRoute },
    '@/utils/auth-session': {
      normalizeEmail: (email) => email.trim().toLowerCase(),
      isValidEmail: (email) => email.includes('@'),
      mapOAuthErrorMessage: () => 'Ошибка входа',
      restoreLocalAccountKeysFromSupabase: async () => ({ success: true }),
      signInWithOAuthProvider: async (provider) => { providers.push(provider); return { success: true }; },
      signUpWithEmailPassword: async () => signupResult,
    },
    '@/utils/user-avatar': { ensureDefaultAvatar: async () => {} },
    'expo-router': { router: { replace: (target) => routes.push(target) } },
    'react-native': { Platform: { OS: 'ios' }, Pressable: 'Pressable', View: 'View', StyleSheet: { create: (s) => s } },
    '@/components/auth/auth-error-banner': { AuthErrorBanner: 'ErrorBanner' },
    '@/components/auth/auth-screen-layout': { AuthScreenLayout: 'Layout', authInputStyle: {}, authSubmitStyle: {} },
    '@/components/auth/auth-password-field': { AuthPasswordField: 'Password' },
    '@/components/ui': { AppButton: 'Button', AppInput: 'Input', AppText: 'Text', SocialAuthButtons: 'Social' },
    '@/assets/images/illustrations/login-welcome-unicorn.png': 1,
    '@/assets/images/illustrations/register-create-unicorn.png': 2,
  };
  for (const file of ['app/login.tsx', 'app/register.tsx']) {
    const Screen = load(file, mocks).default;
    let renderer;
    await act(async () => { renderer = create(React.createElement(Screen)); });
    nextRoute = '/referral-survey';
    await act(async () => { await renderer.root.findByType('Social').props.onGooglePress(); });
    assert.equal(routes.at(-1), '/referral-survey', 'A new OAuth user receives the survey from either auth screen');
    nextRoute = '/(tabs)';
    await act(async () => { await renderer.root.findByType('Social').props.onApplePress(); });
    assert.equal(routes.at(-1), '/(tabs)', 'An existing OAuth user opens the app directly');
    if (file === 'app/register.tsx') {
      await act(async () => {
        renderer.root.findByType('Input').props.onChangeText('new@example.com');
        renderer.root.findAllByType('Password').forEach((input) => input.props.onChangeText('secret123'));
      });
      await act(async () => { await renderer.root.findByProps({ testID: 'register-submit' }).props.onPress(); });
      assert.equal(routes.at(-1), '/referral-survey', 'Email signup visits the survey before name input');
      signupResult = { success: false, error: 'SUPABASE_EMAIL_CONFIRM_REQUIRED' };
      const routeCount = routes.length;
      await act(async () => { await renderer.root.findByProps({ testID: 'register-submit' }).props.onPress(); });
      assert.equal(routes.length, routeCount, 'Confirmation-required signup stays on the registration page');
    }
    await act(async () => renderer.unmount());
  }
  assert.deepEqual(providers, ['google', 'apple', 'google', 'apple']);
  console.log('PASS auth onboarding flows: email signup, confirmation required, new Google/Apple users and returning users');
}

(async () => {
  await authTests();
  await signupTests();
  await profileTests();
  await nativeAppleTests();
  await nativeGoogleTests();
  await accessScreenTests();
  await networkTests();
  await offlineGateTests();
  await onboardingTests();
  await surveyScreenTests();
  await authLayoutTests();
  await authOnboardingFlowTests();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
