import { useBusinessStore } from '@/store/businessStore';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const formatCurrency = (amount: number, currencyCode?: string, currencySymbol?: string): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    // Get current currency from store if not provided
    if (!currencyCode || !currencySymbol) {
      const store = useBusinessStore.getState();
      currencyCode = store.taxSettings.currency;
      currencySymbol = store.taxSettings.currencySymbol;
    }
    return `${currencySymbol}0.00`;
  }
  
  // Get current currency from store if not provided
  if (!currencyCode || !currencySymbol) {
    const store = useBusinessStore.getState();
    currencyCode = store.taxSettings.currency;
    currencySymbol = store.taxSettings.currencySymbol;
  }
  
  // For currencies that typically don't show decimals (like JPY, KRW)
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'PYG'];
  const minimumFractionDigits = noDecimalCurrencies.includes(currencyCode) ? 0 : 2;
  const maximumFractionDigits = noDecimalCurrencies.includes(currencyCode) ? 0 : 2;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is not supported by Intl.NumberFormat
    const formattedAmount = amount.toFixed(minimumFractionDigits);
    return `${currencySymbol}${formattedAmount}`;
  }
};

export const getRandomColor = (): string => {
  const colors = [
    '#4A7AFF', '#6C63FF', '#FF5252', '#4CAF50', 
    '#FFC107', '#9C27B0', '#FF9800', '#03A9F4'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};