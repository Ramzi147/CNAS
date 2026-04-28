import type { User, UserRole } from "../context/AuthContext";
import api from "./api";

export type LoginPayload = { email: string; password: string };
export type LoginResult = { token: string; user: User };

const KEY_TOKEN = "cnas_token";
const KEY_USER = "cnas_user";

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    try {
      const response = await api.post<{
        success: boolean;
        token: string;
        user: { id: number | string; email: string; fullName: string; role: UserRole };
      }>("/auth/login", payload);

      const user: User = {
        id: String(response.data.user.id),
        email: response.data.user.email,
        fullName: response.data.user.fullName,
        role: response.data.user.role,
      };

      localStorage.setItem(KEY_TOKEN, response.data.token);
      localStorage.setItem(KEY_USER, JSON.stringify(user));

      return { token: response.data.token, user };
    } catch (error: any) {
      const message =
        error?.response?.data?.error || error?.message || "Email ou mot de passe incorrect.";
      throw new Error(message);
    }
  },

  logout() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
  },

  getUser(): User | null {
    const raw = localStorage.getItem(KEY_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem(KEY_TOKEN);
  },
};
