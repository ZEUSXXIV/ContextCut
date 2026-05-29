import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import {
  Activity, Layers, Cpu, Globe, Database, Shield, Trash2, Play, CheckCircle2,
  ExternalLink, Lock, Unlock, Settings, Plus, Search, ArrowRight, ChevronRight,
  Wifi, AlertCircle, Terminal, X, Copy, Check, RefreshCw, LogOut, Mail, KeyRound,
  ChevronLeft, Zap, TrendingDown
} from 'lucide-react';

export function LiveRequestTracker() {
  const { activeTab, setActiveTab, isBackendConnected, setIsBackendConnected, isDemoMode, setIsDemoMode, gateways, setGateways, analytics, setAnalytics, user, setUser, sessionApiKey, setSessionApiKey, apiUrl, setApiUrl, gatewayName, setGatewayName, isValidating, setIsValidating, validationError, setValidationError, availablePaths, setAvailablePaths, credentialKeyName, setCredentialKeyName, credentialValue, setCredentialValue, wizardStep, setWizardStep, newGatewayId, setNewGatewayId, copiedId, setCopiedId, selectedTrace, setSelectedTrace, traceTab, setTraceTab, enableToonCompression, setEnableToonCompression, editingGateway, setEditingGateway, connectMethod, setConnectMethod, baseUrl, setBaseUrl, customHeadersList, setCustomHeadersList, manualEndpoints, setManualEndpoints, synthesizeOpenApiSpec, pathKey, methodKey, simulatingId, setSimulatingId, BACKEND_URL, fetchData, loadDemoData, checkSession, handleLogout, handleValidateUrl, togglePathEnabled, togglePathWritable, handleCreateGateway, handleDeleteGateway, handleSimulateRequest, copyToClipboard, resetWizard, handleStartEditGateway, } = useDashboard();

  return (
    <>
      {/* Right Column (1/3 width) - Live request tracker */}
              <div className="space-y-6">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" />
                    Live Request Tracker
                  </h2>
                  <p className="text-xs text-zinc-400">Real-time trace logs from model requests and gateway adapters</p>
                </div>

                <div className="bg-zinc-950/65 border border-zinc-850 rounded-2xl p-4 min-h-[400px] max-h-[500px] overflow-y-auto space-y-3 custom-scrollbar relative font-mono text-xs">
                  {analytics.liveRequestTracker.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <Activity className="w-8 h-8 text-zinc-600 animate-pulse" />
                      <p className="text-zinc-500 text-xs">Awaiting traffic spikes...</p>
                      <p className="text-[10px] text-zinc-600">Simulate api calls on gateway cards to see immediate context logs.</p>
                    </div>
                  ) : (
                    analytics.liveRequestTracker.map((log: any, idx: number) => {
                      const savingPct = Math.round((1 - log.prunedSize / log.originalSize) * 100);
                      const methodColors: Record<string, string> = {
                        GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                        POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                        PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
                        PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      };

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedTrace(log)}
                          className="border border-zinc-850 bg-zinc-900/10 p-3 rounded-xl space-y-2 flex flex-col hover:border-zinc-800/80 hover:bg-zinc-800/10 hover:scale-[1.01] transition-all duration-200 cursor-pointer relative group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {log.traceStatus === 'SUCCESS' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-red-400 animate-pulse" />
                              )}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${methodColors[log.method] || 'bg-zinc-800 text-zinc-400'}`}>
                                {log.method}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] text-zinc-500 block font-semibold uppercase">Gateway</span>
                            <span className="text-zinc-200 font-bold truncate max-w-full block">
                              {log.gatewayName}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] text-zinc-500 block font-semibold uppercase">Endpoint Path</span>
                            <span className="text-[10px] text-cyan-300 font-medium break-all block">
                              {log.path}
                            </span>
                          </div>

                          {log.prompt && (
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-zinc-500 block font-semibold uppercase">Prompt / Intent</span>
                              <span className="text-[10px] text-zinc-300 font-medium italic truncate max-w-full block">
                                "{log.prompt}"
                              </span>
                            </div>
                          )}

                          {(log.model || log.clientName) && (
                            <div className="flex items-center gap-1.5 pt-1">
                              {log.clientName && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                                  {log.clientName}
                                </span>
                              )}
                              {log.model && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-900/30 font-mono">
                                  {log.model}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850/80">
                            <div>
                              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block">Size</span>
                              <span className="text-[10px] text-zinc-400 line-through">
                                {(log.originalSize / 1000).toFixed(1)} KB
                              </span>
                              <span className="text-[10px] text-white font-bold ml-1.5">
                                {(log.prunedSize / 1000).toFixed(1)} KB
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold block">Context Optimization</span>
                              <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                                {savingPct}% Saved
                              </span>
                            </div>
                          </div>

                          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-zinc-500 group-hover:text-zinc-300 pointer-events-none">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
    </>
  );
}
