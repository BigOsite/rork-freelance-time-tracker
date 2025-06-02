export interface BusinessInfo {
  name: string;
  shortName?: string;
  businessNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  licenseNumber?: string;
  industry?: string;
  logo?: string;
}

export interface PaymentOptions {
  stripeEnabled: boolean;
  paypalEnabled: boolean;
  stripeAccountId?: string;
  paypalEmail?: string;
  paymentInstructions: string;
}

export interface TaxSettings {
  defaultTaxRate: number;
  currency: string;
  currencySymbol: string;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  isLoggedIn: boolean;
  accessToken?: string;
  idToken?: string;
  createdAt?: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends AuthCredentials {
  displayName: string;
}

export interface AuthResponse {
  success: boolean;
  user: UserAccount;
  token: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserAccount | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export type PayPeriodType = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export type RoundTimeType = 'none' | '15min' | '30min' | '1hour';

export type RoundingDirection = 'up' | 'down';

export type RoundingInterval = '15min' | '30min' | '1hour';

export type OvertimeType = 'none' | 'daily' | 'weekly';

export interface PresetBreak {
  id: string;
  name: string;
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  duration: number; // Duration in minutes
  days: string[]; // Days of the week: "Monday", "Tuesday", etc.
}

export interface TimeRoundingSettings {
  enabled: boolean;
  direction: RoundingDirection;
  interval: RoundingInterval;
  bufferTime: number; // 0-30 minutes
}

export interface JobSettings {
  automaticBreaks?: boolean;
  presetBreaks?: PresetBreak[];
  payPeriodType?: PayPeriodType;
  payPeriodStartDay?: number; // 0-6 for weekly/biweekly (0 = Sunday), 1-31 for monthly
  payPeriodStartDate?: number; // Timestamp for custom pay periods
  roundTime?: RoundTimeType; // Legacy field - kept for backward compatibility
  timeRounding?: TimeRoundingSettings;
  tags?: string[];
  location?: string;
  clockOutReminders?: boolean;
  dailyReminderThreshold?: number; // hours after which to remind daily
  weeklyReminderThreshold?: number; // hours after which to remind weekly
  dailyOvertime?: OvertimeType;
  weeklyOvertime?: OvertimeType;
  dailyOvertimeThreshold?: number; // hours
  weeklyOvertimeThreshold?: number; // hours
  dailyOvertimeRate?: number; // multiplier (e.g., 1.5 for time and a half)
  weeklyOvertimeRate?: number; // multiplier
  estimatedTaxRate?: number; // percentage
  deductions?: number; // flat amount
}

export interface Job {
  id: string;
  title: string;
  client: string;
  hourlyRate: number;
  color: string;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
  settings?: JobSettings;
}

export interface TimeEntry {
  id: string;
  jobId: string;
  startTime: number;
  endTime: number | null;
  breaks: Break[];
  note?: string;
  createdAt: number;
  updatedAt?: number;
  isOnBreak?: boolean;
  paidInPeriodId?: string; // Reference to the pay period this entry was marked as paid in
}

export interface Break {
  id: string;
  startTime: number;
  endTime: number | null;
  duration?: number;
}

export interface PayPeriod {
  id: string;
  jobId: string;
  startDate: number;
  endDate: number;
  isPaid: boolean;
  paidDate?: number;
  timeEntryIds: string[];
  totalDuration: number;
  totalEarnings: number;
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

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  timeEntryIds: string[];
}

export interface InvoiceClient {
  name: string;
  email: string;
  address: string;
  phone: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  number: string;
  jobId: string;
  client: InvoiceClient;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
  terms?: string;
  issueDate: number;
  dueDate: number;
  paidAt?: number;
  status: InvoiceStatus;
  createdAt: number;
  updatedAt: number;
  templateId?: string;
  colorScheme?: string;
  logoUrl?: string;
  logoSize?: string;
  customOptions?: any;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  thumbnail: string;
}

export interface InvoiceCustomization {
  templateId: string;
  colorScheme: string;
  logoUrl?: string;
  logoSize?: string;
  removeBackground?: boolean;
  showOptions?: {
    quantity: boolean;
    unitPrice: boolean;
    tax: boolean;
    discount: boolean;
    notes: boolean;
    terms: boolean;
    businessName: boolean;
    businessAddress: boolean;
    businessContact: boolean;
    paymentOptions: boolean;
    signature: boolean;
    thankYouMessage: boolean;
    dueDate: boolean;
    invoiceNumber: boolean;
  };
  fontOption?: string;
  highContrast?: boolean;
  customLabels?: {
    invoiceTitle: string;
    billTo: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
    subtotal: string;
    tax: string;
    total: string;
    balanceDue: string;
  };
  isGradient?: boolean;
}

// Define more specific types for color schemes
export type SolidColorScheme = {
  primary: string;
  secondary: string;
  colors?: never;
};

export type GradientColorScheme = {
  colors: string[];
  primary?: never;
  secondary?: never;
};

export type ColorScheme = SolidColorScheme | GradientColorScheme;

export interface SupportMessage {
  id: string;
  message: string;
  userEmail?: string;
  deviceInfo?: string;
  appVersion?: string;
  createdAt: number;
  status: 'new' | 'in-progress' | 'resolved';
}

export interface SupportMessageInput {
  message: string;
  userEmail?: string;
  deviceInfo?: string;
  appVersion?: string;
}