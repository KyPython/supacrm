// TypeScript declaration for AuthContext.js
import { ReactNode } from "react";

export interface UserProfile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  signUp: (email: string, password: string) => Promise<UserProfile | null>;
  sendMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut?: () => Promise<void>;
}

export declare function AuthProvider({ children }: { children: ReactNode }): JSX.Element;
export declare function useAuth(): AuthContextType;
