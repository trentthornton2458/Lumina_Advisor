import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, getIdToken } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  logout: () => Promise<void>;
  loginAsDemo: (email?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  logout: async () => {},
  loginAsDemo: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const t = await u.getIdToken();
          setToken(t);
        } catch (e) {
          console.error("Failed to get ID token", e);
        }
      } else {
        setToken(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setToken(null);
  };

  const loginAsDemo = (email = 'demo@lumina.ai') => {
    const mockUser = {
      uid: 'demo-user-id-12345',
      email: email,
      displayName: 'Demo User',
      emailVerified: true,
      getIdToken: async () => 'demo-token-123',
    } as unknown as User;
    setUser(mockUser);
    setToken('demo-token-123');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, logout, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

