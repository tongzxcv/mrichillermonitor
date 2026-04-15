import { useState, useEffect, useCallback, useRef } from 'react';

export function useTvMode() {
  const [tvMode, setTvMode] = useState(() => localStorage.getItem('tvMode') === 'true');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    localStorage.setItem('tvMode', String(tvMode));
    const root = document.documentElement;
    if (tvMode) {
      root.classList.add('tv-mode');
    } else {
      root.classList.remove('tv-mode');
      root.style.cursor = '';
    }
    return () => root.classList.remove('tv-mode');
  }, [tvMode]);

  // Auto-hide cursor in TV mode
  useEffect(() => {
    if (!tvMode) return;
    const show = () => {
      document.documentElement.style.cursor = '';
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        document.documentElement.style.cursor = 'none';
      }, 3000);
    };
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('click', show);
    return () => {
      clearTimeout(timerRef.current);
      document.documentElement.style.cursor = '';
      window.removeEventListener('mousemove', show);
      window.removeEventListener('click', show);
    };
  }, [tvMode]);

  const toggleTvMode = useCallback(() => setTvMode(prev => !prev), []);

  return { tvMode, toggleTvMode };
}
