/** Shared free-text class helpers for student forms/import. */

export const MAX_CLASS_LENGTH = 50;

export const STUDENT_GENDERS = ['Male', 'Female'] as const;
export type StudentGenderValue = (typeof STUDENT_GENDERS)[number];

export function normalizeClassLabel(value: string): string {
  return value.trim();
}

export function isValidClassLabel(value: string): boolean {
  const normalized = normalizeClassLabel(value);
  return normalized.length > 0 && normalized.length <= MAX_CLASS_LENGTH;
}

export function normalizeStudentGender(value?: string | null): StudentGenderValue | undefined {
  const raw = (value || '').trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === 'male' || raw === 'm' || raw === 'boy' || raw === 'boys') return 'Male';
  if (raw === 'female' || raw === 'f' || raw === 'girl' || raw === 'girls') return 'Female';
  return undefined;
}

export function isValidStudentGender(value?: string | null): boolean {
  if (!value || !String(value).trim()) return true;
  return normalizeStudentGender(value) !== undefined;
}

export type StudentImportRow = {
  first_name: string;
  last_name: string;
  phone: string;
  class: string;
  gender?: string;
  stream?: string;
  school_fees_amount?: number;
  scholarship_type?: string;
  scholarship_percentage?: number;
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
};

export function normalizeStudentImportRow(student: StudentImportRow): StudentImportRow {
  const parsedFees =
    student.school_fees_amount !== undefined && !Number.isNaN(student.school_fees_amount)
      ? student.school_fees_amount
      : undefined;
  const parsedScholarship =
    student.scholarship_percentage !== undefined && !Number.isNaN(student.scholarship_percentage)
      ? student.scholarship_percentage
      : undefined;

  return {
    first_name: student.first_name.trim(),
    last_name: student.last_name.trim(),
    phone: student.phone.trim(),
    class: normalizeClassLabel(student.class),
    gender: normalizeStudentGender(student.gender),
    stream: student.stream?.trim() || undefined,
    school_fees_amount: parsedFees,
    scholarship_type: student.scholarship_type?.trim() || undefined,
    scholarship_percentage: parsedScholarship,
    parent_first_name: student.parent_first_name?.trim() || undefined,
    parent_last_name: student.parent_last_name?.trim() || undefined,
    parent_phone: student.parent_phone?.trim() || undefined,
  };
}

export function validateStudentImportRow(student: StudentImportRow): string[] {
  const normalized = normalizeStudentImportRow(student);
  const errors: string[] = [];

  if (!normalized.first_name) errors.push('First name is required');
  if (!normalized.last_name) errors.push('Last name is required');
  if (!isValidClassLabel(normalized.class)) {
    errors.push('Class is required and must be 50 characters or fewer');
  }
  if (!normalized.phone && !normalized.parent_phone) {
    errors.push('Student phone or parent phone is required');
  }
  if (student.gender && String(student.gender).trim() && !normalized.gender) {
    errors.push('Gender must be Male or Female');
  }
  if (
    normalized.school_fees_amount !== undefined &&
    (Number.isNaN(normalized.school_fees_amount) || normalized.school_fees_amount < 0)
  ) {
    errors.push('School fees amount must be a valid positive number');
  }
  if (
    normalized.scholarship_percentage !== undefined &&
    (Number.isNaN(normalized.scholarship_percentage) ||
      normalized.scholarship_percentage < 0 ||
      normalized.scholarship_percentage > 100)
  ) {
    errors.push('Scholarship percentage must be between 0 and 100');
  }

  return errors;
}

export function mapExcelRowToStudent(row: Record<string, unknown>): StudentImportRow {
  const firstName = String(row['First Name'] || row['first_name'] || row['FirstName'] || row['FIRST_NAME'] || '').trim();
  const lastName = String(row['Last Name'] || row['last_name'] || row['LastName'] || row['LAST_NAME'] || '').trim();
  const phone = String(row['Phone'] || row['phone'] || row['PHONE'] || '').trim();
  const className = String(row['Class'] || row['class'] || row['CLASS'] || '').trim();
  const gender = row['Gender'] || row['gender'] || row['GENDER'] || row['Sex'] || row['sex'];
  const stream = row['Stream'] || row['stream'] || row['STREAM'] || row['Subject Combination'];
  const scholarshipType = row['Scholarship Type'] || row['scholarship_type'] || row['ScholarshipType'];
  const scholarshipPercentage =
    row['Scholarship Percentage'] ||
    row['scholarship_percentage'] ||
    row['ScholarshipPercentage'] ||
    row['Discount'] ||
    row['discount'];
  const schoolFees =
    row['School Fees Amount'] ||
    row['school_fees_amount'] ||
    row['SchoolFeesAmount'] ||
    row['Fees'];
  const parentFirstName = row['Parent First Name'] || row['parent_first_name'] || row['ParentFirstName'];
  const parentLastName = row['Parent Last Name'] || row['parent_last_name'] || row['ParentLastName'];
  const parentPhone = row['Parent Phone'] || row['parent_phone'] || row['ParentPhone'];

  const parsedFees =
    schoolFees !== undefined && schoolFees !== null && String(schoolFees).trim() !== ''
      ? parseFloat(String(schoolFees))
      : undefined;

  return {
    first_name: firstName,
    last_name: lastName,
    phone,
    class: className,
    gender: gender ? String(gender).trim() : undefined,
    stream: stream ? String(stream).trim() : undefined,
    school_fees_amount: parsedFees !== undefined && !Number.isNaN(parsedFees) ? parsedFees : undefined,
    scholarship_type: scholarshipType ? String(scholarshipType).trim() : undefined,
    scholarship_percentage:
      scholarshipPercentage !== undefined && scholarshipPercentage !== null && String(scholarshipPercentage).trim() !== ''
        ? parseFloat(String(scholarshipPercentage))
        : undefined,
    parent_first_name: parentFirstName ? String(parentFirstName).trim() : undefined,
    parent_last_name: parentLastName ? String(parentLastName).trim() : undefined,
    parent_phone: parentPhone ? String(parentPhone).trim() : undefined,
  };
}

export function buildStudentCreatePayload(student: StudentImportRow): Record<string, unknown> {
  const normalized = normalizeStudentImportRow(student);
  const payload: Record<string, unknown> = {
    first_name: normalized.first_name,
    last_name: normalized.last_name,
    class: normalized.class,
  };
  if (normalized.phone) payload.phone = normalized.phone;
  if (normalized.gender) payload.gender = normalized.gender;
  if (normalized.stream) payload.stream = normalized.stream;
  if (normalized.school_fees_amount !== undefined) payload.school_fees_amount = normalized.school_fees_amount;
  if (normalized.scholarship_type) payload.scholarship_type = normalized.scholarship_type;
  if (
    normalized.scholarship_percentage !== undefined &&
    !Number.isNaN(normalized.scholarship_percentage)
  ) {
    payload.scholarship_percentage = normalized.scholarship_percentage;
  }
  if (normalized.parent_first_name) payload.parent_first_name = normalized.parent_first_name;
  if (normalized.parent_last_name) payload.parent_last_name = normalized.parent_last_name;
  if (normalized.parent_phone) payload.parent_phone = normalized.parent_phone;
  return payload;
}
