'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { studentsAPI, schoolsAPI, paymentsAPI } from '@/lib/api';
import type { PublicSchoolLookupResponse } from '@/lib/api';
import { normalizeUgandaPhoneForStorage } from '@/lib/utils';
import type {
  FeeForPayment,
  LookupStep,
  OneOffChargeForPayment,
  Student,
  StudentLookupData,
} from '@/components/lookup/types';

function apiError(err: unknown, fallback: string): string {
  const axiosError = err as { response?: { data?: { error?: string } } };
  return axiosError.response?.data?.error || fallback;
}

export function useLookupFlow() {
  const [step, setStep] = useState<LookupStep>('school');
  const [direction, setDirection] = useState(1);
  const [schoolIdentifier, setSchoolIdentifier] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [school, setSchool] = useState<PublicSchoolLookupResponse | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentLookupData, setStudentLookupData] = useState<StudentLookupData | null>(null);
  const [lookupPaymentLoading, setLookupPaymentLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeForPayment | null>(null);
  const [selectedOneOff, setSelectedOneOff] = useState<OneOffChargeForPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const schoolClasses = school?.classes || [];

  const goTo = useCallback((next: LookupStep, dir: 1 | -1) => {
    setDirection(dir);
    setStep(next);
    setError('');
  }, []);

  const clearPaymentSelection = useCallback(() => {
    setSelectedFee(null);
    setSelectedOneOff(null);
    setPaymentAmount('');
    setPaymentReference(null);
  }, []);

  const resetToSchoolEntry = useCallback(() => {
    setDirection(-1);
    setStep('school');
    setSchool(null);
    setSelectedClass('');
    setStudentId('');
    setStudents([]);
    setStudentLookupData(null);
    clearPaymentSelection();
    setPaymentPhone('');
    setError('');
  }, [clearPaymentSelection]);

  const loadPaymentDetails = useCallback(
    async (student: Student) => {
      if (!school) return false;
      try {
        setLookupPaymentLoading(true);
        setError('');
        const res = await paymentsAPI.lookupStudentForPayment(student.registration_id, school.code);
        const data = res.data.data as StudentLookupData;
        setStudentLookupData(data);
        setPaymentPhone(data?.student?.phone || student.phone || '');
        clearPaymentSelection();
        return true;
      } catch (err: unknown) {
        toast.error(apiError(err, 'Failed to load payment details'));
        setStudentLookupData(null);
        return false;
      } finally {
        setLookupPaymentLoading(false);
      }
    },
    [school, clearPaymentSelection],
  );

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
      setSchool(schoolResponse.data.data);
    } catch (err: unknown) {
      setError(apiError(err, 'School not found. Please check the school code or merchant ID.'));
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
      setError('Please look up the school first');
      return;
    }
    if (schoolClasses.length > 0 && !selectedClass) {
      setError('Please select a class');
      return;
    }
    goTo('student', 1);
  };

  const handleStudentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStudents([]);
    setStudentLookupData(null);
    clearPaymentSelection();

    try {
      if (!studentId.trim()) {
        setError('Please enter a student ID');
        setLoading(false);
        return;
      }

      if (!school) {
        setError('School information is missing. Please go back and look up the school again.');
        setLoading(false);
        return;
      }

      const response = await studentsAPI.lookup({
        registration_id: studentId.trim(),
        school_code: school.code,
      });

      const foundStudents = (response.data.data || []) as Student[];
      const filteredStudents = selectedClass
        ? foundStudents.filter((s) => s.class === selectedClass)
        : foundStudents;

      setStudents(filteredStudents);

      if (filteredStudents.length === 0) {
        setError(
          selectedClass
            ? `No student found with that ID in ${selectedClass}. Check the ID or class.`
            : 'No students found. Please check the student ID and try again.',
        );
        return;
      }

      const loaded = await loadPaymentDetails(filteredStudents[0]);
      if (loaded) {
        goTo('pay', 1);
      }
    } catch (err: unknown) {
      setError(apiError(err, 'Failed to search. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePayFees = async (student: Student) => {
    const loaded = studentLookupData ? true : await loadPaymentDetails(student);
    if (loaded) {
      goTo('pay', 1);
    }
  };

  const handleBack = () => {
    if (step === 'pay') {
      clearPaymentSelection();
      goTo('student', -1);
      return;
    }
    if (step === 'student') {
      setStudents([]);
      setStudentId('');
      setStudentLookupData(null);
      clearPaymentSelection();
      goTo('school', -1);
      return;
    }
    if (school) {
      resetToSchoolEntry();
    }
  };

  const selectFee = (fee: FeeForPayment) => {
    setSelectedFee(fee);
    setSelectedOneOff(null);
    setPaymentAmount(fee.is_locked ? fee.outstanding.toString() : '');
  };

  const selectOneOff = (charge: OneOffChargeForPayment) => {
    setSelectedOneOff(charge);
    setSelectedFee(null);
    setPaymentAmount(charge.outstanding.toString());
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
    if (
      amount > selectedItem.outstanding ||
      (selectedOneOff && Math.abs(amount - selectedOneOff.outstanding) > 0.01)
    ) {
      toast.error(
        selectedOneOff
          ? `Additional charges must be paid in full: UGX ${selectedOneOff.outstanding.toLocaleString()}`
          : `Amount cannot exceed UGX ${selectedFee!.outstanding.toLocaleString()}`,
      );
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
        description: selectedOneOff
          ? `Additional charge: ${selectedOneOff.name}`
          : `School fees: ${selectedFee!.name}`,
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

      if (pollRef.current) clearInterval(pollRef.current);
      const maxPolls = 40;
      let pollCount = 0;
      pollRef.current = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setProcessingPayment(false);
          return;
        }
        try {
          const statusRes = await paymentsAPI.getStatus(payment.reference);
          const status = (statusRes.data.data?.status || '').toLowerCase();
          if (status === 'completed' || status === 'paid') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            toast.success('Payment completed!');
            setProcessingPayment(false);
            clearPaymentSelection();
            const current = students[0];
            if (current) {
              await loadPaymentDetails(current);
            }
          } else if (status === 'failed' || status === 'cancelled') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            toast.error(`Payment ${status}`);
            setProcessingPayment(false);
          }
        } catch {
          // Ignore poll errors
        }
      }, 3000);
    } catch (err: unknown) {
      toast.error(apiError(err, 'Payment failed'));
      setProcessingPayment(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const enteredAmount = Number(paymentAmount);
  const amountExceeded =
    !!(selectedFee || selectedOneOff) &&
    paymentAmount !== '' &&
    Number.isFinite(enteredAmount) &&
    enteredAmount > (selectedOneOff || selectedFee)!.outstanding;

  return {
    step,
    direction,
    schoolIdentifier,
    setSchoolIdentifier,
    selectedClass,
    studentId,
    setStudentId,
    school,
    students,
    loading,
    error,
    schoolClasses,
    studentLookupData,
    lookupPaymentLoading,
    selectedFee,
    selectedOneOff,
    paymentAmount,
    setPaymentAmount,
    paymentPhone,
    setPaymentPhone,
    processingPayment,
    paymentReference,
    enteredAmount,
    amountExceeded,
    handleSchoolLookup,
    handleClassChange,
    handleProceedToStudentSearch,
    handleStudentSearch,
    handlePayFees,
    handleBack,
    selectFee,
    selectOneOff,
    handleProcessPayment,
  };
}
