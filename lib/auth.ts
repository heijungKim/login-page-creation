const TOKEN_KEY = "freed_erp_access_token"
const PERSIST_KEY = "freed_erp_persist"
const USERNAME_KEY = "freed_erp_username"

const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "8080"

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL
  if (typeof window === "undefined") return `http://localhost:${DEFAULT_API_PORT}`
  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}`
}

/** @deprecated 새로운 코드는 getApiBaseUrl() 를 호출하세요. */
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"

export type LoginResponse = {
  accessToken: string
  tokenType: string
  expiresIn: number
  username: string
  displayName: string
}

export type MeResponse = {
  id: number
  username: string
  displayName: string
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "ApiError"
  }
}

export function saveAccessToken(token: string, persist = false, username?: string): void {
  if (typeof window === "undefined") return
  if (persist) {
    window.localStorage.setItem(TOKEN_KEY, token)
    window.localStorage.setItem(PERSIST_KEY, "1")
    if (username) window.localStorage.setItem(USERNAME_KEY, username)
  } else {
    window.sessionStorage.setItem(TOKEN_KEY, token)
    window.localStorage.removeItem(PERSIST_KEY)
    window.localStorage.removeItem(USERNAME_KEY)
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY)
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(PERSIST_KEY)
  window.localStorage.removeItem(USERNAME_KEY)
  window.sessionStorage.removeItem(TOKEN_KEY)
}

export function getPersistedUsername(): string {
  if (typeof window === "undefined") return ""
  return window.localStorage.getItem(USERNAME_KEY) ?? ""
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

export function isPersistLogin(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(PERSIST_KEY) === "1"
}

export function logout(): void {
  clearAccessToken()
}
