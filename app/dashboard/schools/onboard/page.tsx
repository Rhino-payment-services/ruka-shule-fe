'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { schoolsAPI } from '@/lib/api';
import { School, ArrowLeft, Loader2, User, Building2, CreditCard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormData {
  // School Information
  name: string;
  abbreviation: string;
  address: string;
  phone: string;
  email: string;
  
  // Owner/Representative Information
  ownerFirstName: string;
  ownerLastName: string;
  ownerMiddleName: string;
  ownerDateOfBirth: string;
  ownerGender: 'MALE' | 'FEMALE' | 'OTHER' | '';
  ownerNationalId: string;
  
  // Business Registration Information
  certificateOfIncorporation: string;
  taxIdentificationNumber: string;
  businessType: string;
  businessRegistrationDate: string;
  businessCity: string;
  
  // Financial Information (Optional)
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch: string;
}

type FormSection = 'school' | 'owner' | 'business' | 'financial';

export default function OnboardSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [quickSignup, setQuickSignup] = useState(true); // Default to quick signup
  const [currentSection, setCurrentSection] = useState<FormSection>('school');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    abbreviation: '',
    address: '',
    phone: '',
    email: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerMiddleName: '',
    ownerDateOfBirth: '',
    ownerGender: '',
    ownerNationalId: '',
    certificateOfIncorporation: '',
    taxIdentificationNumber: '',
    businessType: '',
    businessRegistrationDate: '',
    businessCity: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    branch: '',
  });

  const sections: { id: FormSection; title: string; icon: React.ReactNode }[] = [
    { id: 'school', title: 'School Information', icon: <School className="h-4 w-4" /> },
    { id: 'owner', title: 'Owner Information', icon: <User className="h-4 w-4" /> },
    { id: 'business', title: 'Business Registration', icon: <Building2 className="h-4 w-4" /> },
    { id: 'financial', title: 'Financial Information', icon: <CreditCard className="h-4 w-4" /> },
  ];

  const getCurrentSectionIndex = () => {
    return sections.findIndex(s => s.id === currentSection);
  };

  const canProceedToNext = () => {
    switch (currentSection) {
      case 'school':
        return formData.name && formData.phone && formData.email;
      case 'owner':
        return formData.ownerFirstName && formData.ownerLastName && formData.ownerDateOfBirth && formData.ownerGender && formData.ownerNationalId;
      case 'business':
        return formData.certificateOfIncorporation && formData.taxIdentificationNumber && formData.businessType && formData.businessRegistrationDate && formData.businessCity;
      case 'financial':
        return true; // All optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    const currentIndex = getCurrentSectionIndex();
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentSectionIndex();
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await schoolsAPI.create({
        name: formData.name,
        abbreviation: formData.abbreviation || undefined,
        address: formData.address || undefined,
        phone: formData.phone,
        email: formData.email,
        owner_first_name: formData.ownerFirstName || undefined,
        owner_last_name: formData.ownerLastName || undefined,
        owner_middle_name: formData.ownerMiddleName || undefined,
        owner_date_of_birth: formData.ownerDateOfBirth || undefined,
        owner_gender: formData.ownerGender || undefined,
        owner_national_id: formData.ownerNationalId || undefined,
        certificate_of_incorporation: formData.certificateOfIncorporation || undefined,
        tax_identification_number: formData.taxIdentificationNumber || undefined,
        business_type: formData.businessType || undefined,
        business_registration_date: formData.businessRegistrationDate || undefined,
        business_city: formData.businessCity || undefined,
        bank_name: formData.bankName || undefined,
        account_number: formData.accountNumber || undefined,
        account_name: formData.accountName || undefined,
        branch: formData.branch || undefined,
      });

      setSuccess(true);
      // Redirect to schools list after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/schools');
      }, 2000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      setError(axiosError.response?.data?.error || axiosError.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#08163d] to-[#0a1f4f] bg-clip-text text-transparent">
                Onboard New School
              </h1>
              <p className="mt-2 text-muted-foreground">
                Add a new school. Choose quick signup or complete merchant onboarding now.
              </p>
            </div>
          </div>

          {/* Progress Steps - Only show if full onboarding */}
          {!quickSignup && (
            <div className="flex items-center justify-between border-b pb-4">
              {sections.map((section, index) => {
                const isActive = currentSection === section.id;
                const isCompleted = getCurrentSectionIndex() > index;
                const isAccessible = index === 0 || getCurrentSectionIndex() >= index - 1;

                return (
                  <div key={section.id} className="flex items-center flex-1">
                    <button
                      type="button"
                      onClick={() => isAccessible && setCurrentSection(section.id)}
                      disabled={!isAccessible || loading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-[#08163d] text-white'
                          : isCompleted
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : isAccessible
                          ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                          : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {section.icon}
                      <span className="hidden sm:inline text-sm font-medium">{section.title}</span>
                    </button>
                    {index < sections.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground mx-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <AlertDescription>
                {quickSignup 
                  ? 'School created successfully! You can complete merchant onboarding later. Redirecting to schools list...'
                  : 'School and merchant account created successfully! KYC submitted for approval. Redirecting to schools list...'}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300">
                  {quickSignup ? (
                    <School className="h-6 w-6 text-blue-600" />
                  ) : (
                    <>
                      {currentSection === 'school' && <School className="h-6 w-6 text-blue-600" />}
                      {currentSection === 'owner' && <User className="h-6 w-6 text-blue-600" />}
                      {currentSection === 'business' && <Building2 className="h-6 w-6 text-blue-600" />}
                      {currentSection === 'financial' && <CreditCard className="h-6 w-6 text-blue-600" />}
                    </>
                  )}
                </div>
                <div>
                  <CardTitle>
                    {quickSignup 
                      ? 'School Information' 
                      : sections.find(s => s.id === currentSection)?.title}
                  </CardTitle>
                  <CardDescription>
                    {quickSignup 
                      ? 'Enter the school details below. The school code will be automatically generated. You can complete merchant onboarding later.'
                      : currentSection === 'school' && 'Enter the school details below. The school code will be automatically generated.'}
                    {!quickSignup && currentSection === 'owner' && 'Enter the owner or representative information for merchant KYC.'}
                    {!quickSignup && currentSection === 'business' && 'Enter business registration details required for merchant onboarding.'}
                    {!quickSignup && currentSection === 'financial' && 'Enter bank account information (optional). This can be added later.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* School Information Section */}
                {(quickSignup || currentSection === 'school') && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        School Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., St. Mary's Primary School"
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="abbreviation" className="text-sm font-medium">
                        Abbreviation (Optional)
                      </Label>
                      <Input
                        id="abbreviation"
                        type="text"
                        value={formData.abbreviation}
                        onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                        placeholder="e.g., STMP"
                        maxLength={6}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional abbreviation for code generation. If not provided, it will be extracted from the school name.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-medium">
                        Address
                      </Label>
                      <Input
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g., Kampala, Uganda"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g., +256700123456"
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g., info@school.ug"
                        required
                        className="h-11"
                      />
                    </div>
                  </div>
                )}

                {/* Owner Information Section */}
                {!quickSignup && currentSection === 'owner' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ownerFirstName" className="text-sm font-medium">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="ownerFirstName"
                          type="text"
                          value={formData.ownerFirstName}
                          onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                          placeholder="e.g., John"
                          required
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ownerLastName" className="text-sm font-medium">
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="ownerLastName"
                          type="text"
                          value={formData.ownerLastName}
                          onChange={(e) => setFormData({ ...formData, ownerLastName: e.target.value })}
                          placeholder="e.g., Doe"
                          required
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ownerMiddleName" className="text-sm font-medium">
                        Middle Name (Optional)
                      </Label>
                      <Input
                        id="ownerMiddleName"
                        type="text"
                        value={formData.ownerMiddleName}
                        onChange={(e) => setFormData({ ...formData, ownerMiddleName: e.target.value })}
                        placeholder="e.g., Michael"
                        className="h-11"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ownerDateOfBirth" className="text-sm font-medium">
                          Date of Birth <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="ownerDateOfBirth"
                          type="date"
                          value={formData.ownerDateOfBirth}
                          onChange={(e) => setFormData({ ...formData, ownerDateOfBirth: e.target.value })}
                          required
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ownerGender" className="text-sm font-medium">
                          Gender <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.ownerGender}
                          onValueChange={(value) => setFormData({ ...formData, ownerGender: value as 'MALE' | 'FEMALE' | 'OTHER' })}
                          required
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ownerNationalId" className="text-sm font-medium">
                        National ID Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="ownerNationalId"
                        type="text"
                        value={formData.ownerNationalId}
                        onChange={(e) => setFormData({ ...formData, ownerNationalId: e.target.value })}
                        placeholder="e.g., CM12345678901234"
                        required
                        minLength={10}
                        maxLength={20}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        National ID number of the school owner or representative
                      </p>
                    </div>
                  </div>
                )}

                {/* Business Registration Section */}
                {!quickSignup && currentSection === 'business' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="certificateOfIncorporation" className="text-sm font-medium">
                          Certificate of Incorporation <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="certificateOfIncorporation"
                          type="text"
                          value={formData.certificateOfIncorporation}
                          onChange={(e) => setFormData({ ...formData, certificateOfIncorporation: e.target.value })}
                          placeholder="e.g., 80020012345678"
                          required
                          minLength={5}
                          maxLength={50}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="taxIdentificationNumber" className="text-sm font-medium">
                          Tax Identification Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="taxIdentificationNumber"
                          type="text"
                          value={formData.taxIdentificationNumber}
                          onChange={(e) => setFormData({ ...formData, taxIdentificationNumber: e.target.value })}
                          placeholder="e.g., TIN123456789"
                          required
                          minLength={5}
                          maxLength={20}
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessType" className="text-sm font-medium">
                          Business Type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.businessType}
                          onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                          required
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SOLE_PROPRIETORSHIP">Sole Proprietorship</SelectItem>
                            <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                            <SelectItem value="LIMITED_COMPANY">Limited Company</SelectItem>
                            <SelectItem value="PUBLIC_COMPANY">Public Company</SelectItem>
                            <SelectItem value="NGO">NGO</SelectItem>
                            <SelectItem value="COOPERATIVE">Cooperative</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="businessRegistrationDate" className="text-sm font-medium">
                          Registration Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="businessRegistrationDate"
                          type="date"
                          value={formData.businessRegistrationDate}
                          onChange={(e) => setFormData({ ...formData, businessRegistrationDate: e.target.value })}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessCity" className="text-sm font-medium">
                        Business City <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="businessCity"
                        type="text"
                        value={formData.businessCity}
                        onChange={(e) => setFormData({ ...formData, businessCity: e.target.value })}
                        placeholder="e.g., Kampala"
                        required
                        className="h-11"
                      />
                    </div>
                  </div>
                )}

                {/* Financial Information Section */}
                {!quickSignup && currentSection === 'financial' && (
                  <div className="space-y-6">
                    <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                      <AlertDescription>
                        Financial information is optional. You can add bank account details later if needed.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="bankName" className="text-sm font-medium">
                        Bank Name
                      </Label>
                      <Input
                        id="bankName"
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="e.g., Bank of Uganda"
                        className="h-11"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber" className="text-sm font-medium">
                          Account Number
                        </Label>
                        <Input
                          id="accountNumber"
                          type="text"
                          value={formData.accountNumber}
                          onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                          placeholder="e.g., 1234567890"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountName" className="text-sm font-medium">
                          Account Name
                        </Label>
                        <Input
                          id="accountName"
                          type="text"
                          value={formData.accountName}
                          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                          placeholder="e.g., School Name"
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branch" className="text-sm font-medium">
                        Branch
                      </Label>
                      <Input
                        id="branch"
                        type="text"
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        placeholder="e.g., Kampala Main Branch"
                        className="h-11"
                      />
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  {!quickSignup && getCurrentSectionIndex() > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={loading}
                      className="flex-1"
                    >
                      Previous
                    </Button>
                  )}
                  
                  {quickSignup ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={loading}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || !formData.name || !formData.phone || !formData.email}
                        className="flex-1 bg-[#08163d] hover:bg-[#0a1f4f] text-white"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating School...
                          </>
                        ) : (
                          <>
                            <School className="mr-2 h-4 w-4" />
                            Create School (Quick Signup)
                          </>
                        )}
                      </Button>
                    </>
                  ) : getCurrentSectionIndex() < sections.length - 1 ? (
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
                      {getCurrentSectionIndex() > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.back()}
                          disabled={loading}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={loading || !canProceedToNext()}
                        className="flex-1 bg-[#08163d] hover:bg-[#0a1f4f] text-white"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating School & Merchant...
                          </>
                        ) : (
                          <>
                            <School className="mr-2 h-4 w-4" />
                            Create School & Merchant
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
