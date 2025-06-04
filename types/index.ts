export interface Job {
  id: string;
  title: string;
  client: string;
  hourlyRate: number;
  color: string;
  settings?: JobSettings;
  createdAt: number;
}

export interface JobSettings {
  // Pay period settings
  payPeriodType?: PayPeriodType;
  payPeriodStartDay?: number;
  
  // Time rounding settings (legacy)
  roundTime?: RoundTimeType;
  
  // New time rounding settings
  timeRounding?: TimeRoundingSettings;
  
  // Organization
  tags?: string[];
  location?: string;
  
  // Reminders
  clockOutReminders?: boolean;
  dailyReminderThreshold?: number;
  weeklyReminderThreshold?: number;
  
  // Breaks
  automaticBreaks?: boolean;
  presetBreaks?: PresetBreak[];
  
  // Overtime settings
  dailyOvertime?: OvertimeType;
  dailyOvertimeThreshold?: number;
  dailyOvertimeRate?: number;
  weeklyOvertime?: OvertimeType;
  weeklyOvertimeThreshold?: number;
  weeklyOvertimeRate?: number;
  
  // Financial settings
  estimatedTaxRate?: number;
  deductions?: number;
}

export interface TimeRoundingSettings {
  enabled: boolean;
  direction: RoundingDirection;
  interval: RoundingInterval;
  bufferTime: number;
}

export type PayPeriodType = 'weekly' | 'biweekly' | 'monthly';
export type RoundTimeType = 'none' | '15min' | '30min' | '1hour';
export type OvertimeType = 'none' | 'daily' | 'weekly';
export type RoundingDirection = 'up' | 'down';
export type RoundingInterval = '15min' | '30min' | '1hour';

export interface PresetBreak {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
  duration: number; // in minutes
}

export interface BreakEntry {
  id: string;
  startTime: number;
  endTime: number | null;
}

export interface TimeEntry {
  id: string;
  jobId: string;
  startTime: number;
  endTime: number | null;
  note: string;
  breaks?: BreakEntry[];
  isOnBreak: boolean;
  createdAt: number;
  paidInPeriodId?: string;
}

export interface PayPeriod {
  id: string;
  jobId: string;
  startDate: number;
  endDate: number;
  totalDuration: number;
  totalEarnings: number;
  isPaid: boolean;
  paidDate?: number;
  timeEntryIds: string[];
  createdAt: number;
}

export interface JobWithDuration extends Job {
  totalDuration: number;
  isActive: boolean;
  activeEntryId?: string;
}

export interface JobWithPayPeriods extends JobWithDuration {
  payPeriods: PayPeriod[];
  paidEarnings: number;
  unpaidEarnings: number;
  paidDuration: number;
  unpaidDuration: number;
}

export interface BusinessInfo {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  taxId?: string;
  logo?: string;
}

export interface PaymentOptions {
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  paymentInstructions: string;
}

export interface TaxSettings {
  defaultTaxRate: number;
  currency: string;
  currencySymbol: string;
}

export interface UserAccount {
  uid: string;
  id: string; // This should always be set to the same value as uid
  email: string;
  displayName: string;
  photoURL: string | null;
  isLoggedIn: boolean;
  createdAt?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserAccount | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  issueDate: number;
  dueDate: number;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  jobId?: string;
  timeEntryIds?: string[];
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  createdAt: number;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface SupportRequest {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  deviceInfo?: string;
  appVersion?: string;
  createdAt: string;
}

// Sync Queue Types
export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncEntityType = 'job' | 'timeEntry' | 'payPeriod' | 'businessInfo';

export interface SyncQueueItem {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  lastError?: string;
}

export interface NetworkInfo {
  isConnected: boolean;
  type: string | null;
}