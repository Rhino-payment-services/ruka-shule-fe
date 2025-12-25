'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Phone, Eye, EyeOff, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RukapayLogo } from '@/components/RukapayLogo';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    role: 'school_admin' as 'admin' | 'school_admin',
    school_id: '',
  });

  // Prevent scroll restoration on page reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  }, []);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: any = {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      };
      if (formData.role === 'school_admin' && formData.school_id) {
        data.school_id = formData.school_id;
      }
      await register(data);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left Panel - Register Form */}
      <div className="flex w-full flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white px-6 py-12 md:w-1/2 md:px-12">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-left-4 duration-500">
          {/* Logo */}
          <div className="mb-8">
            <RukapayLogo size="lg" className="mb-6" />
            <h1 className="mb-2 text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Get Started
            </h1>
            <p className="text-muted-foreground text-lg">
              Welcome to Ruka Shule - Let's create your account
            </p>
          </div>

          {/* Form Card */}
          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <CardDescription>Enter your information to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="admin@school.com"
                      required
                      className="pl-10 h-11 border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+256700000000"
                      required
                      className="pl-10 h-11 border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Create a password"
                      required
                      className="pl-10 pr-10 h-11 border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* School ID (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="school_id" className="text-sm font-medium">School ID (Optional)</Label>
                  <Input
                    id="school_id"
                    type="text"
                    value={formData.school_id}
                    onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                    placeholder="Enter school UUID if available"
                    className="h-11 border-2"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Creating account...
                    </span>
                  ) : (
                    'Sign up'
                  )}
                </Button>
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
      <div className="hidden md:flex md:w-1/2 md:flex-col md:items-center md:justify-center md:px-12 relative overflow-hidden bg-gradient-to-br from-primary via-[#0052A3] to-[#003d7a]">
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
