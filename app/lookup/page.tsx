'use client';

import { useState, useEffect } from 'react';
import { Search, School, User, GraduationCap, ArrowRight, ArrowLeft, DollarSign, CheckCircle2, Wallet, Smartphone, Loader2 } from 'lucide-react';
import { studentsAPI, schoolsAPI, feesAPI, paymentsAPI } from '@/lib/api';
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
  class: string;
  stream?: string | null;
  school_name: string;
  school_code: string;
}

interface School {
  id: string;
  name: string;
  code: string;
  merchant_code?: string;
  merchant_id?: string;
}

interface Fee {
  id: string;
  name: string;
  amount: number;
  currency: string;
  fee_type: string;
  class?: string;
  academic_year: string;
  term: string;
  stream?: string | null;
  due_date?: string;
}

interface FeeForPayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  total_paid: number;
  outstanding: number;
  is_paid: boolean;
}

interface StudentLookupData {
  student: { id: string; registration_id: string; full_name: string; class: string; phone: string };
  school: { code: string; name: string };
  available_fees: FeeForPayment[];
  payment_summary: { total_fees: number; total_paid: number; total_outstanding: number; payment_status: string };
}

// All valid class values
const VALID_CLASSES = [
  // Kindergarten
  'Kindergarten',
  // Primary School
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7',
  // Secondary/High School
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6',
  // Cambridge International System
  'Cambridge Year 1', 'Cambridge Year 2', 'Cambridge Year 3', 'Cambridge Year 4',
  'Cambridge Year 5', 'Cambridge Year 6', 'Cambridge Year 7', 'Cambridge Year 8',
  'Cambridge Year 9', 'Cambridge Year 10', 'Cambridge Year 11', 'Cambridge Year 12',
  'Cambridge Year 13', 'IGCSE', 'AS Level', 'A Level',
  // International Baccalaureate (IB)
  'IB PYP 1', 'IB PYP 2', 'IB PYP 3', 'IB PYP 4', 'IB PYP 5',
  'IB MYP 1', 'IB MYP 2', 'IB MYP 3', 'IB MYP 4', 'IB MYP 5',
  'IB DP 1', 'IB DP 2',
  // University/College
  'University Year 1', 'University Year 2', 'University Year 3', 'University Year 4', 'University Year 5',
];

// Valid terms
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

type Step = 'school' | 'student';

export default function LookupPage() {
  const [step, setStep] = useState<Step>('school');
  const [schoolIdentifier, setSchoolIdentifier] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [studentId, setStudentId] = useState('');
  
  const [school, setSchool] = useState<School | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [allFees, setAllFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment flow (visitor can pay after lookup)
  const [studentLookupData, setStudentLookupData] = useState<StudentLookupData | null>(null);
  const [lookupPaymentLoading, setLookupPaymentLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeForPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentMnoProvider, setPaymentMnoProvider] = useState<string>('MTN');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Prevent scroll restoration on page reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  }, []);

  const handleSchoolLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSchool(null);
    setFees([]);
    setStudents([]);

    try {
      if (!schoolIdentifier.trim()) {
        setError('Please enter a school code or merchant ID');
        setLoading(false);
        return;
      }

      // Lookup school
      const schoolResponse = await schoolsAPI.lookup(schoolIdentifier.trim());
      const schoolData = schoolResponse.data.data;
      setSchool(schoolData);

      // If class is selected, fetch fees
      if (selectedClass) {
        await fetchFees(schoolData.id, selectedClass);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'School not found. Please check the school code or merchant ID.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async (schoolId: string, className: string, term?: string) => {
    try {
      const feesResponse = await feesAPI.getBySchoolAndClass(schoolId, className);
      const fetchedFees = feesResponse.data.data || [];
      setAllFees(fetchedFees);
      
      // Filter by term if selected
      if (term) {
        const filteredFees = fetchedFees.filter((fee: Fee) => 
          fee.term === term || !fee.term // Include fees without term (annual fees)
        );
        setFees(filteredFees);
      } else {
        setFees(fetchedFees);
      }
    } catch (err) {
      console.error('Failed to fetch fees:', err);
      setFees([]);
      setAllFees([]);
    }
  };

  const handleClassChange = async (className: string) => {
    setSelectedClass(className);
    setSelectedTerm(''); // Reset term when class changes
    if (school && className) {
      await fetchFees(school.id, className);
    }
  };

  const handleTermChange = (term: string) => {
    setSelectedTerm(term);
    // Filter fees by term
    if (term) {
      const filteredFees = allFees.filter((fee: Fee) => 
        fee.term === term || !fee.term // Include fees without term (annual fees)
      );
      setFees(filteredFees);
    } else {
      // Show all fees if no term selected
      setFees(allFees);
    }
  };

  const handleProceedToStudentSearch = () => {
    if (!school) {
      setError('Please lookup the school first');
      return;
    }
    if (!selectedClass) {
      setError('Please select a class to view fees');
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
    // Clear previous payment flow so user can pay for newly searched student
    setStudentLookupData(null);
    setSelectedFee(null);
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
      
      // Filter by selected class if available
      const filteredStudents = selectedClass 
        ? foundStudents.filter((s: Student) => s.class === selectedClass)
        : foundStudents;

      setStudents(filteredStudents);
      
      if (filteredStudents.length === 0) {
        setError('No students found. Please check the student ID and try again.');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'student') {
      setStep('school');
      setStudents([]);
      setStudentLookupData(null);
      setSelectedFee(null);
      setPaymentReference(null);
      setError('');
    }
  };

  const handlePayFees = async (student: Student) => {
    if (!school) return;
    try {
      setLookupPaymentLoading(true);
      setError('');
      const res = await paymentsAPI.lookupStudentForPayment(student.registration_id, school.code);
      const data = res.data.data;
      setStudentLookupData(data);
      setPaymentPhone(data?.student?.phone || student.phone || '');
      // Auto-select first outstanding fee so user can pay immediately without extra click
      const payableFees = (data?.available_fees || []).filter((f: FeeForPayment) => !f.is_paid && f.outstanding > 0);
      if (payableFees.length > 0) {
        setSelectedFee(payableFees[0]);
        setPaymentAmount(payableFees[0].outstanding.toString());
      } else {
        setSelectedFee(null);
        setPaymentAmount('');
      }
      toast.success('Ready to pay');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Failed to load payment details');
      setStudentLookupData(null);
    } finally {
      setLookupPaymentLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!studentLookupData || !selectedFee || !paymentAmount || !paymentPhone) {
      toast.error('Fill all required fields');
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > selectedFee.outstanding) {
      toast.error(`Amount cannot exceed UGX ${selectedFee.outstanding.toLocaleString()}`);
      return;
    }
    const phone = paymentPhone.replace(/\D/g, '');
    if (phone.length < 9) {
      toast.error('Enter a valid phone number');
      return;
    }
    const formattedPhone = phone.startsWith('256') ? `+${phone}` : `+256${phone}`;

    try {
      setProcessingPayment(true);
      setPaymentReference(null);
      const res = await paymentsAPI.processPayment({
        registration_id: studentLookupData.student.registration_id,
        school_code: studentLookupData.school.code,
        fee_id: selectedFee.id,
        class: studentLookupData.student.class,
        amount,
        currency: 'UGX',
        payment_method: 'MOBILE_MONEY',
        phone_number: formattedPhone,
        mno_provider: paymentMnoProvider,
        description: `School fees: ${selectedFee.name}`,
      });
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
          const status = statusRes.data.data?.status;
          if (status === 'completed') {
            clearInterval(pollInterval);
            toast.success('Payment completed!');
            setProcessingPayment(false);
            setStudentLookupData(null);
            setSelectedFee(null);
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

  const resetPaymentFlow = () => {
    setStudentLookupData(null);
    setSelectedFee(null);
    setPaymentAmount('');
    setPaymentReference(null);
  };

  const calculateTotalFees = () => {
    return fees.reduce((total, fee) => total + fee.amount, 0);
  };

  // Calculate total fees for a specific student stream.
  // - If the fee has no stream, it applies to all streams.
  // - If the fee has a stream, it only applies when it matches the student's stream.
  // - If student has no stream, we exclude stream-specific fees to avoid double-counting.
  const calculateTotalFeesForStream = (stream?: string | null) => {
    return fees.reduce((total, fee) => {
      if (fee.stream) {
        if (!stream) {
          // Student stream unknown – skip stream-specific tuition
          return total;
        }
        if (fee.stream !== stream) {
          return total;
        }
      }
      return total + fee.amount;
    }, 0);
  };

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
                  ? 'Enter school code or merchant ID, then select a class to view fees'
                  : 'Enter student ID to find the student'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'school' ? (
                <>
                  {/* School Lookup Form */}
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

                  {/* School Info */}
                  {school && (
                    <div className="mt-6 space-y-4">
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

                      {/* Class and Term Selectors */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="class">Select Class</Label>
                          <Select value={selectedClass} onValueChange={handleClassChange}>
                            <SelectTrigger id="class" className="w-full">
                              <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {VALID_CLASSES.map((className) => (
                                <SelectItem key={className} value={className}>
                                  {className}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Select the class to view applicable fees
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="term">Select Term</Label>
                          <Select 
                            value={selectedTerm || 'all_terms'} 
                            onValueChange={(value) => handleTermChange(value === 'all_terms' ? '' : value)}
                            disabled={!selectedClass}
                          >
                            <SelectTrigger id="term" className="w-full">
                              <SelectValue placeholder="Select a term" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all_terms">All Terms</SelectItem>
                              {TERMS.map((term) => (
                                <SelectItem key={term} value={term}>
                                  {term}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Filter fees by term (optional)
                          </p>
                        </div>
                      </div>

                      {/* Fees Display */}
                      {selectedClass && fees.length > 0 && (
                        <Card className="border-2 border-primary/20">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              Fees for {selectedClass}
                              {selectedTerm && ` - ${selectedTerm}`}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {fees.map((fee) => (
                                <div key={fee.id} className="flex items-center justify-between rounded-lg border p-3">
                                  <div>
                                    <p className="font-medium">{fee.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {fee.academic_year}{fee.term ? ` • ${fee.term}` : ' • Annual'}
                                      {fee.due_date && ` • Due: ${new Date(fee.due_date).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">
                                      {fee.currency} {fee.amount.toLocaleString()}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {fee.fee_type === 'school_fees' ? 'School Fees' : 'Other'}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                              <div className="mt-4 flex items-center justify-between border-t pt-3">
                                <span className="font-semibold">Total Fees:</span>
                                <span className="text-lg font-bold text-primary">
                                  UGX {calculateTotalFees().toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {selectedClass && fees.length === 0 && (
                        <Card className="border-2 border-yellow-200 bg-yellow-50">
                          <CardContent className="pt-6">
                            <p className="text-sm text-yellow-800">
                              No fees found for {selectedClass}. Fees may not be set up yet for this class.
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Proceed Button */}
                      {school && selectedClass && (
                        <Button 
                          onClick={handleProceedToStudentSearch}
                          className="w-full"
                          size="lg"
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
                      className="mb-4"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to School & Class
                    </Button>
              </div>

                  {school && (
                    <div className="mb-4 rounded-lg bg-muted p-3">
                      <p className="text-sm font-medium">{school.name}</p>
                      <p className="text-xs text-muted-foreground">Class: {selectedClass}</p>
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
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      {studentLookupData.student.full_name} — {studentLookupData.student.class}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={resetPaymentFlow}>
                      Change student
                    </Button>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total outstanding</span>
                      <span className="font-semibold text-red-600">
                        UGX {studentLookupData.payment_summary.total_outstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select fee to pay</label>
                    <div className="grid gap-2">
                      {studentLookupData.available_fees
                        .filter((f) => !f.is_paid && f.outstanding > 0)
                        .map((fee) => (
                          <button
                            key={fee.id}
                            type="button"
                            onClick={() => {
                              setSelectedFee(fee);
                              setPaymentAmount(fee.outstanding.toString());
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
                            </div>
                            {selectedFee?.id === fee.id && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            )}
                          </button>
                        ))}
                    </div>
                    {studentLookupData.available_fees.filter((f) => !f.is_paid && f.outstanding > 0).length === 0 && (
                      <p className="text-sm text-muted-foreground">All fees are paid.</p>
                    )}
                  </div>

                  {selectedFee && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Amount (UGX)</label>
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            min={1}
                            max={selectedFee.outstanding}
                          />
                          <p className="text-xs text-muted-foreground">
                            Max: UGX {selectedFee.outstanding.toLocaleString()}
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
                        <div className="space-y-2">
                          <label className="text-sm font-medium block">MNO Provider</label>
                          <Select value={paymentMnoProvider} onValueChange={setPaymentMnoProvider}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MTN">
                                <span className="flex items-center gap-2">
                                  <Smartphone className="h-4 w-4" /> MTN
                                </span>
                              </SelectItem>
                              <SelectItem value="AIRTEL">AIRTEL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleProcessPayment}
                          disabled={processingPayment}
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
                              Pay {paymentAmount && !isNaN(parseFloat(paymentAmount)) ? `UGX ${parseFloat(paymentAmount).toLocaleString()}` : 'Now'}
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
                            <div className="pt-4 border-t">
                              <p className="text-sm font-medium mb-2">Total Fees for {student.class}:</p>
                              <p className="text-2xl font-bold text-primary">
                                UGX {calculateTotalFeesForStream(student.stream).toLocaleString()}
                              </p>
                            </div>
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
                              Pay Fees
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
