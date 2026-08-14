/** Shared free-text class helpers for student forms/import. */

export const MAX_CLASS_LENGTH = 50;

export function normalizeClassLabel(value: string): string {
  return value.trim();
}

export function isValidClassLabel(value: string): boolean {
  const normalized = normalizeClassLabel(value);
  return normalized.length > 0 && normalized.length <= MAX_CLASS_LENGTH;
}

export type StudentImportRow = {
  first_name: string;
  last_name: string;
  phone: string;
  class: string;
  stream?: string;
  school_fees_amount?: number;
  scholarship_type?: string;
  scholarship_percentage?: number;
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
};

export function mapExcelRowToStudent(row: Record<string, unknown>): StudentImportRow {
  const firstName = String(row['First Name'] || row['first_name'] || row['FirstName'] || row['FIRST_NAME'] || '').trim();
  const lastName = String(row['Last Name'] || row['last_name'] || row['LastName'] || row['LAST_NAME'] || '').trim();
  const phone = String(row['Phone'] || row['phone'] || row['PHONE'] || '').trim();
  const className = String(row['Class'] || row['class'] || row['CLASS'] || '').trim();
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
  const payload: Record<string, unknown> = {
    first_name: student.first_name,
    last_name: student.last_name,
    class: student.class,
  };
  if (student.phone) payload.phone = student.phone;
  if (student.stream) payload.stream = student.stream;
  if (student.school_fees_amount !== undefined) payload.school_fees_amount = student.school_fees_amount;
  if (student.scholarship_type) payload.scholarship_type = student.scholarship_type;
  if (student.scholarship_percentage !== undefined && !Number.isNaN(student.scholarship_percentage)) {
    payload.scholarship_percentage = student.scholarship_percentage;
  }
  if (student.parent_first_name) payload.parent_first_name = student.parent_first_name;
  if (student.parent_last_name) payload.parent_last_name = student.parent_last_name;
  if (student.parent_phone) payload.parent_phone = student.parent_phone;
  return payload;
}
