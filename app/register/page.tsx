'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Phone, Eye, EyeOff, Sparkles, User, School, ChevronRight, ChevronLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RukapayLogo } from '@/components/RukapayLogo';
import { LoadingState } from '@/components/LoadingState';
import { schoolsAPI, authAPI, getApiErrorMessage, mapSchoolCreateFieldErrors } from '@/lib/api';

type RegistrationStep = 'personal' | 'contact' | 'password' | 'school';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    // User Information
    email: '',
    phone: '+256',
    password: '',
    confirmPassword: '',
    pin: '',
    confirmPin: '',
    firstName: '',
    lastName: '',
    role: 'school_admin' as 'admin' | 'school_admin',
    
    // School Information (for school_admin creating new school)
    schoolName: '',
    schoolCode: '',
    schoolAbbreviation: '',
    schoolAddress: '',
    schoolEmail: '',
    // Optional bank info (non-required)
    bankName: '',
    bankCode: '',
    accountNumber: '',
    accountName: '',
    branch: '',
  });

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('personal');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /** True after /auth/register succeeds — school create can be retried without re-registering. */
  const [accountCreated, setAccountCreated] = useState(false);
  const { register, user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  // Logged-in users should not use public signup; create schools from the dashboard.
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (accountCreated) return; // mid-flow after register, before school succeeds
    if (user.role === 'school_admin') {
      router.replace('/dashboard/schools/onboard');
      return;
    }
    router.replace('/dashboard');
  }, [user, authLoading, accountCreated, router]);

  const steps: { id: RegistrationStep; title: string; icon: React.ReactNode }[] = [
    { id: 'personal', title: 'Personal Info', icon: <User className="h-4 w-4" /> },
    { id: 'contact', title: 'Contact Info', icon: <Mail className="h-4 w-4" /> },
    { id: 'password', title: 'Password', icon: <Lock className="h-4 w-4" /> },
    { id: 'school', title: 'School Info', icon: <School className="h-4 w-4" /> },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(s => s.id === currentStep);
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'personal':
        return formData.firstName && formData.lastName;
      case 'contact':
        // Phone should start with + and have at least 10 characters total (country code + number)
        // Don't check fieldErrors here - validation happens on Next click
        return formData.email && formData.phone && formData.phone.startsWith('+') && formData.phone.length >= 10;
      case 'password':
        return (
          formData.password.length >= 6 &&
          formData.password === formData.confirmPassword &&
          /^\d{4,5}$/.test(formData.pin) &&
          formData.pin === formData.confirmPin
        );
      case 'school':
        // Phone should be valid (starts with + and has at least 10 characters)
        const isPhoneValid = formData.phone && formData.phone.startsWith('+') && formData.phone.length >= 10;
        return formData.schoolName && isPhoneValid && formData.schoolEmail;
      default:
        return false;
    }
  };

  const validateUserPhone = async (phone: string): Promise<boolean> => {
    if (!phone || phone.length < 10 || !phone.startsWith('+')) {
      const errorMsg = 'Please enter a valid phone number';
      setFieldErrors(prev => ({ ...prev, phone: errorMsg }));
      toast.error(errorMsg);
      return false;
    }
    // Phone is contact info only — never block signup because the MSISDN is already used.
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.phone;
      return newErrors;
    });
    return true;
  };

  const validateUserEmail = async (email: string): Promise<boolean> => {
    try {
      const response = await authAPI.checkEmail(email);
      
      // Handle different response structures
      const responseData = response.data?.data || response.data || {};
      const exists = responseData.exists === true; // Explicitly check for true
      
      if (exists === true) {
        const errorMsg = 'This email is already registered. Please log in.';
        setFieldErrors(prev => ({ ...prev, email: errorMsg }));
        toast.error(errorMsg);
        router.push(`/login?email=${encodeURIComponent(email)}`);
        return false;
      }
      
      // Email NOT found (exists = false) - this is GOOD, allow proceeding
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
      return true;
    } catch (err: any) {
      // Handle 404 - endpoint might not be available (backend not updated)
      if (err?.response?.status === 404) {
        return true; // Allow proceeding if endpoint doesn't exist
      }
      return true; // Allow proceeding if validation fails (network error)
    }
  };

  const validateSchoolName = async (name: string): Promise<boolean> => {
    try {
      const response = await schoolsAPI.checkName(name);
      const exists = response.data?.data?.exists || false;
      if (exists) {
        const errorMsg = 'A school with this name already exists';
        setFieldErrors(prev => ({ ...prev, schoolName: errorMsg }));
        toast.error(errorMsg);
        return false;
      }
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.schoolName;
        return newErrors;
      });
      return true;
    } catch (err: any) {
      // Handle 404 - endpoint might not be available (backend not updated)
      if (err?.response?.status === 404) {
        return true; // Allow proceeding if endpoint doesn't exist
      }
      return true; // Allow proceeding if validation fails (network error)
    }
  };

  const handleNext = async () => {
    const currentIndex = getCurrentStepIndex();
    if (!canProceedToNext()) {
      return;
    }

    setError('');

    // Validate before proceeding to next step
    if (currentStep === 'contact') {
      setValidating(true);
      
      // Validate phone and email in parallel
      const [phoneValid, emailValid] = await Promise.all([
        validateUserPhone(formData.phone),
        validateUserEmail(formData.email)
      ]);
      
      setValidating(false);

      // Only block if validation explicitly fails (phone/email exists)
      // If phone/email is NOT found (exists = false), validation returns true and we proceed
      if (!phoneValid || !emailValid) {
        // Don't proceed - validation errors are already set in fieldErrors
        return;
      }
      
      // Both validations passed (phone and email are available)
      // Clear any previous errors and proceed
      setFieldErrors({});
      setError('');
    }

    if (currentStep === 'password') {
      // Before going to school step, validate school name if it's filled
      if (formData.schoolName) {
        setValidating(true);
        let schoolNameValid = true;

        if (formData.schoolName) {
          schoolNameValid = await validateSchoolName(formData.schoolName);
        }
        setValidating(false);

        if (!schoolNameValid) {
          return; // Don't proceed if validation fails
        }
      }
    }

    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  // Prevent scroll restoration on page reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    // Password/PIN only matter when creating the account for the first time
    if (!accountCreated) {
      if (formData.password !== formData.confirmPassword) {
        const errorMsg = 'Passwords do not match. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      if (!/^\d{4,5}$/.test(formData.pin)) {
        const errorMsg = 'Enter a Rukapay PIN with 4–5 digits.';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      if (formData.pin !== formData.confirmPin) {
        const errorMsg = 'Rukapay PIN confirmation does not match.';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }
    }

    try {
      setValidating(true);

      if (!accountCreated) {
        const phoneValid = await validateUserPhone(formData.phone);
        const emailValid = await validateUserEmail(formData.email);
        if (!phoneValid || !emailValid) {
          setValidating(false);
          setLoading(false);
          return;
        }
      }

      if (formData.role === 'school_admin' && formData.schoolName) {
        const schoolNameValid = await validateSchoolName(formData.schoolName);
        if (!schoolNameValid) {
          setValidating(false);
          setLoading(false);
          setCurrentStep('school');
          return;
        }
      }

      setValidating(false);

      if (!accountCreated) {
        await register({
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          first_name: formData.firstName,
          last_name: formData.lastName,
        });
        setAccountCreated(true);
      }

      if (formData.role === 'school_admin' && formData.schoolName && formData.phone && formData.schoolEmail) {
        try {
          await schoolsAPI.register({
            name: formData.schoolName,
            code: formData.schoolCode || undefined,
            abbreviation: formData.schoolAbbreviation || undefined,
            address: formData.schoolAddress || undefined,
            phone: formData.phone,
            email: formData.schoolEmail,
            owner_first_name: formData.firstName,
            owner_last_name: formData.lastName,
            owner_pin: formData.pin || undefined,
            bank_name: formData.bankName || undefined,
            bank_code: formData.bankCode || undefined,
            account_number: formData.accountNumber || undefined,
            account_name: formData.accountName || undefined,
            branch: formData.branch || undefined,
          });
        } catch (schoolErr: unknown) {
          const apiMsg = getApiErrorMessage(
            schoolErr,
            'School could not be created. Check the details below and try again.',
          );
          const mapped = mapSchoolCreateFieldErrors(apiMsg);
          setFieldErrors(mapped);
          setCurrentStep('school');
          setError(
            Object.keys(mapped).length > 0
              ? apiMsg
              : `Your account is ready, but school setup failed: ${apiMsg}`,
          );
          toast.error(apiMsg);
          setLoading(false);
          return;
        }

        await refreshUser().catch(() => false);
        toast.success('School created successfully');
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMsg = getApiErrorMessage(err, 'Registration failed. Please try again.');
      if (/email already exists/i.test(errorMsg)) {
        toast.error('This email is already registered. Please log in.');
        router.push(`/login?email=${encodeURIComponent(formData.email)}`);
        setLoading(false);
        return;
      }
      setError(errorMsg);
      toast.error(errorMsg);
      setValidating(false);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = getCurrentStepIndex();
  const isLastStep = currentStepIndex === steps.length - 1;

  if (authLoading || (user && !accountCreated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState label={user ? 'Redirecting…' : 'Loading…'} size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left Panel - Register Form */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 py-12 md:w-1/2 md:px-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Logo */}
          <div className="mb-8">
            <RukapayLogo size="lg" className="mb-6 text-[#08163d]" />
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-gray-900">
              Get Started
            </h1>
            <p className="text-muted-foreground text-lg">
              Welcome to Ruka Shule - Let's create your account
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between border-b pb-4 mb-6 gap-2">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStepIndex > index;
              const isAccessible = index === 0 || currentStepIndex >= index - 1;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => isAccessible && setCurrentStep(step.id)}
                  disabled={!isAccessible || loading}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs whitespace-nowrap flex-1 min-w-0 ${
                    isActive
                      ? 'bg-[#08163d] text-white'
                      : isCompleted
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : isAccessible
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                      : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {step.icon}
                  <span className="font-medium truncate">{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Form Card */}
          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-1 pb-4 px-0">
              <CardTitle className="text-2xl">{steps.find(s => s.id === currentStep)?.title}</CardTitle>
              <CardDescription>
                {currentStep === 'personal' && 'Tell us about yourself'}
                {currentStep === 'contact' && 'How can we reach you?'}
                {currentStep === 'password' && 'Create a secure password'}
                {currentStep === 'school' && 'Enter your school information'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2 space-y-2">
                    <p>{error}</p>
                    {accountCreated && (
                      <p className="text-xs text-muted-foreground">
                        Your login works. Fix the school details above and retry, or{' '}
                        <button
                          type="button"
                          className="underline font-medium text-primary"
                          onClick={() => router.push('/dashboard/schools/onboard')}
                        >
                          finish school setup in the dashboard
                        </button>
                        .
                      </p>
                    )}
                  </div>
                )}

                {/* Step 1: Personal Information */}
                {currentStep === 'personal' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium">First Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="John"
                        required
                        className="h-10 border-2 w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium">Last Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Doe"
                        required
                        className="h-10 border-2 w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Contact Information */}
                {currentStep === 'contact' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email <span className="text-red-500">*</span></Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (fieldErrors.email) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.email;
                                return newErrors;
                              });
                            }
                          }}
                          placeholder="admin@school.com"
                          required
                          className={`pl-10 h-10 border-2 transition-all focus:ring-2 focus:ring-primary/20 ${
                            fieldErrors.email ? 'border-destructive focus:border-destructive' : 'focus:border-primary'
                          }`}
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-xs text-destructive">{fieldErrors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></Label>
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Allow user to type freely, but ensure it starts with +
                            if (value && !value.startsWith('+')) {
                              // If user types without +, add it
                              value = '+' + value;
                            }
                            setFormData({ ...formData, phone: value });
                            if (fieldErrors.phone) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.phone;
                                return newErrors;
                              });
                            }
                          }}
                          placeholder="+256700000000"
                          required
                          className={`pl-10 h-10 border-2 transition-all focus:ring-2 focus:ring-primary/20 ${
                            fieldErrors.phone ? 'border-destructive focus:border-destructive' : 'focus:border-primary'
                          }`}
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Contact number for your account and school — reuse is allowed</p>
                    </div>
                  </div>
                )}

                {/* Step 3: Password */}
                {currentStep === 'password' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">Password <span className="text-red-500">*</span></Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Create a password"
                          required
                          minLength={6}
                          className="pl-10 pr-10 h-10 border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password <span className="text-red-500">*</span></Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="Confirm your password"
                          required
                          minLength={6}
                          className={`pl-10 pr-10 h-10 border-2 transition-all focus:ring-2 focus:ring-primary/20 ${
                            formData.confirmPassword && formData.password !== formData.confirmPassword
                              ? 'border-destructive focus:border-destructive'
                              : 'focus:border-primary'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                      {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
                        <p className="text-xs text-green-600">Passwords match</p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <Label htmlFor="pin" className="text-sm font-medium">
                        Rukapay PIN <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="pin"
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        value={formData.pin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pin: e.target.value.replace(/\D/g, '').slice(0, 5),
                          })
                        }
                        placeholder="4–5 digits"
                        required
                        minLength={4}
                        maxLength={5}
                        className="h-10 border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for Rukapay wallet/app actions — not for logging into Shule.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPin" className="text-sm font-medium">
                        Confirm Rukapay PIN <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="confirmPin"
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        value={formData.confirmPin}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPin: e.target.value.replace(/\D/g, '').slice(0, 5),
                          })
                        }
                        placeholder="Re-enter PIN"
                        required
                        minLength={4}
                        maxLength={5}
                        className={`h-10 border-2 transition-all focus:ring-2 focus:ring-primary/20 ${
                          formData.confirmPin && formData.pin !== formData.confirmPin
                            ? 'border-destructive focus:border-destructive'
                            : 'focus:border-primary'
                        }`}
                      />
                      {formData.confirmPin && formData.pin !== formData.confirmPin && (
                        <p className="text-xs text-destructive">PINs do not match</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: School Information */}
                {currentStep === 'school' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Provide your school details. Enter a unique school code (will be validated for uniqueness).
                    </p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="schoolName" className="text-sm font-medium">School Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="schoolName"
                        type="text"
                        value={formData.schoolName}
                        onChange={async (e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, schoolName: value });
                          if (fieldErrors.schoolName) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.schoolName;
                              return newErrors;
                            });
                          }
                          // Validate on blur or after typing stops
                          if (value && value.length > 3) {
                            setTimeout(async () => {
                              await validateSchoolName(value);
                            }, 500);
                          }
                        }}
                        placeholder="e.g., St. Mary's Primary School"
                        required
                        className={`h-10 border-2 ${
                          fieldErrors.schoolName ? 'border-destructive focus:border-destructive' : ''
                        }`}
                      />
                      {fieldErrors.schoolName && (
                        <p className="text-xs text-destructive">{fieldErrors.schoolName}</p>
                      )}
                    </div>

                      <div className="space-y-2">
                        <Label htmlFor="schoolCode" className="text-sm font-medium">School Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <div className="relative">
                          <Input
                            id="schoolCode"
                            type="text"
                            value={formData.schoolCode || ''}
                            onChange={async (e) => {
                              const value = e.target.value.toUpperCase();
                              setFormData({ ...formData, schoolCode: value });
                              
                              // Auto-generate from abbreviation if empty
                              if (!value && formData.schoolAbbreviation) {
                                setFormData(prev => ({ ...prev, schoolCode: formData.schoolAbbreviation }));
                              }
                              
                              // Validate code if length >= 3
                              if (value.length >= 3) {
                                try {
                                  const response = await schoolsAPI.checkCode(value);
                                  const exists = response.data?.data?.exists;
                                  if (exists) {
                                    setFieldErrors(prev => ({ ...prev, schoolCode: `Code "${value}" already taken` }));
                                  } else {
                                    setFieldErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.schoolCode;
                                      return newErrors;
                                    });
                                  }
                                } catch {
                                  /* ignore */
                                }
                              } else {
                                setFieldErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.schoolCode;
                                  return newErrors;
                                });
                              }
                            }}
                            placeholder="KPS001 or leave blank to auto-generate"
                            maxLength={10}
                            className={`h-10 border-2 w-full pr-10 transition-all ${
                              fieldErrors.schoolCode 
                                ? 'border-destructive focus:border-destructive ring-1 ring-destructive/30' 
                                : 'focus:border-primary focus:ring-primary/20'
                            }`}
                          />
                          {formData.schoolCode && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, schoolCode: formData.schoolAbbreviation || '' }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-muted px-2 py-1 rounded-md hover:bg-muted/80 transition-colors"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                        {fieldErrors.schoolCode && (
                          <p className="text-xs text-destructive mt-1">{fieldErrors.schoolCode}</p>
                        )}
                        {formData.schoolCode && !fieldErrors.schoolCode && (
                          <p className="text-xs text-green-600 mt-1">Code available ✅</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Enter your desired code or abbreviation - system auto-adds unique number if needed
                      </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolPhone" className="text-sm font-medium">School Phone <span className="text-red-500">*</span></Label>
                      <div className="p-3 bg-muted rounded-md border-2 border-dashed w-full">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formData.phone}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Using the same phone number from your contact information
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolEmail" className="text-sm font-medium">School Email <span className="text-red-500">*</span></Label>
                      <Input
                        id="schoolEmail"
                        type="email"
                        value={formData.schoolEmail}
                        onChange={(e) => setFormData({ ...formData, schoolEmail: e.target.value })}
                        placeholder="info@school.ug"
                        required
                        className="h-10 border-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schoolAddress" className="text-sm font-medium">School Address</Label>
                      <Input
                        id="schoolAddress"
                        type="text"
                        value={formData.schoolAddress}
                        onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                        placeholder="e.g., Kampala, Uganda"
                        className="h-10 border-2"
                      />
                    </div>

                    {/* Optional Bank Information */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Bank Information (Optional - can be added later)
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName" className="text-sm font-medium">Bank Name</Label>
                        <Input
                          id="bankName"
                          type="text"
                          value={formData.bankName}
                          onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                          placeholder="e.g., Stanbic Bank"
                          className="h-10 border-2"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="bankCode" className="text-sm font-medium">Bank Code</Label>
                          <Input
                            id="bankCode"
                            type="text"
                            value={formData.bankCode}
                            onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })}
                            placeholder="e.g., 040147"
                            className="h-10 border-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber" className="text-sm font-medium">Account Number</Label>
                          <Input
                            id="accountNumber"
                            type="text"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                            placeholder="e.g., 1234567890"
                            className="h-10 border-2"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="accountName" className="text-sm font-medium">Account Name</Label>
                          <Input
                            id="accountName"
                            type="text"
                            value={formData.accountName}
                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                            placeholder="e.g., School Account"
                            className="h-10 border-2"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="branch" className="text-sm font-medium">Branch</Label>
                          <Input
                            id="branch"
                            type="text"
                            value={formData.branch}
                            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                            placeholder="e.g., Kampala Main"
                            className="h-10 border-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  {currentStepIndex > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={loading || accountCreated}
                      className="flex-1"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                  )}
                  
                  {!isLastStep ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceedToNext() || loading || validating}
                      className="flex-1 bg-[#08163d] hover:bg-[#0a1f4f] text-white"
                    >
                      {validating ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Validating...
                        </span>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={
                        loading ||
                        validating ||
                        !formData.schoolName ||
                        !formData.schoolEmail ||
                        (!accountCreated && (
                          !formData.email ||
                          !formData.phone ||
                          !formData.password ||
                          !formData.confirmPassword ||
                          formData.password !== formData.confirmPassword ||
                          !formData.firstName ||
                          !formData.lastName
                        ))
                      }
                      className="flex-1 bg-[#08163d] hover:bg-[#0a1f4f] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading || validating ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          {validating
                            ? 'Validating...'
                            : accountCreated
                              ? 'Creating school...'
                              : 'Creating account...'}
                        </span>
                      ) : accountCreated ? (
                        'Retry school setup'
                      ) : (
                        'Sign up'
                      )}
                    </Button>
                  )}
                </div>
              </form>

              {/* Login Link */}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline transition-colors">
                  Log in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Promotional */}
      <div className="hidden md:flex md:w-1/2 md:flex-col md:items-center md:justify-center md:px-12 relative overflow-hidden bg-[#08163d]">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="text-center text-white relative z-10 animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-4 shadow-2xl">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="mb-2 text-6xl font-bold tracking-tight">Enter</h2>
          <h2 className="mb-2 text-6xl font-bold tracking-tight">the Future</h2>
          <h2 className="mb-4 text-5xl font-light">of School</h2>
          <h2 className="mb-8 text-5xl font-light">Fee Management</h2>
          <p className="text-xl text-blue-100 max-w-md mx-auto leading-relaxed">
            Streamline payments, track fees, and manage students with ease
          </p>
          
          {/* Feature Pills */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <div className="rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium">
              Secure Payments
            </div>
            <div className="rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium">
              Real-time Tracking
            </div>
            <div className="rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium">
              Easy Management
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
