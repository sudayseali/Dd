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
    let retryCount = 0;
    
    const initTelegram = () => {
      let id = null;
      let user = null;
      
      if (window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        
        // Ensure app is expanded
        webApp.expand(); 
        
        // Wait for initData to populate
        if (webApp.initDataUnsafe?.user?.id) {
          id = String(webApp.initDataUnsafe.user.id);
          user = webApp.initDataUnsafe.user;
          webApp.ready();
          
          setTelegramId(id);
          setTgUser(user);
          setIsReady(true);
        } else if (retryCount < 10) {
          // If the object exists but user data isn't loaded yet, try again in 100ms
          retryCount++;
          setTimeout(initTelegram, 100);
        } else {
           // We are in a browser or outside the proper bot context
           setIsReady(true);
        }
      } else if (retryCount < 10) {
         retryCount++;
         setTimeout(initTelegram, 100);
      } else {
         // No telegram object at all
         setIsReady(true);
      }
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
