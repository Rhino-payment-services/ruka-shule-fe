'use client';

import { useState, useEffect } from 'react';
import { Search, School, User, GraduationCap, ArrowRight, ArrowLeft, CheckCircle2, Wallet, Loader2 } from 'lucide-react';
import { studentsAPI, schoolsAPI, paymentsAPI } from '@/lib/api';
import type { PublicSchoolLookupResponse } from '@/lib/api';
import { normalizeUgandaPhoneForStorage } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RukapayLogo } from '@/components/RukapayLogo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Student {
  id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  school_fees_amount?: number;
  class: string;
  stream?: string | null;
  school_name?: string;
  school_code?: string;
}

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
  payment_method?: string;
}

interface StudentLookupData {
  student: { id: string; registration_id: string; full_name: string; class: string; phone: string; school_fees_amount?: number };
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

type Step = 'school' | 'student';

export default function LookupPage() {
  const [step, setStep] = useState<Step>('school');
  const [schoolIdentifier, setSchoolIdentifier] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [studentId, setStudentId] = useState('');
  
  const [school, setSchool] = useState<PublicSchoolLookupResponse | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment flow (visitor can pay after lookup)
  const [studentLookupData, setStudentLookupData] = useState<StudentLookupData | null>(null);
  const [lookupPaymentLoading, setLookupPaymentLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeForPayment | null>(null);
  const [selectedOneOff, setSelectedOneOff] = useState<OneOffChargeForPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Prevent scroll restoration on page reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  }, []);

  const schoolClasses = school?.classes || [];

  const resetToSchoolEntry = () => {
    setStep('school');
    setSchool(null);
    setSelectedClass('');
    setStudentId('');
    setStudents([]);
    setStudentLookupData(null);
    setSelectedFee(null);
    setSelectedOneOff(null);
    setPaymentAmount('');
    setPaymentPhone('');
    setPaymentReference(null);
    setError('');
  };

  const handleSchoolLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSchool(null);
    setStudents([]);
    setSelectedClass('');

    try {
      if (!schoolIdentifier.trim()) {
        setError('Please enter a school code or merchant ID');
        setLoading(false);
        return;
      }

      const schoolResponse = await schoolsAPI.lookup(schoolIdentifier.trim());
      const schoolData = schoolResponse.data.data;
      setSchool(schoolData);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'School not found. Please check the school code or merchant ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (className: string) => {
    setSelectedClass(className);
    setError('');
  };

  const handleProceedToStudentSearch = () => {
    if (!school) {
      setError('Please lookup the school first');
      return;
    }
    if (schoolClasses.length > 0 && !selectedClass) {
      setError('Please select a class');
      return;
    }
    setStep('student');
    setError('');
  };

  const handleStudentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStudents([]);
    setStudentLookupData(null);
    setSelectedFee(null);
    setSelectedOneOff(null);
    setPaymentAmount('');
    setPaymentReference(null);

    try {
      if (!studentId.trim()) {
        setError('Please enter a student ID');
        setLoading(false);
        return;
      }

      if (!school) {
        setError('School information is missing. Please go back and lookup the school again.');
        setLoading(false);
        return;
      }

      const response = await studentsAPI.lookup({ 
        registration_id: studentId.trim(), 
        school_code: school.code 
      });

      const foundStudents = response.data.data || [];
      
      const filteredStudents = selectedClass 
        ? foundStudents.filter((s: Student) => s.class === selectedClass)
        : foundStudents;

      setStudents(filteredStudents);
      
      if (filteredStudents.length === 0) {
        setError(
          selectedClass
            ? `No student found with that ID in ${selectedClass}. Check the ID or class.`
            : 'No students found. Please check the student ID and try again.',
        );
      } else {
        // Load payable fees immediately so the visitor sees all balances.
        await loadPaymentDetails(filteredStudents[0]);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    // Payment panel → student search results
    if (studentLookupData) {
      setStudentLookupData(null);
      setSelectedFee(null);
      setSelectedOneOff(null);
      setPaymentAmount('');
      setPaymentReference(null);
      return;
    }
    // Student search → school/class step
    if (step === 'student') {
      setStep('school');
      setStudents([]);
      setStudentId('');
      setSelectedFee(null);
      setSelectedOneOff(null);
      setPaymentReference(null);
      return;
    }
    // School found / class select → school code entry
    if (school) {
      resetToSchoolEntry();
    }
  };

  const loadPaymentDetails = async (student: Student) => {
    if (!school) return;
    try {
      setLookupPaymentLoading(true);
      setError('');
      const res = await paymentsAPI.lookupStudentForPayment(student.registration_id, school.code);
      const data = res.data.data;
      setStudentLookupData(data);
      setPaymentPhone(data?.student?.phone || student.phone || '');
      setSelectedFee(null);
      setSelectedOneOff(null);
      setPaymentAmount('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Failed to load payment details');
      setStudentLookupData(null);
    } finally {
      setLookupPaymentLoading(false);
    }
  };

  const handlePayFees = async (student: Student) => {
    await loadPaymentDetails(student);
    if (!lookupPaymentLoading) {
      toast.success('Ready to pay');
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
      const maxPolls = 40;
      let pollCount = 0;
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
            setStudentLookupData(null);
            setSelectedFee(null);
            setSelectedOneOff(null);
            setPaymentReference(null);
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
      const axiosErr = err as { response?: { data?: { error?: string } } };
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

  return (
    <div className="min-h-screen bg-[#08163d]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center text-white">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <RukapayLogo size="lg" showText={true} className="text-white [&_span]:text-white" />
          </Link>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl tracking-tight">Student & Fees Lookup</h1>
          <p className="mt-3 text-lg text-blue-100">Find your student information and check fees</p>
        </div>

        {/* Progress Indicator */}
        <div className="mx-auto mb-6 max-w-2xl">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'school' ? 'text-white' : 'text-blue-300'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'school' ? 'bg-white text-[#08163d]' : 'bg-blue-600 text-white'}`}>
                {step === 'school' ? '1' : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <span className="font-medium">School & Class</span>
            </div>
            <ArrowRight className="h-5 w-5 text-blue-300" />
            <div className={`flex items-center gap-2 ${step === 'student' ? 'text-white' : 'text-blue-300'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'student' ? 'bg-white text-[#08163d]' : 'bg-blue-600 text-white'}`}>
                2
              </div>
              <span className="font-medium">Student Search</span>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="mx-auto max-w-2xl">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-md">
            <CardHeader>
              <CardTitle>
                {step === 'school' ? 'Step 1: Find School & Select Class' : 'Step 2: Search for Student'}
              </CardTitle>
              <CardDescription>
                {step === 'school' 
                  ? 'Enter school code or merchant ID, then select a class at that school'
                  : 'Enter student ID to find the student'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'school' ? (
                <>
                  {/* School Lookup Form */}
                  {!school ? (
                  <form onSubmit={handleSchoolLookup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="school_identifier">School Code or Merchant ID</Label>
                      <div className="relative">
                        <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="school_identifier"
                          type="text"
                          value={schoolIdentifier}
                          onChange={(e) => setSchoolIdentifier(e.target.value)}
                          placeholder="Enter school code or merchant ID"
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You can use either the school code (e.g., SCH001) or merchant ID
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading || !schoolIdentifier.trim()} 
                      className="w-full"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          Looking up school...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Search className="h-4 w-4" />
                          Lookup School
                        </span>
                      )}
                    </Button>
                  </form>
                  ) : (
                    <div className="space-y-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBack}
                        className="-ml-2"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>

                      <Card className="border-2 border-green-200 bg-green-50">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <School className="h-5 w-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-green-900">{school.name}</h3>
                              <p className="text-sm text-green-700">Code: {school.code}</p>
                              {school.merchant_code && (
                                <p className="text-sm text-green-700">Merchant Code: {school.merchant_code}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="space-y-2">
                        <Label htmlFor="class">Select Class</Label>
                        {schoolClasses.length === 0 ? (
                          <Card className="border-2 border-amber-200 bg-amber-50">
                            <CardContent className="pt-4">
                              <p className="text-sm text-amber-900">
                                No classes found for this school yet. Students may not have been added.
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          <>
                            <Select value={selectedClass} onValueChange={handleClassChange}>
                              <SelectTrigger id="class" className="w-full">
                                <SelectValue placeholder="Select a class" />
                              </SelectTrigger>
                              <SelectContent className="max-h-75">
                                {schoolClasses.map((className) => (
                                  <SelectItem key={className} value={className}>
                                    {className}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Only classes that exist at this school are listed
                            </p>
                          </>
                        )}
                      </div>

                      {(schoolClasses.length === 0 || selectedClass) && (
                        <Button 
                          onClick={handleProceedToStudentSearch}
                          className="w-full"
                          size="lg"
                          disabled={schoolClasses.length > 0 && !selectedClass}
                        >
                          Continue to Student Search
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Student Search Form */}
                  <div className="mb-4">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </div>

                  {school && (
                    <div className="mb-4 rounded-lg bg-muted p-3">
                      <p className="text-sm font-medium">{school.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedClass ? `Class: ${selectedClass}` : 'All classes'}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleStudentSearch} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="registration_id">Registration ID</Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="registration_id"
                          type="text"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="Enter registration ID"
                          className="pl-10"
                        />
                      </div>
                    </div>

                <Button 
                  type="submit" 
                      disabled={loading || !studentId.trim()} 
                      className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Searching...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Search className="h-4 w-4" />
                          Search Student
                    </span>
                  )}
                </Button>
              </form>

                  {/* Payment form (when visitor proceeds to pay) */}
              {studentLookupData ? (
                <div className="mt-6 space-y-4 rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-lg">
                      {studentLookupData.student.full_name} — {studentLookupData.student.class}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Back
                    </Button>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">School Fees</span>
                      <span className="font-semibold text-emerald-700">
                        UGX {(
                          studentLookupData.payment_summary.school_fee_total ??
                          studentLookupData.available_fees
                            ?.filter((f) => f.fee_type === 'school_fees')
                            .reduce((sum, f) => sum + (f.amount || 0), 0) ??
                          studentLookupData.student.school_fees_amount ??
                          0
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Other Fees</span>
                      <span className="font-semibold">
                        UGX {(
                          studentLookupData.payment_summary.other_fee_total ??
                          studentLookupData.available_fees
                            ?.filter((f) => f.fee_type === 'other_fees')
                            .reduce((sum, f) => sum + (f.amount || 0), 0) ??
                          0
                        ).toLocaleString()}
                      </span>
                    </div>
                    {studentLookupData.payment_summary.one_off_outstanding !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Additional Charges</span>
                        <span className="font-semibold text-red-600">
                          UGX {studentLookupData.payment_summary.one_off_outstanding.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total outstanding</span>
                      <span className="font-semibold text-red-600">
                        UGX {studentLookupData.payment_summary.total_outstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {(Array.isArray(studentLookupData.available_fees) && studentLookupData.available_fees.length > 0) ||
                  (Array.isArray(studentLookupData.available_one_off_charges) &&
                    studentLookupData.available_one_off_charges.some((c) => c.status === 'unpaid' && c.outstanding > 0)) ? (
                    <div className="rounded-lg border border-emerald-200 bg-white p-4">
                      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Student balances
                      </h4>
                      <div className="space-y-2">
                        {(studentLookupData.available_fees || []).map((fee) => (
                          <div key={`summary-${fee.id}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                            <div>
                              <p className="font-medium">
                                {fee.name}
                                {fee.fee_type === 'school_fees' ? ' (School Fees)' : ' (Other Fee)'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Paid: UGX {(fee.total_paid || 0).toLocaleString()} · Outstanding: UGX {(fee.outstanding || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">UGX {(fee.amount || 0).toLocaleString()}</p>
                              <Badge variant="outline" className="text-xs">
                                {fee.is_paid ? 'Paid' : 'Due'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {(studentLookupData.available_one_off_charges || [])
                          .filter((c) => c.status === 'unpaid' && c.outstanding > 0)
                          .map((charge) => (
                            <div key={`ao-${charge.id}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                              <div>
                                <p className="font-medium">{charge.name} (Additional Charge)</p>
                                <p className="text-xs text-muted-foreground">
                                  Outstanding: UGX {(charge.outstanding || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right font-semibold">
                                UGX {(charge.amount || 0).toLocaleString()}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No fee balances found for this student yet.
                    </p>
                  )}

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
                            className={`flex items-center justify-between rounded-lg border-2 p-3 text-left transition-colors ${
                              selectedFee?.id === fee.id
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-emerald-300 bg-white'
                            }`}
                          >
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Outstanding: UGX {fee.outstanding.toLocaleString()}
                              </p>
                              {fee.is_locked && (
                                <Badge className="mt-1 bg-amber-500 hover:bg-amber-600">Locked</Badge>
                              )}
                              {fee.fee_type === 'school_fees' && (
                                <Badge variant="outline" className="mt-1 text-[11px] uppercase tracking-wide">
                                  School Fees
                                </Badge>
                              )}
                              {fee.fee_type !== 'school_fees' && (
                                <Badge variant="outline" className="mt-1 text-[11px] uppercase tracking-wide">
                                  Other Fees
                                </Badge>
                              )}
                            </div>
                            {selectedFee?.id === fee.id && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            )}
                          </button>
                        ))}
                    </div>
                    {studentLookupData.available_fees.filter((f) => !!f.id && !f.is_paid && f.outstanding > 0).length === 0 && (
                      <p className="text-sm text-muted-foreground">
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
                              className={`flex items-center justify-between rounded-lg border-2 p-3 text-left transition-colors ${
                                selectedOneOff?.id === charge.id
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200 hover:border-emerald-300 bg-white'
                              }`}
                            >
                              <div>
                                <p className="font-medium">{charge.name}</p>
                                <p className="text-xs text-muted-foreground">Outstanding: UGX {charge.outstanding.toLocaleString()}</p>
                              </div>
                              {selectedOneOff?.id === charge.id && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                            </button>
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
                          <p className="text-xs text-muted-foreground">
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
                            onChange={(e) => setPaymentPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 items-end">
                        <Button
                          onClick={handleProcessPayment}
                          disabled={processingPayment || amountExceeded || !paymentAmount || !Number.isFinite(enteredAmount) || enteredAmount <= 0}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
              ) : (
                /* Student Results */
                students.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold">Student Found</h3>
                    {students.map((student) => (
                      <Card key={student.id} className="border-2 border-primary/20 shadow-lg">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5 text-primary" />
                              <h4 className="text-lg font-semibold">
                                {student.first_name} {student.last_name}
                              </h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                <span><strong>Registration ID:</strong> {student.registration_id}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <School className="h-4 w-4 text-muted-foreground" />
                                <span><strong>Class:</strong> {student.class}</span>
                              </div>
                              {student.stream && (
                                <div className="flex items-center gap-2">
                                  <School className="h-4 w-4 text-muted-foreground" />
                                  <span><strong>Stream:</strong> {student.stream}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <School className="h-4 w-4 text-muted-foreground" />
                                <span><strong>School:</strong> {student.school_name}</span>
                              </div>
                            </div>
                            {lookupPaymentLoading && !studentLookupData && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading student balances…
                              </div>
                            )}
                            <Button
                              onClick={() => handlePayFees(student)}
                              disabled={lookupPaymentLoading}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {lookupPaymentLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Wallet className="h-4 w-4 mr-2" />
                              )}
                              {studentLookupData ? 'Refresh balances' : 'Pay Fees'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              )}
                </>
              )}

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-white">
            <p className="text-sm text-blue-100">
              Need help? Contact your school administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
