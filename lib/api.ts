import {
  ApiError,
  clearAccessToken,
  getAccessToken,
  getApiBaseUrl,
  saveAccessToken,
  type LoginResponse,
  type MeResponse,
} from "@/lib/auth"

export { ApiError } from "@/lib/auth"

type ApiErrorBody = {
  status?: number
  error?: string
  message?: string
}

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  auth?: boolean
  parseJson?: boolean
}

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

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

  if (res.status === 401) {
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
): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>(
    "/api/auth/login",
    { username, password },
    { auth: false },
  )
  saveAccessToken(data.accessToken)
  return data
}

export async function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>("/api/auth/me")
}
