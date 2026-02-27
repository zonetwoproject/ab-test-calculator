import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Colors from '@/constants/color';
import GuideScreen from '@/screens/GuideScreen';
import WebAppScreen from '@/screens/WebAppScreen';

type RootTabParamList = {
  Calculator: undefined;
  Guide: undefined;
};

const Tab = createNativeBottomTabNavigator<RootTabParamList>();

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
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={() => ({
            headerTitle: () => <HeaderTitle />,
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textTertiary,
            tabBarMinimizeBehavior: Platform.OS === 'ios' ? 'onScrollDown' : undefined,
            overrideScrollViewContentInsetAdjustmentBehavior: true,
            headerShown: true,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          })}
        >
          <Tab.Screen
            name="Calculator"
            options={{
              title: '계산기',
              tabBarIcon: ({ focused }) => ({
                type: 'sfSymbol',
                name: focused ? 'divide.square.fill' : 'divide.square',
              }),
            }}
            component={WebAppScreen}
          />
          <Tab.Screen
            name="Guide"
            options={{
              title: '사용 가이드',
              tabBarIcon: ({ focused }) => ({
                type: 'sfSymbol',
                name: focused ? 'book.fill' : 'book',
              }),
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
