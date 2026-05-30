'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Cpu,
  Globe,
  Database,
  Shield,
  Trash2,
  Play,
  CheckCircle2,
  ExternalLink,
  Lock,
  Unlock,
  Settings,
  Plus,
  Search,
  ArrowRight,
  ChevronRight,
  Wifi,
  AlertCircle,
  Terminal,
  X,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Mail,
  KeyRound,
  ChevronLeft,
  Zap,
  TrendingDown
} from 'lucide-react';

// Interfaces matching backend
interface PathConfig {
  path: string;
  method: string;
  isEnabled: boolean;
  isWritable: boolean;
}

interface Gateway {
  id?: string;
  _id?: string;
  name: string;
  openApiUrl: string;
  specUrl?: string;
  isManual?: boolean;
  rawSpec?: any;
  enableToonCompression?: boolean;
  customHeaders?: Record<string, string>;
  tokenSaverConfig?: any;
  paths: PathConfig[];
  credentialKeyName?: string;
  totalRequests: number;
  averageCompressionRatio: number;
  createdAt: string;
}

interface RequestLog {
  id?: string;
  traceId?: string;
  spanId?: string;
  timestamp: string;
  gatewayName: string;
  method: string;
  path: string;
  toolName?: string;
  status: number;
  traceStatus?: 'SUCCESS' | 'API_ERROR' | 'GATEWAY_ERROR';
  errorMessage?: string;
  arguments?: Record<string, any>;
  originalSize: number;
  prunedSize: number;
  compressionRatio: number;
  latencies?: {
    total: number;
    gateway: number;
    origin: number;
  };
  requestHeaders?: Record<string, string>;
  requestBody?: Record<string, any>;
  requestQuery?: Record<string, any>;
  rawResponseBody?: string;
  optimizedResponseBody?: string;
  prompt?: string;
  model?: string;
  clientName?: string;
  toonResponseBody?: string;
  [key: string]: any;
}

interface Analytics {
  totalRequests: number;
  averageCompressionRatio: number;
  activeConnectionsCount: number;
  liveRequestTracker: RequestLog[];
}

import { useDashboard, DashboardProvider } from '../../context/DashboardContext';
import { LiveRequestTracker } from '../../components/LiveRequestTracker';
import { ConnectWizard } from '../../components/ConnectWizard';
import { TraceparentModal } from '../../components/TraceparentModal';

import { useRouter } from 'next/navigation';

function DashboardContent() {
  const router = useRouter();
  const { activeTab, setActiveTab, isBackendConnected, setIsBackendConnected, isDemoMode, setIsDemoMode, gateways, setGateways, analytics, setAnalytics, user, setUser, sessionApiKey, setSessionApiKey, apiUrl, setApiUrl, gatewayName, setGatewayName, isValidating, setIsValidating, validationError, setValidationError, availablePaths, setAvailablePaths, credentialKeyName, setCredentialKeyName, credentialValue, setCredentialValue, wizardStep, setWizardStep, newGatewayId, setNewGatewayId, copiedId, setCopiedId, selectedTrace, setSelectedTrace, traceTab, setTraceTab, enableToonCompression, setEnableToonCompression, editingGateway, setEditingGateway, connectMethod, setConnectMethod, baseUrl, setBaseUrl, customHeadersList, setCustomHeadersList, manualEndpoints, setManualEndpoints, synthesizeOpenApiSpec, simulatingId, setSimulatingId, BACKEND_URL, fetchData, loadDemoData, checkSession, handleLogout, handleValidateUrl, togglePathEnabled, togglePathWritable, handleCreateGateway, handleDeleteGateway, handleSimulateRequest, copyToClipboard, resetWizard, handleStartEditGateway, } = useDashboard();
  
  // Loaded & Authenticated Dashboard Render
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
              <div className="relative bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-cyan-400">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  Omni MCP Gateway
                </h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">
                  v1.2.0
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Dynamic OpenAPI to Model Context Protocol Adapter</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex bg-zinc-900/90 border border-zinc-800/80 p-1 rounded-xl">
              <button
                onClick={() => {
                  router.push('/dashboard');
                  setNewGatewayId(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 ${
                  activeTab === 'dashboard'
                    ? 'bg-zinc-800 text-cyan-400 shadow-md border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Active Gateways
              </button>
              <button
                onClick={() => {
                  resetWizard();
                  router.push('/dashboard/connect');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 ${
                  activeTab === 'connect'
                    ? 'bg-zinc-800 text-cyan-400 shadow-md border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Connect New API
              </button>
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
        
        {/* Screen 1: Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            {/* Premium Analytics Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Stat 1: Total Volume */}
              <div className="relative group overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md p-6 flex items-center justify-between transition-all duration-300 hover:border-zinc-700/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-blue-600"></div>
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">
                    Total Requests Routed
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight text-white">
                      {analytics.totalRequests.toLocaleString()}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      +12.4%
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Context operations successfully parsed</p>
                </div>
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-xl text-cyan-400">
                  <Activity className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              {/* Stat 2: Compression Savings */}
              <div className="relative group overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md p-6 flex items-center justify-between transition-all duration-300 hover:border-zinc-700/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-600"></div>
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">
                    Avg Context Saving
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                      {analytics.averageCompressionRatio.toFixed(2)}x
                    </span>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      76.8% Saved
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Response payload tokens saved</p>
                </div>
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400">
                  <Database className="w-6 h-6" />
                </div>
              </div>

              {/* Stat 3: Active Gateways */}
              <div className="relative group overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md p-6 flex items-center justify-between transition-all duration-300 hover:border-zinc-700/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-600"></div>
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">
                    Active Gateways
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight text-white">
                      {gateways.length}
                    </span>
                    <span className="text-xs text-zinc-400 font-semibold">
                      / unlimited
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">REST API connectors active</p>
                </div>
                <div className="p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl text-purple-400">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* Main grid layout for Screen 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column (2/3 width) - List of Hosted connections */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-white">Hosted Gateway Connections</h2>
                    <p className="text-xs text-zinc-400">Active adapters exposing REST endpoints to model context protocol servers</p>
                  </div>
                  <button
                    onClick={() => {
                      resetWizard();
                      router.push('/dashboard/connect');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-black font-semibold text-xs rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Connect API
                  </button>
                </div>

                {gateways.length === 0 ? (
                  <div className="border border-dashed border-zinc-800 bg-zinc-900/10 rounded-2xl p-12 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800/40 border border-zinc-700/50 flex items-center justify-center mx-auto text-zinc-400">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-zinc-200">No Gateways Connected Yet</p>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                        Instantly deploy custom API definitions by validating any OpenAPI endpoint and bridging it securely to LLM platforms.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetWizard();
                        router.push('/dashboard/connect');
                      }}
                      className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold rounded-xl text-cyan-400 transition duration-200 cursor-pointer"
                    >
                      Connect New API Spec
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {gateways.map((gt: any) => {
                      const id = gt.id || gt._id || 'mock';
                      const gatewayUrl = `${BACKEND_URL}/api/mcp/sse?apiKey=${sessionApiKey || 'omni_gt_developer_key_123456'}`;
                      const isSimulating = simulatingId === id;

                      return (
                        <div
                          key={id}
                          className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700 transition-all duration-300 flex flex-col p-5 space-y-4"
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                                {gt.name}
                              </h3>
                              <p className="text-[10px] text-zinc-400 max-w-[200px] truncate" title={gt.specUrl || gt.openApiUrl}>
                                {gt.specUrl || gt.openApiUrl}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSimulateRequest(id)}
                                disabled={isSimulating}
                                title="Trigger Simulation"
                                className="p-1.5 bg-zinc-850/80 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 border border-zinc-750 rounded-lg transition duration-200 cursor-pointer disabled:opacity-40"
                              >
                                <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                onClick={() => {
                                  handleStartEditGateway(gt);
                                  router.push('/dashboard/connect');
                                }}
                                title="Edit Connection"
                                className="p-1.5 bg-zinc-850/80 hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-400 border border-zinc-750 rounded-lg transition duration-200 cursor-pointer"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteGateway(id)}
                                title="Remove connection"
                                className="p-1.5 bg-zinc-850/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-750 rounded-lg transition duration-200 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Connection metrics */}
                          <div className="grid grid-cols-2 gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Calls</span>
                              <p className="text-sm font-extrabold text-white">{gt.totalRequests}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Compression</span>
                              <p className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                                {gt.averageCompressionRatio > 0 ? `${gt.averageCompressionRatio.toFixed(2)}x` : '--'}
                              </p>
                            </div>
                          </div>

                          {/* Spec details preview */}
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">
                              Active Endpoints ({gt.paths?.filter((p: any) => p.isEnabled).length || 0})
                            </span>
                            <div className="flex flex-wrap gap-1 max-h-[50px] overflow-y-auto custom-scrollbar">
                              {gt.paths?.map((p: any, i: number) => (
                                <span
                                  key={i}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                    p.isEnabled
                                      ? 'bg-zinc-850 border border-zinc-800 text-zinc-300'
                                      : 'bg-zinc-900/40 text-zinc-600 line-through'
                                  }`}
                                >
                                  {p.method.toUpperCase()} {p.path.substring(0, 15)}{p.path.length > 15 ? '...' : ''}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* MCP endpoint preview card link */}
                          <div className="pt-2 border-t border-zinc-850 flex items-center justify-between gap-2">
                            <div className="space-y-0.5 overflow-hidden flex-1">
                              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block">
                                Gateway Endpoint URL
                              </span>
                              <p className="text-[10px] font-mono text-cyan-400 truncate max-w-[200px]">
                                {gatewayUrl}
                              </p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(gatewayUrl, id)}
                              className="px-2 py-1 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-[10px] text-zinc-400 hover:text-white rounded-lg flex items-center gap-1 transition duration-200 cursor-pointer"
                            >
                              {copiedId === id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <LiveRequestTracker />


            </div>
          </div>
        )}

        <ConnectWizard />


      </main>

      <TraceparentModal />
      {/* Footer */}
      <footer className="border-t border-zinc-850/80 bg-zinc-950/20 py-6 text-center text-xs text-zinc-650 font-medium select-none relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Omni MCP Gateway Corporation. All rights reserved.</p>
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


export default function Dashboard() {
  return <DashboardContent />;
}
