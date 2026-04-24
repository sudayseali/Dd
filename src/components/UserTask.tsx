import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../context/AppContext';
import { AsYouType, getCountries, getCountryCallingCode, CountryCode } from 'libphonenumber-js';
import { supabase, SupabaseTask } from '../lib/supabase';
import { Loader2, CheckCircle2, Globe, RefreshCw, XCircle, Wallet, Users, Copy } from 'lucide-react';

export default function UserTask() {
  const { telegramId, startParam } = useAppConfig();
  const [step, setStep] = useState<'home' | 'form' | 'waiting' | 'success'>('home');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [accountType, setAccountType] = useState<'Personal' | 'Business'>('Personal');
  const [paymentMethod, setPaymentMethod] = useState<'TRX' | 'Payeer'>('TRX');
  const [transactionId, setTransactionId] = useState('');
  const [taskData, setTaskData] = useState<SupabaseTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

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
        if (data.status === 'success' || data.status === 'error' || data.verification_code || data.image_url) {
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
          if (updatedRow.status === 'success' || updatedRow.status === 'error' || updatedRow.verification_code || updatedRow.image_url) {
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
      const formatter = new AsYouType();
      formatter.input(val);
      let countryCode = formatter.getCountry();
      const callingCode = formatter.getCallingCode();
      
      // Fallback: If country is not resolved but we have a calling code (like +249),
      // lookup the first country that matches this calling code.
      if (!countryCode && callingCode) {
        const countries = getCountries();
        countryCode = countries.find(c => getCountryCallingCode(c) === callingCode);
      }
      
      if (countryCode) {
        const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
        const countryName = displayNames.of(countryCode);
        const callingCodeDisplay = callingCode ? `+${callingCode}` : '';
        setCountry(`${countryName} ${callingCodeDisplay ? `(${callingCodeDisplay})` : ''}`);
      } else {
        setCountry('');
      }
    } catch (err) {
      setCountry('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramId || !phone || !transactionId) return;

    setIsLoading(true);
    
    // Upsert the record
    const { data, error } = await supabase
      .from('verifications')
      .upsert({
         telegram_id: telegramId,
         phone,
         country,
         account_type: accountType,
         payment_method: paymentMethod,
         transaction_id: transactionId,
         status: 'waiting',
         verification_code: null,
         image_url: null,
         success_message: null,
         referred_by: startParam || null
      }, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (!error && data) {
      // Notify the Admin immediately via Telegram
      try {
        const TELEGRAM_BOT_TOKEN = "8791737110:AAG5j0C3FDsubXAbvYsN1t9zMQWa_oOb-Tw";
        const ADMIN_CHAT_ID = "5806129562"; // Your Admin Telegram ID
        const message = `🚨 <b>New Verification Request!</b>\n\n<b>ID:</b> <code>${telegramId}</code>\n<b>Phone:</b> ${phone}\n<b>Location:</b> ${country}\n<b>Type:</b> ${accountType}\n<b>Method:</b> ${paymentMethod}\n<b>TxID:</b> <code>${transactionId}</code>\n\n<i>Open the Admin Panel to verify payment and issue a code.</i>`;
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: message,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "🔑 Open Admin Panel", web_app: { url: "https://dd-fctt.vercel.app/" } }]]
            }
          })
        });
      } catch (err) {
        console.error("Failed to trigger admin notification:", err);
      }

      setTaskData(data as SupabaseTask);
      setStep('waiting');
    } else {
       console.error("Error creating request:", error);
       alert("An error occurred, please try again!");
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
          The system needs to verify your details in order to securely issue your Access Code.
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

          {/* Payment Section */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs uppercase tracking-widest font-bold text-zinc-500">Payment Method <span className="text-emerald-500">*</span></label>
            <div className="flex space-x-4 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 shadow-sm">
              <label className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer py-2.5 rounded-lg text-sm font-bold transition-colors ${paymentMethod === 'TRX' ? 'bg-indigo-600/20 text-indigo-400 shadow-sm border border-indigo-500/30' : 'text-zinc-500 hover:text-zinc-400 bg-zinc-800/50'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="TRX"
                  checked={paymentMethod === 'TRX'}
                  className="hidden"
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <span>TRON (TRX)</span>
              </label>
              <label className={`flex-1 flex items-center justify-center space-x-2 cursor-pointer py-2.5 rounded-lg text-sm font-bold transition-colors ${paymentMethod === 'Payeer' ? 'bg-indigo-600/20 text-indigo-400 shadow-sm border border-indigo-500/30' : 'text-zinc-500 hover:text-zinc-400 bg-zinc-800/50'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Payeer"
                  checked={paymentMethod === 'Payeer'}
                  className="hidden"
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <span>Payeer</span>
              </label>
            </div>

            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-sm space-y-3 mt-2">
              <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1 border-b border-zinc-800/50 pb-2">
                Send Payment To:
              </div>
              {paymentMethod === 'TRX' ? (
                <div className="text-center pt-2 pb-1">
                  <div className="text-emerald-400 font-mono text-base md:text-lg font-bold select-all bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    TMH8nN... (YOUR_TRX_ADDRESS)
                  </div>
                  <div className="text-zinc-500 text-xs mt-2 font-medium">Network: TRC20</div>
                </div>
              ) : (
                <div className="text-center pt-2 pb-1">
                  <div className="text-indigo-400 font-mono text-base md:text-lg font-bold select-all bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                    P10... (YOUR_PAYEER_ACCOUNT)
                  </div>
                  <div className="text-zinc-500 text-xs mt-2 font-medium">System: Payeer</div>
                </div>
              )}
            </div>
            
            <div className="space-y-2 mt-4">
              <label className="block text-xs uppercase tracking-widest font-bold text-zinc-500">Transaction ID / Hash</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder={paymentMethod === 'TRX' ? "Enter TRX Transaction Hash" : "Enter Payeer Operation ID"}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none text-zinc-200 font-mono transition-all shadow-sm placeholder-zinc-700 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 mt-6"
            disabled={isLoading || !transactionId || !phone}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Request & Transaction'}
          </button>
        </form>
      </div>
    );
  }

  const handleManualRefresh = async () => {
    if (!telegramId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (data && !error) {
        setTaskData(data as SupabaseTask);
        if (data.status === 'success' || data.verification_code || data.image_url) {
          setStep('success');
        } else if (data.status === 'waiting') {
          setStep('waiting');
        }
      }
    } catch (err) {
      console.error("Refresh fail", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center max-w-sm mx-auto relative cursor-default">
        <button 
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="absolute top-8 right-6 p-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh Status"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 relative shadow-2xl">
          <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl animate-pulse"></div>
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Processing...</h2>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Your request is being securely verified by the admin. Please stay here while we verify you. If it takes too long, tap the refresh icon 🔁 above.
        </p>
      </div>
    );
  }

  if (step === 'success' && taskData) {
    const isError = taskData.status === 'error';

    return (
      <div className="flex flex-col items-center px-6 pt-12 max-w-[340px] mx-auto text-center pb-8">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mt-4 shadow-2xl ${isError ? 'bg-red-500/10 border border-red-500/20 text-red-500 shadow-red-900/20' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-emerald-900/20'}`}>
          {isError ? <XCircle className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
        </div>
        
        <h3 className="text-xl font-bold text-zinc-100 tracking-tight">{isError ? 'Verification Failed' : 'Verified Successfully'}</h3>
        <p className="text-sm text-zinc-400 mt-2 px-4 mb-8 leading-relaxed">
          {taskData.success_message || (isError ? 'Verification failed, please review and try again.' : 'The admin has successfully verified your data. (Verified)')}
        </p>

        {taskData.verification_code ? (
          <div className={`w-full p-5 bg-zinc-900 border ${isError ? 'border-red-500/20' : 'border-emerald-500/20'} rounded-2xl shadow-lg relative overflow-hidden`}>
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${isError ? 'from-red-400 to-rose-500' : 'from-emerald-400 to-teal-500'}`}></div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Your Access Code</div>
            <div className={`text-3xl font-mono tracking-[0.2em] font-bold ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
              {taskData.verification_code}
            </div>
          </div>
        ) : null}

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

        {!isError && (
          <div className="mt-8 w-full space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Available Balance</div>
                  <div className="text-2xl font-bold text-zinc-100">${(taskData.balance || 0).toFixed(2)}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <button
                  onClick={() => setShowWithdraw(!showWithdraw)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition-all"
                >
                  Withdraw Funds
                </button>
              </div>
              
              {showWithdraw && (
                <div className="mt-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-sm">
                  <div className="text-zinc-400 mb-2 font-medium">Minimum withdrawal amounts:</div>
                  <div className="flex justify-between items-center bg-zinc-900 p-2 rounded-lg mb-2">
                    <span className="text-zinc-300">TRON (TRX)</span>
                    <span className="text-emerald-400 font-bold">$0.05</span>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-900 p-2 rounded-lg">
                    <span className="text-zinc-300">Payeer</span>
                    <span className="text-emerald-400 font-bold">$1.00</span>
                  </div>
                  <button 
                    onClick={() => alert('Withdrawal request submitted! Pending admin approval.')}
                    className="w-full mt-3 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Request Withdrawal
                  </button>
                </div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm text-left">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-zinc-100 font-bold">Referral Program</div>
                  <div className="text-zinc-500 text-xs">Earn 10% from every referral</div>
                </div>
              </div>
              
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div className="truncate text-xs font-mono text-zinc-400 select-all mr-3">
                  https://t.me/YourBotName?start={telegramId}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://t.me/YourBotName?start=${telegramId}`);
                    alert('Referral link copied!');
                  }}
                  className="p-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
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
