import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../context/AppContext';
import { AsYouType, getCountries, getCountryCallingCode, CountryCode } from 'libphonenumber-js';
import { supabase, SupabaseTask } from '../lib/supabase';
import { Loader2, CheckCircle2, Globe, RefreshCw, XCircle, Wallet, Users, Copy } from 'lucide-react';

export default function UserTask() {
  const { telegramId, startParam } = useAppConfig();
  const [step, setStep] = useState<'home' | 'form' | 'waiting' | 'success'>('home');
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'referrals'>('home');
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
         payment_method: null,
         transaction_id: null,
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
        const message = `🚨 <b>New Verification Request!</b>\n\n<b>ID:</b> <code>${telegramId}</code>\n<b>Phone:</b> ${phone}\n<b>Location:</b> ${country}\n<b>Type:</b> ${accountType}\n\n<i>Open the Admin Panel to verify the user and issue an access code.</i>`;
        
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
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 text-center max-w-sm mx-auto bg-black text-white">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden">
          <Globe className="w-12 h-12 text-white relative z-10" />
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">Access Control</h1>
        <p className="text-gray-400 text-[15px] mb-10 leading-relaxed px-2">
          The system needs to verify your details in order to securely issue your Access Code.
        </p>
        <div className="w-full space-y-4 px-2">
          <button
            onClick={() => setStep('form')}
            className="bg-blue-500 active:bg-blue-600 text-white font-semibold py-4 px-8 rounded-2xl transition-all w-full text-lg shadow-lg shadow-blue-500/20"
          >
            Verify Now
          </button>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="flex flex-col max-w-md mx-auto p-4 pt-6 bg-black min-h-[100dvh] text-white pb-32">
        <h2 className="text-4xl font-bold mb-6 tracking-tight px-2">Details</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-[#1c1c1e] rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-4 border-b border-[#2c2c2e]">
              <span className="text-gray-400 w-1/3 text-base">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+252 6x xxxxxx"
                className="w-2/3 bg-transparent outline-none text-white font-mono text-lg placeholder-gray-600 text-right"
                required
              />
            </div>
            <div className="flex items-center px-4 py-4 border-b border-[#2c2c2e]">
              <span className="text-gray-400 w-1/3 text-base">Location</span>
              <span className="w-2/3 text-right text-blue-400 font-medium text-base truncate">{country || 'Detecting...'}</span>
            </div>
            <div className="flex items-center px-4 py-4">
              <span className="text-gray-400 w-1/3 text-base">Telegram ID</span>
              <span className="w-2/3 text-right font-mono text-gray-500 text-sm select-all">{telegramId}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest pl-4 mb-2">Account Type</label>
            <div className="bg-[#1c1c1e] rounded-xl overflow-hidden">
              <label className="flex items-center justify-between px-4 py-4 border-b border-[#2c2c2e] cursor-pointer active:bg-[#2c2c2e] transition-colors">
                <span className="text-white text-base font-medium">Personal Account</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${accountType === 'Personal' ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                  {accountType === 'Personal' && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                </div>
                <input
                  type="radio"
                  name="accountType"
                  value="Personal"
                  checked={accountType === 'Personal'}
                  className="hidden"
                  onChange={(e) => setAccountType(e.target.value as any)}
                />
              </label>
              <label className="flex items-center justify-between px-4 py-4 cursor-pointer active:bg-[#2c2c2e] transition-colors">
                <span className="text-white text-base font-medium">Business Account</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${accountType === 'Business' ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                  {accountType === 'Business' && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                </div>
                <input
                  type="radio"
                  name="accountType"
                  value="Business"
                  checked={accountType === 'Business'}
                  className="hidden"
                  onChange={(e) => setAccountType(e.target.value as any)}
                />
              </label>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black via-black to-transparent backdrop-blur-[2px]">
            <button
              type="submit"
              className="bg-blue-500 active:bg-blue-600 disabled:opacity-50 disabled:active:bg-blue-500 text-white font-bold py-4 px-8 rounded-2xl transition-all w-full text-lg flex items-center justify-center shadow-lg shadow-blue-500/20"
              disabled={isLoading || !phone}
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm & Verify'}
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
      <div className="flex flex-col max-w-md mx-auto p-4 pt-8 bg-black min-h-[100dvh] text-white pb-28">
        
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 relative shadow-2xl overflow-hidden bg-[#1c1c1e]">
            <div className={`absolute inset-0 ${isError ? 'bg-red-500/20' : 'bg-blue-500/20'}`}></div>
            {isError ? <XCircle className="w-10 h-10 text-red-500 relative z-10" /> : <CheckCircle2 className="w-10 h-10 text-blue-500 relative z-10" />}
          </div>
          <h3 className="text-2xl font-bold tracking-tight">{isError ? 'Verification Failed' : 'Verified Successfully'}</h3>
          <p className="text-sm text-gray-400 mt-2 px-4 text-center">
            {taskData.success_message || (isError ? 'Verification failed, please review and try again.' : 'The admin has successfully verified your data.')}
          </p>
        </div>

        {!isError && (
          <div className="flex bg-[#1c1c1e] rounded-xl p-1 mb-6">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'home' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setActiveTab('wallet')}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'wallet' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Wallet
            </button>
            <button 
              onClick={() => setActiveTab('referrals')}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'referrals' ? 'bg-[#2c2c2e] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Referrals
            </button>
          </div>
        )}

        <div className="space-y-6">
          {(isError || activeTab === 'home') && (
            <>
              {taskData.verification_code ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest pl-4 mb-2">Access Code</label>
                  <div className="bg-[#1c1c1e] rounded-xl overflow-hidden p-6 flex justify-center border border-[#2c2c2e] shadow-lg">
                    <div className={`text-5xl font-mono tracking-widest font-bold ${isError ? 'text-red-500' : 'text-blue-500'} select-all`}>
                      {taskData.verification_code}
                    </div>
                  </div>
                </div>
              ) : null}

              {taskData.image_url && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest pl-4 mb-2">Evidence Image</label>
                  <div className="bg-[#1c1c1e] rounded-xl overflow-hidden relative border border-[#2c2c2e]" style={{ paddingTop: '56.25%' }}>
                     <img 
                       src={taskData.image_url} 
                       alt="Verification Evidence" 
                       className="absolute inset-0 w-full h-full object-cover px-1 py-1 rounded" 
                       referrerPolicy="no-referrer"
                     />
                  </div>
                </div>
              )}
            </>
          )}

          {!isError && activeTab === 'wallet' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest pl-4 mb-2">Wallet</label>
                <div className="bg-[#1c1c1e] rounded-xl overflow-hidden shadow-lg border border-[#2c2c2e]">
                  <div className="p-5 flex items-center justify-between border-b border-[#2c2c2e] bg-gradient-to-r from-[#1c1c1e] to-[#252528]">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Available Balance</div>
                        <div className="text-3xl font-bold text-white tracking-tight">${(taskData.balance || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-black">
                    <div className="text-gray-400 mb-3 text-xs uppercase tracking-wider font-semibold pl-1">Withdrawal Hub</div>
                    
                    <div className="bg-[#1c1c1e] rounded-xl overflow-hidden mb-4 border border-[#2c2c2e]">
                      <div className="flex justify-between items-center px-4 py-3.5 border-b border-[#2c2c2e]">
                        <span className="text-gray-300 text-sm font-medium">TRON (TRX) Min.</span>
                        <span className="text-green-500 font-bold bg-green-500/10 px-2.5 py-1 rounded-lg text-xs">$0.05</span>
                      </div>
                      <div className="flex justify-between items-center px-4 py-3.5">
                        <span className="text-gray-300 text-sm font-medium">Payeer Min.</span>
                        <span className="text-green-500 font-bold bg-green-500/10 px-2.5 py-1 rounded-lg text-xs">$1.00</span>
                      </div>
                    </div>

                    <div className="bg-[#1c1c1e] rounded-xl overflow-hidden mb-4 border border-[#2c2c2e]">
                      <label className="flex items-center justify-between px-4 py-3 border-b border-[#2c2c2e] cursor-pointer active:bg-[#2c2c2e] transition-colors">
                        <span className="text-white text-sm font-medium">Withdraw to TRON (TRX)</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'TRX' ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                          {paymentMethod === 'TRX' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <input
                          type="radio"
                          name="withdrawalMethod"
                          value="TRX"
                          checked={paymentMethod === 'TRX'}
                          className="hidden"
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                        />
                      </label>
                      <label className="flex items-center justify-between px-4 py-3 cursor-pointer active:bg-[#2c2c2e] transition-colors">
                        <span className="text-white text-sm font-medium">Withdraw to Payeer</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'Payeer' ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                          {paymentMethod === 'Payeer' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <input
                          type="radio"
                          name="withdrawalMethod"
                          value="Payeer"
                          checked={paymentMethod === 'Payeer'}
                          className="hidden"
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                        />
                      </label>
                    </div>

                    <div className="mb-4">
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder={paymentMethod === 'TRX' ? "Enter TRX Wallet Address..." : "Enter Payeer Account..."}
                        className="w-full bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl px-4 py-3.5 outline-none text-white font-mono placeholder-gray-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                      />
                    </div>
                    
                    <button 
                      onClick={() => alert('Withdrawal request submitted! Pending admin approval.')}
                      disabled={!transactionId || taskData.balance === 0}
                      className="w-full py-4 bg-blue-500 active:bg-blue-600 disabled:opacity-50 disabled:active:bg-blue-500 text-white rounded-xl text-base font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2"
                    >
                      <span>Request Withdrawal</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {!isError && activeTab === 'referrals' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest pl-4 mb-2">Referrals</label>
                <div className="bg-[#1c1c1e] rounded-xl overflow-hidden p-5 flex flex-col space-y-4 border border-[#2c2c2e]">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg tracking-tight">Invite Friends</div>
                      <div className="text-gray-400 text-sm mt-1 leading-snug">Earn 10% from every referral that verifies successfully.</div>
                    </div>
                  </div>
                  <div className="bg-black p-3.5 rounded-xl flex items-center justify-between border border-[#2c2c2e]">
                    <div className="truncate text-xs font-mono text-gray-400 select-all mr-3">
                      https://t.me/YourBotName?start={telegramId}
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://t.me/YourBotName?start=${telegramId}`);
                        alert('Referral link copied!');
                      }}
                      className="p-2.5 bg-[#2c2c2e] text-blue-400 rounded-lg hover:text-white transition-colors shrink-0"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black via-black to-transparent backdrop-blur-[2px]">
          <button
            onClick={() => {
              setStep('home');
              setPhone('');
              setCountry('');
            }}
            className="w-full py-4 bg-[#1c1c1e] active:bg-[#2c2c2e] text-blue-500 rounded-2xl text-lg font-semibold transition-all border border-[#2c2c2e]"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}
