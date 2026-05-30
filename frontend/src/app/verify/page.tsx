'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, KeyRound, AlertCircle, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';

const BACKEND_URL = 'http://localhost:3001';

export default function VerifyPage() {
  const router = useRouter();
  const [authEmail, setAuthEmail] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(''));
  const [otpResendTimer, setOtpResendTimer] = useState(60);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('pending_verify_email');
    if (!email) {
      router.push('/login');
    } else {
      setAuthEmail(email);
    }
    const otp = localStorage.getItem('dev_otp_code');
    if (otp) setDevOtpCode(otp);
  }, [router]);

  useEffect(() => {
    if (otpResendTimer > 0) {
      const timer = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTimer]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpCode.join('');
    if (otp.length < 6) {
      setAuthError('Please enter the full 6-digit verification code.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      if (!isDemoMode) {
        const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, otp }),
          credentials: 'include'
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'OTP verification failed.');

        localStorage.removeItem('pending_verify_email');
        localStorage.removeItem('dev_otp_code');
        router.push('/dashboard');
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        if (otp === '123456') {
          const mockUser = { id: 'dev_user_1', email: authEmail, isVerified: true };
          const mockApiKey = 'omni_gt_developer_key_123456';
          localStorage.setItem('omni_mcp_session', JSON.stringify({ user: mockUser, apiKey: mockApiKey }));
          localStorage.removeItem('pending_verify_email');
          localStorage.removeItem('dev_otp_code');
          router.push('/dashboard');
        } else {
          throw new Error('Invalid OTP. Use "123456" in sandbox mode.');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during verification.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpResendTimer > 0) return;
    setAuthError('');
    setDevOtpCode(null);
    setOtpResendTimer(60);

    try {
      if (!isDemoMode) {
        const res = await fetch(`${BACKEND_URL}/api/auth/resend-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail }),
          credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to resend OTP.');
        if (data.otp) setDevOtpCode(data.otp);
      } else {
        setDevOtpCode('123456');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to resend code.');
      setOtpResendTimer(0);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden px-4">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none translate-y-1/3"></div>

      <div className="mb-8 text-center z-10">
        <div className="inline-flex bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl text-cyan-400 mb-4 shadow-xl relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <Cpu className="w-8 h-8 relative z-10" />
        </div>
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          ContextCut
        </h1>
        <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase mt-1">Enterprise API Federation Platform</p>
      </div>

      <GlassCard className="w-full max-w-md bg-zinc-950/45 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/30 via-emerald-500/30 to-transparent"></div>

        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex bg-cyan-500/10 text-cyan-400 p-2.5 rounded-xl mb-3 border border-cyan-500/20">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">OTP Verification</h2>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              A verification code has been generated for <span className="text-cyan-400 font-medium">{authEmail}</span>. Enter the 6 digits below.
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {devOtpCode && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center text-xs text-emerald-400 font-semibold select-all">
              Sandbox Testing OTP: <span className="font-mono text-sm tracking-widest text-emerald-300 font-bold ml-1">{devOtpCode}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-between gap-2.5">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  className="w-12 h-14 text-center bg-zinc-900 border border-zinc-805 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-xl font-bold font-mono transition duration-150 outline-none text-zinc-100 focus:shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:from-zinc-700 disabled:to-zinc-800 disabled:opacity-50 text-black font-semibold text-sm rounded-xl transition duration-300 shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-1.5 cursor-pointer animate-pulse-subtle"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Verify & Authenticate
                </>
              )}
            </button>
          </form>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-zinc-900 text-xs">
            <button
              onClick={handleResendOtp}
              disabled={otpResendTimer > 0}
              className={`font-medium ${otpResendTimer > 0 ? 'text-zinc-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300 transition cursor-pointer'}`}
            >
              {otpResendTimer > 0 ? `Resend Code (${otpResendTimer}s)` : 'Resend Code'}
            </button>
            <button
              onClick={() => router.push('/login')}
              className="text-zinc-400 hover:text-zinc-300 transition flex items-center gap-1 cursor-pointer font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Login
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
