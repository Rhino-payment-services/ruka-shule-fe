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
import { PanelShell } from '@/components/data-table';
import { PERMISSIONS } from '@/lib/permissions';
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

    if (formData.scholarship_percentage) {
      const pct = parseFloat(formData.scholarship_percentage);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        toast.error('Invalid scholarship percentage', {
          description: 'Enter a number between 0 and 100, e.g. 50 for 50% off class school fees.',
        });
        return;
      }
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
    <ProtectedRoute requiredPermission={PERMISSIONS.studentsWrite}>
      <DashboardLayout>
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/students')}
              className="h-9 rounded-full text-slate-500 hover:text-[#08163d]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <p className="text-xs text-slate-500">Add a new student to your school</p>
          </div>

          <PanelShell
            title="Student Information"
            description="Fill in the required details. Registration ID is generated automatically."
          >
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Student Phone (Optional)</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+256700123456"
                    />
                  </div>
                  <div className="space-y-1.5">
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
                  </div>
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
                    <Label htmlFor="stream">Stream</Label>
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
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#08163d]">Parent/Guardian</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="parent_first_name">First Name</Label>
                      <Input
                        id="parent_first_name"
                        name="parent_first_name"
                        value={formData.parent_first_name}
                        onChange={handleChange}
                        placeholder="Jane"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="parent_last_name">Last Name</Label>
                      <Input
                        id="parent_last_name"
                        name="parent_last_name"
                        value={formData.parent_last_name}
                        onChange={handleChange}
                        placeholder="Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="parent_phone">
                        Phone <span className="text-red-500">*</span>
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
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Provide a student or parent phone. Parent phone is used for payment notifications.
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#08163d]">Fees & scholarship (optional)</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="school_fees_amount">School Fees Amount</Label>
                      <Input
                        id="school_fees_amount"
                        name="school_fees_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.school_fees_amount}
                        onChange={handleChange}
                        placeholder="Leave blank for class school fees"
                      />
                    </div>
                    <div className="space-y-1.5">
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
                    <div className="space-y-1.5">
                      <Label htmlFor="scholarship_percentage">Scholarship Percentage</Label>
                      <Input
                        id="scholarship_percentage"
                        name="scholarship_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.scholarship_percentage}
                        onChange={handleChange}
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Leave this amount blank to use class school fees. A custom amount replaces class school fees for this student only — not other fees. Scholarship % then discounts whichever school-fees amount is used (50 = half).
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/students')}
                    disabled={loading}
                    className="h-9 rounded-full border-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-9 rounded-full bg-[#08163d] px-5 text-white hover:bg-[#0a1f4f]"
                  >
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
          </PanelShell>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
