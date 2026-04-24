import React, { createContext, useContext, useEffect, useState } from 'react';

// Using the provided admin Telegram ID
export const ADMIN_IDS = ['5806129562'];

interface AppContextType {
  telegramId: string | null;
  isAdmin: boolean;
  tgUser: any | null;
  isReady: boolean;
  startParam: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<any | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [startParam, setStartParam] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: any;
    
    const tryInit = (retriesLeft: number) => {
      const webApp = window.Telegram?.WebApp;
      
      if (webApp) {
        webApp.expand();
        
        if (webApp.initDataUnsafe?.start_param) {
          setStartParam(webApp.initDataUnsafe.start_param);
        }

        // Sometimes user id is populated shortly after init
        const user = webApp.initDataUnsafe?.user;
        if (user && user.id) {
          const idStr = String(user.id);
          setTelegramId(idStr);
          setTgUser(user);
          webApp.ready();
          setIsReady(true);
          return;
        }
      }
      
      // Fallback: Check if Telegram passed parameters in URL hash manually (sometimes happens in external clients)
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const initDataRaw = hashParams.get('tgWebAppData');
        const legacyStartParam = hashParams.get('tgWebAppStartParam');
        
        if (legacyStartParam) {
           setStartParam(legacyStartParam);
        }

        if (initDataRaw) {
          const params = new URLSearchParams(initDataRaw);
          const userStr = params.get('user');
          const sp = params.get('start_param');
          if (sp) setStartParam(sp);

          if (userStr) {
            const userObj = JSON.parse(decodeURIComponent(userStr));
            if (userObj && userObj.id) {
              setTelegramId(String(userObj.id));
              setTgUser(userObj);
              setIsReady(true);
              return;
            }
          }
        }
      } catch (e) {
         // ignore parsing errors
      }

      if (retriesLeft > 0) {
        timeoutId = setTimeout(() => tryInit(retriesLeft - 1), 200);
      } else {
        // Fallback or finish
        setIsReady(true);
      }
    };

    tryInit(15); // Try for up to 3 seconds (15 * 200ms)

    return () => clearTimeout(timeoutId);
  }, []);

  const isAdmin = telegramId ? ADMIN_IDS.includes(telegramId) : false;

  return (
    <AppContext.Provider value={{ telegramId, isAdmin, tgUser, isReady, startParam }}>
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
