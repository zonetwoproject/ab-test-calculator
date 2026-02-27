import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
        '.guide-pane { display: none !important; }',
        '.footer { display: none !important; }',
        '.content[data-active-tab="calculator"] .calculator-pane { display: block !important; }'
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

    function postMessage(payload) {
      if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }

    function getDocumentHeight() {
      var body = document.body;
      var html = document.documentElement;
      return Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        html ? html.clientHeight : 0,
        html ? html.scrollHeight : 0,
        html ? html.offsetHeight : 0
      );
    }

    var lastHeight = 0;
    var scheduled = false;
    function sendHeight(force) {
      var height = Math.max(1, Math.ceil(getDocumentHeight()));
      if (force || Math.abs(height - lastHeight) >= 1) {
        lastHeight = height;
        postMessage({
          type: 'content-height',
          height: height,
          ts: Date.now()
        });
      }
    }

    function queueHeight(force) {
      if (scheduled && !force) return;
      scheduled = true;
      var runner = function () {
        scheduled = false;
        sendHeight(force);
      };
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(runner);
      } else {
        setTimeout(runner, 16);
      }
    }

    var resizeObserver = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(function () {
        queueHeight(false);
      });
      if (document.body) resizeObserver.observe(document.body);
      if (document.documentElement) resizeObserver.observe(document.documentElement);
    }

    var mutationObserver = new MutationObserver(function () {
      queueHeight(false);
    });
    mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true
    });

    ['load', 'resize', 'orientationchange'].forEach(function (type) {
      window.addEventListener(type, function () {
        queueHeight(true);
      });
    });
    ['DOMContentLoaded', 'input', 'change', 'click', 'transitionend', 'animationend'].forEach(function (type) {
      document.addEventListener(type, function () {
        queueHeight(false);
      }, true);
    });

    setTimeout(function () { queueHeight(true); }, 50);
    setTimeout(function () { queueHeight(true); }, 250);
    setTimeout(function () { queueHeight(true); }, 900);
    setInterval(function () { queueHeight(false); }, 1500);
  })();
  true;
`;

const REPORT_HEIGHT_SCRIPT = `
  (function () {
    function postHeight() {
      var body = document.body;
      var html = document.documentElement;
      var height = Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        html ? html.clientHeight : 0,
        html ? html.scrollHeight : 0,
        html ? html.offsetHeight : 0,
        1
      );
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'content-height',
          height: Math.ceil(height),
          ts: Date.now()
        }));
      }
    }

    if (!window.__RN_HEIGHT_OBSERVER_INSTALLED__) {
      window.__RN_HEIGHT_OBSERVER_INSTALLED__ = true;
      if (window.ResizeObserver) {
        var resizeObserver = new ResizeObserver(function () {
          postHeight();
        });
        if (document.body) resizeObserver.observe(document.body);
        if (document.documentElement) resizeObserver.observe(document.documentElement);
      }
      var mutationObserver = new MutationObserver(function () {
        postHeight();
      });
      mutationObserver.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true
      });
      window.addEventListener('load', postHeight);
      window.addEventListener('resize', postHeight);
      document.addEventListener('DOMContentLoaded', postHeight);
    }

    postHeight();
    setTimeout(postHeight, 120);
    setTimeout(postHeight, 450);
    setTimeout(postHeight, 900);
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

type WebAppScreenProps = Record<string, never>;

const WebAppScreen = React.forwardRef<WebAppScreenHandle, WebAppScreenProps>(function WebAppScreen(_, ref) {
  const webViewRef = useRef<WebViewType>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [viewportHeight, setViewportHeight] = useState(1);
  const [webContentHeight, setWebContentHeight] = useState(1);
  const hasHeightReportRef = useRef(false);
  const lastScrollLogTsRef = useRef(0);
  const lastHeightLogTsRef = useRef(0);

  const debugLog = useCallback((...args: unknown[]) => {
    if (!DEBUG_SCROLL) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[WebAppScreen]', ...args);
  }, []);

  const scrollToTopRef = useRef({
    scrollToTop: () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      webViewRef.current?.injectJavaScript(`
        (function () {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
  const webViewHeight = Math.max(viewportHeight, webContentHeight);
  const canScroll = webViewHeight > viewportHeight + 2;

  React.useEffect(() => {
    debugLog(
      'layout',
      `viewport=${viewportHeight}`,
      `content=${webContentHeight}`,
      `webViewHeight=${webViewHeight}`,
      `canScroll=${canScroll}`
    );
  }, [canScroll, debugLog, viewportHeight, webContentHeight, webViewHeight]);

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
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      scrollEventThrottle={16}
      onLayout={(event) => {
        const nextHeight = Math.max(1, Math.round(event.nativeEvent.layout.height));
        setViewportHeight(nextHeight);
        debugLog('onLayout', `height=${nextHeight}`);
      }}
      onScroll={(event) => {
        const now = Date.now();
        if (now - lastScrollLogTsRef.current < 120) {
          return;
        }
        lastScrollLogTsRef.current = now;

        const y = Math.max(0, event.nativeEvent.contentOffset.y);
        const ch = Math.max(0, event.nativeEvent.contentSize.height);
        const vh = Math.max(0, event.nativeEvent.layoutMeasurement.height);
        debugLog('onScroll', `y=${y.toFixed(1)}`, `content=${ch.toFixed(1)}`, `viewport=${vh.toFixed(1)}`);
      }}
      onScrollBeginDrag={(event) => {
        const y = Math.max(0, event.nativeEvent.contentOffset.y);
        debugLog('onScrollBeginDrag', `y=${y.toFixed(1)}`);
      }}
      onScrollEndDrag={(event) => {
        const y = Math.max(0, event.nativeEvent.contentOffset.y);
        debugLog('onScrollEndDrag', `y=${y.toFixed(1)}`);
      }}
      onMomentumScrollBegin={(event) => {
        const y = Math.max(0, event.nativeEvent.contentOffset.y);
        debugLog('onMomentumScrollBegin', `y=${y.toFixed(1)}`);
      }}
      onMomentumScrollEnd={(event) => {
        const y = Math.max(0, event.nativeEvent.contentOffset.y);
        debugLog('onMomentumScrollEnd', `y=${y.toFixed(1)}`);
      }}
    >
      <WebView
        key={webSourceKey}
        ref={webViewRef}
        source={webSource}
        style={[styles.webView, { height: webViewHeight }]}
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
          hasHeightReportRef.current = false;
          setWebContentHeight((prev) => Math.max(prev, viewportHeight * 2));
          webViewRef.current?.injectJavaScript(REPORT_HEIGHT_SCRIPT);
          setTimeout(() => {
            if (!hasHeightReportRef.current) {
              const fallbackHeight = Math.max(viewportHeight * 6, 3000);
              debugLog('height-fallback', fallbackHeight);
              setWebContentHeight((prev) => Math.max(prev, fallbackHeight));
            }
          }, 1200);
          setLoading(false);
        }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as { type?: string; height?: number } | undefined;
            if (payload?.type === 'content-height' && Number.isFinite(payload.height)) {
              const nextHeight = Math.max(1, Math.ceil(payload.height ?? 1));
              hasHeightReportRef.current = true;
              const now = Date.now();
              if (now - lastHeightLogTsRef.current > 250) {
                lastHeightLogTsRef.current = now;
                debugLog('content-height', nextHeight);
              }
              setWebContentHeight(nextHeight);
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
        scalesPageToFit={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        nestedScrollEnabled={false}
      />
      {loading ? (
        <View style={styles.loadingIndicatorWrap}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : null}
    </ScrollView>
  );
});

export default WebAppScreen;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
  },
  webView: {
    width: '100%',
    backgroundColor: Colors.surface,
  },
  loadingIndicatorWrap: {
    paddingVertical: 12,
    alignItems: 'center',
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
