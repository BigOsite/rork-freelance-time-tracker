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
      // First check basic network connectivity
      try {
        const networkController = new AbortController();
        const networkTimeoutId = setTimeout(() => networkController.abort(), 3000);
        
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          signal: networkController.signal,
          mode: 'no-cors'
        });
        clearTimeout(networkTimeoutId);
      } catch (networkError) {
        console.log('Basic network connectivity failed:', networkError);
        setState({
          isOnline: false,
          isChecking: false,
          lastChecked: Date.now(),
          error: 'No internet connection',
        });
        return false;
      }
      
      // Then check server health - try multiple endpoints
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      // Try the main server endpoint first
      let response;
      try {
        response = await fetch('https://dev-8e23p8rts6cegks6ymhco.rorktest.dev/health', {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (primaryError) {
        console.log('Primary server check failed, trying fallback:', primaryError);
        // Try fallback endpoint
        response = await fetch('https://hrymwfavjfvnksxjezoy.supabase.co/rest/v1/', {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyeW13ZmF2amZ2bmtzeGplem95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzExNTMsImV4cCI6MjA2NDIwNzE1M30.o3aPJsDW8JHSCdAE0ACYrLj4Y6u9UR3kPbujBzEcapY',
            'Cache-Control': 'no-cache',
          },
        });
      }
      
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
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error';
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Connection error';
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