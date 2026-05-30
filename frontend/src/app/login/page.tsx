'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, Mail, Lock, Play, AlertCircle } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';

const BACKEND_URL = 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false); // Can be moved to global state/context

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    setAuthLoading(true);
    setAuthError('');

    try {
      if (!isDemoMode) {
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
          credentials: 'include'
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 403 || (data.error && data.error.includes('verify'))) {
            localStorage.setItem('pending_verify_email', authEmail);
            if (data.otp) localStorage.setItem('dev_otp_code', data.otp);
            router.push('/verify');
            return;
          }
          throw new Error(data.error || 'Login failed.');
        }

        if (data.otpRequired) {
          localStorage.setItem('pending_verify_email', authEmail);
          if (data.otp) localStorage.setItem('dev_otp_code', data.otp);
          router.push('/verify');
        } else {
          router.push('/dashboard');
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (authEmail === 'developer@omnimcp.local' && authPassword === 'developer123') {
          localStorage.setItem('pending_verify_email', authEmail);
          localStorage.setItem('dev_otp_code', '123456');
          router.push('/verify');
        } else {
          throw new Error('Invalid email or password for Sandbox. Use: developer@omnimcp.local / developer123');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during login.');
    } finally {
      setAuthLoading(false);
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
            <h2 className="text-2xl font-bold text-zinc-100">Welcome Back</h2>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Authenticate your session to manage gateway endpoints.
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="developer@omnimcp.local"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 transition duration-150 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 transition duration-150 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-black font-semibold text-sm rounded-xl transition duration-300 shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Sign In & Verify 2FA
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-3 border-t border-zinc-900">
            <p className="text-xs text-zinc-400">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition cursor-pointer"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
