import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

import Colors from '@/constants/color';

const WEBAPP_PROD_URLS = ['https://ab-test-calculator-one.vercel.app/versions/v9/index.html'];
const BUNDLED_WEBAPP_SOURCE = require('../assets/web/v9.html');
const IOS_SIMULATOR_URL = 'http://127.0.0.1:4173/';
const ANDROID_EMULATOR_URL = 'http://10.0.2.2:4173/';
const IOS_LOCAL_WEB_URL = 'http://127.0.0.1:3000/versions/v9';
const ANDROID_LOCAL_WEB_URL = 'http://10.0.2.2:3000/versions/v9';

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
        '.guide-pane { display: none !important; }',
        '.footer { display: none !important; }',
        '.content[data-active-tab=\"calculator\"] .calculator-pane { display: block !important; }'
      ].join(' ');
      (document.head || document.documentElement).appendChild(style);
    }

    function forceCalculatorMode() {
      var content = document.querySelector('.content');
      if (content) {
        content.setAttribute('data-active-tab', 'calculator');
      }
    }

    applyInAppStyle();
    forceCalculatorMode();
    document.addEventListener('DOMContentLoaded', applyInAppStyle);
    document.addEventListener('DOMContentLoaded', forceCalculatorMode);

    var content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);

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

    var lastY = 0;
    var lastTs = Date.now();
    var scheduled = false;

    function getScrollY() {
      var scrollingElement = document.scrollingElement || document.documentElement || document.body;
      return window.scrollY || (scrollingElement && scrollingElement.scrollTop) || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }

    function postScrollSignal() {
      var y = getScrollY();
      var now = Date.now();
      var dy = y - lastY;
      var dt = Math.max(now - lastTs, 1);
      var speed = Math.abs(dy) / dt;
      var direction = dy > 0 ? 'down' : dy < 0 ? 'up' : 'idle';
      var atTop = y <= 4;

      if (Math.abs(dy) >= 1 || atTop) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'tabbar-scroll',
            y: y,
            dy: dy,
            speed: speed,
            direction: direction,
            atTop: atTop,
            ts: now
          }));
        }
        lastY = y;
        lastTs = now;
      }

      scheduled = false;
    }

    function queueScrollSignal() {
      if (scheduled) return;
      scheduled = true;
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(postScrollSignal);
      } else {
        setTimeout(postScrollSignal, 16);
      }
    }

    window.addEventListener('scroll', queueScrollSignal, { passive: true });
    document.addEventListener('scroll', queueScrollSignal, { capture: true, passive: true });
    window.addEventListener('touchmove', queueScrollSignal, { passive: true });
    window.addEventListener('load', queueScrollSignal);
    document.addEventListener('DOMContentLoaded', queueScrollSignal);
    setTimeout(queueScrollSignal, 250);
    setTimeout(queueScrollSignal, 900);
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

export type WebTabBarScrollSignal = {
  type: 'tabbar-scroll';
  y: number;
  dy: number;
  speed: number;
  direction: 'up' | 'down' | 'idle';
  atTop: boolean;
  ts: number;
};

export type WebNativeScrollSignal = {
  y: number;
  dy: number;
  direction: 'up' | 'down' | 'idle';
  atTop: boolean;
  velocityY?: number;
};

type WebAppScreenProps = {
  onScrollSignal?: (signal: WebTabBarScrollSignal) => void;
  onNativeScroll?: (signal: WebNativeScrollSignal) => void;
};

const WebAppScreen = React.forwardRef<WebAppScreenHandle, WebAppScreenProps>(function WebAppScreen({ onScrollSignal, onNativeScroll }, ref) {
  const webViewRef = useRef<WebViewType>(null);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const lastNativeScrollYRef = useRef(0);
  const scrollToTopRef = useRef({
    scrollToTop: () => {
      webViewRef.current?.injectJavaScript(`
        (function () {
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          if (document && document.documentElement) document.documentElement.scrollTop = 0;
          if (document && document.body) document.body.scrollTop = 0;
        })();
        true;
      `);
    },
  });
  const scrollToTop = useCallback(() => {
    scrollToTopRef.current.scrollToTop();
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

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState('');
  const [urlIndex, setUrlIndex] = useState(0);
  const [useBundledFallback, setUseBundledFallback] = useState(false);
  const urls = useMemo(() => getWebAppUrls(), []);
  const url = urls[urlIndex];
  const webSource = useBundledFallback ? BUNDLED_WEBAPP_SOURCE : { uri: url };
  const webSourceKey = useBundledFallback ? 'bundled-webapp-v9' : url;

  const handleReload = () => {
    setUseBundledFallback(false);
    setUrlIndex(0);
    setHasError(false);
    setLoading(true);
    setLastError('');
    webViewRef.current?.reload();
  };

  return (
    <View style={styles.container}>
      {hasError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>웹앱에 연결할 수 없습니다.</Text>
          {__DEV__ ? (
            <Text style={styles.errorText}>
              먼저 웹앱 preview 서버를 실행하세요.{'\n'}
              {Platform.OS === 'android'
                ? 'npm run webapp:preview (포트 4173)'
                : 'npm run webapp:preview (포트 4173)'}
            </Text>
          ) : (
            <Text style={styles.errorText}>
              네트워크 상태를 확인한 뒤 다시 시도하세요.{'\n'}
              연결 URL: {url}
            </Text>
          )}
          {lastError ? <Text style={styles.errorDetail}>오류: {lastError}</Text> : null}
          <Pressable style={styles.retryBtn} onPress={handleReload} accessibilityRole="button">
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <WebView
            key={webSourceKey}
            ref={webViewRef}
            source={webSource}
            onLoadStart={() => {
              setLoading(true);
              setHasError(false);
            }}
            onLoad={() => {
              setHasError(false);
              setLastError('');
            }}
            onLoadEnd={() => setLoading(false)}
            onScroll={(event) => {
              if (!onNativeScroll) {
                return;
              }

              const y = Math.max(0, event.nativeEvent.contentOffset?.y ?? 0);
              const prevY = lastNativeScrollYRef.current;
              const dy = y - prevY;
              lastNativeScrollYRef.current = y;

              const direction: WebNativeScrollSignal['direction'] =
                dy > 0.5 ? 'down' : dy < -0.5 ? 'up' : 'idle';

              onNativeScroll({
                y,
                dy,
                direction,
                atTop: y <= 2,
                velocityY: event.nativeEvent.velocity?.y,
              });
            }}
            onMessage={(event) => {
              if (!onScrollSignal) {
                return;
              }

              try {
                const payload = JSON.parse(event.nativeEvent.data) as WebTabBarScrollSignal;
                if (payload?.type === 'tabbar-scroll') {
                  onScrollSignal(payload);
                }
              } catch {
                // Ignore non-JSON messages from the page.
              }
            }}
            onError={(event) => {
              const { nativeEvent } = event;
              if (isIgnorableWebViewError(nativeEvent)) {
                return;
              }

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
            scrollEventThrottle={16}
            injectedJavaScriptBeforeContentLoaded={NO_ZOOM_SCRIPT}
            scalesPageToFit={false}
            setBuiltInZoomControls={false}
            setDisplayZoomControls={false}
            originWhitelist={['*']}
          />
          {loading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
});

export default WebAppScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    flex: 1,
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
