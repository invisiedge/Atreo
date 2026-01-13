/**
 * Authentication Types
 * Contains all authentication-related type definitions
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "user" | "accountant";
}

export interface SignupResponse {
  message: string;
  user: User;
  token: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "accountant";
  employeeId?: string;
  adminRole?: "admin" | "super-admin";
  permissions?: string[];
  isActive?: boolean;
  phone?: string;
  address?: string;
  position?: string;
  bankName?: string;
  accountNumber?: string;
  swiftCode?: string;
  createdAt?: string;
}
