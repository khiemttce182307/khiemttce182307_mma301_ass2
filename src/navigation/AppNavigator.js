import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { notificationService } from '../services/notificationService';
import { ROUTES } from '../constants/routes';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();

// Reference điều hướng toàn cục phục vụ xử lý khi click vào Notification
export const navigationRef = createNavigationContainerRef();

export const AppNavigator = () => {
  useEffect(() => {
    // Đăng ký lắng nghe khi người dùng nhấn vào thông báo
    const subscription = notificationService.addNotificationResponseListener((data) => {
      if (navigationRef.isReady()) {
        if (data?.type === 'ORDER_SUCCESS') {
          // Tự động chuyển người dùng đến tab Đơn hàng để xem chi tiết
          navigationRef.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.ORDERS });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.card,
          },
          headerTitleStyle: {
            fontWeight: '700',
            color: COLORS.textPrimary,
          },
          headerTintColor: COLORS.primary,
        }}
      >
        <Stack.Screen
          name={ROUTES.MAIN_TABS}
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={ROUTES.PRODUCT_DETAIL}
          component={ProductDetailScreen}
          options={({ route }) => ({
            title: route.params?.title || 'Chi tiết sản phẩm',
            headerBackTitle: 'Quay lại',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
