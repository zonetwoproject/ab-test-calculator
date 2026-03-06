import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BookOpen, Calculator } from 'lucide-react-native';

import Colors from '@/constants/color';
import GuideScreen from '@/screens/GuideScreen';
import WebAppScreen, { type WebNativeScrollSignal } from '@/screens/WebAppScreen';

type RootTabParamList = {
  Calculator: undefined;
  Guide: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function HeaderTitle() {
  return (
    <View style={styles.headerTitleWrap}>
      <Text style={styles.headerTitleText}>배민 실험 계산기</Text>
      <View style={styles.betaBadge}>
        <Text style={styles.betaBadgeText}>beta</Text>
      </View>
    </View>
  );
}

export default function App() {
  const androidHeaderHeight = (StatusBar.currentHeight ?? 0) + 44;
  const [isCalculatorTabBarCollapsed, setIsCalculatorTabBarCollapsed] = React.useState(false);

  const handleCalculatorNativeScroll = React.useCallback((signal: WebNativeScrollSignal) => {
    if (Platform.OS !== 'ios') {
      return;
    }

    setIsCalculatorTabBarCollapsed((prev) => {
      if (signal.atTop || signal.y <= 1) {
        return false;
      }

      if (signal.direction === 'up' && signal.dy < -0.5) {
        return false;
      }

      // Keep collapse responsive even when available scroll range is short.
      if (signal.direction === 'down' || signal.y >= 8) {
        return true;
      }

      return prev;
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerTitle: () => <HeaderTitle />,
            headerTitleAlign: 'center',
            headerStyle: {
              height: Platform.OS === 'android' ? androidHeaderHeight : 44,
            },
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textTertiary,
            tabBarStyle:
              Platform.OS === 'ios' && route.name === 'Calculator' && isCalculatorTabBarCollapsed
                ? {
                    height: 38,
                    paddingTop: 3,
                    paddingBottom: 3,
                  }
                : undefined,
            tabBarShowLabel:
              Platform.OS === 'ios' && route.name === 'Calculator'
                ? !isCalculatorTabBarCollapsed
                : true,
            headerShown: true,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          })}
        >
          <Tab.Screen
            name="Calculator"
            listeners={{
              blur: () => setIsCalculatorTabBarCollapsed(false),
            }}
            options={{
              title: '계산기',
              tabBarIcon: ({ color, size }) => <Calculator color={color} size={size} />,
            }}
          >
            {() => <WebAppScreen onNativeScroll={handleCalculatorNativeScroll} />}
          </Tab.Screen>
          <Tab.Screen
            name="Guide"
            options={{
              title: '사용 가이드',
              tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
            }}
            component={GuideScreen}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  betaBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  betaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
});
