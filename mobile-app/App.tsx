import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BookOpen, Globe } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Colors from '@/constants/color';
import GuideScreen from '@/screens/GuideScreen';
import WebAppScreen from '@/screens/WebAppScreen';

type RootTabParamList = {
  WebApp: undefined;
  Guide: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function HeaderTitle() {
  return (
    <View style={styles.headerCenter}>
      <Text style={styles.headerTitle}>실험 계산기</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Mark9</Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.textTertiary,
            tabBarStyle: {
              backgroundColor: Colors.surface,
              borderTopColor: Colors.borderLight,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
            headerStyle: {
              backgroundColor: Colors.surface,
            },
            headerShadowVisible: false,
          }}
        >
          <Tab.Screen
            name="WebApp"
            options={{
              title: '계산기',
              tabBarLabel: '계산기',
              headerTitle: () => <HeaderTitle />,
              headerTitleAlign: 'center',
              tabBarIcon: ({ color, size }) => <Globe size={size} color={color} />,
            }}
            component={WebAppScreen}
          />
          <Tab.Screen
            name="Guide"
            options={{
              title: '사용 가이드',
              tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
});
