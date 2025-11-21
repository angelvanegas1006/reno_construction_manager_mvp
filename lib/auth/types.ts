/**
 * User roles in the system
 */
export type UserRole = "partner" | "reno_construction_manager" | "reno_admin" | "super_admin";

/**
 * Simulated user data (will be replaced with Auth0 later)
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  picture?: string;
}

/**
 * Auth context value
 */
export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}







