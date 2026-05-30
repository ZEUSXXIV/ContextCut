import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import {
  Activity, Layers, Cpu, Globe, Database, Shield, Trash2, Play, CheckCircle2,
  ExternalLink, Lock, Unlock, Settings, Plus, Search, ArrowRight, ChevronRight,
  Wifi, AlertCircle, Terminal, X, Copy, Check, RefreshCw, LogOut, Mail, KeyRound,
  ChevronLeft, Zap, TrendingDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ConnectWizard() {
  const router = useRouter();
  const { activeTab, setActiveTab, isBackendConnected, setIsBackendConnected, isDemoMode, setIsDemoMode, gateways, setGateways, analytics, setAnalytics, user, setUser, sessionApiKey, setSessionApiKey, apiUrl, setApiUrl, gatewayName, setGatewayName, isValidating, setIsValidating, validationError, setValidationError, availablePaths, setAvailablePaths, credentialKeyName, setCredentialKeyName, credentialValue, setCredentialValue, wizardStep, setWizardStep, newGatewayId, setNewGatewayId, copiedId, setCopiedId, selectedTrace, setSelectedTrace, traceTab, setTraceTab, enableToonCompression, setEnableToonCompression, editingGateway, setEditingGateway, connectMethod, setConnectMethod, baseUrl, setBaseUrl, customHeadersList, setCustomHeadersList, manualEndpoints, setManualEndpoints, synthesizeOpenApiSpec, pathKey, methodKey, simulatingId, setSimulatingId, BACKEND_URL, fetchData, loadDemoData, checkSession, handleLogout, handleValidateUrl, togglePathEnabled, togglePathWritable, handleCreateGateway, handleDeleteGateway, handleSimulateRequest, copyToClipboard, resetWizard, handleStartEditGateway, } = useDashboard();

  return (
    <>
      {/* Screen 2: Connect New API Wizard Tab */}
        {activeTab === 'connect' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold tracking-tight text-white">
                {editingGateway ? `Edit Connection: ${editingGateway.name}` : 'Connect & Host New API Gateway'}
              </h2>
              <p className="text-xs text-zinc-400">
                {editingGateway ? 'Modify details of your connected API gateway.' : 'Bridge any third-party JSON OpenAPI specification instantly to standard MCP model tools.'}
              </p>
            </div>

            {/* Wizard Steps indicator */}
            {connectMethod === 'url' ? (
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase border-b border-zinc-850 pb-3">
                <span className={wizardStep === 1 ? 'text-cyan-400 font-bold' : 'text-zinc-400'}>
                  1. Validate Endpoint Spec
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className={wizardStep === 2 ? 'text-cyan-400 font-bold' : 'text-zinc-400'}>
                  2. Select Paths & Build Gateway
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-400 uppercase border-b border-zinc-850 pb-3 font-extrabold">
                Manual API Designer & Endpoint Modeler
              </div>
            )}

            {/* Step 1: URL input and Validator */}
            {wizardStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                {/* Connection Method Selector Tabs */}
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-850 max-w-md">
                  <button
                    type="button"
                    onClick={() => setConnectMethod('url')}
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                      connectMethod === 'url'
                        ? 'bg-zinc-800/80 text-cyan-400 font-extrabold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Import OpenAPI URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectMethod('manual')}
                    className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                      connectMethod === 'manual'
                        ? 'bg-zinc-800/80 text-cyan-400 font-extrabold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Manual API Designer
                  </button>
                </div>

                {connectMethod === 'url' ? (
                  <form onSubmit={handleValidateUrl} className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                        Public OpenAPI Specification URL
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                          <Globe className="w-4 h-4" />
                        </div>
                        <input
                          type="url"
                          required
                          value={apiUrl}
                          onChange={(e) => setApiUrl(e.target.value)}
                          placeholder="e.g. https://petstore.swagger.io/v2/swagger.json"
                          className="w-full bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-10 py-3 rounded-xl transition duration-200 outline-none text-white placeholder-zinc-650"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Supports JSON specifications version 2.0 (Swagger) and 3.0+. Standard CORS rules apply.
                      </p>
                    </div>

                    {validationError && (
                      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-300 font-medium">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{validationError}</span>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isValidating || !apiUrl}
                        className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-black font-bold text-xs rounded-xl shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        {isValidating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Validating Spec...</span>
                          </>
                        ) : (
                          <>
                            <span>Parse Spec</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    {/* Manual API Designer Form */}
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-2 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-cyan-400" /> API Configuration
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                            Gateway Connection Name
                          </label>
                          <input
                            type="text"
                            required
                            value={gatewayName}
                            onChange={(e) => setGatewayName(e.target.value)}
                            placeholder="e.g. My Custom API"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-4 py-2.5 rounded-xl transition duration-200 outline-none text-white font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                            API Base URL
                          </label>
                          <input
                            type="url"
                            required
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="e.g. https://api.example.com/v1"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-4 py-2.5 rounded-xl transition duration-200 outline-none text-white font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                            Auth Header Key (Optional)
                          </label>
                          <input
                            type="text"
                            value={credentialKeyName}
                            onChange={(e) => setCredentialKeyName(e.target.value)}
                            placeholder="Authorization (e.g. x-rapidapi-key)"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-4 py-2.5 rounded-xl transition duration-200 outline-none text-white font-medium"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                            Auth Token / Value (Optional)
                          </label>
                          <input
                            type="password"
                            value={credentialValue}
                            onChange={(e) => setCredentialValue(e.target.value)}
                            placeholder="API Key or secret value (will be securely encrypted)"
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-4 py-2.5 rounded-xl transition duration-200 outline-none text-white font-medium"
                          />
                        </div>
                      </div>

                      {/* TOON Option */}
                      <div className="border-t border-zinc-850/80 pt-4 flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="enableToonManual"
                          checked={enableToonCompression}
                          onChange={(e) => setEnableToonCompression(e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-zinc-800 bg-zinc-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer mt-0.5"
                        />
                        <div className="space-y-0.5">
                          <label htmlFor="enableToonManual" className="text-xs font-bold text-zinc-300 uppercase tracking-wider cursor-pointer block">
                            Enable TOON Tabular Serialization
                          </label>
                          <p className="text-[10px] text-zinc-500 leading-normal">
                            Converts response payloads into Tabular Object-Oriented Notation (TOON) to minimize context window consumption by up to 90%.
                          </p>
                          {enableToonCompression && (
                            <p className="text-[9px] text-amber-400 font-medium leading-normal mt-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg flex items-start gap-1">
                              <span>⚠️</span>
                              <span><strong>Semantic Quality Warning:</strong> TOON removes JSON brackets, array hierarchies, and nested metadata to compress . While highly token-efficient, it may slightly degrade semantic quality or field parsing on smaller LLMs (like older 8B models). Works best with Sonnet 3.5, GPT-4o, and DeepSeek-V3.</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Static Custom Headers Sub-section */}
                      <div className="pt-4 border-t border-zinc-850/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-cyan-400" /> Additional Static Headers (e.g. X-Rapidapi-Host)
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomHeadersList([
                                ...customHeadersList,
                                { key: '', value: '' }
                              ]);
                            }}
                            className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Static Header
                          </button>
                        </div>

                        {customHeadersList.length === 0 ? (
                          <p className="text-[10px] text-zinc-500 italic">No additional static headers defined.</p>
                        ) : (
                          <div className="space-y-2">
                            {customHeadersList.map((h: any, hIdx: number) => (
                              <div key={hIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-zinc-950 p-2 rounded-xl relative pr-10 border border-zinc-850">
                                <input
                                  type="text"
                                  required
                                  value={h.key}
                                  onChange={(e) => {
                                    const updated = [...customHeadersList];
                                    updated[hIdx].key = e.target.value;
                                    setCustomHeadersList(updated);
                                  }}
                                  placeholder="Header Key (e.g. X-Rapidapi-Host)"
                                  className="bg-zinc-900 border border-zinc-800 text-[11px] px-3 py-1.5 rounded-lg outline-none text-white font-medium"
                                />

                                <input
                                  type="text"
                                  required
                                  value={h.value}
                                  onChange={(e) => {
                                    const updated = [...customHeadersList];
                                    updated[hIdx].value = e.target.value;
                                    setCustomHeadersList(updated);
                                  }}
                                  placeholder="Header Value (e.g. imdb232.p.rapidapi.com)"
                                  className="bg-zinc-900 border border-zinc-800 text-[11px] px-3 py-1.5 rounded-lg outline-none text-white font-medium sm:col-span-2"
                                />

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = customHeadersList.filter((_: any, idx: number) => idx !== hIdx);
                                    setCustomHeadersList(updated);
                                  }}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Endpoints Designer Card */}
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
                      <div className="border-b border-zinc-850 pb-2 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-cyan-400" /> Endpoints (Model Tools)
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setManualEndpoints([
                              ...manualEndpoints,
                              {
                                path: '',
                                method: 'get',
                                description: '',
                                parameters: []
                              }
                            ]);
                          }}
                          className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-cyan-400 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Endpoint
                        </button>
                      </div>

                      {manualEndpoints.length === 0 ? (
                        <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
                          <p className="text-xs text-zinc-500">No endpoints designed yet. Click "Add Endpoint" to begin.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {manualEndpoints.map((ep: any, epIdx: number) => (
                            <div key={epIdx} className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 md:p-5 space-y-4 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = manualEndpoints.filter((_: any, idx: number) => idx !== epIdx);
                                  setManualEndpoints(updated);
                                }}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 p-1.5 transition cursor-pointer"
                                title="Remove Endpoint"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1 md:col-span-1">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Method</label>
                                  <select
                                    value={ep.method}
                                    onChange={(e) => {
                                      const updated = [...manualEndpoints];
                                      updated[epIdx].method = e.target.value;
                                      setManualEndpoints(updated);
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs px-3 py-2 rounded-lg outline-none text-white font-semibold"
                                  >
                                    <option value="get">GET</option>
                                    <option value="post">POST</option>
                                    <option value="put">PUT</option>
                                    <option value="delete">DELETE</option>
                                    <option value="patch">PATCH</option>
                                  </select>
                                </div>

                                <div className="space-y-1 md:col-span-3">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Endpoint Path</label>
                                  <input
                                    type="text"
                                    required
                                    value={ep.path}
                                    onChange={(e) => {
                                      const updated = [...manualEndpoints];
                                      updated[epIdx].path = e.target.value;
                                      setManualEndpoints(updated);
                                    }}
                                    placeholder="e.g. /current or /users/{id}"
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs px-3 py-2 rounded-lg outline-none text-white font-medium"
                                  />
                                </div>

                                <div className="space-y-1 md:col-span-4">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Description</label>
                                  <input
                                    type="text"
                                    value={ep.description}
                                    onChange={(e) => {
                                      const updated = [...manualEndpoints];
                                      updated[epIdx].description = e.target.value;
                                      setManualEndpoints(updated);
                                    }}
                                    placeholder="Summary of what this tool/endpoint does for the LLM"
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs px-3 py-2 rounded-lg outline-none text-white font-medium"
                                  />
                                </div>
                              </div>

                              {/* Parameters Sub-section */}
                              <div className="space-y-3 pt-3 border-t border-zinc-900">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Parameters Schema</h4>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...manualEndpoints];
                                      updated[epIdx].parameters.push({
                                        name: '',
                                        in: 'query',
                                        type: 'string',
                                        required: true,
                                        description: ''
                                      });
                                      setManualEndpoints(updated);
                                    }}
                                    className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add Parameter
                                  </button>
                                </div>

                                {ep.parameters.length === 0 ? (
                                  <p className="text-[10px] text-zinc-500 italic">No custom inputs defined for this endpoint.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {ep.parameters.map((param: any, pIdx: number) => (
                                      <div key={pIdx} className="grid grid-cols-1 md:grid-cols-6 gap-2 bg-zinc-900 p-2.5 rounded-lg relative pr-10">
                                        <input
                                          type="text"
                                          required
                                          value={param.name}
                                          onChange={(e) => {
                                            const updated = [...manualEndpoints];
                                            updated[epIdx].parameters[pIdx].name = e.target.value;
                                            setManualEndpoints(updated);
                                          }}
                                          placeholder="Param Name"
                                          className="bg-zinc-950 border border-zinc-800 text-[11px] px-2 py-1 rounded outline-none text-white md:col-span-1"
                                        />

                                        <select
                                          value={param.in}
                                          onChange={(e) => {
                                            const updated = [...manualEndpoints];
                                            updated[epIdx].parameters[pIdx].in = e.target.value;
                                            setManualEndpoints(updated);
                                          }}
                                          className="bg-zinc-950 border border-zinc-800 text-[11px] px-2 py-1 rounded outline-none text-white md:col-span-1"
                                        >
                                          <option value="query">Query</option>
                                          <option value="path">Path</option>
                                          <option value="body">Body</option>
                                        </select>

                                        <select
                                          value={param.type}
                                          onChange={(e) => {
                                            const updated = [...manualEndpoints];
                                            updated[epIdx].parameters[pIdx].type = e.target.value;
                                            setManualEndpoints(updated);
                                          }}
                                          className="bg-zinc-950 border border-zinc-800 text-[11px] px-2 py-1 rounded outline-none text-white md:col-span-1"
                                        >
                                          <option value="string">String</option>
                                          <option value="number">Number</option>
                                          <option value="boolean">Boolean</option>
                                        </select>

                                        <div className="flex items-center gap-1 md:col-span-1 px-1">
                                          <input
                                            type="checkbox"
                                            id={`req-${epIdx}-${pIdx}`}
                                            checked={param.required}
                                            onChange={(e) => {
                                              const updated = [...manualEndpoints];
                                              updated[epIdx].parameters[pIdx].required = e.target.checked;
                                              setManualEndpoints(updated);
                                            }}
                                            className="rounded border-zinc-800 text-cyan-500 focus:ring-0 cursor-pointer"
                                          />
                                          <label htmlFor={`req-${epIdx}-${pIdx}`} className="text-[10px] font-semibold text-zinc-400 uppercase select-none cursor-pointer">Required</label>
                                        </div>

                                        <input
                                          type="text"
                                          value={param.description}
                                          onChange={(e) => {
                                            const updated = [...manualEndpoints];
                                            updated[epIdx].parameters[pIdx].description = e.target.value;
                                            setManualEndpoints(updated);
                                          }}
                                          placeholder="Description / Guide"
                                          className="bg-zinc-950 border border-zinc-800 text-[11px] px-2 py-1 rounded outline-none text-white md:col-span-2"
                                        />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...manualEndpoints];
                                            updated[epIdx].parameters = updated[epIdx].parameters.filter((_: any, idx: number) => idx !== pIdx);
                                            setManualEndpoints(updated);
                                          }}
                                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-650 hover:text-red-400 p-1 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Manual Connect Button */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateGateway}
                        disabled={!gatewayName || !baseUrl || manualEndpoints.some((ep: any) => !ep.path)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <span>{editingGateway ? 'Save Connection Updates' : 'Connect & Generate Tools'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Paths Grid Selection & Gateway construction */}
            {wizardStep === 2 && !newGatewayId && (
              <div className="space-y-8">
                
                {/* Form fields: Gateway Name & Credentials */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-2 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-cyan-400" /> General Config
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                        Gateway Connection Name
                      </label>
                      <input
                        type="text"
                        required
                        value={gatewayName}
                        onChange={(e) => setGatewayName(e.target.value)}
                        placeholder="e.g. Stripe Gateway"
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-4 py-2.5 rounded-xl transition duration-200 outline-none text-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                          Auth Header Key
                        </label>
                        <input
                          type="text"
                          value={credentialKeyName}
                          onChange={(e) => setCredentialKeyName(e.target.value)}
                          placeholder="Authorization"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-4 py-2.5 rounded-xl transition duration-200 outline-none text-white font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                          Auth Token / Key
                        </label>
                        <input
                          type="password"
                          value={credentialValue}
                          onChange={(e) => setCredentialValue(e.target.value)}
                          placeholder="API Key or secret value"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-4 py-2.5 rounded-xl transition duration-200 outline-none text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 bg-zinc-950/40 px-3.5 py-2 rounded-xl border border-zinc-850">
                    Security Baseline: Credentials are encrypted via AES-256-GCM both in-transit and at-rest.
                  </p>

                  {/* TOON Option */}
                  <div className="border-t border-zinc-850 pt-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="enableToon"
                      checked={enableToonCompression}
                      onChange={(e) => setEnableToonCompression(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-zinc-800 bg-zinc-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <label htmlFor="enableToon" className="text-xs font-bold text-zinc-300 uppercase tracking-wider cursor-pointer block">
                        Enable TOON Tabular Serialization
                      </label>
                      <p className="text-[10px] text-zinc-500 leading-normal">
                        Converts response payloads into Tabular Object-Oriented Notation (TOON) to minimize context window consumption by up to 90%.
                      </p>
                      {enableToonCompression && (
                        <p className="text-[9px] text-amber-400 font-medium leading-normal mt-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg flex items-start gap-1">
                          <span>⚠️</span>
                          <span><strong>Semantic Quality Warning:</strong> TOON removes JSON brackets, array hierarchies, and nested metadata to compress . While highly token-efficient, it may slightly degrade semantic quality or field parsing on smaller LLMs (like older 8B models). Works best with Sonnet 3.5, GPT-4o, and DeepSeek-V3.</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Paths selection grid */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-2 flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" /> Configure OpenAPI Paths ({availablePaths.length})
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Choose which endpoints to expose as tool calls. Restricting write permissions overrides standard method mutation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                    {availablePaths.map((p: any, idx: number) => {
                      const methodColors: Record<string, string> = {
                        get: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                        post: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                        put: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                        delete: 'bg-red-500/10 text-red-400 border-red-500/20',
                        patch: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      };

                      return (
                        <div
                          key={idx}
                          className={`border p-4 rounded-xl flex items-center justify-between gap-4 transition-all duration-300 ${
                            p.isEnabled
                              ? 'bg-zinc-950/80 border-zinc-800'
                              : 'bg-zinc-900/10 border-dashed border-zinc-850 opacity-40'
                          }`}
                        >
                          <div className="space-y-1.5 overflow-hidden flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border tracking-wider font-mono ${methodColors[p.method]}`}>
                                {p.method}
                              </span>
                              <span className="text-xs font-mono font-semibold text-zinc-300 truncate max-w-[200px]" title={p.path}>
                                {p.path}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => togglePathWritable(idx)}
                                disabled={!p.isEnabled}
                                className={`flex items-center gap-1 text-[10px] font-bold ${
                                  p.isWritable
                                    ? 'text-cyan-400 hover:text-cyan-300'
                                    : 'text-zinc-500 hover:text-zinc-400'
                                }`}
                              >
                                {p.isWritable ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Read & Write</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Read-Only</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={p.isEnabled}
                              onChange={() => togglePathEnabled(idx)}
                              className="w-4.5 h-4.5 rounded border-zinc-800 bg-zinc-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Wizard Action buttons */}
                <div className="flex items-center justify-between border-t border-zinc-850 pt-4">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 border border-zinc-800 hover:bg-zinc-850 hover:text-white rounded-xl text-xs font-semibold text-zinc-400 transition duration-200 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateGateway}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-black font-bold text-xs rounded-xl shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> {editingGateway ? 'Save Changes' : 'Host Gateway'}
                  </button>
                </div>

              </div>
            )}

            {/* Success screen & Gateway output preview card */}
            {newGatewayId && (
              <div className="max-w-2xl mx-auto bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 text-center animate-scale-in">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-white">Gateway Connected Successfully!</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    API definitions hosted securely. Bridge dynamic gateway to Model Context Protocol clients immediately.
                  </p>
                </div>

                {/* Custom Interactive Preview card */}
                <div className="bg-zinc-950/80 border border-zinc-800 p-6 rounded-2xl text-left space-y-4 max-w-md mx-auto relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 rounded-bl-full pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Gateway Configuration</span>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/25 font-bold uppercase">
                      Active
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Service Name</span>
                      <p className="text-zinc-200 font-black tracking-wide">{gatewayName}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">API OpenAPI Schema</span>
                      <p className="text-[10px] text-zinc-400 font-mono truncate">{apiUrl}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Active Endpoints</span>
                      <p className="text-zinc-400 font-medium">
                        {availablePaths.filter((p: any) => p.isEnabled).length} tools exposed to LLM client.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Hosted MCP Gateway URL</span>
                      <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-xl">
                        <span className="text-[10px] font-mono text-cyan-400 truncate flex-1 select-all">
                          {`${BACKEND_URL}/api/mcp/sse?apiKey=${sessionApiKey || 'omni_gt_developer_key_123456'}`}
                        </span>
                        <button
                          onClick={() => copyToClipboard(`${BACKEND_URL}/api/mcp/sse?apiKey=${sessionApiKey || 'omni_gt_developer_key_123456'}`, 'mcp-url')}
                          className="text-zinc-400 hover:text-white transition cursor-pointer"
                        >
                          {copiedId === 'mcp-url' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-4 border-t border-zinc-850">
                  <button
                    onClick={() => {
                      setNewGatewayId(null);
                      router.push('/dashboard');
                    }}
                    className="px-5 py-2.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold rounded-xl text-zinc-200 transition duration-200 cursor-pointer"
                  >
                    View in Dashboard
                  </button>
                  <button
                    onClick={resetWizard}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-black font-bold text-xs rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                  >
                    Connect Another API
                  </button>
                </div>

              </div>
            )}

          </div>
        )}
    </>
  );
}
