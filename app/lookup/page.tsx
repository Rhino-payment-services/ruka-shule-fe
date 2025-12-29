'use client';

import { useState, useEffect } from 'react';
import { Search, School, User, Phone, GraduationCap } from 'lucide-react';
import { studentsAPI } from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RukapayLogo } from '@/components/RukapayLogo';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  class: string;
  school_name: string;
  school_code: string;
}

export default function LookupPage() {
  const [searchType, setSearchType] = useState<'student' | 'phone'>('student');
  const [studentId, setStudentId] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [phone, setPhone] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prevent scroll restoration on page reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStudents([]);

    try {
      let response;
      if (searchType === 'student') {
        if (!studentId || !schoolCode) {
          setError('Please enter both Student ID and School Code');
          setLoading(false);
          return;
        }
        response = await studentsAPI.lookup({ student_id: studentId, school_code: schoolCode });
      } else {
        if (!phone) {
          setError('Please enter a phone number');
          setLoading(false);
          return;
        }
        response = await studentsAPI.lookup({ phone });
      }

      setStudents(response.data.data || []);
      if (response.data.data?.length === 0) {
        setError('No students found. Please check your information and try again.');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08163d]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center text-white">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <RukapayLogo size="lg" showText={true} className="text-white [&_span]:text-white" />
          </Link>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl tracking-tight">Student Lookup</h1>
          <p className="mt-3 text-lg text-blue-100">Find your student information to make payments</p>
        </div>

        {/* Search Card */}
        <div className="mx-auto max-w-2xl">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Search for Student</CardTitle>
              <CardDescription>Enter student information to find their records</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Type Toggle */}
              <div className="mb-6 flex gap-2 rounded-lg bg-primary/10 p-1 border border-primary/20">
                <button
                  type="button"
                  onClick={() => {
                    setSearchType('student');
                    setError('');
                    setStudents([]);
                  }}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    searchType === 'student'
                      ? 'bg-[#08163d] text-white shadow-lg shadow-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                  }`}
                >
                  <GraduationCap className="mr-2 inline h-4 w-4" />
                  By Student ID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchType('phone');
                    setError('');
                    setStudents([]);
                  }}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    searchType === 'phone'
                      ? 'bg-[#08163d] text-white shadow-lg shadow-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                  }`}
                >
                  <Phone className="mr-2 inline h-4 w-4" />
                  By Phone
                </button>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="space-y-4">
                {searchType === 'student' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="student_id">Student ID</Label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="student_id"
                          type="text"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="Enter student ID"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school_code">School Code</Label>
                      <div className="relative">
                        <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="school_code"
                          type="text"
                          value={schoolCode}
                          onChange={(e) => setSchoolCode(e.target.value)}
                          placeholder="Enter school code"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+256700000000"
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-10 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Searching...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </span>
                  )}
                </Button>
              </form>

              {/* Results */}
              {students.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Search Results</h3>
                  {students.map((student) => (
                    <Card key={student.id} className="border-2 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5 text-primary" />
                              <h4 className="font-semibold">
                                {student.first_name} {student.last_name}
                              </h4>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <School className="h-4 w-4" />
                                <span>{student.school_name} ({student.school_code})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                <span>Class: {student.class}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{student.phone}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="default" className="shadow-md hover:shadow-lg transition-shadow">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
