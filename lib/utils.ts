import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Canonical Uganda MSISDN for API: 256XXXXXXXXX (no + prefix). */
export function normalizeUgandaPhoneForStorage(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10 && digits.startsWith('0')) {
    return `256${digits.slice(1)}`
  }
  if (digits.length === 9) {
    return `256${digits}`
  }
  if (digits.startsWith('256') && digits.length >= 12) {
    return digits.slice(0, 12)
  }
  return digits
}



