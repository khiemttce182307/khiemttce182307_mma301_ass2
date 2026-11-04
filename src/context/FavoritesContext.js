import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../storage/asyncStorage';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const isFirstRender = useRef(true);

  // HYDRATION: Phục hồi danh sách yêu thích khi khởi động
  useEffect(() => {
    let isMounted = true;

    const hydrateFavorites = async () => {
      try {
        const stored = await getStorageData(STORAGE_KEYS.FAVORITES, []);
        if (isMounted && Array.isArray(stored)) {
          setFavorites(stored);
        }
      } catch (err) {
        console.warn('Lỗi hydrate danh sách yêu thích:', err);
      } finally {
        if (isMounted) setIsHydrated(true);
      }
    };

    hydrateFavorites();

    return () => {
      isMounted = false;
    };
  }, []);

  // PERSISTENCE: Lưu lại khi danh sách yêu thích thay đổi (chỉ lưu sau khi hydrate xong)
  useEffect(() => {
    if (!isHydrated) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStorageData(STORAGE_KEYS.FAVORITES, favorites);
  }, [favorites, isHydrated]);

  // Toggle thêm hoặc xóa khỏi yêu thích
  const toggleFavorite = useCallback((product) => {
    if (!product || !product.id) return;
    setFavorites((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }
      return [...prev, product];
    });
  }, []);

  const isFavorite = useCallback(
    (productId) => {
      return favorites.some((item) => item.id === productId);
    },
    [favorites]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isHydrated,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites phải được dùng bên trong FavoritesProvider');
  }
  return context;
};
