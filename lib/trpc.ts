import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  // Fallback for development
  if (__DEV__) {
    return 'http://localhost:3000';
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: () => {
        // Get auth token from store - use a function to get fresh state
        let authToken: string | null = null;
        try {
          // Import the store dynamically to avoid circular dependencies
          const { useBusinessStore } = require('@/store/businessStore');
          const authState = useBusinessStore.getState().authState;
          authToken = authState.token;
        } catch (error) {
          console.log('Could not get auth token from store:', error);
        }
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'HoursTracker-App/1.0.0',
        };
        
        if (authToken) {
          headers.authorization = `Bearer ${authToken}`;
        }
        
        return headers;
      },
      fetch: async (url, options) => {
        try {
          console.log('Making tRPC request to:', url);
          
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

          // Ensure url is a string
          const requestUrl = typeof url === 'string' ? url : url.toString();

          // Create proper RequestInit object
          const requestInit: RequestInit = {
            method: options?.method || 'POST',
            headers: options?.headers,
            body: options?.body,
            signal: controller.signal,
          };

          const response = await fetch(requestUrl, requestInit);

          // Clear timeout if request completes
          clearTimeout(timeoutId);

          console.log('tRPC response status:', response.status);

          // Check if response is ok
          if (!response.ok) {
            // Try to get error message from response
            let errorMessage = `HTTP ${response.status}`;
            try {
              const contentType = response.headers.get('content-type');
              
              if (contentType?.includes('application/json')) {
                const errorJson = await response.json();
                errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
              } else {
                const errorText = await response.text();
                console.log('Non-JSON error response:', errorText.substring(0, 200));
                
                // Check if it's an HTML error page (common when server is down)
                if (errorText.includes('<html>') || errorText.includes('<!DOCTYPE')) {
                  errorMessage = 'Server is not available. Please try again later.';
                } else if (errorText) {
                  errorMessage = errorText.substring(0, 200); // Limit error message length
                } else {
                  errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
              }
            } catch (parseError) {
              console.log('Error parsing error response:', parseError);
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            
            throw new Error(errorMessage);
          }

          // Validate that response is JSON
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            console.warn('Response is not JSON:', contentType);
            const text = await response.text();
            console.log('Non-JSON response:', text.substring(0, 200));
            
            if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
              throw new Error('Server returned HTML instead of JSON. Server may be down.');
            }
            
            throw new Error('Server returned invalid response format.');
          }

          return response;
        } catch (error: any) {
          console.error('TRPC fetch error:', error);
          
          // Handle AbortError (timeout)
          if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
          }
          
          // Handle network connection errors
          if (error.name === 'TypeError' && error.message?.includes('fetch')) {
            throw new Error('Network error. Please check your connection and try again.');
          }
          
          if (error.message?.includes('timeout')) {
            throw new Error('Request timed out. Please try again.');
          }
          
          if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
            throw new Error('Network error. Please check your connection and try again.');
          }
          
          if (error.message?.includes('Server did not start')) {
            throw new Error('Server is not available. Please try again later.');
          }
          
          if (error.message?.includes('JSON Parse error') || error.message?.includes('Unexpected character')) {
            throw new Error('Server error. Please try again later.');
          }
          
          if (error.message?.includes('Server returned HTML')) {
            throw new Error('Server is not available. Please try again later.');
          }
          
          // Handle connection refused errors
          if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Connection refused')) {
            throw new Error('Server is not available. Please try again later.');
          }
          
          // Re-throw the error with the original message if it's already descriptive
          throw error;
        }
      },
    }),
  ],
});