import { createContext, useContext, useState } from "react";

// ponytail: client-side gate only. The credentials ship in the JS bundle and
// the backend API stays open; move the check to the backend if this needs to
// keep people out.
const USERNAME = "admin";
const PASSWORD = "aitik2026";
const STORAGE_KEY = "aitik-auth";

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(readStored);

  const login = (username, password) => {
    if (username.trim() !== USERNAME || password !== PASSWORD) return false;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Private mode: stay logged in for this tab only.
    }
    setAuthed(true);
    return true;
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ authed, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
