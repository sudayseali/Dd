import React, { createContext, useContext, useEffect, useState } from 'react';

// Using the provided admin Telegram ID
export const ADMIN_IDS = ['5806129562'];

interface AppContextType {
  telegramId: string | null;
  isAdmin: boolean;
  tgUser: any | null;
  isReady: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<any | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Strictly require Telegram WebApp environment
    const initTelegram = () => {
      let id = null;
      let user = null;
      
      if (window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        const initDataUnsafe = webApp.initDataUnsafe;
        
        if (initDataUnsafe?.user?.id) {
          id = String(initDataUnsafe.user.id);
          user = initDataUnsafe.user;
          
          webApp.expand(); // Expand app to maximum available height
          webApp.ready();
        }
      }
      
      setTelegramId(id);
      setTgUser(user);
      setIsReady(true);
    };

    initTelegram();
  }, []);

  const isAdmin = telegramId ? ADMIN_IDS.includes(telegramId) : false;

  return (
    <AppContext.Provider value={{ telegramId, isAdmin, tgUser, isReady }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppConfig = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppProvider');
  }
  return context;
};
