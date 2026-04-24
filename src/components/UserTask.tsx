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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center max-w-sm mx-auto bg-black text-white">
        <div className="w-24 h-24 bg-[#1c1c1e] rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/10"></div>
          <Globe className="w-12 h-12 text-blue-500 relative z-10" />
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">Access Verification</h1>
        <p className="text-gray-400 text-base mb-10 leading-relaxed px-2">
          The system needs to verify your details in order to securely issue your Access Code.
        </p>
        <div className="fixed bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black via-black to-transparent">
          <button
            onClick={() => setStep('form')}
            className="bg-blue-500 active:bg-blue-600 text-white font-semibold py-4 px-8 rounded-2xl transition-all w-full text-lg"
          >
            Verify Now
          </button>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="flex flex-col max-w-md mx-auto p-4 pt-8 bg-black min-h-[100dvh] text-white pb-28">
        <h2 className="text-3xl font-bold mb-6 tracking-tight px-2">Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 px-2">
            <label className="block text-sm font-medium text-gray-400">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="+252 63 8364274"
              className="w-full px-4 py-3.5 bg-[#1c1c1e] rounded-xl focus:border-blue-500 border border-transparent focus:ring-1 focus:ring-blue-500/50 outline-none text-white font-mono transition-all placeholder-gray-600 text-lg"
              required
            />
          </div>

          <div className="bg-[#1c1c1e] rounded-xl mx-2 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2c2c2e] flex justify-between items-center text-sm">
              <span className="text-gray-400">Phone</span>
              <span className="font-mono text-white">{phone || '...'}</span>
            </div>
            <div className="px-4 py-3 border-b border-[#2c2c2e] flex justify-between items-center text-sm">
              <span className="text-gray-400">Location</span>
              <span className="font-medium text-blue-400">{country || 'Waiting...'}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center text-sm">
              <span className="text-gray-400">Telegram ID</span>
              <span className="font-mono bg-[#2c2c2e] text-gray-300 px-2.5 rounded-md py-1 text-xs">{telegramId}</span>
            </div>
          </div>

          <div className="space-y-2 px-2 pt-2">
            <label className="block text-sm font-medium text-gray-400">Account Type</label>
            <div className="flex p-1 bg-[#1c1c1e] rounded-xl">
              <label className={`flex-1 flex items-center justify-center cursor-pointer py-2.5 rounded-lg text-sm font-semibold transition-colors ${accountType === 'Personal' ? 'bg-[#2c2c2e] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
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
              <label className={`flex-1 flex items-center justify-center cursor-pointer py-2.5 rounded-lg text-sm font-semibold transition-colors ${accountType === 'Business' ? 'bg-[#2c2c2e] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
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
          <div className="space-y-4 px-2 pt-4">
            <label className="block text-sm font-medium text-gray-400">Payment Method <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center py-4 rounded-xl cursor-pointer border transition-colors ${paymentMethod === 'TRX' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-[#1c1c1e] border-[#2c2c2e] text-gray-400'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="TRX"
                  checked={paymentMethod === 'TRX'}
                  className="hidden"
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <span className="font-semibold text-sm">TRON (TRX)</span>
              </label>
              <label className={`flex items-center justify-center py-4 rounded-xl cursor-pointer border transition-colors ${paymentMethod === 'Payeer' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-[#1c1c1e] border-[#2c2c2e] text-gray-400'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Payeer"
                  checked={paymentMethod === 'Payeer'}
                  className="hidden"
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                />
                <span className="font-semibold text-sm">Payeer</span>
              </label>
            </div>

            <div className="bg-[#1c1c1e] p-5 rounded-xl space-y-3 mt-4 text-center border border-[#2c2c2e]">
              <div className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-1">
                Send Payment To
              </div>
              {paymentMethod === 'TRX' ? (
                <div className="pt-2">
                  <div className="text-blue-400 font-mono text-lg font-bold select-all bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                    TMH8nN...
                  </div>
                  <div className="text-gray-500 text-xs mt-3 font-medium">Network: TRC20</div>
                </div>
              ) : (
                <div className="pt-2">
                  <div className="text-blue-400 font-mono text-lg font-bold select-all bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                    P10...
                  </div>
                  <div className="text-gray-500 text-xs mt-3 font-medium">System: Payeer</div>
                </div>
              )}
            </div>
            
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-gray-400">Transaction Hash / ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder={paymentMethod === 'TRX' ? "TRX Hash" : "Payeer Operation ID"}
                className="w-full px-4 py-3.5 bg-[#1c1c1e] rounded-xl focus:border-blue-500 border border-[#2c2c2e] focus:ring-1 focus:ring-blue-500/50 outline-none text-white font-mono transition-all placeholder-gray-600 text-base"
                required
              />
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black via-black to-transparent">
            <button
              type="submit"
              className="bg-blue-500 active:bg-blue-600 disabled:opacity-50 disabled:active:bg-blue-500 text-white font-semibold py-4 px-8 rounded-2xl transition-all w-full text-lg flex items-center justify-center"
              disabled={isLoading || !transactionId || !phone}
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Request & Transaction'}
            </button>
          </div>
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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center max-w-sm mx-auto relative cursor-default bg-black text-white">
        <button 
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="absolute top-6 right-6 p-2.5 bg-[#1c1c1e] rounded-full text-gray-400 hover:text-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#2c2c2e]"
          title="Refresh Status"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <div className="w-24 h-24 bg-[#1c1c1e] rounded-[2rem] flex items-center justify-center mb-8 relative shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-bold mb-3 tracking-tight">Processing</h2>
        <p className="text-gray-400 text-base leading-relaxed px-2">
          Your request is being securely verified by the admin. Please wait here. Tap the refresh icon 🔁 above to check for updates.
        </p>
      </div>
    );
  }

  if (step === 'success' && taskData) {
    const isError = taskData.status === 'error';

    return (
      <div className="flex flex-col items-center px-4 pt-12 max-w-md mx-auto text-center pb-28 bg-black min-h-[100dvh] text-white">
        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden ${isError ? 'bg-[#1c1c1e]' : 'bg-[#1c1c1e]'}`}>
          <div className={`absolute inset-0 ${isError ? 'bg-red-500/10' : 'bg-green-500/10'}`}></div>
          {isError ? <XCircle className="w-12 h-12 text-red-500 relative z-10" /> : <CheckCircle2 className="w-12 h-12 text-green-500 relative z-10" />}
        </div>
        
        <h3 className="text-2xl font-bold tracking-tight">{isError ? 'Verification Failed' : 'Verified Successfully'}</h3>
        <p className="text-base text-gray-400 mt-3 px-4 mb-8 leading-relaxed">
          {taskData.success_message || (isError ? 'Verification failed, please review and try again.' : 'The admin has successfully verified your data. (Verified)')}
        </p>

        {taskData.verification_code ? (
          <div className={`w-full p-6 bg-[#1c1c1e] border ${isError ? 'border-red-500/20' : 'border-[#2c2c2e]'} rounded-2xl shadow-lg relative overflow-hidden mb-6`}>
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${isError ? 'from-red-500 to-red-400' : 'from-green-500 to-green-400'}`}></div>
            <div className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Access Code</div>
            <div className={`text-4xl font-mono tracking-[0.15em] font-bold ${isError ? 'text-red-400' : 'text-green-500'}`}>
              {taskData.verification_code}
            </div>
          </div>
        ) : null}

        {taskData.image_url && (
          <div className="w-full h-48 bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl overflow-hidden relative shadow-inner mb-6">
             <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 uppercase tracking-widest font-semibold z-0">Evidence</div>
             <img 
               src={taskData.image_url} 
               alt="Verification Evidence" 
               className="w-full h-full object-cover relative z-10" 
               referrerPolicy="no-referrer"
             />
          </div>
        )}

        {!isError && (
          <div className="w-full space-y-4">
            <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-5 shadow-sm text-left">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-gray-500 text-xs font-semibold uppercase tracking-widest">Available Balance</div>
                  <div className="text-3xl font-bold text-white">${(taskData.balance || 0).toFixed(2)}</div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-[#2c2c2e]">
                <button
                  onClick={() => setShowWithdraw(!showWithdraw)}
                  className="w-full py-3.5 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white rounded-xl text-base font-semibold transition-all"
                >
                  Withdraw Funds
                </button>
              </div>
              
              {showWithdraw && (
                <div className="mt-4 bg-black p-4 rounded-xl border border-[#2c2c2e] text-sm">
                  <div className="text-gray-400 mb-3 font-medium">Minimum withdrawal amounts:</div>
                  <div className="flex justify-between items-center bg-[#1c1c1e] p-3 rounded-xl mb-2">
                    <span className="text-white font-medium">TRON (TRX)</span>
                    <span className="text-green-500 font-bold">$0.05</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#1c1c1e] p-3 rounded-xl">
                    <span className="text-white font-medium">Payeer</span>
                    <span className="text-green-500 font-bold">$1.00</span>
                  </div>
                  <button 
                    onClick={() => alert('Withdrawal request submitted! Pending admin approval.')}
                    className="w-full mt-4 py-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    Request Withdrawal
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-2xl p-5 shadow-sm text-left">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg">Referral Program</div>
                  <div className="text-gray-400 text-sm">Earn 10% from every referral</div>
                </div>
              </div>
              
              <div className="bg-black p-4 rounded-xl border border-[#2c2c2e] flex items-center justify-between">
                <div className="truncate text-sm font-mono text-gray-300 select-all mr-4">
                  https://t.me/YourBotName?start={telegramId}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://t.me/YourBotName?start=${telegramId}`);
                    alert('Referral link copied!');
                  }}
                  className="p-2.5 bg-[#2c2c2e] text-white rounded-xl hover:bg-[#3c3c3e] transition-colors shrink-0"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="fixed bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black via-black to-transparent">
          <button
            onClick={() => {
              setStep('home');
              setPhone('');
              setCountry('');
            }}
            className="w-full py-4 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white rounded-2xl text-lg font-semibold transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
