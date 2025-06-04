import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusinessInfo, PaymentOptions, TaxSettings, UserAccount, AuthState, SyncQueueItem } from '@/types';

interface AppRating {
  rating: number;
  submittedAt: string;
}

interface BusinessState {
  businessInfo: BusinessInfo | null;
  paymentOptions: PaymentOptions | null;
  taxSettings: TaxSettings;
  userAccount: UserAccount | null;
  authState: AuthState;
  appRatings: AppRating[];
  isDarkMode: boolean;
  businessSyncQueue: SyncQueueItem[];
  
  updateBusinessInfo: (info: BusinessInfo) => void;
  updatePaymentOptions: (options: PaymentOptions) => void;
  updateTaxSettings: (settings: Partial<TaxSettings>) => void;
  updateCurrency: (currency: string, currencySymbol: string) => void;
  updateTaxRate: (taxRate: number) => void;
  setUserAccount: (account: UserAccount) => void;
  setAuthState: (state: Partial<AuthState>) => void;
  setAuthToken: (token: string) => void;
  clearAuth: () => void;
  submitAppRating: (rating: number) => void;
  getLatestRating: () => AppRating | null;
  toggleDarkMode: () => void;
  signOut: () => void;
  resetAllData: () => void;
  
  // Business sync methods
  addToBusinessSyncQueue: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) => void;
  processBusinessSyncQueue: (userId: string) => Promise<void>;
  clearBusinessSyncQueue: () => void;
}

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      businessInfo: null,
      paymentOptions: {
        stripeEnabled: false,
        paypalEnabled: false,
        paymentInstructions: ''
      },
      taxSettings: {
        defaultTaxRate: 0,
        currency: 'USD',
        currencySymbol: '$'
      },
      userAccount: null,
      authState: {
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      },
      appRatings: [],
      isDarkMode: false,
      businessSyncQueue: [],
      
      updateBusinessInfo: (info) => {
        set({ businessInfo: info });
        
        // Add to sync queue for business data
        get().addToBusinessSyncQueue({
          entityType: 'businessInfo',
          entityId: 'business-info',
          operation: 'update',
          data: info,
        });
      },
      
      updatePaymentOptions: (options) => {
        set({ paymentOptions: options });
        
        // Add to sync queue
        get().addToBusinessSyncQueue({
          entityType: 'businessInfo',
          entityId: 'payment-options',
          operation: 'update',
          data: { paymentOptions: options },
        });
      },
      
      updateTaxSettings: (settings) => {
        set(state => ({ 
          taxSettings: { 
            ...state.taxSettings, 
            ...settings 
          } 
        }));
        
        // Add to sync queue
        get().addToBusinessSyncQueue({
          entityType: 'businessInfo',
          entityId: 'tax-settings',
          operation: 'update',
          data: { taxSettings: { ...get().taxSettings, ...settings } },
        });
      },
      
      updateCurrency: (currency, currencySymbol) => {
        set(state => ({
          taxSettings: {
            ...state.taxSettings,
            currency,
            currencySymbol
          }
        }));
        
        // Add to sync queue
        get().addToBusinessSyncQueue({
          entityType: 'businessInfo',
          entityId: 'currency',
          operation: 'update',
          data: { currency, currencySymbol },
        });
      },
      
      updateTaxRate: (taxRate) => {
        set(state => ({
          taxSettings: {
            ...state.taxSettings,
            defaultTaxRate: taxRate
          }
        }));
        
        // Add to sync queue
        get().addToBusinessSyncQueue({
          entityType: 'businessInfo',
          entityId: 'tax-rate',
          operation: 'update',
          data: { defaultTaxRate: taxRate },
        });
      },
      
      setUserAccount: (account) => {
        // Ensure the id property is set to the same value as uid for compatibility
        const accountWithId = {
          ...account,
          id: account.uid, // Ensure id is always set to uid
        };
        set({ userAccount: accountWithId });
      },
      
      setAuthState: (newState) => {
        set(state => ({
          authState: {
            ...state.authState,
            ...newState,
          }
        }));
      },
      
      setAuthToken: (token) => {
        set(state => ({
          authState: {
            ...state.authState,
            token,
          }
        }));
      },
      
      clearAuth: () => {
        set({
          userAccount: null,
          authState: {
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
          }
        });
      },
      
      submitAppRating: (rating) => {
        const newRating: AppRating = {
          rating,
          submittedAt: new Date().toISOString()
        };
        set(state => ({
          appRatings: [...state.appRatings, newRating]
        }));
      },
      
      getLatestRating: () => {
        const ratings = get().appRatings;
        if (ratings.length === 0) return null;
        return ratings[ratings.length - 1];
      },
      
      toggleDarkMode: () => {
        set(state => ({ isDarkMode: !state.isDarkMode }));
      },
      
      signOut: () => {
        set({ 
          userAccount: null,
          authState: {
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
          }
        });
      },
      
      addToBusinessSyncQueue: (item) => {
        const queueItem: SyncQueueItem = {
          ...item,
          id: `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          retryCount: 0,
        };
        
        set(state => ({
          businessSyncQueue: [...state.businessSyncQueue, queueItem]
        }));
      },
      
      processBusinessSyncQueue: async (userId: string) => {
        const state = get();
        if (state.businessSyncQueue.length === 0) {
          return;
        }
        
        try {
          // For now, we'll just clear the queue since business data sync
          // is less critical than job/time entry data
          // In a full implementation, you would sync business data to a backend
          console.log('Processing business sync queue:', state.businessSyncQueue);
          
          // Clear processed items
          set({ businessSyncQueue: [] });
          
        } catch (error) {
          console.error('Error processing business sync queue:', error);
        }
      },
      
      clearBusinessSyncQueue: () => {
        set({ businessSyncQueue: [] });
      },
      
      resetAllData: () => {
        set({
          businessInfo: null,
          paymentOptions: {
            stripeEnabled: false,
            paypalEnabled: false,
            paymentInstructions: ''
          },
          taxSettings: {
            defaultTaxRate: 0,
            currency: 'USD',
            currencySymbol: '$'
          },
          userAccount: null,
          authState: {
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
          },
          appRatings: [],
          isDarkMode: false,
          businessSyncQueue: [],
        });
      }
    }),
    {
      name: 'business-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist certain parts of the state
      partialize: (state) => ({
        businessInfo: state.businessInfo,
        paymentOptions: state.paymentOptions,
        taxSettings: state.taxSettings,
        userAccount: state.userAccount,
        authState: {
          isAuthenticated: state.authState.isAuthenticated,
          token: state.authState.token,
          // Don't persist loading or error states
        },
        appRatings: state.appRatings,
        isDarkMode: state.isDarkMode,
        // Don't persist sync queue - should be fresh on app start
      }),
    }
  )
);