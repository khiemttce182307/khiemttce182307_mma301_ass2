import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ProductListScreen } from '../screens/ProductListScreen';
import { CartScreen } from '../screens/CartScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { AIRecommendScreen } from '../screens/AIRecommendScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ROUTES } from '../constants/routes';
import { COLORS } from '../constants/colors';

import { useCart } from '../hooks/useCart';

const Tab = createBottomTabNavigator();

// Bottom Tab Navigator quản lý 5 phân hệ chính của ứng dụng
export const TabNavigator = () => {
  const { totalQuantity } = useCart();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: COLORS.card,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: COLORS.textPrimary,
          fontSize: 18,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'ellipse-outline';

          if (route.name === ROUTES.PRODUCT_LIST) {
            iconName = focused ? 'bag' : 'bag-outline';
          } else if (route.name === ROUTES.CART) {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === ROUTES.ORDERS) {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === ROUTES.AI_RECOMMEND) {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === ROUTES.SETTINGS) {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size || 22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name={ROUTES.PRODUCT_LIST}
        component={ProductListScreen}
        options={{ title: 'Sản phẩm' }}
      />
      <Tab.Screen
        name={ROUTES.CART}
        component={CartScreen}
        options={{
          title: 'Giỏ hàng',
          tabBarBadge: totalQuantity > 0 ? totalQuantity : undefined,
        }}
      />
      <Tab.Screen
        name={ROUTES.ORDERS}
        component={OrdersScreen}
        options={{ title: 'Đơn hàng' }}
      />
      <Tab.Screen
        name={ROUTES.AI_RECOMMEND}
        component={AIRecommendScreen}
        options={{ title: 'AI Gợi ý' }}
      />
      <Tab.Screen
        name={ROUTES.SETTINGS}
        component={SettingsScreen}
        options={{ title: 'Cài đặt' }}
      />
    </Tab.Navigator>
  );
};
