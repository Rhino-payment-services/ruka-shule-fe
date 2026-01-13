'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Phone, Eye, EyeOff, Sparkles, User, School, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RukapayLogo } from '@/components/RukapayLogo';
import { schoolsAPI, authAPI } from '@/lib/api';

type RegistrationStep = 'personal' | 'contact' | 'password' | 'school';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    // User Information
    email: '',
    phone: '+256',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'school_admin' as 'admin' | 'school_admin',
    
    // School Information (for school_admin creating new school)
    schoolName: '',
    schoolAbbreviation: '',
    schoolAddress: '',
    schoolEmail: '',
  });

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('personal');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { register } = useAuth();
  const router = useRouter();

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
        return formData.password.length >= 6 && formData.password === formData.confirmPassword;
      case 'school':
        // Phone should be valid (starts with + and has at least 10 characters)
        const isPhoneValid = formData.phone && formData.phone.startsWith('+') && formData.phone.length >= 10;
        return formData.schoolName && isPhoneValid && formData.schoolEmail;
      default:
        return false;
    }
  };

  const validateUserPhone = async (phone: string): Promise<boolean> => {
    if (!phone || phone.length < 10) {
      const errorMsg = 'Please enter a valid phone number';
      setFieldErrors(prev => ({ ...prev, phone: errorMsg }));
      toast.error(errorMsg);
      return false; // Phone too short
    }

    try {
      // Backend now handles normalization and checks multiple formats
      const response = await authAPI.checkPhone(phone);
      
      // Handle different response structures
      const responseData = response.data?.data || response.data || {};
      const exists = responseData.exists === true; // Explicitly check for true
      
      console.log('Phone validation result:', { 
        phone, 
        exists, 
        responseData,
        fullResponse: response.data 
      });
      
      if (exists === true) {
        // Phone exists - show error and prevent proceeding
        const errorMsg = 'This phone number is already registered';
        setFieldErrors(prev => ({ ...prev, phone: errorMsg }));
        toast.error(errorMsg);
        return false;
      }

      // Phone NOT found (exists = false or undefined) - this is GOOD, allow proceeding
      console.log('Phone is available (not found), allowing proceeding');
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
      return true; // Phone is available, allow proceeding
    } catch (err: any) {
      // Handle 404 - endpoint might not be available (backend not updated)
      if (err?.response?.status === 404) {
        console.warn('Validation endpoint not available, skipping phone validation');
        // Clear error and allow proceeding if endpoint doesn't exist
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
        return true;
      }
      // For other errors (500, network errors, etc.), log but allow proceeding
      console.error('Error checking phone:', err);
      // Clear any previous errors and allow proceeding
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
      return true; // Allow proceeding if validation fails (don't block user)
    }
  };

  const validateUserEmail = async (email: string): Promise<boolean> => {
    try {
      const response = await authAPI.checkEmail(email);
      
      // Handle different response structures
      const responseData = response.data?.data || response.data || {};
      const exists = responseData.exists === true; // Explicitly check for true
      
      console.log('Email validation result:', { email, exists, responseData });
      
      if (exists === true) {
        const errorMsg = 'This email is already registered';
        setFieldErrors(prev => ({ ...prev, email: errorMsg }));
        toast.error(errorMsg);
        return false;
      }
      
      // Email NOT found (exists = false) - this is GOOD, allow proceeding
      console.log('Email is available (not found), allowing proceeding');
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
      return true;
    } catch (err: any) {
      // Handle 404 - endpoint might not be available (backend not updated)
      if (err?.response?.status === 404) {
        console.warn('Validation endpoint not available, skipping email validation');
        return true; // Allow proceeding if endpoint doesn't exist
      }
      console.error('Error checking email:', err);
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
        console.warn('Validation endpoint not available, skipping school name validation');
        return true; // Allow proceeding if endpoint doesn't exist
      }
      console.error('Error checking school name:', err);
      return true; // Allow proceeding if validation fails (network error)
    }
  };

  const validateSchoolPhone = async (phone: string): Promise<boolean> => {
    try {
      // Backend handles normalization - just check the phone as-is
      const response = await schoolsAPI.checkPhone(phone);
      const exists = response.data?.data?.exists || false;
      
      if (exists) {
        // School phone exists - show error
        const errorMsg = 'A school with this phone number already exists';
        setFieldErrors(prev => ({ ...prev, phone: errorMsg }));
        toast.error(errorMsg);
        return false;
      }

      // Phone NOT found (exists = false) - this is GOOD, allow proceeding
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
      return true; // Phone is available, allow proceeding
    } catch (err: any) {
      // Handle 404 - endpoint might not be available (backend not updated)
      if (err?.response?.status === 404) {
        console.warn('Validation endpoint not available, skipping school phone validation');
        // Clear error and allow proceeding
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
        return true;
      }
      // For other errors, log but allow proceeding
      console.error('Error checking school phone:', err);
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
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
      
      console.log('Validation results:', { phoneValid, emailValid, phone: formData.phone, email: formData.email });
      
      setValidating(false);

      // Only block if validation explicitly fails (phone/email exists)
      // If phone/email is NOT found (exists = false), validation returns true and we proceed
      if (!phoneValid || !emailValid) {
        console.log('Validation failed, blocking progression:', { phoneValid, emailValid, fieldErrors });
        // Don't proceed - validation errors are already set in fieldErrors
        return;
      }
      
      // Both validations passed (phone and email are available)
      console.log('Validation passed, proceeding to next step');
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

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      const errorMsg = 'Passwords do not match. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return;
    }

    try {
      // Validate all fields before proceeding
      setValidating(true);
      
      // Validate user phone and email
      const phoneValid = await validateUserPhone(formData.phone);
      const emailValid = await validateUserEmail(formData.email);
      
      if (!phoneValid || !emailValid) {
        const errorMsg = 'Please fix the validation errors above before submitting.';
        setError(errorMsg);
        toast.error(errorMsg);
        setValidating(false);
        setLoading(false);
        return;
      }

      // Validate school name and phone if creating school
      if (formData.role === 'school_admin' && formData.schoolName && formData.phone) {
        const schoolNameValid = await validateSchoolName(formData.schoolName);
        const schoolPhoneValid = await validateSchoolPhone(formData.phone);
        
        if (!schoolNameValid || !schoolPhoneValid) {
          const errorMsg = 'Please fix the school validation errors above before submitting.';
          setError(errorMsg);
          toast.error(errorMsg);
          setValidating(false);
          setLoading(false);
          return;
        }
      }
      
      setValidating(false);

      // Step 1: Register the user
      const registerData: { 
        email: string; 
        phone: string; 
        password: string; 
        role: 'admin' | 'school_admin'; 
        school_id?: string;
      } = {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      };

      await register(registerData);

      // Step 2: Create school for school_admin using the register endpoint
      // Use the same phone number for both user and school
      if (formData.role === 'school_admin' && formData.schoolName && formData.phone && formData.schoolEmail) {
        try {
          await schoolsAPI.register({
            name: formData.schoolName,
            abbreviation: formData.schoolAbbreviation || undefined,
            address: formData.schoolAddress || undefined,
            phone: formData.phone, // Use same phone as user
            email: formData.schoolEmail,
            owner_first_name: formData.firstName,
            owner_last_name: formData.lastName,
          });
          // School is created and user is automatically linked via the backend
        } catch (schoolErr: unknown) {
          // If school creation fails, user is already registered - this is a problem
          // We should ideally rollback user registration, but for now show error
          console.error('Failed to create school during registration:', schoolErr);
          const axiosError = schoolErr as { response?: { data?: { error?: string } }; message?: string };
          const errorMsg = `Registration successful, but school creation failed: ${axiosError.response?.data?.error || axiosError.message || 'Unknown error'}. Please contact support.`;
          setError(errorMsg);
          toast.error(errorMsg);
          setLoading(false);
          return; // Don't redirect to dashboard
        }
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Registration failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
      setValidating(false);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = getCurrentStepIndex();
  const isLastStep = currentStepIndex === steps.length - 1;

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
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
                    {error}
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
                      <p className="text-xs text-muted-foreground">This phone number will be used for both your account and school registration</p>
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
                  </div>
                )}

                {/* Step 4: School Information */}
                {currentStep === 'school' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Provide your school details. The school code will be automatically generated.
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
                      <Label htmlFor="schoolAbbreviation" className="text-sm font-medium">Abbreviation</Label>
                      <Input
                        id="schoolAbbreviation"
                        type="text"
                        value={formData.schoolAbbreviation}
                        onChange={(e) => setFormData({ ...formData, schoolAbbreviation: e.target.value.toUpperCase() })}
                        placeholder="STMP"
                        maxLength={6}
                        className="h-10 border-2 w-full"
                      />
                      <p className="text-xs text-muted-foreground">Optional - used for code generation</p>
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
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  {currentStepIndex > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={loading}
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
                    <>
                      {currentStepIndex > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePrevious}
                          disabled={loading}
                          className="flex-1"
                        >
                          <ChevronLeft className="mr-2 h-4 w-4" />
                          Previous
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={(() => {
                          // Check only required fields - don't block on fieldErrors as validation happens on submit
                          const isDisabled = 
                            loading || 
                            validating || 
                            !formData.email || 
                            !formData.phone || 
                            !formData.password || 
                            !formData.confirmPassword || 
                            formData.password !== formData.confirmPassword || 
                            !formData.firstName || 
                            !formData.lastName || 
                            !formData.schoolName || 
                            !formData.schoolEmail;
                          
                          // Log what's blocking the button (only in development)
                          if (isDisabled && process.env.NODE_ENV === 'development' && !loading && !validating) {
                            const missingFields = [];
                            if (!formData.email) missingFields.push('email');
                            if (!formData.phone) missingFields.push('phone');
                            if (!formData.password) missingFields.push('password');
                            if (!formData.confirmPassword) missingFields.push('confirmPassword');
                            if (formData.password !== formData.confirmPassword) missingFields.push('passwordsMatch');
                            if (!formData.firstName) missingFields.push('firstName');
                            if (!formData.lastName) missingFields.push('lastName');
                            if (!formData.schoolName) missingFields.push('schoolName');
                            if (!formData.schoolEmail) missingFields.push('schoolEmail');
                            console.log('Sign up button disabled - missing fields:', missingFields);
                          }
                          
                          return isDisabled;
                        })()}
                        className="flex-1 bg-[#08163d] hover:bg-[#0a1f4f] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading || validating ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            {validating ? 'Validating...' : 'Creating account...'}
                          </span>
                        ) : (
                          'Sign up'
                        )}
                      </Button>
                    </>
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
