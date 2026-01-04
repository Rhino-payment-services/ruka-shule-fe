'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Phone, Eye, EyeOff, Sparkles, User, School, ChevronRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RukapayLogo } from '@/components/RukapayLogo';
import { schoolsAPI } from '@/lib/api';

type RegistrationStep = 'personal' | 'contact' | 'password' | 'school';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    // User Information
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'school_admin' as 'admin' | 'school_admin',
    
    // School Information (for school_admin creating new school)
    schoolName: '',
    schoolAbbreviation: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
  });

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('personal');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
        return formData.email && formData.phone;
      case 'password':
        return formData.password.length >= 6 && formData.password === formData.confirmPassword;
      case 'school':
        return formData.schoolName && formData.schoolPhone && formData.schoolEmail;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
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
    setLoading(true);

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      setLoading(false);
      return;
    }

    try {
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
      if (formData.role === 'school_admin' && formData.schoolName && formData.schoolPhone && formData.schoolEmail) {
        try {
          await schoolsAPI.register({
            name: formData.schoolName,
            abbreviation: formData.schoolAbbreviation || undefined,
            address: formData.schoolAddress || undefined,
            phone: formData.schoolPhone,
            email: formData.schoolEmail,
          });
          // School is created and user is automatically linked via the backend
        } catch (schoolErr: unknown) {
          // Log error but don't fail registration - school can be created later
          console.error('Failed to create school during registration:', schoolErr);
          const axiosError = schoolErr as { response?: { data?: { error?: string } }; message?: string };
          setError(`Registration successful, but school creation failed: ${axiosError.response?.data?.error || axiosError.message || 'Unknown error'}. You can create the school later from the dashboard.`);
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          return;
        }
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      setError(axiosError.response?.data?.error || axiosError.message || 'Registration failed. Please try again.');
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
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl">{steps.find(s => s.id === currentStep)?.title}</CardTitle>
              <CardDescription>
                {currentStep === 'personal' && 'Tell us about yourself'}
                {currentStep === 'contact' && 'How can we reach you?'}
                {currentStep === 'password' && 'Create a secure password'}
                {currentStep === 'school' && 'Enter your school information'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                {/* Step 1: Personal Information */}
                {currentStep === 'personal' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium">First Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="John"
                          required
                          className="h-10 border-2"
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
                          className="h-10 border-2"
                        />
                      </div>
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
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="admin@school.com"
                          required
                          className="pl-10 h-10 border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Phone <span className="text-red-500">*</span></Label>
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+256700000000"
                          required
                          className="pl-10 h-10 border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
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
                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                        placeholder="e.g., St. Mary's Primary School"
                        required
                        className="h-10 border-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="schoolAbbreviation" className="text-sm font-medium">Abbreviation</Label>
                        <Input
                          id="schoolAbbreviation"
                          type="text"
                          value={formData.schoolAbbreviation}
                          onChange={(e) => setFormData({ ...formData, schoolAbbreviation: e.target.value.toUpperCase() })}
                          placeholder="STMP"
                          maxLength={6}
                          className="h-10 border-2"
                        />
                        <p className="text-xs text-muted-foreground">Optional - used for code generation</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schoolPhone" className="text-sm font-medium">School Phone <span className="text-red-500">*</span></Label>
                        <Input
                          id="schoolPhone"
                          type="tel"
                          value={formData.schoolPhone}
                          onChange={(e) => setFormData({ ...formData, schoolPhone: e.target.value })}
                          placeholder="+256700123456"
                          required
                          className="h-10 border-2"
                        />
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
                      disabled={!canProceedToNext() || loading}
                      className="flex-1 bg-[#08163d] hover:bg-[#0a1f4f] text-white"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
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
                        disabled={loading || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword || !formData.firstName || !formData.lastName || !formData.schoolName || !formData.schoolPhone || !formData.schoolEmail}
                        className="flex-1 bg-[#08163d] hover:bg-[#0a1f4f] text-white"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Creating account...
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
