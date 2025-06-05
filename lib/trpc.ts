import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { useBusinessStore } from "@/store/businessStore";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
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
        // Get auth token from store
        const authState = useBusinessStore.getState().authState;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (authState.token) {
          headers.authorization = `Bearer ${authState.token}`;
        }
        
        return headers;
      },
      fetch: async (url, options) => {
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
            },
          });

          // Check if response is ok
          if (!response.ok) {
            // Try to get error message from response
            let errorMessage = `HTTP ${response.status}`;
            try {
              const errorText = await response.text();
              if (errorText) {
                // Try to parse as JSON first
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson.error?.message || errorJson.message || errorText;
                } catch {
                  // If not JSON, use the text as is
                  errorMessage = errorText;
                }
              }
            } catch {
              // If we can't read the response, use the status
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            
            throw new Error(errorMessage);
          }

          return response;
        } catch (error: any) {
          console.error('TRPC fetch error:', error);
          throw error;
        }
      },
    }),
  ],
});