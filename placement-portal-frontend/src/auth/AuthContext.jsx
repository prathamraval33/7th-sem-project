// Stores the current user, JWT tokens, and role — the single source of
// truth for auth state across the app.
import { createContext, useCallback, useEffect, useState } from "react";
import { authApi } from "../api/auth.api";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../utils/tokenStorage";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateUser = useCallback(async () => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await authApi.getMe();
      setUser(data);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
    const { data: me } = await authApi.getMe();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const value = {
    user,
    setUser,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    logout,
    refreshUser: hydrateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
