'use client';

import React from 'react';
import { useDashboard } from '../../../context/DashboardContext';
import { ConnectWizard } from '../../../components/ConnectWizard';
import { Activity, Layers, Cpu, Globe, Database, Shield, Trash2, Play, CheckCircle2,
  ExternalLink, Lock, Unlock, Settings, Plus, Search, ArrowRight, ChevronRight,
  Wifi, AlertCircle, Terminal, X, Copy, Check, RefreshCw, LogOut, Mail, KeyRound,
  ChevronLeft, Zap, TrendingDown
} from 'lucide-react';
import Link from 'next/link';

export default function ConnectPage() {
  const { isDemoMode, fetchData, isBackendConnected, user, handleLogout } = useDashboard();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none translate-y-1/3"></div>

      {/* Connection Indicator Alert Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs text-amber-300 font-medium flex items-center justify-center gap-2 relative z-50">
          <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            <strong>Local Sandbox Mode:</strong> Backend API on <strong>port 3001</strong> is currently offline. Gateway configurations and metrics are temporarily running on virtual local memory.
          </span>
          <button 
            onClick={() => fetchData()} 
            className="ml-3 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry Connection
          </button>
        </div>
      )}

      {/* Header / Nav Menu */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-lg blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
              <Link href="/dashboard" className="relative bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-cyan-400 block">
                <Cpu className="w-6 h-6 animate-pulse" />
              </Link>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <Link href="/dashboard" className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                  ContextCut
                </Link>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">
                  v1.2.0
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Enterprise OpenAPI to Model Context Protocol Adapter</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex bg-zinc-900/90 border border-zinc-800/80 p-1 rounded-xl">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 text-zinc-400 hover:text-white hover:bg-zinc-800/30"
              >
                <Layers className="w-3.5 h-3.5" />
                Active Gateways
              </Link>
              <Link
                href="/dashboard/connect"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 bg-zinc-800 text-cyan-400 shadow-md border border-zinc-700/50"
              >
                <Plus className="w-3.5 h-3.5" />
                Connect New API
              </Link>
            </nav>

            <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-850 px-3.5 py-1.5 rounded-xl text-xs font-medium">
              <Wifi className={`w-3.5 h-3.5 ${isBackendConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span className={isBackendConnected ? 'text-emerald-400' : 'text-amber-400'}>
                {isBackendConnected ? 'LIVE GATEWAY' : 'SANDBOX'}
              </span>
            </div>

            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer"
                title="Log out of session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:py-10">
        <ConnectWizard />
      </main>

      {/* Premium Informational Footer */}
      <footer className="border-t border-zinc-850/80 bg-zinc-950/60 py-10 text-xs text-zinc-500 relative z-10 font-sans mt-8 w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-left">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-200 font-black tracking-tight">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span>ContextCut</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Enterprise gateway federation engine and real-time observability proxy translating custom OpenAPI REST endpoints into token-optimized Model Context Protocol capabilities.
            </p>
          </div>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Security & Cryptography</span>
            <ul className="space-y-2 text-[11px]">
              <li className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> AES-256-GCM Token Vault</li>
              <li className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-cyan-500" /> Cryptographic Signed Session</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-500" /> In-Memory Decryption Redaction</li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Context Compaction</span>
            <ul className="space-y-2 text-[11px]">
              <li className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-400" /> Token-Saver Array Slicing</li>
              <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> Tabular TOON Compression</li>
              <li className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-cyan-400" /> Up to 90% Context Savings</li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Specifications & Compliance</span>
            <ul className="space-y-2 text-[11px] text-zinc-400">
              <li>• OpenAPI / Swagger spec 2.0 & 3.0+</li>
              <li>• Model Context Protocol (MCP) spec v1.0</li>
              <li>• W3C Traceparent Trace Context standards</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-zinc-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ContextCut Gateway Federation Corporation. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="https://nextjs.org" className="hover:text-zinc-400 transition">Next.js Framework</a>
            <span>•</span>
            <a href="https://tailwindcss.com" className="hover:text-zinc-400 transition">Tailwind CSS</a>
            <span>•</span>
            <a href="https://github.com/modelcontextprotocol" className="hover:text-zinc-400 transition">MCP Specification</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
