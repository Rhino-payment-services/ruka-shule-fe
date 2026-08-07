// ---------------------------------------------------------------------------
// lib/api/index.ts — single barrel re-export
//
// Every existing import of '@/lib/api' continues to work unchanged:
//   import { authAPI, schoolsAPI, paymentsAPI, ... } from '@/lib/api'
//   import type { PublicSchoolLookupResponse } from '@/lib/api'
// ---------------------------------------------------------------------------

// Core axios instance + token store + interceptors
export { api, tokenStore, API_BASE_URL } from './client';

// Domain API modules
export { authAPI } from './auth';
export { schoolsAPI } from './schools';
export { studentsAPI } from './students';
export { paymentsAPI } from './payments';
export { feesAPI } from './fees';
export { adminAPI } from './admin';

// All shared types — import with `import type { ... } from '@/lib/api'`
export type {
  // Response wrappers
  ApiSuccessResponse,
  ApiPaginatedResponse,
  // Auth
  UserRole,
  User,
  AuthResponse,
  // Schools
  WalletInfo,
  School,
  PublicSchool,
  // Legacy alias so existing pages using `PublicSchoolLookupResponse` don't break
  PublicSchool as PublicSchoolLookupResponse,
  // Students
  Student,
  StudentPaymentInfo,
  // Fees
  FeeType,
  Fee,
  FeeForPayment,
  FeePaymentStatus,
  // Payments
  PaymentStatus,
  PaymentMethod,
  Payment,
  PaymentSummary,
  TermPaymentStatus,
  StudentPaymentSummary,
  StudentLookupResponse,
  SchoolPaymentInfo,
  // Settlements
  Settlement,
  SettlementsResponse,
  SettlementSummary,
  // Admin
  AdminStats,
  AdminUser,
} from './types';
