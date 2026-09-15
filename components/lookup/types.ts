export interface Student {
  id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  school_fees_amount?: number;
  class: string;
  gender?: string | null;
  stream?: string | null;
  school_name?: string;
  school_code?: string;
}

export interface FeeForPayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  fee_type?: string;
  total_paid: number;
  outstanding: number;
  is_paid: boolean;
  is_locked: boolean;
}

export interface OneOffChargeForPayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  status: string;
  total_paid: number;
  outstanding: number;
  is_paid: boolean;
  paid_at?: string;
  payment_reference?: string;
  external_ref?: string;
  payment_method?: string;
}

export interface StudentLookupData {
  student: {
    id: string;
    registration_id: string;
    full_name: string;
    class: string;
    gender?: string;
    phone: string;
    school_fees_amount?: number;
  };
  school: { code: string; name: string };
  available_fees: FeeForPayment[];
  available_one_off_charges?: OneOffChargeForPayment[];
  one_off_charges?: OneOffChargeForPayment[];
  payment_summary: {
    total_fees: number;
    total_paid: number;
    total_outstanding: number;
    fee_total?: number;
    one_off_total?: number;
    fee_outstanding?: number;
    one_off_outstanding?: number;
    school_fees_amount?: number;
    school_fee_total?: number;
    other_fee_total?: number;
    payment_status: string;
  };
}

export type LookupStep = 'school' | 'student' | 'pay';

export function formatUgx(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}
