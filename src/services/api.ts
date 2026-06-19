import axios from "axios";
import type { AccuracyMetrics, AuthResponse, Claim, ClaimListItem, ClaimReview, Decision, EvidenceRequirement, ObjectType } from "../types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("claimlens_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),
  register: (full_name: string, email: string, password: string) =>
    api.post<AuthResponse>("/auth/register", { full_name, email, password }).then((r) => r.data),
};

export const claimsApi = {
  list: () => api.get<ClaimListItem[]>("/claims").then((r) => r.data),
  get: (id: string) => api.get<Claim>(`/claims/${id}`).then((r) => r.data),
  create: (data: FormData) =>
    api.post<Claim>("/claims/create", data, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  metrics: () => api.get<AccuracyMetrics>("/claims/metrics/accuracy").then((r) => r.data),
  review: (id: string, actual_decision: Decision, notes = "") =>
    api.post<ClaimReview>(`/claims/${id}/review`, { actual_decision, notes }).then((r) => r.data),
};

export const evidenceApi = {
  all: () =>
    api.get<Record<ObjectType, EvidenceRequirement[]>>("/evidence-requirements").then((r) => r.data),
};

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.detail || error.message;
  return "Something went wrong. Please try again.";
}
