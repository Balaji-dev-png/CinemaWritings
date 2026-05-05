import { useState, useRef, useCallback } from 'react';

export function useLoadingState() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback((messages: string[], intervalTime: number = 800) => {
    setIsLoading(true);
    if (messages.length > 0) {
      setMessage(messages[0]);
      if (messages.length > 1) {
        let index = 1;
        intervalRef.current = setInterval(() => {
          setMessage(messages[index]);
          index = (index + 1) % messages.length;
        }, intervalTime);
      }
    }

    // Safety timeout: auto-stop after 10 seconds to prevent hanging UI
    setTimeout(() => {
      setIsLoading(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, 10000);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setMessage("");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { isLoading, message, startLoading, stopLoading, setMessage };
}
