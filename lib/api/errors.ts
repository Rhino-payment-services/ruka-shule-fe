/** Pull a human-readable message from typical Axios / API error shapes. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err || typeof err !== 'object') {
    return fallback;
  }

  const axiosLike = err as {
    message?: string;
    response?: {
      data?: {
        error?: string | { message?: string };
        message?: string;
        data?: { error?: string; message?: string };
      };
    };
  };

  const data = axiosLike.response?.data;
  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }
  if (data?.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
    return data.error.message.trim();
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  if (typeof data?.data?.error === 'string' && data.data.error.trim()) {
    return data.data.error.trim();
  }
  if (typeof data?.data?.message === 'string' && data.data.message.trim()) {
    return data.data.message.trim();
  }
  if (typeof axiosLike.message === 'string' && axiosLike.message.trim() && !axiosLike.message.startsWith('Request failed')) {
    return axiosLike.message.trim();
  }

  return fallback;
}

function getHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  return (err as { response?: { status?: number } }).response?.status;
}

export function isSchoolContextRequiredError(err: unknown): boolean {
  return getApiErrorMessage(err, '').toLowerCase().includes('school context required');
}

export type SchoolContextVerificationResult =
  | 'not_school_context'
  | 'missing_school_link'
  | 'unexpected_context';

export async function verifySchoolContextIssue(
  err: unknown,
  verifySchool: () => Promise<unknown>,
): Promise<SchoolContextVerificationResult> {
  if (!isSchoolContextRequiredError(err)) {
    return 'not_school_context';
  }

  try {
    await verifySchool();
    return 'unexpected_context';
  } catch (verifyErr) {
    const verifyMessage = getApiErrorMessage(verifyErr, '').toLowerCase();
    const verifyStatus = getHttpStatus(verifyErr);
    if (
      verifyStatus === 404 ||
      verifyMessage.includes('school context required') ||
      verifyMessage.includes('school not found')
    ) {
      return 'missing_school_link';
    }
    return 'unexpected_context';
  }
}

/** Map known school-create errors onto form fields when possible. */
export function mapSchoolCreateFieldErrors(message: string): Record<string, string> {
  const lower = message.toLowerCase();
  const fields: Record<string, string> = {};

  if (lower.includes('school with this name') || lower.includes('name already exists')) {
    fields.schoolName = message;
  }
  if (lower.includes('school code') || (lower.includes('code') && lower.includes('already'))) {
    fields.schoolCode = message;
  }
  if (lower.includes('phone') && (lower.includes('already') || lower.includes('exists'))) {
    fields.phone = message;
  }
  if (lower.includes('email') && (lower.includes('already') || lower.includes('exists'))) {
    fields.email = message;
  }

  return fields;
}
