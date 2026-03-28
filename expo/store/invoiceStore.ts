import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Invoice } from '@/types';

interface InvoiceState {
  invoices: Invoice[];
  nextInvoiceNumber: number;
  
  // Add proper function implementation
  getInvoicesForJob: (jobId: string) => Invoice[];
  resetAllData: () => void;
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      invoices: [],
      nextInvoiceNumber: 1,
      
      // Implement the function to return invoices for a specific job
      getInvoicesForJob: (jobId: string) => {
        const { invoices } = get();
        return invoices.filter(invoice => invoice.jobId === jobId);
      },
      
      resetAllData: () => {
        set({
          invoices: [],
          nextInvoiceNumber: 1
        });
      }
    }),
    {
      name: 'invoices-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);