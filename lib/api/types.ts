// ---------------------------------------------------------------------------
// Shared API response wrappers
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type UserRole = 'admin' | 'school_admin' | 'parent';

export interface User {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  school_id?: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: User;
}

// ---------------------------------------------------------------------------
// Schools
// ---------------------------------------------------------------------------

export interface WalletInfo {
  id: string;
  currency: string;
  balance: number;
  wallet_type: string;
  is_active: boolean;
}

export interface School {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address?: string;
  // status is always present from the backend but typing it as optional
  // avoids breakage if a future response omits it
  status: string;
  merchant_id?: string;
  merchant_code?: string;
  merchant_status?: string;
  merchant_status_note?: string;
  merchant_rejection_reason?: string;
  business_wallet_id?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_code?: string;
  bank_branch?: string;
  admin_id?: string;
  auto_settlement_enabled?: boolean;
  settlement_frequency?: string;
  settlement_min_threshold?: number;
  last_settlement_at?: string;
  wallet?: WalletInfo;
  created_at: string;
}

export interface PublicSchool {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  merchant_id?: string;
  merchant_code?: string;
  business_wallet_id?: string;
  merchant_status?: string;
  merchant_rejection_reason?: string;
  merchant_status_note?: string;
  status?: string;
  classes?: string[];
  wallet?: WalletInfo;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export interface Student {
  id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  class: string;
  stream?: string;
  status: string;
  school_id: string;
  school_name?: string;
  school_code?: string;
  school_fees_amount?: number;
  resolved_school_fees?: number;
  total_fees_due?: number;
  fee_source?: string;
  scholarship_type?: string;
  scholarship_percentage?: number;
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
  created_at: string;
  deleted_at?: string;
}

// Student as returned from the public lookup/payment flow
export interface StudentPaymentInfo {
  id: string;
  registration_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  class: string;
  stream?: string;
  phone: string;
  school_id: string;
  school_fees_amount?: number;
  scholarship_type?: string;
  scholarship_percentage?: number;
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

export type FeeType = 'school_fees' | 'other_fees';
export type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'termly' | 'annual' | 'one_off';

export interface Fee {
  id: string;
  name: string;
  amount: number;
  currency: string;
  fee_type: FeeType;
  billing_frequency?: BillingFrequency | string;
  academic_year: string;
  term?: string | null | undefined;
  class?: string | null | undefined;
  stream?: string | null | undefined;
  due_date?: string | null | undefined;
  status: 'active' | 'inactive';
  is_locked: boolean;
  school_id: string;
  created_at: string;
  updated_at?: string;
}

// Fee as returned from the payment lookup flow
export interface FeeForPayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  fee_type?: FeeType;
  academic_year: string;
  term?: string;
  class?: string;
  stream?: string;
  due_date?: string;
  total_paid: number;
  outstanding: number;
  is_paid: boolean;
  is_locked: boolean;
  status?: string;
  last_payment_at?: string;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'MOBILE_MONEY' | 'WALLET';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  registration_id: string;
  student_name?: string;
  fee_id?: string;
  fee_name?: string;
  school_name?: string;
  school_code?: string;
  transaction_id?: string;
  paid_at?: string;
  last_status_sync_at?: string;
  created_at: string;
}

export interface FeePaymentStatus {
  fee_id?: string;
  fee_name: string;
  fee_type?: FeeType;
  amount: number;
  paid: number;
  outstanding: number;
  is_paid: boolean;
}

export interface PaymentSummary {
  registration_id: string;
  student_name: string;
  class: string;
  total_fees: number;
  fee_total?: number;
  school_fee_total?: number;
  other_fee_total?: number;
  one_off_total?: number;
  total_paid: number;
  outstanding: number;
  fee_outstanding?: number;
  one_off_outstanding?: number;
  school_fees_amount?: number;
  payment_status: 'full' | 'partial' | 'outstanding';
  payment_count: number;
  last_payment_at?: string;
  fees?: FeePaymentStatus[];
  one_off_charges?: OneOffChargeForPayment[];
}

export interface TermPaymentStatus {
  registration_id: string;
  student_name: string;
  class: string;
  academic_year: string;
  term: string;
  total_fees: number;
  total_paid: number;
  outstanding: number;
  carry_forward_balance?: number;
  payment_status: 'full' | 'partial' | 'outstanding';
  fees?: FeePaymentStatus[];
}

export interface StudentPaymentSummary {
  school_fees_amount?: number;
  school_fee_total?: number;
  other_fee_total?: number;
  total_fees: number;
  fee_total?: number;
  one_off_total?: number;
  total_paid: number;
  total_outstanding: number;
  fee_outstanding?: number;
  one_off_outstanding?: number;
  carry_forward_balance?: number;
  payment_status: 'full' | 'partial' | 'outstanding';
  payment_count: number;
  last_payment_at?: string;
}

export interface SchoolPaymentInfo {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  merchant_code?: string;
  business_wallet_id?: string;
  accepts_partial_payment?: boolean;
}

export interface OneOffChargeForPayment {
  id: string;
  one_off_charge_id: string;
  name: string;
  amount: number;
  currency: string;
  status: string;
  total_paid: number;
  outstanding: number;
  is_paid: boolean;
  paid_at?: string;
  payment_id?: string;
  payment_reference?: string;
  external_ref?: string;
  payment_method?: string;
}

export interface StudentLookupResponse {
  student: StudentPaymentInfo;
  school: SchoolPaymentInfo;
  available_fees: FeeForPayment[];
  available_one_off_charges?: OneOffChargeForPayment[];
  one_off_charges?: OneOffChargeForPayment[];
  payment_summary: StudentPaymentSummary;
}

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------

export interface Settlement {
  id: string;
  school_id?: string;
  parent_settlement_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'escrow_funded';
  retry_count: number;
  failure_reason?: string;
  initiated_by?: string;
  initiated_at?: string;
  settled_at?: string;
  completed_at?: string;
  reference: string;
  /** RDBS escrow-fund transaction id (business → escrow). */
  escrow_transaction_id?: string;
  /** RDBS bank-payout transaction id (escrow → bank). */
  transaction_id?: string;
  notes?: string;
  created_at: string;
}

// The listSettlements endpoint returns this envelope (not a plain array)
export interface SettlementsResponse {
  settlements: Settlement[];
  summary: SettlementSummary;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface SettlementSummary {
  available_for_settlement: number;
  total_collected: number;
  total_settled: number;
  pending_settlements: number;
  business_wallet_balance?: number;
  escrow_balance?: number;
  escrow_wallet_id?: string;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminStats {
  total_schools: number;
  total_students: number;
  total_payments: number;
  total_revenue: number;
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string;
  role: string;
  school_id?: string;
  school_name?: string;
  created_at: string;
}
