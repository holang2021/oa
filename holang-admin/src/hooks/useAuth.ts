// ============================================================
// Auth Hook - localStorage-based auth for demo
// ============================================================

import { useState, useEffect, useCallback } from "react";
import type { User, LoginCredentials } from "@/types";
import { DEFAULT_USERS } from "@/data/mockData";

const STORAGE_KEY = "holang_admin_user";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setLoading(true);
    setError("");
    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    const found = DEFAULT_USERS.find(
      u => u.username === credentials.username && u.password === credentials.password
    );

    if (found) {
      const { password: _, ...safeUser } = found;
      setUser(safeUser as User);
      setLoading(false);
      return true;
    }

    setError("用户名或密码错误");
    setLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { user, loading, error, login, logout, setError };
}
