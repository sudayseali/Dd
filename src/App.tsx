import React from 'react';
import { AppProvider, useAppConfig } from './context/AppContext';
import UserTask from './components/UserTask';
import AdminDashboard from './components/AdminDashboard';
import { ShieldAlert, Terminal } from 'lucide-react';

function AppContent() {
  const { isReady, isAdmin, telegramId } = useAppConfig();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Strict Telegram environment check
  if (!telegramId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col items-center justify-center p-6 selection:bg-emerald-500/30 selection:text-emerald-200">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-rose-600"></div>
          
          <div className="w-20 h-20 bg-zinc-950 border border-zinc-800 rounded-2xl mx-auto flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-red-500/10 rounded-2xl animate-pulse"></div>
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-zinc-100 mb-3 tracking-tight">Access Restricted</h1>
          
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Nidaamka amniga wuxuu ogaaday inaad ka soo galayso meel ka baxsan Telegram. Si aad u isticmaasho app-kan, fadlan ka fur dhexdiisa <span className="text-emerald-400 font-medium">Telegram App</span>.
          </p>

          <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 flex items-start text-left space-x-3">
            <Terminal className="w-5 h-5 text-zinc-500 mt-0.5 shrink-0" />
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest leading-relaxed">
              Error: 403 Forbidden<br/>
              Context: EXTR_BROWSER<br/>
              <span className="text-red-500/80 mt-1 block">Connection rejected.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active App (In Telegram)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {isAdmin ? <AdminDashboard /> : <UserTask />}
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
