import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  theme: 'dark' | 'light';
}

interface UserContextType {
  user: UserProfile;
  updateUser: (data: Partial<UserProfile>) => void;
  toggleTheme: (theme: 'dark' | 'light') => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const defaultUser: UserProfile = {
  name: 'Alexandre Silva',
  email: 'alexandre@financeflow.com',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUEz4YCXP7IwOZSzJ_SifXLKD36uqi_CBctKR17okK9n-CPpk472-SwPhRMMIJebP-uXfohuye-BKPO2ooNYq4EPDYlQdGQ_d_A0GsNwf06lutVJmc9W1eJi5EmnwKBE4djriUPxE1T3t2ArQ1hqEnosB9CVzWzRlqQq7Bc_xRCrl_FXXY38wd08l4CUCSX5vlO7bUNuE303ljY5m4kjZiZICQ-Ufb2OXzOr5diLSM92iQ25gOUUPprTR9j88E3-MLzC1s_LdQBzce',
  theme: 'dark' // Default theme
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);

  // Load from LocalStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('finflow_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        applyTheme(parsed.theme);
      } catch (e) {
        applyTheme(defaultUser.theme);
      }
    } else {
        applyTheme(defaultUser.theme);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('finflow_user', JSON.stringify(user));
  }, [user]);

  const applyTheme = (theme: 'dark' | 'light') => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  };

  const updateUser = (data: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...data }));
  };

  const toggleTheme = (theme: 'dark' | 'light') => {
    updateUser({ theme });
    applyTheme(theme);
  };

  return (
    <UserContext.Provider value={{ user, updateUser, toggleTheme }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
