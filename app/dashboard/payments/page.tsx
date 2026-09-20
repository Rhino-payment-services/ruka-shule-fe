'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreditCard, Search, CheckCircle, Loader2, Wallet, Users, Calendar, CircleDot, Hash } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { useEffect, useState } from 'react';
import { paymentsAPI, studentsAPI, schoolsAPI, API_BASE_URL } from '@/lib/api';
import { getApiErrorMessage, verifySchoolContextIssue } from '@/lib/api/errors';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeUgandaPhoneForStorage } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DataTableShell,
  StatusPill,
  TableHeadLabel,
  toneFromStatus,
} from '@/components/data-table';
import { toast } from 'sonner';
import { ListPagination } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FeeForPayment {
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

interface OneOffChargeForPayment {
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
}

interface SchoolProfile {
  code?: string;
  name?: string;
  phone?: string;
}

interface StudentLookupData {
  student: {
    id: string;
    registration_id: string;
    full_name: string;
    class: string;
    gender?: string;
    phone: string;
    school_fees_amount?: number;
  };
  school: {
    code: string;
    name: string;
  };
  available_fees: FeeForPayment[];
  available_one_off_charges?: OneOffChargeForPayment[];
  one_off_charges?: OneOffChargeForPayment[];
  payment_summary: {
    school_fees_amount?: number;
    total_fees: number;
    total_paid: number;
    total_outstanding: number;
    fee_outstanding?: number;
    one_off_outstanding?: number;
    carry_forward_balance?: number;
    payment_status: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  payment_method: string;
  registration_id: string;
  student_name?: string;
  fee_name?: string;
  school_name?: string;
  school_code?: string;
  paid_at?: string;
  created_at: string;
  updated_at?: string;
}

interface StudentPaymentSummary {
  registration_id: string;
  student_name: string;
  class: string;
  total_paid: number;
  total_fees: number;
  school_fees_amount?: number;
  outstanding: number;
  payment_status: string;
  payment_count: number;
  last_payment_at?: string;
  fees?: Array<{
    fee_id?: string;
    fee_name: string;
    fee_type?: string;
    amount: number;
    paid: number;
    outstanding: number;
    is_paid: boolean;
  }>;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);
  const [schoolChecked, setSchoolChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentPaymentSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Collect Payment state
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [schoolPhone, setSchoolPhone] = useState<string>('');
  const [lookupRegistrationId, setLookupRegistrationId] = useState('');
  const [studentLookupData, setStudentLookupData] = useState<StudentLookupData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeForPayment | null>(null);
  const [selectedOneOff, setSelectedOneOff] = useState<OneOffChargeForPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentPhoneTouched, setPaymentPhoneTouched] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  const syncSchoolProfile = async (): Promise<SchoolProfile | null> => {
    try {
      const res = await schoolsAPI.getMySchool();
      const school = res.data.data as SchoolProfile;
      if (school?.code) setSchoolCode(school.code);
      if (school?.phone) {
        setSchoolPhone(school.phone);
        setPaymentPhone((current) => (paymentPhoneTouched ? current : school.phone || current));
      }
      return school;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setSchoolSetupRequired(true);
      }
      return null;
    } finally {
      setSchoolChecked(true);
    }
  };

  useEffect(() => {
    // Load school once on mount. Do NOT refetch on every window focus —
    // /schools/me hits rdbs_core login and was burning the IP rate limit.
    void syncSchoolProfile();
  }, []);

  useEffect(() => {
    if (!schoolChecked || schoolSetupRequired) {
      setLoading(false);
      return;
    }
    loadPayments();
  }, [page, schoolChecked, schoolSetupRequired]);

  useEffect(() => {
    if (!paymentPhone && schoolPhone) {
      setPaymentPhone(schoolPhone);
    }
  }, [paymentPhone, schoolPhone]);

  const loadPayments = async () => {
    if (schoolSetupRequired) return;
    try {
      setLoading(true);
      const response = await paymentsAPI.list(page, DEFAULT_PAGE_SIZE);
      // Backend returns PaginatedResponse: { data, page, page_size, total, total_pages }
      const paymentsData = response.data.data || [];
      const total = response.data.total;
      setPayments(paymentsData);
      setTotalPayments(total !== undefined ? total : paymentsData.length);
      setTotalPages(normalizePaginationMeta(response.data).totalPages);
    } catch (err: unknown) {
      const schoolContext = await verifySchoolContextIssue(err, () => schoolsAPI.getMySchool());
      if (schoolContext === 'missing_school_link') {
        setSchoolSetupRequired(true);
      } else if (schoolContext === 'unexpected_context') {
        toast.error(
          'Your school link exists, but school context could not be verified. Please refresh and try again.',
        );
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to load payments'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setSearching(true);
      // Try to find student by registration_id, phone, or name
      const lookupParams: { registration_id?: string; phone?: string; school_code?: string } = {};
      
      // Check if it looks like a registration ID
      if (searchQuery.match(/^[A-Z0-9-]+$/)) {
        lookupParams.registration_id = searchQuery;
      } else if (searchQuery.match(/^\+?[0-9]+$/)) {
        // Looks like a phone number
        lookupParams.phone = searchQuery;
      }
      
      // Try student lookup first
      try {
        const studentRes = await studentsAPI.lookup(lookupParams);
          const students = studentRes.data.data;
          const student = Array.isArray(students) ? students[0] : students;

          if (student && student.id) {
            // Get payment summary for this student
            const summaryRes = await paymentsAPI.getSummary(student.id);
            setSearchResults(summaryRes.data.data);
          } else {
            setSearchResults(null);
          }
      } catch {
        setSearchResults(null);
      }
    } catch {
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

  const handlePaymentLookup = async (options?: { silent?: boolean }) => {
    // Avoid blocking lookup on /schools/me + rdbs wallet auth; only sync when code is missing.
    let latestSchoolCode = schoolCode;
    let latestSchoolPhone = schoolPhone;
    if (!latestSchoolCode) {
      const latestSchool = await syncSchoolProfile();
      latestSchoolCode = latestSchool?.code || '';
      latestSchoolPhone = latestSchool?.phone || '';
    }

    if (!lookupRegistrationId.trim() || !latestSchoolCode) {
      if (!options?.silent) {
        toast.error(schoolCode ? 'Enter student registration ID' : 'School not loaded');
      }
      return;
    }
    try {
      setLookupLoading(true);
      if (!options?.silent) {
        setStudentLookupData(null);
      }
      const res = await paymentsAPI.lookupStudentForPayment(lookupRegistrationId.trim(), latestSchoolCode);
      const data = res.data.data;
      setStudentLookupData(data);
      setPaymentPhone(latestSchoolPhone || data?.student?.phone || '');
      setPaymentPhoneTouched(false);
      // Let the user pick a fee and type the amount — do not auto-fill.
      setSelectedFee(null);
      setSelectedOneOff(null);
      setPaymentAmount('');
      if (!options?.silent) {
        toast.success('Student found');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      if (!options?.silent) {
        toast.error(axiosErr.response?.data?.error || 'Student not found');
      }
      setStudentLookupData(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!studentLookupData || (!selectedFee && !selectedOneOff) || !paymentAmount || !paymentPhone) {
      toast.error('Fill all required fields');
      return;
    }
    const selectedItem = selectedOneOff || selectedFee;
    if (!selectedItem?.id) {
      toast.error('Select a payable item, then try again.');
      return;
    }
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > selectedItem.outstanding || (selectedOneOff && Math.abs(amount - selectedOneOff.outstanding) > 0.01)) {
      toast.error(selectedOneOff
        ? `Additional charges must be paid in full: UGX ${selectedOneOff.outstanding.toLocaleString()}`
        : `Amount cannot exceed UGX ${selectedFee!.outstanding.toLocaleString()}`);
      return;
    }
    const phone = paymentPhone.replace(/\D/g, '');
    if (phone.length < 9) {
      toast.error('Enter a valid phone number');
      return;
    }
    const formattedPhone = normalizeUgandaPhoneForStorage(phone);

    try {
      setProcessingPayment(true);
      setPaymentReference(null);
      const paymentPayload: Record<string, unknown> = {
        registration_id: studentLookupData.student.registration_id,
        school_code: studentLookupData.school.code,
        amount,
        currency: 'UGX',
        payment_method: 'MOBILE_MONEY',
        phone_number: formattedPhone,
        description: selectedOneOff ? `Additional charge: ${selectedOneOff.name}` : `School fees: ${selectedFee!.name}`,
      };
      if (selectedOneOff) {
        paymentPayload.student_one_off_charge_id = selectedOneOff.id;
      } else {
        paymentPayload.fee_id = selectedFee!.id;
        paymentPayload.class = studentLookupData.student.class;
      }
      const res = await paymentsAPI.processPayment(paymentPayload);
      const payment = res.data.data;
      setPaymentReference(payment.reference);
      toast.success('Payment initiated. Check your phone to complete.');
      // Refresh list immediately so new payment appears without manual refresh
      loadPayments();
      // Poll for status
      let pollCount = 0;
      const maxPolls = 40; // 2 minutes
      const pollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          setProcessingPayment(false);
          return;
        }
        try {
          const statusRes = await paymentsAPI.getStatus(payment.reference);
          const status = (statusRes.data.data?.status || '').toLowerCase();
          if (status === 'completed' || status === 'paid') {
            clearInterval(pollInterval);
            toast.success('Payment completed!');
            setProcessingPayment(false);
            loadPayments();
            void handlePaymentLookup({ silent: true });
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(pollInterval);
            toast.error(`Payment ${status}`);
            setProcessingPayment(false);
          }
        } catch {
          // Ignore poll errors
        }
      }, 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(axiosErr.response?.data?.error || 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const enteredAmount = Number(paymentAmount);
  const amountExceeded =
    !!(selectedFee || selectedOneOff) &&
    paymentAmount !== '' &&
    Number.isFinite(enteredAmount) &&
    enteredAmount > (selectedOneOff || selectedFee)!.outstanding;

  const resetPaymentFlow = () => {
    setStudentLookupData(null);
    setSelectedFee(null);
    setSelectedOneOff(null);
    setPaymentAmount('');
    setPaymentReference(null);
  };

  const getStatusBadge = (status: string) => {
    const label =
      status.toLowerCase() === 'completed' || status.toLowerCase() === 'paid' || status.toLowerCase() === 'success'
        ? 'Paid'
        : status.toLowerCase() === 'pending'
          ? 'Initiated'
          : status;
    return (
      <StatusPill tone={toneFromStatus(status)} dot>
        {label}
      </StatusPill>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.paymentsRead}>
      <DashboardLayout>
        <div className="space-y-4">
          {schoolSetupRequired && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">School setup required</CardTitle>
                <CardDescription className="text-amber-800">
                  This account is active, but no school is linked yet. Complete school onboarding before collecting payments.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={() => window.location.assign('/dashboard/schools/onboard')} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Onboard School
                </Button>
                <Button variant="outline" onClick={() => window.location.assign('/dashboard/settings')}>
                  Open Settings
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-slate-500">View and manage payment transactions</p>
              {payments.length > 0 && (
                <>
                  <StatusPill tone="neutral">{totalPayments || payments.length} total</StatusPill>
                  <StatusPill tone="pending">
                    {payments.filter((p) => p.status === 'pending' || p.status === 'processing').length} pending
                  </StatusPill>
                  <StatusPill tone="success">
                    {payments.filter((p) => p.status === 'completed' || p.status === 'paid').length} completed
                  </StatusPill>
                </>
              )}
            </div>
          </div>

          {/* Collect Payment Card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
            <div className="border-b border-slate-100 px-4 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#08163d]">
                <Wallet className="h-4 w-4 text-[#E8A317]" />
                Collect Payment
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Look up a student and collect fees via Mobile Money
              </p>
            </div>
            <div className="space-y-4 px-4 py-4">
              {/* Step 1: Lookup */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-slate-500">Student Registration ID</label>
                  <Input
                    placeholder="e.g. STU001"
                    value={lookupRegistrationId}
                    onChange={(e) => setLookupRegistrationId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePaymentLookup()}
                    className="h-10 rounded-full border-0 bg-[#F8F9FB] shadow-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-[#E8A317]/35"
                  />
                </div>
                {schoolCode && studentLookupData?.school?.name && (
                  <div className="text-xs text-slate-400">
                    School: {studentLookupData.school.name} ({schoolCode})
                  </div>
                )}
                {schoolCode && !studentLookupData && (
                  <div className="text-xs text-slate-400">School: {schoolCode}</div>
                )}
                <Button
                  onClick={() => void handlePaymentLookup()}
                  disabled={lookupLoading || !schoolCode}
                  className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                >
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Lookup
                    </>
                  )}
                </Button>
              </div>

              {/* Step 2: Fees & Payment */}
              {studentLookupData && (
                  <div className="mt-4 space-y-4 rounded-2xl bg-[#F8F9FB] p-4 ring-1 ring-black/3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#08163d]">
                        {studentLookupData.student.full_name} — {studentLookupData.student.class}
                        {studentLookupData.student.gender
                          ? ` (${studentLookupData.student.gender})`
                          : ''}
                      </h3>
                      {studentLookupData.school?.name && (
                        <p className="mt-0.5 text-xs text-slate-500">{studentLookupData.school.name}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetPaymentFlow} className="rounded-full">
                      Change student
                    </Button>
                  </div>
                  <div className="grid gap-2 text-sm">
                    {studentLookupData.payment_summary.school_fees_amount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">School Fees</span>
                        <span className="font-semibold text-[#08163d]">
                          UGX {studentLookupData.payment_summary.school_fees_amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Carry-forward</span>
                      <span className="font-semibold text-amber-700">
                        UGX {(studentLookupData.payment_summary.carry_forward_balance || 0).toLocaleString()}
                      </span>
                    </div>
                    {studentLookupData.payment_summary.one_off_outstanding !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Additional Charges</span>
                        <span className="font-semibold text-red-600">
                          UGX {studentLookupData.payment_summary.one_off_outstanding.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total outstanding</span>
                      <span className="font-semibold text-red-600">
                        UGX {studentLookupData.payment_summary.total_outstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select fee to pay</label>
                    <div className="grid gap-2">
                      {studentLookupData.available_fees
                        .filter((f) => !!f.id && !f.is_paid && f.outstanding > 0)
                        .map((fee) => (
                          <button
                            key={fee.id}
                            type="button"
                            onClick={() => {
                              setSelectedFee(fee);
                              setSelectedOneOff(null);
                              // Locked fees require full outstanding; otherwise user types the amount.
                              setPaymentAmount(fee.is_locked ? fee.outstanding.toString() : '');
                            }}
                            className={`flex items-center justify-between rounded-xl p-3 text-left ring-1 transition-colors ${
                              selectedFee?.id === fee.id
                                ? 'bg-white ring-[#08163d]/20'
                                : 'bg-white ring-slate-200 hover:ring-[#08163d]/15'
                            }`}
                          >
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              <p className="text-xs text-slate-500">
                                Outstanding: UGX {fee.outstanding.toLocaleString()}
                              </p>
                              {fee.is_locked && (
                                <StatusPill tone="warning" dot className="mt-1">Locked</StatusPill>
                              )}
                              {fee.fee_type === 'school_fees' && (
                                <StatusPill tone="info" className="mt-1">
                                  School Fees
                                </StatusPill>
                              )}
                            </div>
                            {selectedFee?.id === fee.id && (
                              <CheckCircle className="h-5 w-5 text-[#08163d]" />
                            )}
                          </button>
                        ))}
                    </div>
                    {studentLookupData.available_fees.filter((f) => !!f.id && !f.is_paid && f.outstanding > 0).length === 0 && (
                      <p className="text-sm text-slate-500">
                        No payable fee structure for this student. Create an active school fees fee for their class, or all fees are paid.
                      </p>
                    )}
                  </div>

                  {Array.isArray(studentLookupData.available_one_off_charges) && studentLookupData.available_one_off_charges.filter((charge) => charge.status === 'unpaid' && charge.outstanding > 0).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Additional charges (full amount required)</label>
                      <div className="grid gap-2">
                        {studentLookupData.available_one_off_charges
                          .filter((charge) => charge.status === 'unpaid' && charge.outstanding > 0)
                          .map((charge) => (
                            <button
                              key={charge.id}
                              type="button"
                              onClick={() => {
                                setSelectedOneOff(charge);
                                setSelectedFee(null);
                                setPaymentAmount(charge.outstanding.toString());
                              }}
                              className={`flex items-center justify-between rounded-xl p-3 text-left ring-1 transition-colors ${
                                selectedOneOff?.id === charge.id ? 'bg-white ring-[#08163d]/20' : 'bg-white ring-slate-200 hover:ring-[#08163d]/15'
                              }`}
                            >
                              <div><p className="font-medium">{charge.name}</p><p className="text-xs text-slate-500">Outstanding: UGX {charge.outstanding.toLocaleString()}</p></div>
                              {selectedOneOff?.id === charge.id && <CheckCircle className="h-5 w-5 text-[#08163d]" />}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(studentLookupData.one_off_charges) && studentLookupData.one_off_charges.some((charge) => ['paid', 'waived', 'pending'].includes(charge.status)) && (
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                      <h4 className="mb-2 text-sm font-semibold">Additional charge history</h4>
                      <div className="space-y-2">
                        {studentLookupData.one_off_charges.filter((charge) => ['paid', 'waived', 'pending'].includes(charge.status)).map((charge) => (
                          <div key={`history-${charge.id}`} className="flex items-center justify-between text-sm">
                            <span>{charge.name}{charge.external_ref ? ` · ${charge.external_ref}` : ''}</span>
                            <StatusPill tone={toneFromStatus(charge.status)} dot>
                              {charge.status}
                            </StatusPill>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedFee || selectedOneOff) && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Amount (UGX)</label>
                          <Input
                            type="number"
                            min="1"
                            max={(selectedOneOff || selectedFee)!.outstanding}
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            readOnly={!!selectedOneOff || !!selectedFee?.is_locked}
                            disabled={!!selectedOneOff || !!selectedFee?.is_locked}
                            placeholder={(selectedOneOff || selectedFee)!.outstanding.toString()}
                          />
                          <p className="text-xs text-slate-500">
                            {selectedOneOff
                              ? `Additional charge: full amount of UGX ${selectedOneOff.outstanding.toLocaleString()} is required`
                              : selectedFee?.is_locked
                              ? `Locked fee: full outstanding amount required, UGX ${selectedFee.outstanding.toLocaleString()}`
                              : `Enter the amount to send. Max outstanding: UGX ${(selectedFee?.outstanding ?? 0).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Phone (Mobile Money)</label>
                          <Input
                            placeholder="256700123456"
                            value={paymentPhone}
                            readOnly
                            disabled
                          />
                          <p className="text-xs text-slate-500">
                            Uses the school payment phone saved in Settings.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={handleProcessPayment}
                          disabled={processingPayment || amountExceeded || !paymentAmount || !Number.isFinite(enteredAmount) || enteredAmount <= 0}
                          className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                        >
                          {processingPayment ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Wallet className="h-4 w-4 mr-2" />
                              Pay UGX {(Number(paymentAmount) || (selectedOneOff || selectedFee)!.outstanding).toLocaleString()}
                            </>
                          )}
                        </Button>
                      </div>
                      {paymentReference && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                          <p className="font-medium text-blue-900">Payment initiated</p>
                          <p className="text-blue-700 font-mono">Ref: {paymentReference}</p>
                          <p className="text-blue-600 mt-1">Check the payer&apos;s phone to complete.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!schoolCode && (
                <p className="text-sm text-amber-600">Loading school information...</p>
              )}
            </div>
          </div>

          {/* Student Search Card */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
            <div className="border-b border-slate-100 px-4 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#08163d]">
                <Search className="h-4 w-4 text-[#E8A317]" />
                Search Student Payment Status
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Enter student ID, phone number, or name to check payment status
              </p>
            </div>
            <div className="px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Enter student ID, phone, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleStudentSearch();
                    }
                  }}
                  className="h-10 min-w-[220px] flex-1 rounded-full border-0 bg-[#F8F9FB] shadow-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-[#E8A317]/35"
                />
                <Button
                  onClick={handleStudentSearch}
                  disabled={searching}
                  className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="mt-4 rounded-2xl bg-[#F8F9FB] p-4 ring-1 ring-black/5">
                  <h3 className="mb-3 text-sm font-semibold text-[#08163d]">Payment Summary</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-400">Student</p>
                      <p className="font-semibold text-[#08163d]">{searchResults.student_name}</p>
                      <p className="text-[11px] text-slate-400">ID: {searchResults.registration_id}</p>
                      <p className="text-[11px] text-slate-400">Class: {searchResults.class}</p>
                      {searchResults.school_fees_amount !== undefined && (
                        <p className="text-[11px] text-slate-400">
                          School Fees: UGX {searchResults.school_fees_amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Total Fees</p>
                      <p className="text-lg font-semibold text-[#08163d]">UGX {searchResults.total_fees.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Total Paid</p>
                      <p className="text-lg font-semibold text-emerald-600">UGX {searchResults.total_paid.toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400">{searchResults.payment_count} payment(s)</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Outstanding</p>
                      <p className={`text-lg font-semibold ${searchResults.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        UGX {searchResults.outstanding.toLocaleString()}
                      </p>
                      <StatusPill
                        tone={
                          searchResults.payment_status === 'full'
                            ? 'success'
                            : searchResults.payment_status === 'partial'
                              ? 'pending'
                              : 'danger'
                        }
                        dot
                      >
                        {searchResults.payment_status === 'full'
                          ? 'Fully Paid'
                          : searchResults.payment_status === 'partial'
                            ? 'Partially Paid'
                            : 'Outstanding'}
                      </StatusPill>
                    </div>
                  </div>
                  {Array.isArray(searchResults.fees) && searchResults.fees.length > 0 && (
                    <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-black/5">
                      <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Fee Breakdown
                      </h4>
                      <div className="space-y-2">
                        {searchResults.fees.map((fee) => (
                          <div key={`${fee.fee_id || fee.fee_name}-${fee.fee_type || 'fee'}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-[#08163d]">
                                {fee.fee_name}
                                {fee.fee_type === 'school_fees' ? ' (School Fees)' : fee.fee_type ? ' (Other Fee)' : ''}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Paid: UGX {(fee.paid || 0).toLocaleString()} · Outstanding: UGX {(fee.outstanding || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right text-sm font-semibold text-[#08163d]">
                              UGX {(fee.amount || 0).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchResults.last_payment_at && (
                    <div className="mt-3 border-t border-slate-200/80 pt-3">
                      <p className="text-xs text-slate-400">
                        Last Payment: {formatDate(searchResults.last_payment_at)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {searchQuery && !searchResults && !searching && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200/80">
                  No payment information found for this student.
                </div>
              )}
            </div>
          </div>

          <DataTableShell
            title="Payment Transactions"
            description="All payment transactions for your school"
            toolbar={
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPayments()}
                disabled={loading}
                className="h-8 rounded-full border-slate-200 px-3 text-xs"
              >
                <Loader2 className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            }
            footer={
              payments.length > 0 ? (
                <ListPagination
                  page={page}
                  totalPages={totalPages}
                  total={totalPayments}
                  loading={loading}
                  onPageChange={setPage}
                />
              ) : null
            }
          >
            {loading ? (
              <LoadingState label="Loading payments…" className="py-10" />
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08163d]/5">
                  <CreditCard className="h-6 w-6 text-[#08163d]/50" />
                </div>
                <p className="text-sm text-slate-400">No payments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <TableHeadLabel icon={Hash}>Reference</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Users}>Student</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Fee</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Amount</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Method</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={CircleDot}>Status</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Date</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Updated</TableHeadLabel>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        <a
                          href={`${API_BASE_URL}/receipts/${payment.reference}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#08163d] hover:text-[#E8A317] hover:underline"
                          title="View receipt"
                        >
                          {payment.reference}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#08163d]">{payment.student_name || 'N/A'}</p>
                          <p className="text-[11px] text-slate-400">ID: {payment.registration_id}</p>
                          {payment.school_name && (
                            <p className="text-[11px] text-slate-400">{payment.school_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{payment.fee_name || 'N/A'}</TableCell>
                      <TableCell className="text-sm font-semibold text-[#08163d]">
                        {payment.currency}{' '}
                        {payment.amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {payment.payment_method === 'MOBILE_MONEY'
                          ? 'Mobile Money'
                          : payment.payment_method || 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {formatDate(payment.paid_at || payment.created_at)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {payment.updated_at
                          ? new Date(payment.updated_at).toLocaleDateString()
                          : new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTableShell>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
