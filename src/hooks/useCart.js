import { useCallback } from 'react';
import { useCartContext, CART_ACTIONS } from '../context/CartContext';

// Custom hook cung cấp các hành động tiện ích cho giỏ hàng
export const useCart = () => {
  const { items, totalQuantity, totalAmount, dispatch } = useCartContext();

  const addToCart = useCallback(
    (product, quantity = 1) => {
      if (!product || !product.id) return;
      dispatch({
        type: CART_ACTIONS.ADD_ITEM,
        payload: { ...product, quantity },
      });
    },
    [dispatch]
  );

  const updateQuantity = useCallback(
    (id, quantity) => {
      dispatch({
        type: CART_ACTIONS.UPDATE_QUANTITY,
        payload: { id, quantity },
      });
    },
    [dispatch]
  );

  const removeFromCart = useCallback(
    (id) => {
      dispatch({
        type: CART_ACTIONS.REMOVE_ITEM,
        payload: { id },
      });
    },
    [dispatch]
  );

  const clearCart = useCallback(() => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
  }, [dispatch]);

  return {
    items,
    totalQuantity,
    totalAmount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
};
