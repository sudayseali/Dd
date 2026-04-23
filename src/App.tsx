import React from 'react';
import { AppProvider, useAppConfig, ADMIN_IDS } from './context/AppContext';
import UserTask from './components/UserTask';
import AdminDashboard from './components/AdminDashboard';
import { Shield, Smartphone } from 'lucide-react';

function AppContent() {
  const { isReady, isAdmin, telegramId, setMockTelegramId } = useAppConfig();

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Dev Navigation (Mock) - Only visible if we aren't legitimately inside Telegram to allow local testing */}
      {!window.Telegram?.WebApp?.initDataUnsafe?.user?.id && (
        <div className="bg-white border-b border-slate-200 p-2 flex justify-center space-x-2 fixed top-0 w-full z-50">
          <button 
            onClick={() => setMockTelegramId('user_' + Math.floor(Math.random()*1000))}
            className={`px-3 py-1 text-xs font-bold rounded-full flex items-center ${!isAdmin ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Smartphone className="w-3 h-3 mr-1" /> User Mode
          </button>
          <button 
            onClick={() => setMockTelegramId(ADMIN_IDS[0])}
            className={`px-3 py-1 text-xs font-bold rounded-full flex items-center ${isAdmin ? 'bg-[#24A1DE] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Shield className="w-3 h-3 mr-1" /> Admin Mode
          </button>
        </div>
      )}
      
      <div className={!window.Telegram?.WebApp?.initDataUnsafe?.user?.id ? "pt-12" : ""}>
        {isAdmin ? <AdminDashboard /> : <UserTask />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
