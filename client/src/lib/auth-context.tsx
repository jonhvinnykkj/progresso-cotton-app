import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, UserRole } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  selectedRole: UserRole | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSelectedRole: (role: UserRole) => void;
  login: (user: User, accessToken: string, refreshToken: string, selectedRole?: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
  clearCacheAndReload: () => Promise<void>;
  getAuthHeaders: () => HeadersInit;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRoleState] = useState<UserRole | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("cotton_user");
    const storedRole = localStorage.getItem("cotton_selected_role");
    const storedAccessToken = localStorage.getItem("cotton_access_token");
    const storedRefreshToken = localStorage.getItem("cotton_refresh_token");

    if (storedUser && storedAccessToken) {
      try {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);

        if (storedRole) {
          setSelectedRoleState(storedRole as UserRole);
        }
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("cotton_user");
        localStorage.removeItem("cotton_selected_role");
        localStorage.removeItem("cotton_access_token");
        localStorage.removeItem("cotton_refresh_token");
      }
    }
  }, []);

  const login = (newUser: User, newAccessToken: string, newRefreshToken: string, role?: UserRole) => {
    setUser(newUser);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);

    localStorage.setItem("cotton_user", JSON.stringify(newUser));
    localStorage.setItem("cotton_access_token", newAccessToken);
    localStorage.setItem("cotton_refresh_token", newRefreshToken);

    if (role) {
      setSelectedRoleState(role);
      localStorage.setItem("cotton_selected_role", role);
    }
  };

  const setSelectedRole = (role: UserRole) => {
    setSelectedRoleState(role);
    localStorage.setItem("cotton_selected_role", role);
  };

  const logout = () => {
    setUser(null);
    setSelectedRoleState(null);
    setAccessToken(null);
    setRefreshToken(null);

    localStorage.removeItem("cotton_user");
    localStorage.removeItem("cotton_selected_role");
    localStorage.removeItem("cotton_access_token");
    localStorage.removeItem("cotton_refresh_token");
  };

  const getAuthHeaders = (): HeadersInit => {
    if (!accessToken) {
      return {};
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  };

  const clearCacheAndReload = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear localStorage (keep user session and tokens)
      const currentUser = localStorage.getItem("cotton_user");
      const currentRole = localStorage.getItem("cotton_selected_role");
      const currentAccessToken = localStorage.getItem("cotton_access_token");
      const currentRefreshToken = localStorage.getItem("cotton_refresh_token");

      localStorage.clear();

      if (currentUser) {
        localStorage.setItem("cotton_user", currentUser);
      }
      if (currentRole) {
        localStorage.setItem("cotton_selected_role", currentRole);
      }
      if (currentAccessToken) {
        localStorage.setItem("cotton_access_token", currentAccessToken);
      }
      if (currentRefreshToken) {
        localStorage.setItem("cotton_refresh_token", currentRefreshToken);
      }

      // Clear sessionStorage
      sessionStorage.clear();

      // Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Hard reload
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Reload anyway
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        selectedRole,
        accessToken,
        refreshToken,
        setSelectedRole,
        login,
        logout,
        isAuthenticated: !!user && !!accessToken,
        clearCacheAndReload,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
