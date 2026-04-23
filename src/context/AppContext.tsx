import React, { createContext, useContext, useEffect, useState } from 'react';

// Using the provided admin Telegram ID
export const ADMIN_IDS = ['5806129562'];

interface AppContextType {
  telegramId: string | null;
  isAdmin: boolean;
  setMockTelegramId: (id: string) => void;
  isReady: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Attempt to get Telegram ID from window.Telegram.WebApp
    const initTelegram = () => {
      let id = null;
      if (window.Telegram?.WebApp) {
        const initDataUnsafe = window.Telegram.WebApp.initDataUnsafe;
        if (initDataUnsafe?.user?.id) {
          id = String(initDataUnsafe.user.id);
        }
      }
      
      // If we're not inside Telegram (e.g. testing in browser), we'll check localStorage for a mock ID
      if (!id) {
        id = localStorage.getItem('mock_telegram_id');
      }

      setTelegramId(id);
      setIsReady(true);
      
      // Notify Telegram we are ready
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
      }
    };

    initTelegram();
  }, []);

  const setMockTelegramId = (id: string) => {
    localStorage.setItem('mock_telegram_id', id);
    setTelegramId(id);
    // Reload to simulate fresh start
    window.location.reload();
  };

  const isAdmin = telegramId ? ADMIN_IDS.includes(telegramId) : false;

  return (
    <AppContext.Provider value={{ telegramId, isAdmin, setMockTelegramId, isReady }}>
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
