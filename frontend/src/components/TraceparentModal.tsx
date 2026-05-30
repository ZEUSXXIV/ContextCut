import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import {
  Activity, Layers, Cpu, Globe, Database, Shield, Trash2, Play, CheckCircle2,
  ExternalLink, Lock, Unlock, Settings, Plus, Search, ArrowRight, ChevronRight,
  Wifi, AlertCircle, Terminal, X, Copy, Check, RefreshCw, LogOut, Mail, KeyRound,
  ChevronLeft, Zap, TrendingDown
} from 'lucide-react';

export function TraceparentModal() {
  const { activeTab, setActiveTab, isBackendConnected, setIsBackendConnected, isDemoMode, setIsDemoMode, gateways, setGateways, analytics, setAnalytics, user, setUser, sessionApiKey, setSessionApiKey, apiUrl, setApiUrl, gatewayName, setGatewayName, isValidating, setIsValidating, validationError, setValidationError, availablePaths, setAvailablePaths, credentialKeyName, setCredentialKeyName, credentialValue, setCredentialValue, wizardStep, setWizardStep, newGatewayId, setNewGatewayId, copiedId, setCopiedId, selectedTrace, setSelectedTrace, traceTab, setTraceTab, enableToonCompression, setEnableToonCompression, editingGateway, setEditingGateway, connectMethod, setConnectMethod, baseUrl, setBaseUrl, customHeadersList, setCustomHeadersList, manualEndpoints, setManualEndpoints, synthesizeOpenApiSpec, pathKey, methodKey, simulatingId, setSimulatingId, BACKEND_URL, fetchData, loadDemoData, checkSession, handleLogout, handleValidateUrl, togglePathEnabled, togglePathWritable, handleCreateGateway, handleDeleteGateway, handleSimulateRequest, copyToClipboard, resetWizard, handleStartEditGateway, } = useDashboard();

  return (
    <>
      {/* Visual Request Telemetry Trace Details Modal */}
      {selectedTrace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar p-6 space-y-6 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-850 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wide border ${
                    selectedTrace.method === 'GET'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {selectedTrace.method}
                  </span>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {selectedTrace.toolName}
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {selectedTrace.gatewayName} • {selectedTrace.path}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrace(null)}
                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition cursor-pointer animate-fade-in"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trace Parent Header Metadata */}
            <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  W3C traceparent Context Header
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-900/40">
                  Sampled (01)
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-xl">
                <span className="text-[10px] font-mono text-cyan-400 truncate flex-1 select-all">
                  00-{selectedTrace.traceId}-{selectedTrace.spanId}-01
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`00-${selectedTrace.traceId}-${selectedTrace.spanId}-01`);
                    setCopiedId(`trace-${selectedTrace.traceId}`);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Copy traceparent"
                >
                  {copiedId === `trace-${selectedTrace.traceId}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[10px] pt-1">
                <div>
                  <span className="text-zinc-500 font-bold block">TRACE ID</span>
                  <span className="font-mono text-zinc-400">{selectedTrace.traceId}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold block">SPAN ID</span>
                  <span className="font-mono text-zinc-400">{selectedTrace.spanId}</span>
                </div>
              </div>
            </div>

            {/* LLM & Client Telemetry Context */}
            {(selectedTrace.prompt || selectedTrace.model || selectedTrace.clientName) && (
              <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-2xl space-y-3">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  LLM & Client Context
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {selectedTrace.clientName && (
                    <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">Client Orchestrator</span>
                      <span className="text-white font-medium flex items-center gap-1.5 mt-0.5 font-mono">
                        <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                        {selectedTrace.clientName}
                      </span>
                    </div>
                  )}
                  {selectedTrace.model && (
                    <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60">
                      <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">AI Model</span>
                      <span className="text-white font-medium flex items-center gap-1.5 mt-0.5 font-mono">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        {selectedTrace.model}
                      </span>
                    </div>
                  )}
                </div>
                {selectedTrace.prompt && (
                  <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60 space-y-1">
                    <span className="text-[10px] text-zinc-500 font-semibold block uppercase tracking-wider">User Prompt / Intent</span>
                    <p className="text-[11px] text-zinc-200 leading-relaxed font-medium italic">
                      "{selectedTrace.prompt}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Token Savings Optimization Dashboard */}
            {selectedTrace.originalSize > 0 && (
              <div className="bg-gradient-to-br from-zinc-900/90 to-zinc-950/95 border border-zinc-800/80 p-5 rounded-2xl space-y-4 shadow-xl relative overflow-hidden group">
                {/* Visual glow background decorator */}
                <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-cyan-500/5 blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500" />
                <div className="absolute -left-24 -bottom-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500" />

                <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                    Token Optimization Analytics
                  </span>
                  {(() => {
                    const finalSize = selectedTrace.prunedSize || 0;
                    const rawSize = selectedTrace.originalSize || 0;
                    const savedPct = rawSize > 0 ? Math.round((1 - finalSize / rawSize) * 100) : 0;
                    return (
                      <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.07)]">
                        {savedPct}% REDUCTION
                      </span>
                    );
                  })()}
                </div>

                {(() => {
                  const rawSize = selectedTrace.originalSize || 0;
                  const getStringSize = (str: string) => {
                    if (!str) return 0;
                    try {
                      return new Blob([str]).size;
                    } catch (e) {
                      return str.length;
                    }
                  };
                  const tokenSaverSize = getStringSize(selectedTrace.optimizedResponseBody);
                  const toonSize = getStringSize(selectedTrace.toonResponseBody);

                  // Tokens estimation heuristics (English/JSON usually spans ~3.8 characters or bytes per token)
                  const rawTokens = Math.ceil(rawSize / 3.8);
                  const tokenSaverTokens = Math.ceil(tokenSaverSize / 3.8);
                  const toonTokens = toonSize ? Math.ceil(toonSize / 3.8) : 0;

                  const isToonActive = toonSize > 0;
                  const finalSize = isToonActive ? toonSize : (tokenSaverSize > 0 ? tokenSaverSize : rawSize);
                  const finalTokens = isToonActive ? toonTokens : (tokenSaverTokens > 0 ? tokenSaverTokens : rawTokens);
                  const savedTokens = rawTokens - finalTokens;
                  const savedPct = rawSize > 0 ? Math.round((1 - finalSize / rawSize) * 100) : 0;

                  return (
                    <div className="space-y-4">
                      {/* Metric columns */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Raw column */}
                        <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Raw REST Response</span>
                            <span className="text-zinc-400 text-[10px] block mt-0.5">Uncompressed Data</span>
                          </div>
                          <div className="mt-3">
                            <span className="text-zinc-300 font-extrabold text-lg block">{(rawSize / 1000).toFixed(2)} <span className="text-xs font-semibold">KB</span></span>
                            <span className="text-zinc-500 font-mono text-[10px] block mt-0.5">≈ {rawTokens.toLocaleString()} tokens</span>
                          </div>
                        </div>

                        {/* Token Saver column */}
                        <div className={`bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 flex flex-col justify-between relative overflow-hidden ${!isToonActive ? 'ring-1 ring-cyan-500/20' : ''}`}>
                          {!isToonActive && <div className="absolute top-0 right-0 w-1.5 h-full bg-cyan-500" />}
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold block">Token-Saver Pruning</span>
                            <span className="text-zinc-400 text-[10px] block mt-0.5">Depth, Slicing & Meta Keys</span>
                          </div>
                          <div className="mt-3">
                            <span className="text-cyan-300 font-extrabold text-lg block">{(tokenSaverSize / 1000).toFixed(2)} <span className="text-xs font-semibold">KB</span></span>
                            <span className="text-cyan-500/80 font-mono text-[10px] block mt-0.5">≈ {tokenSaverTokens.toLocaleString()} tokens</span>
                          </div>
                        </div>

                        {/* TOON Serializer column */}
                        {isToonActive ? (
                          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 flex flex-col justify-between relative overflow-hidden ring-1 ring-emerald-500/30">
                            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                                TOON Serialization
                              </span>
                              <span className="text-zinc-400 text-[10px] block mt-0.5">Compact Tabular Notation</span>
                            </div>
                            <div className="mt-3">
                              <span className="text-emerald-300 font-extrabold text-lg block">{(toonSize / 1000).toFixed(2)} <span className="text-xs font-semibold">KB</span></span>
                              <span className="text-emerald-500 font-mono text-[10px] block mt-0.5">≈ {toonTokens.toLocaleString()} tokens</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-950/30 p-3 rounded-xl border border-zinc-900/60 flex flex-col justify-between border-dashed">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-650 font-bold block">TOON Serialization</span>
                              <span className="text-zinc-650 text-[10px] block mt-0.5">Not Active for connection</span>
                            </div>
                            <div className="mt-4 bg-zinc-950/40 p-2 rounded-lg border border-zinc-900/50">
                              <span className="text-[9px] text-zinc-500 leading-relaxed block">
                                💡 <span className="text-cyan-400/80 font-semibold">Pro Tip:</span> Enable TOON serialization in Connection Settings to convert JSON lists into CSV tables and save up to 60% more context!
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Comparative visual savings bar */}
                      <div className="space-y-2 bg-zinc-950/80 border border-zinc-900 p-4 rounded-xl">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-zinc-400">Context Compaction Slider</span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" />
                            {savedTokens.toLocaleString()} TOKENS SAVED ({savedPct}% LESS EXPENDITURE)
                          </span>
                        </div>

                        {/* Compression Slider bar */}
                        <div className="h-4 bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-850 p-[2px] relative">
                          {/* Raw representation */}
                          <div className="h-full bg-zinc-800 rounded-full transition-all duration-500" style={{ width: '100%' }}>
                            <div className="h-full flex items-center pl-3">
                              <span className="text-[8px] text-zinc-500 font-bold uppercase select-none">Raw Content Bounds</span>
                            </div>
                          </div>

                          {/* Token Saver overlay */}
                          <div 
                            className="absolute top-[2px] left-[2px] bottom-[2px] bg-gradient-to-r from-cyan-600/90 to-blue-600/90 rounded-full flex items-center justify-end pr-3 transition-all duration-500 shadow-md border-r border-cyan-400/20"
                            style={{ width: `calc(${Math.max(12, Math.round((tokenSaverSize / rawSize) * 100))}% - 4px)` }}
                          >
                            {tokenSaverSize / rawSize < 0.8 && (
                              <span className="text-[8px] text-white font-extrabold uppercase select-none tracking-wider pr-1">
                                {Math.round((tokenSaverSize / rawSize) * 100)}%
                              </span>
                            )}
                          </div>

                          {/* TOON overlay */}
                          {isToonActive && (
                            <div 
                              className="absolute top-[2px] left-[2px] bottom-[2px] bg-gradient-to-r from-emerald-500/90 to-teal-500/90 rounded-full flex items-center justify-end pr-3 transition-all duration-500 shadow-lg border-r border-emerald-300/30"
                              style={{ width: `calc(${Math.max(8, Math.round((toonSize / rawSize) * 100))}% - 4px)` }}
                            >
                              {toonSize / rawSize < 0.6 && (
                                <span className="text-[8px] text-zinc-950 font-black uppercase select-none tracking-wider font-mono">
                                  TOON {Math.round((toonSize / rawSize) * 100)}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                          <span>Raw Size: {(rawSize / 1024).toFixed(1)} KB</span>
                          <span className="flex items-center gap-1 text-cyan-400/90">
                            Token-Saver size: {(tokenSaverSize / 1024).toFixed(1)} KB
                          </span>
                          {isToonActive && (
                            <span className="text-emerald-400 font-bold">
                              TOON Output size: {(toonSize / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </div>

                      {/* savings quote banner */}
                      <div className="text-[10px] text-zinc-400 leading-relaxed bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex items-start gap-2.5">
                        <span className="text-emerald-400 text-xs mt-0.5">🌟</span>
                        <div>
                          <p className="font-semibold text-zinc-200">Excellent context footprint reduction!</p>
                          <p className="text-zinc-500 mt-0.5">
                            By converting raw payloads into optimized and {isToonActive ? 'TOON configurations' : 'pruned Token-Saver structures'}, you have saved <span className="text-emerald-400 font-extrabold">{savedTokens.toLocaleString()} tokens</span> for this request. This directly translates to <span className="text-white font-bold">{savedPct}% cheaper downstream prompt processing</span> and guards your LLM against model context window limits.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Error Notification Banner */}
            {selectedTrace.traceStatus !== 'SUCCESS' && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide">
                    {selectedTrace.traceStatus === 'GATEWAY_ERROR' ? 'Gateway Block Event' : 'Downstream API Exception'}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-300 font-medium">
                    {selectedTrace.errorMessage || 'Unknown execution trace failure.'}
                  </p>
                </div>
              </div>
            )}

            {/* Latency Trace Timeline */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">
                Execution Latency Lifecycle Timeline
              </span>
              
              <div className="relative border-l-2 border-zinc-800 ml-3 pl-6 space-y-6">
                
                {/* Step 1 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Activity className="w-2.5 h-2.5 text-zinc-400" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-200">LLM Request Trigger</span>
                      <span className="text-zinc-500 font-bold">0 ms</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Standard JSON-RPC 2.0 `tools/call` message captured over SSE channel.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <Cpu className="w-2.5 h-2.5 text-zinc-400" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-200">Omni Proxy Handshake</span>
                      <span className="text-emerald-400 font-bold">+{selectedTrace.latencies?.gateway || 2} ms</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Resolved Connected API context. Salted credential key decrypted in-memory. Custom static routing headers merged.
                    </p>
                  </div>
                </div>

                {/* Step 3 (Only if API was called) */}
                {(selectedTrace.latencies?.origin > 0 || selectedTrace.traceStatus === 'SUCCESS' || selectedTrace.traceStatus === 'API_ERROR') && (
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <Globe className="w-2.5 h-2.5 text-zinc-400" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-200">REST Downstream API Dispatch</span>
                        <span className="text-cyan-400 font-bold">+{selectedTrace.latencies?.origin || 120} ms</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        Axios connection established. Propagated W3C `traceparent` downstream.
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          selectedTrace.status >= 400 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          HTTP {selectedTrace.status}
                        </span>
                        <span className="text-[9px] text-zinc-500 truncate max-w-xs font-mono select-all">
                          {selectedTrace.path}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 */}
                {selectedTrace.originalSize > 0 && (
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <Layers className="w-2.5 h-2.5 text-zinc-400" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-200">Token-Saver Optimization Cap</span>
                        <span className="text-zinc-500 font-bold">&lt; 1 ms</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Recursively pruned diagnostic trace keys, capped nested depth at 4 levels, and sliced arrays.
                      </p>
                      <div className="flex items-center gap-4 text-[9px] font-semibold text-zinc-500 pt-1 uppercase">
                        <div>
                          <span>RAW</span>
                          <span className="text-zinc-400 ml-1">{(selectedTrace.originalSize / 1000).toFixed(1)} KB</span>
                        </div>
                        <div>
                          <span>OPTIMIZED</span>
                          <span className="text-white font-bold">{(selectedTrace.prunedSize / 1000).toFixed(1)} KB</span>
                        </div>
                        <div className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 font-black">
                          {selectedTrace.compressionRatio}x Capped
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5 */}
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <CheckCircle2 className="w-2.5 h-2.5 text-zinc-400" />
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">JSON-RPC Stream Output Delivered</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-300 font-black">
                        Total {selectedTrace.latencies?.total || 122} ms
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Standard JSON-RPC 2.0 response wrapper dispatched back to client session stream.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Advanced Tracing Payload Explorer */}
            <div className="space-y-4 pt-4 border-t border-zinc-850">
              
              {/* Tab Selector Buttons */}
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850">
                <button
                  type="button"
                  onClick={() => setTraceTab('request')}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    traceTab === 'request'
                      ? 'bg-zinc-800/80 text-cyan-400 font-extrabold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Request Info
                </button>
                <button
                  type="button"
                  onClick={() => setTraceTab('raw_response')}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    traceTab === 'raw_response'
                      ? 'bg-zinc-800/80 text-cyan-400 font-extrabold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Raw Response
                </button>
                <button
                  type="button"
                  onClick={() => setTraceTab('optimized_response')}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                    traceTab === 'optimized_response'
                      ? 'bg-zinc-800/80 text-cyan-400 font-extrabold shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Optimized Response
                </button>
                {selectedTrace.toonResponseBody && (
                  <button
                    type="button"
                    onClick={() => setTraceTab('toon_response')}
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                      traceTab === 'toon_response'
                        ? 'bg-zinc-800/80 text-cyan-400 font-extrabold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    TOON Format
                  </button>
                )}
              </div>

              {/* Tab Content 1: Request Details */}
              {traceTab === 'request' && (
                <div className="space-y-3 animate-fade-in">
                  
                  {/* Headers */}
                  {selectedTrace.requestHeaders && Object.keys(selectedTrace.requestHeaders).length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">Sanitized Proxy HTTP Headers</span>
                      <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl max-h-[120px] overflow-y-auto custom-scrollbar font-mono text-[10px] text-zinc-400 select-all leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(selectedTrace.requestHeaders, null, 2)}
                      </div>
                    </div>
                  )}

                  {/* Query Args */}
                  {selectedTrace.requestQuery && Object.keys(selectedTrace.requestQuery).length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">Dispatched REST Query Parameters</span>
                      <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl max-h-[120px] overflow-y-auto custom-scrollbar font-mono text-[10px] text-cyan-300 select-all leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(selectedTrace.requestQuery, null, 2)}
                      </div>
                    </div>
                  )}

                  {/* Body Args */}
                  {selectedTrace.requestBody && Object.keys(selectedTrace.requestBody).length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">Dispatched REST Body Parameters</span>
                      <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl max-h-[120px] overflow-y-auto custom-scrollbar font-mono text-[10px] text-blue-300 select-all leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(selectedTrace.requestBody, null, 2)}
                      </div>
                    </div>
                  )}

                  {/* LLM Client Arguments */}
                  {selectedTrace.arguments && Object.keys(selectedTrace.arguments).length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">LLM Client Incoming JSON Arguments</span>
                      <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl max-h-[120px] overflow-y-auto custom-scrollbar font-mono text-[10px] text-zinc-300 select-all leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(selectedTrace.arguments, null, 2)}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Tab Content 2: Raw Response */}
              {traceTab === 'raw_response' && (
                <div className="space-y-1.5 animate-fade-in">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">Downstream JSON/Text Response Payload</span>
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl max-h-[200px] overflow-y-auto custom-scrollbar font-mono text-[10px] text-emerald-400 select-all leading-relaxed whitespace-pre-wrap">
                    {(() => {
                      if (!selectedTrace.rawResponseBody) {
                        return <span className="text-zinc-650 italic">No response payload recorded.</span>;
                      }
                      try {
                        const parsed = JSON.parse(selectedTrace.rawResponseBody);
                        return JSON.stringify(parsed, null, 2);
                      } catch (e) {
                        return selectedTrace.rawResponseBody;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Tab Content 3: Optimized Response */}
              {traceTab === 'optimized_response' && (
                <div className="space-y-1.5 animate-fade-in">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">Pruned Token-Saver Response (Relayed to Model)</span>
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl max-h-[200px] overflow-y-auto custom-scrollbar font-mono text-[10px] text-cyan-300 select-all leading-relaxed whitespace-pre-wrap">
                    {(() => {
                      if (!selectedTrace.optimizedResponseBody) {
                        return <span className="text-zinc-650 italic">No optimized payload recorded.</span>;
                      }
                      try {
                        const parsed = JSON.parse(selectedTrace.optimizedResponseBody);
                        return JSON.stringify(parsed, null, 2);
                      } catch (e) {
                        return selectedTrace.optimizedResponseBody;
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Tab Content 4: TOON Format */}
              {traceTab === 'toon_response' && selectedTrace.toonResponseBody && (
                <div className="space-y-1.5 animate-fade-in">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-extrabold block">Tabular Object-Oriented Notation (TOON) Output</span>
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl max-h-[200px] overflow-y-auto custom-scrollbar font-mono text-[10px] text-cyan-400 select-all leading-relaxed whitespace-pre">
                    {selectedTrace.toonResponseBody}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setSelectedTrace(null)}
                className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold rounded-xl text-zinc-200 transition duration-200 cursor-pointer"
              >
                Close Trace details
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
