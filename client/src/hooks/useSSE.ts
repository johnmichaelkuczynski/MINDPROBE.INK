import { useEffect, useRef, useState } from 'react';

export function useSSE<T>(url: string | null, onMessage?: (data: T) => void) {
  const [data, setData] = useState<T[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) {
      setData([]);
      setIsConnected(false);
      setError(null);
      return;
    }

    console.log('Setting up SSE connection to:', url);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      console.log('SSE message received:', event.data);
      try {
        const parsedData = JSON.parse(event.data) as T;
        setData(prev => [...prev, parsedData]);
        onMessage?.(parsedData);
      } catch (err) {
        console.error('Failed to parse SSE data:', err, 'Raw data:', event.data);
        setError('Failed to parse server data');
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setIsConnected(false);
      setError('Connection lost');
    };

    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
      setIsConnected(false);
    };
  }, [url]);

  const disconnect = () => {
    if (eventSourceRef.current) {
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
