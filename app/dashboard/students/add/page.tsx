'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { studentsAPI } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { isValidClassLabel } from '@/lib/students/import';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const STREAMS = ['General', 'Arts', 'Sciences', 'Business', 'Technical'];
const GENDERS = ['Male', 'Female'];

const SCHOLARSHIP_TYPES = ['Full', 'Partial', 'Merit', 'Need-based', 'Sports'];

export default function AddStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    class: '',
    gender: '',
    stream: '',
    school_fees_amount: '',
    scholarship_type: '',
    scholarship_percentage: '',
    parent_first_name: '',
    parent_last_name: '',
    parent_phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one phone number is provided
    if (!formData.phone && !formData.parent_phone) {
      toast.error('Phone number required', {
        description: 'Please provide either a student phone or parent phone number.',
      });
      return;
    }

    if (!isValidClassLabel(formData.class)) {
      toast.error('Invalid class name', {
        description: 'Enter a class label up to 50 characters (e.g. P1, KG1, Nursery).',
      });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        class: formData.class.trim(),
      };

      // Student phone (optional)
      if (formData.phone) {
        payload.phone = formData.phone;
      }

      // Stream/Subject combination (mainly for secondary school)
      if (formData.stream) {
        payload.stream = formData.stream;
      }
      if (formData.gender) {
        payload.gender = formData.gender;
      }

      // School fees amount
      if (formData.school_fees_amount) {
        payload.school_fees_amount = parseFloat(formData.school_fees_amount);
      }

      // Scholarship fields
      if (formData.scholarship_type) {
        payload.scholarship_type = formData.scholarship_type;
      }
      if (formData.scholarship_percentage) {
        payload.scholarship_percentage = parseFloat(formData.scholarship_percentage);
      }

      // Parent information
      if (formData.parent_first_name) {
        payload.parent_first_name = formData.parent_first_name;
      }
      if (formData.parent_last_name) {
        payload.parent_last_name = formData.parent_last_name;
      }
      if (formData.parent_phone) {
        payload.parent_phone = formData.parent_phone;
      }

      await studentsAPI.create(payload);
      toast.success('Student added successfully!', {
        description: `${formData.first_name} ${formData.last_name} has been added to your school. A unique ID was auto-generated.`,
      });
      router.push('/dashboard/students');
    } catch (error: any) {
      const candidates = error.response?.data?.candidates;
      if (error.response?.status === 409 && Array.isArray(candidates) && candidates.length > 0) {
        const names = candidates
          .map((c: { registration_id?: string; first_name?: string; last_name?: string }) =>
            `${c.registration_id || ''} ${c.first_name || ''} ${c.last_name || ''}`.trim()
          )
          .join('; ');
        toast.error('Possible duplicate student', {
          description: `Review existing record(s) first: ${names}`,
        });
      } else {
        toast.error('Failed to add student', {
          description: getApiErrorMessage(error, 'An error occurred while adding the student.'),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/students')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Add Student</h1>
              <p className="mt-2 text-muted-foreground">
                Add a new student to your school
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>
                Fill in the required information to add a new student. Registration ID will be automatically generated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Student Basics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">
                      Class <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="class"
                      name="class"
                      value={formData.class}
                      onChange={handleChange}
                      placeholder="e.g. P1, KG1, Nursery"
                      required
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use your school&apos;s class name (free text, max 50 characters).
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Student Phone Number (Optional)
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+256700123456"
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank if student doesn't have a phone number
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parent/Guardian Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Parent/Guardian Information</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_first_name">Parent First Name</Label>
                      <Input
                        id="parent_first_name"
                        name="parent_first_name"
                        value={formData.parent_first_name}
                        onChange={handleChange}
                        placeholder="Jane"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_last_name">Parent Last Name</Label>
                      <Input
                        id="parent_last_name"
                        name="parent_last_name"
                        value={formData.parent_last_name}
                        onChange={handleChange}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_phone">
                      Parent Phone Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="parent_phone"
                      name="parent_phone"
                      type="tel"
                      value={formData.parent_phone}
                      onChange={handleChange}
                      placeholder="+256700123457"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for payment notifications. Will be automatically registered on RukaPay.
                    </p>
                  </div>
                </div>

                {/* School Fees Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">School Fees</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="school_fees_amount">
                        Net Payable Amount (Optional)
                      </Label>
                      <Input
                        id="school_fees_amount"
                        name="school_fees_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.school_fees_amount}
                        onChange={handleChange}
                        placeholder="e.g., 500000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Student's individual fees amount. If not specified, school's default fees will apply.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Academic Details */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Academic Details (Optional)</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={formData.gender || 'none'}
                        onValueChange={(value) =>
                          handleChange({ target: { name: 'gender', value: value === 'none' ? '' : value } })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
                          {GENDERS.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stream">Stream/Subject Combination</Label>
                      <Select
                        value={formData.stream || 'none'}
                        onValueChange={(value) =>
                          handleChange({ target: { name: 'stream', value: value === 'none' ? '' : value } })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stream (if applicable)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {STREAMS.map((stream) => (
                            <SelectItem key={stream} value={stream}>
                              {stream}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        For S3-S6 students who have chosen a subject combination
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scholarship Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Scholarship Information (Optional)</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    If a student has a scholarship, enter the net payable amount (after discount) in the "Net Payable Amount" field above.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scholarship_type">Scholarship Type</Label>
                      <Select
                        value={formData.scholarship_type || 'none'}
                        onValueChange={(value) =>
                          handleChange({ target: { name: 'scholarship_type', value: value === 'none' ? '' : value } })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No scholarship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Scholarship</SelectItem>
                          {SCHOLARSHIP_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/students')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Student'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
