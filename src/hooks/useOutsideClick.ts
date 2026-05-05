import { useEffect, useRef } from 'react';

export function useOutsideClick(ref: React.RefObject<any>, callback: () => void) {
  // Store the latest callback in a ref so the stable listener always calls
  // the current version without needing to be re-registered every render.
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callbackRef.current();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}
