'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { HeroBackdrop } from '@/components/landing/HeroBackdrop';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { LookupStepper } from '@/components/lookup/LookupStepper';
import { SchoolStep } from '@/components/lookup/SchoolStep';
import { StudentStep } from '@/components/lookup/StudentStep';
import { PaymentStep } from '@/components/lookup/PaymentStep';
import { useLookupFlow } from '@/lib/hooks/useLookupFlow';

const GOLD = '#E8A317';

const stepVariants = {
  enter: (direction: number) => ({ opacity: 0, x: 24 * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: -24 * direction }),
};

export default function LookupPage() {
  const { loading: authLoading } = useAuth();
  const flow = useLookupFlow();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [flow.step]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <Loader2 className="h-10 w-10 animate-spin text-[#08163d]" />
          <p className="text-sm text-[#08163d]/70">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#08163d]">
      <SiteHeader />
      <main className="relative min-h-[calc(100svh-4rem)] overflow-hidden">
        <HeroBackdrop />
        <div className="relative z-10 mx-auto max-w-xl px-4 py-10 sm:px-8 sm:py-14">
          <p className="mb-3 flex items-center justify-center gap-2 text-sm text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4C2]">
              <GraduationCap className="h-3.5 w-3.5 text-[#E8A317]" />
            </span>
            Rukashule <span className="text-slate-300">|</span> Student lookup
          </p>
          <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Find a student
            <span className="mt-1 block text-2xl font-semibold sm:text-3xl" style={{ color: GOLD }}>
              Then settle what is due.
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-slate-500">
            Enter the school code, then the student ID.
          </p>

          <div className="mt-8">
            <LookupStepper step={flow.step} />
          </div>

          <div className="relative mt-8 overflow-hidden rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-7">
            <AnimatePresence mode="wait" custom={flow.direction}>
              <motion.div
                key={flow.step}
                custom={flow.direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {flow.step === 'school' && (
                  <SchoolStep
                    schoolIdentifier={flow.schoolIdentifier}
                    onSchoolIdentifierChange={flow.setSchoolIdentifier}
                    school={flow.school}
                    schoolClasses={flow.schoolClasses}
                    selectedClass={flow.selectedClass}
                    loading={flow.loading}
                    error={flow.error}
                    onLookup={flow.handleSchoolLookup}
                    onClassChange={flow.handleClassChange}
                    onContinue={flow.handleProceedToStudentSearch}
                    onBack={flow.handleBack}
                  />
                )}
                {flow.step === 'student' && (
                  <StudentStep
                    schoolName={flow.school?.name}
                    selectedClass={flow.selectedClass}
                    studentId={flow.studentId}
                    onStudentIdChange={flow.setStudentId}
                    students={flow.students}
                    loading={flow.loading}
                    lookupPaymentLoading={flow.lookupPaymentLoading}
                    error={flow.error}
                    onSearch={flow.handleStudentSearch}
                    onPay={flow.handlePayFees}
                    onBack={flow.handleBack}
                  />
                )}
                {flow.step === 'pay' && flow.studentLookupData && (
                  <PaymentStep
                    data={flow.studentLookupData}
                    selectedFee={flow.selectedFee}
                    selectedOneOff={flow.selectedOneOff}
                    paymentAmount={flow.paymentAmount}
                    paymentPhone={flow.paymentPhone}
                    processingPayment={flow.processingPayment}
                    paymentReference={flow.paymentReference}
                    amountExceeded={flow.amountExceeded}
                    enteredAmount={flow.enteredAmount}
                    onSelectFee={flow.selectFee}
                    onSelectOneOff={flow.selectOneOff}
                    onAmountChange={flow.setPaymentAmount}
                    onPhoneChange={flow.setPaymentPhone}
                    onPay={flow.handleProcessPayment}
                    onBack={flow.handleBack}
                  />
                )}
                {flow.step === 'pay' && !flow.studentLookupData && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Could not load balances. Go back and try again.
                    </p>
                    <button
                      type="button"
                      onClick={flow.handleBack}
                      className="text-sm text-[#08163d] underline-offset-4 hover:underline"
                    >
                      Back
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Need help? Contact your school administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
