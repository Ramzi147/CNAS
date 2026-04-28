import type { UserRole } from "../context/AuthContext";

export type User = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
};