import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusinessInfo, PaymentOptions, TaxSettings, UserAccount } from '@/types';

interface AppRating {
  rating: number;
  submittedAt: string;
}

interface BusinessState {
  businessInfo: BusinessInfo | null;
  paymentOptions: PaymentOptions | null;
  taxSettings: TaxSettings;
  userAccount: UserAccount | null;
  appRatings: AppRating[];
  isDarkMode: boolean;
  updateBusinessInfo: (info: BusinessInfo) => void;
  updatePaymentOptions: (options: PaymentOptions) => void;
  updateTaxSettings: (settings: Partial<TaxSettings>) => void;
  updateCurrency: (currency: string, currencySymbol: string) => void;
  updateTaxRate: (taxRate: number) => void;
  setUserAccount: (account: UserAccount) => void;
  submitAppRating: (rating: number) => void;
  getLatestRating: () => AppRating | null;
  toggleDarkMode: () => void;
  signOut: () => void;
  resetAllData: () => void;
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
      appRatings: [],
      isDarkMode: false,
      
      updateBusinessInfo: (info) => {
        set({ businessInfo: info });
      },
      
      updatePaymentOptions: (options) => {
        set({ paymentOptions: options });
      },
      
      updateTaxSettings: (settings) => {
        set(state => ({ 
          taxSettings: { 
            ...state.taxSettings, 
            ...settings 
          } 
        }));
      },
      
      updateCurrency: (currency, currencySymbol) => {
        set(state => ({
          taxSettings: {
            ...state.taxSettings,
            currency,
            currencySymbol
          }
        }));
      },
      
      updateTaxRate: (taxRate) => {
        set(state => ({
          taxSettings: {
            ...state.taxSettings,
            defaultTaxRate: taxRate
          }
        }));
      },
      
      setUserAccount: (account) => {
        set({ userAccount: account });
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
          userAccount: {
            uid: '',
            email: '',
            isLoggedIn: false
          }
        });
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
          appRatings: [],
          isDarkMode: false
        });
      }
    }),
    {
      name: 'business-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);