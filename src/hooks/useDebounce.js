import { useState, useEffect } from 'react';

// Custom hook debounce giá trị nhập liệu (trì hoãn gửi request sau khi người dùng ngừng gõ)
export const useDebounce = (value, delay = 450) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
