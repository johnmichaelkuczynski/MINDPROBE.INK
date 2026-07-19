import { useEffect, useRef, useState } from 'react';

export function useSSE<T>(url: string | null, onMessage?: (data: T) => void) {
  const [data, setData] = useState<T[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  // Tracks whether we intentionally closed — prevents reconnect
  const doneRef = useRef(false);

  useEffect(() => {
    if (!url) {
      setData([]);
      setIsConnected(false);
      setError(null);
      doneRef.current = false;
      return;
    }

    doneRef.current = false;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    const closeForever = () => {
      doneRef.current = true;
      eventSource.close();
      setIsConnected(false);
    };

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data) as T;
        setData(prev => [...prev, parsedData]);
        onMessage?.(parsedData);

        // Close permanently when the server signals done or error
        const typed = parsedData as any;
        if (typed?.type === 'complete' || typed?.type === 'error') {
          closeForever();
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err, 'Raw:', event.data);
        setError('Failed to parse server data');
      }
    };

    eventSource.onerror = () => {
      // If we already closed intentionally, do nothing
      if (doneRef.current) return;
      // Otherwise the server dropped the connection unexpectedly — close
      // permanently so the browser does NOT auto-reconnect
      closeForever();
      setError('Connection lost');
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [url]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      doneRef.current = true;
      eventSourceRef.current.close();
      setIsConnected(false);
    }
  };

  return {
    data,
    isConnected,
    error,
    disconnect,
    clearData: () => setData([])
  };
}
