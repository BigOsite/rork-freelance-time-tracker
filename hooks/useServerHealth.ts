import { useState, useEffect, useCallback } from 'react';

interface ServerHealthState {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: number | null;
  error: string | null;
}

export function useServerHealth() {
  const [state, setState] = useState<ServerHealthState>({
    isOnline: true,
    isChecking: false,
    lastChecked: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://8e23p8rts6cegks6ymhco.rork.com/health', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      const isOnline = response.ok;
      setState({
        isOnline,
        isChecking: false,
        lastChecked: Date.now(),
        error: isOnline ? null : `Server returned ${response.status}`,
      });
      
      return isOnline;
    } catch (error: any) {
      console.log('Server health check failed:', error);
      
      let errorMessage = 'Connection failed';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Network error';
      }
      
      setState({
        isOnline: false,
        isChecking: false,
        lastChecked: Date.now(),
        error: errorMessage,
      });
      
      return false;
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();
    
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    ...state,
    checkHealth,
  };
}