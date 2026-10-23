import {
  ApiError,
  clearAccessToken,
  getAccessToken,
  getApiBaseUrl,
  getPersistedUsername,
  isPersistLogin,
  saveAccessToken,
  type LoginResponse,
  type MeResponse,
} from "@/lib/auth"

export { ApiError } from "@/lib/auth"

type ApiErrorBody = {
  status?: number
  error?: string
  message?: string
  errors?: { field?: string; message?: string; defaultMessage?: string }[]
}

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  auth?: boolean
  parseJson?: boolean
  suppressUnauthorized?: boolean
}

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()
let unauthorizedSuppressed = false

export function suppressUnauthorizedRedirect(suppress: boolean) {
  unauthorizedSuppressed = suppress
}

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    body,
    auth = true,
    parseJson = true,
    suppressUnauthorized = false,
    headers,
    method = body !== undefined ? "POST" : "GET",
    ...rest
  } = options

  const finalHeaders = new Headers(headers)
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData

  if (body !== undefined && !isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json")
  }
  if (parseJson && !finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json")
  }
  if (auth) {
    const token = getAccessToken()
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  })

  if (res.status === 401 && !suppressUnauthorized && !unauthorizedSuppressed) {
    clearAccessToken()
    unauthorizedListeners.forEach((fn) => fn())
  }

  if (!res.ok) {
    throw new ApiError(await extractErrorMessage(res), res.status)
  }

  if (!parseJson || res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody
    if (body?.errors && body.errors.length > 0) {
      const details = body.errors
        .map((e) => {
          const field = e.field ?? ""
          const msg = e.message || e.defaultMessage || ""
          return field ? `${field}: ${msg}` : msg
        })
        .filter(Boolean)
        .join("\n")
      if (details) return details
    }
    if (body?.message) return body.message
  } catch {
    // 응답 본문이 JSON이 아니면 상태 코드 기반 메시지로 fallback
  }
  if (res.status === 401) return "인증이 필요합니다. 다시 로그인해주세요."
  if (res.status === 403) return "접근 권한이 없습니다."
  if (res.status === 404) return "요청한 리소스를 찾을 수 없습니다."
  if (res.status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
  return "요청 처리 중 오류가 발생했습니다."
}

export const api = {
  get: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
}

export async function login(
  username: string,
  password: string,
  persist = false,
): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>(
    "/api/auth/login",
    { username, password, rememberMe: persist },
    { auth: false },
  )
  saveAccessToken(data.accessToken, persist, username)
  return data
}

/** JWT payload 의 iat/exp (초) */
function readTokenTimes(token: string): { iat: number; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    if (typeof payload.exp !== "number") return null
    return { iat: typeof payload.iat === "number" ? payload.iat : payload.exp - 3600, exp: payload.exp }
  } catch {
    return null
  }
}

let refreshing: Promise<void> | null = null

/**
 * 사용 중 토큰 자동 연장.
 * - 유효 기간의 절반이 지났으면 새 토큰으로 바꾼다 (자동로그인은 30일, 일반 로그인은 1시간 단위).
 * - 자동로그인인데 예전 1시간짜리 토큰이면 바로 자동로그인 토큰으로 바꾼다.
 * - 이미 만료됐거나 강제 로그아웃된 토큰이면 401 → 전역 로그아웃 처리.
 */
export async function refreshTokenIfNeeded(): Promise<void> {
  const token = getAccessToken()
  if (!token) return
  const times = readTokenTimes(token)
  if (!times) return
  const now = Date.now() / 1000
  if (times.exp <= now) return // 만료 토큰은 다음 요청에서 401 처리
  const persist = isPersistLogin()
  const lifetime = times.exp - times.iat
  const halfPassed = now - times.iat >= lifetime / 2
  const upgradeToRemember = persist && lifetime < 24 * 3600
  if (!halfPassed && !upgradeToRemember) return
  if (refreshing) return refreshing
  refreshing = (async () => {
    try {
      const data = await api.post<LoginResponse>("/api/auth/refresh", { rememberMe: persist })
      saveAccessToken(data.accessToken, persist, persist ? getPersistedUsername() || data.username : undefined)
    } catch {
      // 401 은 apiFetch 가 전역 로그아웃으로 처리, 그 외 오류는 다음 주기에 재시도
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

export async function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>("/api/auth/me")
}
