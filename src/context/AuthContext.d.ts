// TypeScript declaration for AuthContext.js
import { ReactNode } from "react";

export interface AuthContextType {
  user: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  sendMagicLink: (email: string) => Promise<any>;
  logout: () => Promise<void>;
  signOut?: () => Promise<void>;
}

export declare function AuthProvider({ children }: { children: ReactNode }): JSX.Element;
export declare function useAuth(): AuthContextType;
