import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

import Colors from '@/constants/color';

const WEBAPP_PROD_URLS = ['https://ab-test-calculator-one.vercel.app/versions/v11/index.html'];
const BUNDLED_WEBAPP_SOURCE = require('../assets/web/v11.html');
const IOS_SIMULATOR_URL = 'http://127.0.0.1:4173/';
const ANDROID_EMULATOR_URL = 'http://10.0.2.2:4173/';
const IOS_LOCAL_WEB_URL = 'http://127.0.0.1:3000/versions/v11';
const ANDROID_LOCAL_WEB_URL = 'http://10.0.2.2:3000/versions/v11';
const DEBUG_SCROLL = __DEV__;

function isIgnorableWebViewError(nativeEvent: {
  code?: number;
  description?: string;
  domain?: string;
}) {
  const code = nativeEvent.code ?? 0;
  const description = nativeEvent.description ?? '';
  const domain = nativeEvent.domain ?? '';

  // iOS WKWebView often emits cancellation errors during redirects/navigation.
  if (code === -999) return true;
  if (domain === 'WebKitErrorDomain' && code === 102) return true;
  if (description.includes('Frame load interrupted')) return true;
  return false;
}

const NO_ZOOM_SCRIPT = `
  (function () {
    function applyInAppStyle() {
      if (document.getElementById('__rn_webview_style__')) return;
      var style = document.createElement('style');
      style.id = '__rn_webview_style__';
      style.textContent = [
        '.header { display: none !important; }',
        '.tab-switcher { display: none !important; }',
        '.workspace-grid { display: block !important; grid-template-columns: minmax(0, 1fr) !important; }',
        '.calculator-pane { display: block !important; width: 100% !important; max-width: 100% !important; }',
        '.guide-pane { display: none !important; }',
        '#guide-pane { display: none !important; }',
        '.footer { display: none !important; }',
        '.guide-footer { display: none !important; }',
        '.content[data-active-tab="calculator"] .calculator-pane { display: block !important; }'
      ].join(' ');
      (document.head || document.documentElement).appendChild(style);
    }

    function forceCalculatorMode() {
      var content = document.querySelector('.content');
      if (content && content.getAttribute('data-active-tab') !== 'calculator') {
        content.setAttribute('data-active-tab', 'calculator');
      }
    }

    function ensureViewport() {
      var viewportContent = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        (document.head || document.documentElement).appendChild(meta);
      }
      meta.setAttribute('content', viewportContent);
    }

    function postMessage(payload) {
      if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }

    var lastY = 0;
    var lastTs = Date.now();

    function sendNativeScrollSignal() {
      var y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      var now = Date.now();
      var dy = y - lastY;
      var dt = Math.max(1, now - lastTs);
      var direction = dy > 0.5 ? 'down' : (dy < -0.5 ? 'up' : 'idle');

      lastY = y;
      lastTs = now;

      postMessage({
        type: 'native-scroll',
        y: y,
        dy: dy,
        direction: direction,
        atTop: y <= 2,
        velocityY: dy / (dt / 1000)
      });
    }

    applyInAppStyle();
    forceCalculatorMode();
    ensureViewport();

    document.addEventListener('DOMContentLoaded', function () {
      applyInAppStyle();
      forceCalculatorMode();
      ensureViewport();
      sendNativeScrollSignal();
    });

    var mutationObserver = new MutationObserver(function () {
      applyInAppStyle();
      forceCalculatorMode();
    });
    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true
    });

    window.addEventListener('scroll', sendNativeScrollSignal, { passive: true });
    window.addEventListener('load', sendNativeScrollSignal);
    window.addEventListener('resize', sendNativeScrollSignal);

    setTimeout(sendNativeScrollSignal, 80);

    var lastTouchEnd = 0;
    document.addEventListener('touchstart', function (event) {
      if (event.touches.length > 1) event.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', function (event) {
      var now = Date.now();
      if (now - lastTouchEnd <= 300) event.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
      document.addEventListener(type, function (event) {
        event.preventDefault();
      }, { passive: false });
    });
  })();
  true;
`;

function getWebAppUrls() {
  const forceLocal = false;
  if (forceLocal && __DEV__) {
    const previewLocal = Platform.OS === 'android' ? ANDROID_EMULATOR_URL : IOS_SIMULATOR_URL;
    const webLocal = Platform.OS === 'android' ? ANDROID_LOCAL_WEB_URL : IOS_LOCAL_WEB_URL;
    return [previewLocal, webLocal, ...WEBAPP_PROD_URLS];
  }

  // Default: always use production URLs to match web service 1:1.
  return [...WEBAPP_PROD_URLS];
}

export type WebAppScreenHandle = {
  scrollToTop: () => void;
};

export type WebNativeScrollSignal = {
  y: number;
  dy: number;
  direction: 'up' | 'down' | 'idle';
  atTop: boolean;
  velocityY?: number;
};

type WebAppScreenProps = {
  onNativeScroll?: (signal: WebNativeScrollSignal) => void;
};

const WebAppScreen = React.forwardRef<WebAppScreenHandle, WebAppScreenProps>(function WebAppScreen({ onNativeScroll }, ref) {
  const webViewRef = useRef<WebViewType>(null);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState('');
  const [urlIndex, setUrlIndex] = useState(0);
  const [useBundledFallback, setUseBundledFallback] = useState(false);

  const debugLog = useCallback((...args: unknown[]) => {
    if (!DEBUG_SCROLL) return;
    // eslint-disable-next-line no-console
    console.log('[WebAppScreen]', ...args);
  }, []);

  const scrollToTop = useCallback(() => {
    webViewRef.current?.injectJavaScript(`
      (function () {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        if (document && document.documentElement) document.documentElement.scrollTop = 0;
        if (document && document.body) document.body.scrollTop = 0;
      })();
      true;
    `);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop,
    }),
    [scrollToTop]
  );

  React.useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) {
        scrollToTop();
      }
    });
  }, [navigation, scrollToTop]);

  const urls = useMemo(() => getWebAppUrls(), []);
  const url = urls[urlIndex];
  const webSource = useBundledFallback ? BUNDLED_WEBAPP_SOURCE : { uri: url };
  const webSourceKey = useBundledFallback ? 'bundled-webapp-v11' : url;

  const handleReload = () => {
    setUseBundledFallback(false);
    setUrlIndex(0);
    setHasError(false);
    setLoading(true);
    setLastError('');
    webViewRef.current?.reload();
  };

  if (hasError) {
    return (
      <View style={styles.errorWrap}>
        <Text style={styles.errorTitle}>웹앱에 연결할 수 없습니다.</Text>
        {__DEV__ ? (
          <Text style={styles.errorText}>
            먼저 웹앱 preview 서버를 실행하세요.{"\n"}
            {Platform.OS === 'android'
              ? 'npm run webapp:preview (포트 4173)'
              : 'npm run webapp:preview (포트 4173)'}
          </Text>
        ) : (
          <Text style={styles.errorText}>
            네트워크 상태를 확인한 뒤 다시 시도하세요.{"\n"}
            연결 URL: {url}
          </Text>
        )}
        {lastError ? <Text style={styles.errorDetail}>오류: {lastError}</Text> : null}
        <Pressable style={styles.retryBtn} onPress={handleReload} accessibilityRole="button">
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        key={webSourceKey}
        ref={webViewRef}
        source={webSource}
        style={styles.webView}
        onLoadStart={() => {
          debugLog('onLoadStart', webSourceKey);
          setLoading(true);
          setHasError(false);
        }}
        onLoad={() => {
          debugLog('onLoad', webSourceKey);
          setHasError(false);
          setLastError('');
        }}
        onLoadEnd={() => {
          debugLog('onLoadEnd', webSourceKey);
          webViewRef.current?.injectJavaScript(NO_ZOOM_SCRIPT);
          setLoading(false);
        }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as WebNativeScrollSignal & { type?: string };
            if (payload?.type !== 'native-scroll' || !onNativeScroll) {
              return;
            }
            onNativeScroll({
              y: Number.isFinite(payload.y) ? payload.y : 0,
              dy: Number.isFinite(payload.dy) ? payload.dy : 0,
              direction: payload.direction === 'up' || payload.direction === 'down' ? payload.direction : 'idle',
              atTop: payload.atTop === true || (Number.isFinite(payload.y) ? payload.y <= 2 : false),
              velocityY: Number.isFinite(payload.velocityY) ? payload.velocityY : undefined,
            });
          } catch {
            // Ignore non-JSON messages.
          }
        }}
        onError={(event) => {
          const { nativeEvent } = event;
          if (isIgnorableWebViewError(nativeEvent)) {
            return;
          }

          debugLog('onError', nativeEvent);

          const nextIndex = urlIndex + 1;
          if (!useBundledFallback && nextIndex < urls.length) {
            setUrlIndex(nextIndex);
            setLoading(true);
            return;
          }

          if (!useBundledFallback) {
            setUseBundledFallback(true);
            setHasError(false);
            setLoading(true);
            return;
          }

          const code = nativeEvent.code ?? '';
          const domain = nativeEvent.domain ?? '';
          const description = nativeEvent.description ?? '';
          setLastError(`${domain} (${code}) ${description}`.trim());
          setHasError(true);
          setLoading(false);
        }}
        javaScriptEnabled
        domStorageEnabled
        injectedJavaScriptBeforeContentLoaded={NO_ZOOM_SCRIPT}
        injectedJavaScript={NO_ZOOM_SCRIPT}
        scalesPageToFit={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        originWhitelist={['*']}
        scrollEnabled
        bounces={false}
        nestedScrollEnabled
        overScrollMode="never"
        androidLayerType="software"
      />
      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : null}
    </View>
  );
});

export default WebAppScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  errorWrap: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  errorDetail: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});
