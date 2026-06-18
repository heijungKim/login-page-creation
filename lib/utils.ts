import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 숫자 입력 시 1000단위 콤마 자동 적용 */
export function toCommaNumber(value: string): string {
  const digits = value.replace(/[^0-9]/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("ko-KR")
}
