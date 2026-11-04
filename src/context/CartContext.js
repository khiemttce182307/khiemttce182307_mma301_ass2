import React, { createContext, useContext, useReducer, useMemo, useEffect, useState, useRef } from 'react';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../storage/asyncStorage';

// 1. Định nghĩa Action Types
export const CART_ACTIONS = {
  HYDRATE_CART: 'HYDRATE_CART',
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART',
};

// 2. Trạng thái khởi tạo
const initialCartState = {
  items: [],
};

// 3. Reducer bất biến (Không mutate state)
export const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.HYDRATE_CART: {
      return {
        ...state,
        items: Array.isArray(action.payload) ? action.payload : [],
      };
    }

    case CART_ACTIONS.ADD_ITEM: {
      const product = action.payload;
      const addQty = typeof product.quantity === 'number' && product.quantity > 0 ? product.quantity : 1;

      const existingIndex = state.items.findIndex((item) => item.id === product.id);

      if (existingIndex > -1) {
        return {
          ...state,
          items: state.items.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity + addQty }
              : item
          ),
        };
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            id: product.id,
            title: product.title,
            price: product.price,
            thumbnail: product.thumbnail,
            category: product.category,
            quantity: addQty,
          },
        ],
      };
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { id, quantity } = action.payload;

      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== id),
        };
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
      };
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      const { id } = action.payload;
      return {
        ...state,
        items: state.items.filter((item) => item.id !== id),
      };
    }

    case CART_ACTIONS.CLEAR_CART: {
      return {
        ...state,
        items: [],
      };
    }

    default:
      return state;
  }
};

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [isHydrated, setIsHydrated] = useState(false);
  const isFirstRenderAfterHydration = useRef(true);

  // BƯỚC 1: HYDRATION - Phục hồi giỏ hàng từ AsyncStorage khi ứng dụng khởi động
  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const storedItems = await getStorageData(STORAGE_KEYS.CART, []);
        if (isMounted && Array.isArray(storedItems) && storedItems.length > 0) {
          dispatch({
            type: CART_ACTIONS.HYDRATE_CART,
            payload: storedItems,
          });
        }
      } catch (err) {
        console.warn('Lỗi hydrate giỏ hàng:', err);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  // BƯỚC 2: PERSISTENCE - Lưu giỏ hàng mỗi khi `state.items` thay đổi
  // QUY TẮC TRÁNH GHI THỪA & XÓA NHẦM DỮ LIỆU:
  // 1. Chỉ lưu KHI và CHỈ KHI isHydrated === true (tránh ghi đè mảng rỗng khởi tạo ban đầu)
  // 2. Bỏ qua lần render đầu tiên ngay sau khi vừa hydrate xong
  useEffect(() => {
    if (!isHydrated) return;

    if (isFirstRenderAfterHydration.current) {
      isFirstRenderAfterHydration.current = false;
      return;
    }

    setStorageData(STORAGE_KEYS.CART, state.items);
  }, [state.items, isHydrated]);

  // DERIVED STATE: Tính toán tổng tiền và tổng số lượng từ `items`
  const totalQuantity = useMemo(() => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  }, [state.items]);

  const totalAmount = useMemo(() => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [state.items]);

  const value = useMemo(
    () => ({
      items: state.items,
      totalQuantity,
      totalAmount,
      isHydrated,
      dispatch,
    }),
    [state.items, totalQuantity, totalAmount, isHydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext phải được dùng bên trong CartProvider');
  }
  return context;
};
