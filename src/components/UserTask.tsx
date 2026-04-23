import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../context/AppContext';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { supabase, SupabaseTask } from '../lib/supabase';
import { Loader2, CheckCircle2, Globe } from 'lucide-react';

export default function UserTask() {
  const { telegramId } = useAppConfig();
  const [step, setStep] = useState<'home' | 'form' | 'waiting' | 'success'>('home');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [accountType, setAccountType] = useState<'Personal' | 'Business'>('Personal');
  const [taskData, setTaskData] = useState<SupabaseTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initial check and real-time subscription
  useEffect(() => {
    if (!telegramId) return;

    const checkTaskStatus = async () => {
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (data && !error) {
        setTaskData(data as SupabaseTask);
        if (data.status === 'success') {
          setStep('success');
        } else if (data.status === 'waiting') {
          setStep('waiting');
        }
      }
    };

    checkTaskStatus();

    // Subscribe to realtime changes on this user's record
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'verifications',
          filter: `telegram_id=eq.${telegramId}`,
        },
        (payload) => {
          const updatedRow = payload.new as SupabaseTask;
          setTaskData(updatedRow);
          if (updatedRow.status === 'success') {
            setStep('success');
          } else if (updatedRow.status === 'waiting') {
             setStep('waiting');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [telegramId]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Auto-prepend + if it doesn't exist and they start typing a number that is not zero
    if (val && !val.startsWith('+') && !val.startsWith('0')) {
        val = '+' + val;
    }
    setPhone(val);

    try {
      const phoneNumber = parsePhoneNumberFromString(val);
      if (phoneNumber?.country) {
        const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
        const countryName = displayNames.of(phoneNumber.country);
        // Include both Name and calling code (+252, etc)
        const callingCode = phoneNumber.countryCallingCode ? `+${phoneNumber.countryCallingCode}` : '';
        setCountry(`${countryName} (${callingCode})`);
      } else {
        setCountry('');
      }
    } catch (err) {
      setCountry('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramId || !phone) return;

    setIsLoading(true);
    
    // Upsert the record
    const { data, error } = await supabase
      .from('verifications')
      .upsert({
         telegram_id: telegramId,
         phone,
         country,
         account_type: accountType,
         status: 'waiting',
      }, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (!error && data) {
      setTaskData(data as SupabaseTask);
      setStep('waiting');
    } else {
       console.error("Error creating request:", error);
       alert("Khalad ayaa dhacay fadlan dib isku day!");
    }
    
    setIsLoading(false);
  };

  if (step === 'home') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center max-w-sm mx-auto">
        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
          <Globe className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-3 text-zinc-100 tracking-tight">Access Verification</h1>
        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
          Nidaamku wuxuu u baahan yahay in la xaqiijiyo xogtaada si aad u hesho koodhka gelitaanka (Access Code).
        </p>
        <button
          onClick={() => setStep('form')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all w-full shadow-lg shadow-emerald-900/20"
        >
          Verify Now
        </button>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="flex flex-col max-w-md mx-auto p-6 pt-12">
        <h2 className="text-2xl font-bold mb-6 text-zinc-100 tracking-tight">Enter Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest font-bold text-zinc-500">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+252 63 8364274"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none text-zinc-200 font-mono transition-all shadow-sm placeholder-zinc-700"
              required
            />
          </div>

          <div className="bg-zinc-900 p-4 rounded-xl space-y-3 text-sm border border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 mb-2">
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">System Detection</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Phone</span>
              <span className="font-mono text-zinc-200">{phone || '-'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Country</span>
              <span className="font-bold text-emerald-400">{country || 'Waiting...'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">Telegram ID</span>
              <span className="font-mono bg-zinc-950 border border-zinc-800 text-zinc-500 px-2 rounded py-0.5 tracking-widest text-xs">{telegramId}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-widest font-bold text-zinc-500">Account Type</label>
            <div className="flex space-x-4 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 shadow-sm">
              <label className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer py-2.5 rounded-lg text-sm font-bold transition-colors ${accountType === 'Personal' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>
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
              <label className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer py-2.5 rounded-lg text-sm font-bold transition-colors ${accountType === 'Business' ? 'bg-zinc-800 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>
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
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 mt-4"
          >
            Submit Request
          </button>
        </form>
      </div>
    );
  }

  if (step === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center max-w-sm mx-auto">
        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 relative shadow-2xl">
          <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl animate-pulse"></div>
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Processing...</h2>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Your request is being securely verified by the admin. Fadlan halkan joog inta lagaa xaqiijinayo.
        </p>
      </div>
    );
  }

  if (step === 'success' && taskData) {
    return (
      <div className="flex flex-col items-center px-6 pt-12 max-w-[340px] mx-auto text-center pb-8">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 mt-4 shadow-2xl shadow-emerald-900/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        
        <h3 className="text-xl font-bold text-zinc-100 tracking-tight">Verified Successfully</h3>
        <p className="text-sm text-zinc-400 mt-2 px-4 mb-8 leading-relaxed">
          {taskData.success_message || 'Maamulaha ayaa xaqiijiyay xogtaada. (Verified)'}
        </p>

        <div className="w-full p-5 bg-zinc-900 border border-emerald-500/20 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Your Access Code</div>
          <div className="text-3xl font-mono tracking-[0.2em] font-bold text-emerald-400">
            {taskData.verification_code || '--------'}
          </div>
        </div>

        {taskData.image_url && (
          <div className="mt-6 w-full h-40 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative shadow-inner">
             <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-600 uppercase tracking-widest font-bold z-0">Attached Image</div>
             <img 
               src={taskData.image_url} 
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
          className="mt-8 w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-sm font-bold transition-all"
        >
          Return Home
        </button>
      </div>
    );
  }

  return null;
}
