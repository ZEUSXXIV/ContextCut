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
  Lock,
  Settings,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Wifi,
  AlertCircle,
  Terminal,
  X,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Zap,
  Folder,
  Send,
  Clock,
  FileText,
  Info
} from 'lucide-react';

import { useDashboard } from '../../context/DashboardContext';
import { LiveRequestTracker } from '../../components/LiveRequestTracker';
import { TraceparentModal } from '../../components/TraceparentModal';
import { useTabs } from '../../hooks/useTabs';
import { convertToToon } from '../../utils/toonEncoder';
import { useRouter } from 'next/navigation';

function DashboardContent() {
  const router = useRouter();
  const {
    isDemoMode,
    fetchData,
    isBackendConnected,
    user,
    handleLogout,
    gateways,
    analytics,
    sessionApiKey,
    copiedId,
    copyToClipboard,
    handleDeleteGateway,
    handleStartEditGateway,
    BACKEND_URL,
    resetWizard,
    setConnectMethod,
    setTriggerCurlImport
  } = useDashboard();

  // Multi-tab REST Client manager hook
  const {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    updateActiveTab,
    getActiveTab,
    setActiveTabId
  } = useTabs();

  // Left Sidebar Collections States
  const [expandedGateways, setExpandedGateways] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Local URL input state for dual-syncing URLs with parameter grids
  const [urlInputVal, setUrlInputVal] = useState('');

  // Active sub-tabs in request pane
  const [reqSubTab, setReqSubTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'docs'>('params');

  // Active sub-tabs in response pane
  const [resSubTab, setResSubTab] = useState<'body' | 'headers' | 'toon'>('body');

  // Docs Inline Editor States
  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [editDocsSummary, setEditDocsSummary] = useState('');
  const [editDocsDescription, setEditDocsDescription] = useState('');
  const [editDocsParams, setEditDocsParams] = useState<Record<string, string>>({}); // paramName -> description
  const [editDocsParameters, setEditDocsParameters] = useState<any[]>([]);
  const [editDocsBodyProps, setEditDocsBodyProps] = useState<Record<string, string>>({}); // propKey -> description
  const [isSavingDocs, setIsSavingDocs] = useState(false);

  // Reset docs editing state when activeTabId changes
  useEffect(() => {
    setIsEditingDocs(false);
  }, [activeTabId]);

  const toggleEditDocsMode = (docs: any) => {
    if (isEditingDocs) {
      setIsEditingDocs(false);
      return;
    }

    setEditDocsSummary(docs.summary || '');
    setEditDocsDescription(docs.description || '');

    const paramsMap: Record<string, string> = {};
    if (docs.parameters) {
      docs.parameters.forEach((p: any) => {
        paramsMap[p.name] = p.description || '';
      });
      setEditDocsParameters(JSON.parse(JSON.stringify(docs.parameters)));
    } else {
      setEditDocsParameters([]);
    }
    setEditDocsParams(paramsMap);

    const bodyPropsMap: Record<string, string> = {};
    if (docs.requestBody?.content?.['application/json']?.schema?.properties) {
      const props = docs.requestBody.content['application/json'].schema.properties;
      Object.keys(props).forEach((k) => {
        bodyPropsMap[k] = props[k].description || '';
      });
    }
    setEditDocsBodyProps(bodyPropsMap);

    setIsEditingDocs(true);
  };

  const handleSaveDocs = async () => {
    if (isSavingDocs) return;
    const tab = getActiveTab();
    if (!tab) return;

    setIsSavingDocs(true);

    try {
      const targetGt = gateways.find((g: any) => (g.id || g._id) === tab.gatewayId);
      if (!targetGt) throw new Error('Gateway connection not found.');

      // Deep copy gateway rawSpec and paths
      const updatedSpec = JSON.parse(JSON.stringify(targetGt.rawSpec || {}));
      const updatedPaths = JSON.parse(JSON.stringify(targetGt.paths || []));

      // 1. Update rawSpec summary and description
      if (updatedSpec.paths) {
        let pathKey = tab.path;
        let methodKey = tab.method.toLowerCase();
        let pathObj = updatedSpec.paths[pathKey];
        if (!pathObj) {
          const alt = pathKey.startsWith('/') ? pathKey.substring(1) : `/${pathKey}`;
          pathObj = updatedSpec.paths[alt];
          if (pathObj) pathKey = alt;
        }

        if (pathObj && pathObj[methodKey]) {
          const op = pathObj[methodKey];
          op.summary = editDocsSummary;
          op.description = editDocsDescription;

          // Update parameters with the edited parameters array
          op.parameters = editDocsParameters;

          // Update requestBody schema properties descriptions
          if (op.requestBody && op.requestBody.content?.['application/json']?.schema?.properties) {
            const props = op.requestBody.content['application/json'].schema.properties;
            Object.keys(props).forEach((propKey) => {
              if (editDocsBodyProps[propKey] !== undefined) {
                props[propKey].description = editDocsBodyProps[propKey];
              }
            });
          }
        }
      }

      // 2. Update paths array entry customDescription
      const pathIdx = updatedPaths.findIndex(
        (p: any) => p.path === tab.path && p.method.toLowerCase() === tab.method.toLowerCase()
      );
      if (pathIdx !== -1) {
        updatedPaths[pathIdx].customDescription = editDocsDescription || editDocsSummary;
      }

      // Persist updates
      if (!isDemoMode) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (sessionApiKey) {
          headers['Authorization'] = `Bearer ${sessionApiKey}`;
        }

        const res = await fetch(`${BACKEND_URL}/api/gateways/${targetGt._id || targetGt.id}`, {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            name: targetGt.name,
            credentialKeyName: targetGt.credentialKeyName,
            rawSpec: updatedSpec,
            paths: updatedPaths,
            enableToonCompression: targetGt.enableToonCompression,
            customHeaders: targetGt.customHeaders,
            openApiUrl: targetGt.openApiUrl
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update gateway documentation.');
        }
      } else {
        const updatedGts = gateways.map((g: any) => {
          if ((g.id || g._id) === tab.gatewayId) {
            return {
              ...g,
              rawSpec: updatedSpec,
              paths: updatedPaths
            };
          }
          return g;
        });
        localStorage.setItem('omni_mcp_gateways', JSON.stringify(updatedGts));
      }

      await fetchData(true);
      setIsEditingDocs(false);
      alert('Documentation successfully saved and federated downstream!');
    } catch (err: any) {
      alert(err.message || 'Failed to save documentation updates');
    } finally {
      setIsSavingDocs(false);
    }
  };

  // Expand gateways by default on first load
  useEffect(() => {
    if (gateways.length > 0) {
      const initial: Record<string, boolean> = {};
      gateways.forEach((gt: any) => {
        const id = gt.id || gt._id || '';
        if (id) initial[id] = true;
      });
      setExpandedGateways((prev) => ({ ...initial, ...prev }));
    }
  }, [gateways]);

  // Derived base URL resolver for target API
  const getGatewayBaseUrl = (gatewayId: string) => {
    const api = gateways.find((g: any) => (g.id || g._id) === gatewayId);
    if (!api) return 'http://localhost';
    let baseUrl = 'http://localhost';
    const spec = api.rawSpec;
    if (spec && spec.servers && spec.servers.length > 0 && spec.servers[0].url) {
      baseUrl = spec.servers[0].url;
    } else if (api.specUrl) {
      try {
        baseUrl = new URL(api.specUrl).origin;
      } catch (_) {}
    }
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  };

  // String size and token estimators
  const getStringSize = (val: any) => {
    if (!val) return 0;
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    return new Blob([str]).size;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const estimateTokens = (bytes: number) => {
    return Math.ceil(bytes / 3.8);
  };

  // Convert query parameters into a query string
  const queryParamsToString = (params: Array<{ key: string; value: string }>) => {
    if (!params || params.length === 0) return '';
    const filtered = params.filter(p => p.key.trim() !== '');
    if (filtered.length === 0) return '';
    return '?' + filtered.map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`).join('&');
  };

  const activeTab = getActiveTab();

  // Dual-sync URL bar when switching tabs or modifying parameter grids
  useEffect(() => {
    if (activeTabId === 'overview' || activeTabId === '') {
      setUrlInputVal('');
      return;
    }
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
      const base = getGatewayBaseUrl(tab.gatewayId);
      const fullUrl = base + tab.path + queryParamsToString(tab.queryParams);
      setUrlInputVal(fullUrl);
    }
  }, [activeTabId, tabs]);

  // Dual-sync URL edits back into paths and parameter grids in real-time
  const handleUrlInputChange = (value: string) => {
    setUrlInputVal(value);
    
    if (activeTabId === 'overview' || activeTabId === '') return;
    const tab = getActiveTab();
    if (!tab) return;

    const base = getGatewayBaseUrl(tab.gatewayId);
    let relativePath = value;
    if (value.startsWith(base)) {
      relativePath = value.substring(base.length);
    } else if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        const urlObj = new URL(value);
        relativePath = urlObj.pathname + urlObj.search;
      } catch (_) {}
    }

    let pathPart = relativePath;
    let qParams: Array<{ key: string; value: string; description?: string }> = [];
    if (relativePath.includes('?')) {
      const parts = relativePath.split('?');
      pathPart = parts[0];
      try {
        const searchParams = new URLSearchParams(parts[1]);
        searchParams.forEach((val, key) => {
          qParams.push({ key, value: val, description: 'Query parameter' });
        });
      } catch (_) {}
    }

    updateActiveTab({
      path: pathPart,
      queryParams: qParams
    });
  };

  // Dispatch HTTP request downstream via backend decrypt-proxy
  const handleSendRequest = async () => {
    const tab = getActiveTab();
    if (!tab) return;
    
    updateActiveTab({ isLoading: true });
    
    try {
      let bodyData: any = undefined;
      if (tab.body && tab.body.trim() !== '') {
        try {
          bodyData = JSON.parse(tab.body);
        } catch (e) {
          alert('Invalid JSON request body. Please correct JSON format before sending.');
          updateActiveTab({ isLoading: false });
          return;
        }
      }
      
      const qParamsObj: Record<string, string> = {};
      tab.queryParams.forEach(p => {
        if (p.key.trim() !== '') qParamsObj[p.key.trim()] = p.value;
      });
      
      const headersObj: Record<string, string> = {};
      tab.headers.forEach(h => {
        if (h.key.trim() !== '') headersObj[h.key.trim()] = h.value;
      });
      
      const headersToSend: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (sessionApiKey) {
        headersToSend['Authorization'] = `Bearer ${sessionApiKey}`;
      }
      
      const res = await fetch(`${BACKEND_URL}/api/gateways/${tab.gatewayId}/test-request`, {
        method: 'POST',
        headers: headersToSend,
        credentials: 'include',
        body: JSON.stringify({
          path: tab.path,
          method: tab.method,
          queryParams: qParamsObj,
          headers: headersObj,
          body: bodyData
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error relays test request');
      }
      
      const responseData = await res.json();
      updateActiveTab({
        response: responseData,
        isLoading: false
      });
      
      // Refresh background stats/observability logs silently
      fetchData(true);
      
    } catch (error: any) {
      console.error('REST test execute failure:', error);
      updateActiveTab({
        response: {
          status: 500,
          statusText: 'REST Proxy Execution Failed',
          headers: {},
          data: { error: error.message || 'Downstream connection timeout or failed relay.' },
          latencyMs: 0,
          sizeBytes: 0
        },
        isLoading: false
      });
    }
  };

  // Resolve specification documentation from cached rawSpec
  const getEndpointDocs = (gatewayId: string, path: string, method: string) => {
    const api = gateways.find((g: any) => (g.id || g._id) === gatewayId);
    if (!api || !api.rawSpec) return null;
    
    const spec = api.rawSpec;
    const pathsObj = spec.paths || {};
    let pathObj = pathsObj[path];
    if (!pathObj) {
      const alt = path.startsWith('/') ? path.substring(1) : `/${path}`;
      pathObj = pathsObj[alt];
    }
    
    if (!pathObj) return null;
    
    const methodObj = pathObj[method.toLowerCase()];
    if (!methodObj) return null;
    
    return {
      summary: methodObj.summary || methodObj.description || 'No summary descriptor.',
      description: methodObj.description || '',
      parameters: methodObj.parameters || [],
      requestBody: methodObj.requestBody || null
    };
  };

  // Toggle Collections Sidebar folders
  const toggleGatewayExpand = (id: string) => {
    setExpandedGateways(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Grids Row Managers - Parameters
  const handleParamChange = (index: number, field: 'key' | 'value' | 'description', val: string) => {
    const tab = getActiveTab();
    if (!tab) return;
    const updated = [...tab.queryParams];
    updated[index] = { ...updated[index], [field]: val };
    updateActiveTab({ queryParams: updated });
  };

  const handleAddParamRow = () => {
    const tab = getActiveTab();
    if (!tab) return;
    const updated = [...tab.queryParams, { key: '', value: '', description: '' }];
    updateActiveTab({ queryParams: updated });
  };

  const handleRemoveParamRow = (index: number) => {
    const tab = getActiveTab();
    if (!tab) return;
    const updated = tab.queryParams.filter((_, idx) => idx !== index);
    updateActiveTab({ queryParams: updated });
  };

  // Grids Row Managers - Headers Override
  const handleHeaderChange = (index: number, field: 'key' | 'value' | 'description', val: string) => {
    const tab = getActiveTab();
    if (!tab) return;
    const updated = [...tab.headers];
    updated[index] = { ...updated[index], [field]: val };
    updateActiveTab({ headers: updated });
  };

  const handleAddHeaderRow = () => {
    const tab = getActiveTab();
    if (!tab) return;
    const updated = [...tab.headers, { key: '', value: '', description: '' }];
    updateActiveTab({ headers: updated });
  };

  const handleRemoveHeaderRow = (index: number) => {
    const tab = getActiveTab();
    if (!tab) return;
    const updated = tab.headers.filter((_, idx) => idx !== index);
    updateActiveTab({ headers: updated });
  };

  // Format request body helper
  const handleFormatBodyJson = () => {
    const tab = getActiveTab();
    if (!tab || !tab.body) return;
    try {
      const parsed = JSON.parse(tab.body);
      updateActiveTab({ body: JSON.stringify(parsed, null, 2) });
    } catch (e) {
      alert('Invalid JSON. Cannot format.');
    }
  };

  // Filter collections and paths by search query
  const filteredGateways = gateways.filter((gt: any) => {
    if (searchQuery.trim() === '') return true;
    const matchName = gt.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPath = gt.paths?.some((p: any) => p.path.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchName || matchPath;
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black overflow-hidden relative">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none translate-y-1/3"></div>

      {/* Sandbox Connection indicator banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs text-amber-300 font-medium flex items-center justify-center gap-2 relative z-50 shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
          <span>
            <strong>Local Sandbox Mode:</strong> Backend API on <strong>port 3001</strong> is currently offline. Gateway configurations and metrics are temporarily running on virtual local memory.
          </span>
          <button 
            onClick={() => fetchData()} 
            className="ml-3 px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 animate-pulse" /> Retry Connection
          </button>
        </div>
      )}

      {/* Persistent Global Nav Menu */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 shrink-0">
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
                  ContextCut
                </h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded">
                  v1.2.0
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Enterprise OpenAPI to Model Context Protocol Adapter</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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

      {/* Side-by-Side Postman REST Workspace */}
      <div className="flex-1 flex overflow-hidden relative z-10 w-full h-[calc(100vh-80px)]">
        
        {/* Left Pane: Collections Sidebar Tree */}
        <aside className="w-80 border-r border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md flex flex-col overflow-y-auto custom-scrollbar select-none p-4 space-y-4 shrink-0">
          <div className="flex items-center justify-between relative">
            <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest">Workspace</span>
            <div className="flex items-center gap-1.5">
              {/* Swagger Import Quick Button */}
              <button
                onClick={() => {
                  resetWizard();
                  setConnectMethod('url');
                  router.push('/dashboard/connect');
                }}
                title="Import OpenAPI / Swagger Spec"
                className="p-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-cyan-400 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
              </button>

              {/* cURL Import Quick Button */}
              <button
                onClick={() => {
                  resetWizard();
                  setConnectMethod('manual');
                  setTriggerCurlImport(true);
                  router.push('/dashboard/connect');
                }}
                title="Import cURL Command"
                className="p-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-amber-400 rounded-lg transition-all duration-200 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  title="More Connection Options"
                  className={`p-1 border rounded-lg transition-all duration-200 cursor-pointer ${
                    showAddMenu
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 border-zinc-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>

              {/* Dropdown Menu */}
              {showAddMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-45" 
                    onClick={() => setShowAddMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-950 border border-zinc-850 shadow-2xl p-1.5 z-50 animate-fade-in divide-y divide-zinc-900/50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          resetWizard();
                          setConnectMethod('url');
                          setShowAddMenu(false);
                          router.push('/dashboard/connect');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <div className="flex flex-col">
                          <span>Import OpenAPI / Swagger</span>
                          <span className="text-[9px] text-zinc-500 font-medium">Connect via spec URL</span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          resetWizard();
                          setConnectMethod('manual');
                          setTriggerCurlImport(true);
                          setShowAddMenu(false);
                          router.push('/dashboard/connect');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                      >
                        <Terminal className="w-3.5 h-3.5 text-amber-400" />
                        <div className="flex flex-col">
                          <span>Import cURL Command</span>
                          <span className="text-[9px] text-zinc-500 font-medium">Auto-parse shell command</span>
                        </div>
                      </button>
                    </div>
                    
                    <div className="py-1">
                      <button
                        onClick={() => {
                          resetWizard();
                          setConnectMethod('manual');
                          setShowAddMenu(false);
                          router.push('/dashboard/connect');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-purple-400" />
                        <div className="flex flex-col">
                          <span>Manual API Designer</span>
                          <span className="text-[9px] text-zinc-500 font-medium">Build custom specs inline</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

          {/* Sidebar Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search collections or paths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs placeholder-zinc-500 text-zinc-100 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-200"
            />
          </div>

          {/* Navigation Elements */}
          <div className="space-y-1">
            <button
              onClick={() => setActiveTabId('overview')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-250 ${
                activeTabId === 'overview' || activeTabId === ''
                  ? 'bg-zinc-800 text-cyan-400 border border-zinc-700/50'
                  : 'text-zinc-405 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>System Overview</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>

          {/* Connections / Collections Tree Hierarchy */}
          <div className="border-t border-zinc-900 pt-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Collections</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-zinc-900 text-zinc-450 rounded-full font-mono font-bold">
                {gateways.length}
              </span>
            </div>

            {filteredGateways.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-xs italic">
                No collections found
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                {filteredGateways.map((gt: any) => {
                  const id = gt.id || gt._id || 'mock';
                  const isExpanded = !!expandedGateways[id];
                  const hasActive = gt.paths?.some((p: any) => p.isEnabled);
                  
                  const filteredPaths = gt.paths?.filter((p: any) => {
                    if (searchQuery.trim() === '') return true;
                    return p.path.toLowerCase().includes(searchQuery.toLowerCase());
                  }) || [];

                  if (searchQuery.trim() !== '' && filteredPaths.length === 0 && !gt.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                    return null;
                  }

                  return (
                    <div key={id} className="space-y-1">
                      {/* Collection root row */}
                      <div className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-900/40 transition-all duration-200">
                        <button
                          onClick={() => toggleGatewayExpand(id)}
                          className="flex-1 flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors text-left truncate"
                        >
                          <ChevronRight className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          <Folder className="w-4 h-4 text-cyan-400 fill-cyan-400/10 shrink-0" />
                          <span className="truncate max-w-[125px]" title={gt.name}>{gt.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-650'}`} />
                        </button>
                        
                        {/* Hover setting controls */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              handleStartEditGateway(gt);
                              router.push('/dashboard/connect');
                            }}
                            title="Edit Gateway Spec & Options"
                            className="p-1 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGateway(id)}
                            title="Remove Connection"
                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tool route child paths */}
                      {isExpanded && (
                        <div className="pl-6 border-l border-zinc-850/60 ml-3.5 space-y-0.5 pt-0.5 pb-1">
                          {filteredPaths.map((p: any, idx: number) => {
                            const methodColorMap: Record<string, string> = {
                              get: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10',
                              post: 'text-amber-400 bg-amber-500/5 border-amber-500/10',
                              put: 'text-blue-400 bg-blue-500/5 border-blue-500/10',
                              delete: 'text-red-400 bg-red-500/5 border-red-500/10',
                              patch: 'text-purple-400 bg-purple-500/5 border-purple-500/10'
                            };
                            const colorClass = methodColorMap[p.method.toLowerCase()] || 'text-zinc-400 bg-zinc-500/5';
                            const isTabActive = activeTabId === `${id}-${p.method.toUpperCase()}-${p.path}`;

                            return (
                              <button
                                key={idx}
                                onClick={() => openTab(id, gt.name, p.path, p.method, p.customDescription || '')}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] font-mono transition-all text-left ${
                                  isTabActive
                                    ? 'bg-cyan-500/10 text-cyan-300 font-bold border-l-2 border-l-cyan-400 pl-1.5'
                                    : 'text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/30'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded border shrink-0 ${colorClass}`}>
                                    {p.method.toUpperCase()}
                                  </span>
                                  <span className={`truncate ${p.isEnabled ? '' : 'text-zinc-650 line-through'}`}>
                                    {p.path}
                                  </span>
                                </div>
                                <span className={`w-1 h-1 rounded-full shrink-0 ml-1.5 ${p.isEnabled ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                              </button>
                            );
                          })}
                          {filteredPaths.length === 0 && (
                            <div className="text-[10px] text-zinc-600 py-1 pl-2">
                              No endpoints matching path filter.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Right Pane: Central Workspace Multi-Tab and Request Builder */}
        <main className="flex-1 flex flex-col bg-zinc-900/15 overflow-hidden">
          
          {/* Tab Header Selector */}
          <div className="bg-zinc-950 border-b border-zinc-800/80 flex items-center overflow-x-auto custom-scrollbar select-none h-11 shrink-0">
            {/* Hardcoded Overview Tab */}
            <button
              onClick={() => setActiveTabId('overview')}
              className={`flex items-center gap-1.5 px-4 h-full text-xs font-semibold select-none cursor-pointer border-r border-zinc-900 transition-colors shrink-0 ${
                activeTabId === 'overview' || activeTabId === ''
                  ? 'bg-[#09090b] text-cyan-400 border-t-2 border-t-cyan-500 font-bold'
                  : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Overview</span>
            </button>

            {/* Dynamic Open REST testing tabs */}
            {tabs.map((t: any) => {
              const isActive = t.id === activeTabId;
              const methodColorMap: Record<string, string> = {
                GET: 'text-emerald-400',
                POST: 'text-amber-400',
                PUT: 'text-blue-400',
                DELETE: 'text-red-400',
                PATCH: 'text-purple-400'
              };
              const colorClass = methodColorMap[t.method.toUpperCase()] || 'text-zinc-400';

              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTabId(t.id)}
                  className={`flex items-center gap-2 px-4 h-full text-xs font-semibold select-none cursor-pointer border-r border-zinc-900 transition-colors group relative shrink-0 ${
                    isActive
                      ? 'bg-[#09090b] text-cyan-400 border-t-2 border-t-cyan-500 font-bold'
                      : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-white'
                  }`}
                >
                  <span className={`text-[9px] font-black tracking-tight ${colorClass}`}>
                    {t.method}
                  </span>
                  <span className="max-w-[125px] truncate font-mono text-[11px]">
                    {t.path}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(t.id);
                    }}
                    className="p-0.5 rounded text-zinc-550 hover:text-red-400 hover:bg-zinc-800 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Screen Viewport Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
            
            {/* VIEWPORT 1: System Overview and Logs Analytics */}
            {(activeTabId === 'overview' || activeTabId === '') ? (
              <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-10">
                {/* Stats Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* volume routed */}
                  <div className="relative group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/30 backdrop-blur-md p-6 flex items-center justify-between hover:border-zinc-700/50 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-blue-600"></div>
                    <div className="space-y-2">
                      <span className="text-zinc-500 text-xs font-bold tracking-wider uppercase block">
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

                  {/* context savings */}
                  <div className="relative group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/30 backdrop-blur-md p-6 flex items-center justify-between hover:border-zinc-700/50 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-600"></div>
                    <div className="space-y-2">
                      <span className="text-zinc-500 text-xs font-bold tracking-wider uppercase block">
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

                  {/* hosted gateways */}
                  <div className="relative group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/30 backdrop-blur-md p-6 flex items-center justify-between hover:border-zinc-700/50 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-600"></div>
                    <div className="space-y-2">
                      <span className="text-zinc-500 text-xs font-bold tracking-wider uppercase block">
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

                {/* Sub grid for collections overview list + trace analyzer */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                      <div>
                        <h2 className="text-base font-bold tracking-tight text-white">Hosted Connection API Overviews</h2>
                        <p className="text-xs text-zinc-400">Manage, edit, or copy endpoints exposed as Model Context capabilities.</p>
                      </div>
                      <button
                        onClick={() => {
                          resetWizard();
                          router.push('/dashboard/connect');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-black font-bold text-xs rounded-xl shadow-md transition-all duration-300 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Connect API
                      </button>
                    </div>
 
                    {gateways.length === 0 ? (
                      <div className="border border-dashed border-zinc-800 bg-zinc-950/20 rounded-2xl p-12 text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                          <Globe className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-zinc-200">No Collections Connected</p>
                          <p className="text-xs text-zinc-450 max-w-sm mx-auto">
                            Instantly deploy API specs, mock custom endpoints, and test REST parameters downstream via decrypt forwarding proxy.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            resetWizard();
                            router.push('/dashboard/connect');
                          }}
                          className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold rounded-xl text-cyan-400 transition duration-200 cursor-pointer"
                        >
                          Connect New Collection
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {gateways.map((gt: any) => {
                          const id = gt.id || gt._id || 'mock';
                          const gatewayUrl = `${BACKEND_URL}/api/mcp/sse?apiKey=${sessionApiKey || 'omni_gt_developer_key_123456'}${id !== 'mock' ? `&gatewayId=${id}` : ''}`;
                          
                          return (
                            <div
                              key={id}
                              className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-950/25 p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all duration-200"
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                                      {gt.name}
                                    </h3>
                                    <p className="text-[10px] text-zinc-550 max-w-[190px] truncate" title={gt.specUrl || gt.openApiUrl}>
                                      {gt.specUrl || gt.openApiUrl}
                                    </p>
                                  </div>
                                  <span className={`text-[9px] px-2 py-0.5 rounded border border-zinc-800 font-mono ${gt.isManual ? 'text-purple-400 bg-purple-500/5' : 'text-cyan-400 bg-cyan-500/5'}`}>
                                    {gt.isManual ? 'Manual Custom' : 'OpenAPI Spec'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-850">
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold">Calls</span>
                                    <p className="text-xs font-black text-white">{gt.totalRequests}</p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold">Avg Compression</span>
                                    <p className="text-xs font-black text-emerald-400">
                                      {gt.averageCompressionRatio > 0 ? `${gt.averageCompressionRatio.toFixed(2)}x` : '--'}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold block">
                                    Endpoints ({gt.paths?.length || 0})
                                  </span>
                                  <div className="flex flex-wrap gap-1 max-h-[40px] overflow-y-auto custom-scrollbar">
                                    {gt.paths?.map((p: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${
                                          p.isEnabled
                                            ? 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                                            : 'bg-zinc-950 text-zinc-650 line-through border border-transparent'
                                        }`}
                                      >
                                        {p.method.toUpperCase()} {p.path}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between gap-3">
                                <div className="overflow-hidden flex-1 space-y-0.5">
                                  <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-extrabold block">
                                    MCP Connection URI
                                  </span>
                                  <p className="text-[10px] font-mono text-cyan-400/80 truncate">
                                    {gatewayUrl}
                                  </p>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(gatewayUrl, id)}
                                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white rounded-lg flex items-center gap-1 transition-all duration-200"
                                >
                                  {copiedId === id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>{copiedId === id ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Real-time request log observations */}
                  <LiveRequestTracker />
                </div>

                {/* Footer block */}
                <div className="pt-8 border-t border-zinc-900 text-[11px] text-zinc-550 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p>© 2026 ContextCut Adapter Federation Engine. All rights reserved.</p>
                  <div className="flex items-center gap-6">
                    <a href="https://nextjs.org" target="_blank" className="hover:text-zinc-350 transition-colors">Next.js Framework</a>
                    <span>•</span>
                    <a href="https://tailwindcss.com" target="_blank" className="hover:text-zinc-350 transition-colors">Tailwind CSS</a>
                    <span>•</span>
                    <a href="https://github.com/modelcontextprotocol" target="_blank" className="hover:text-zinc-350 transition-colors">MCP Spec v1</a>
                  </div>
                </div>
              </div>
            ) : (
              
              /* VIEWPORT 2: DYNAMIC REST CLIENT TAB */
              activeTab && (
                <div className="space-y-6 max-w-7xl mx-auto flex flex-col pb-10">
                  
                  {/* Address input block */}
                  <div className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-2xl flex items-center gap-3 shadow-md">
                    {/* Method select */}
                    <div className="relative shrink-0">
                      <select
                        value={activeTab.method}
                        onChange={(e) => updateActiveTab({ method: e.target.value })}
                        className={`bg-zinc-900 border border-zinc-750 px-3 py-2 rounded-xl text-xs font-black tracking-widest cursor-pointer focus:outline-none focus:border-cyan-500/50 appearance-none pr-8 ${
                          activeTab.method === 'GET'
                            ? 'text-emerald-400'
                            : activeTab.method === 'POST'
                            ? 'text-amber-400'
                            : activeTab.method === 'PUT'
                            ? 'text-blue-400'
                            : activeTab.method === 'DELETE'
                            ? 'text-red-400'
                            : 'text-purple-400'
                        }`}
                      >
                        <option value="GET" className="text-emerald-400 bg-zinc-950 font-bold">GET</option>
                        <option value="POST" className="text-amber-400 bg-zinc-950 font-bold">POST</option>
                        <option value="PUT" className="text-blue-400 bg-zinc-950 font-bold">PUT</option>
                        <option value="DELETE" className="text-red-400 bg-zinc-950 font-bold">DELETE</option>
                        <option value="PATCH" className="text-purple-400 bg-zinc-950 font-bold">PATCH</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                    </div>

                    {/* URL bar */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={urlInputVal}
                        onChange={(e) => handleUrlInputChange(e.target.value)}
                        placeholder="http://localhost:4000/api/endpoint..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-200"
                      />
                    </div>

                    {/* Send dispatch */}
                    <button
                      onClick={handleSendRequest}
                      disabled={activeTab.isLoading}
                      className="shrink-0 flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all duration-200 cursor-pointer"
                    >
                      {activeTab.isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 animate-pulse" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sub-tabs panels - Params, Auth, Headers, Body, Docs */}
                  <div className="border border-zinc-850 rounded-2xl bg-zinc-950/20 backdrop-blur-md overflow-hidden flex flex-col min-h-[260px] max-h-[400px]">
                    <div className="bg-zinc-950/60 border-b border-zinc-850 px-4 flex items-center gap-1.5 h-10 select-none shrink-0">
                      {(['params', 'auth', 'headers', 'body', 'docs'] as const).map((tabName) => {
                        const countBadge =
                          tabName === 'params'
                            ? activeTab.queryParams.filter(p => p.key.trim() !== '').length
                            : tabName === 'headers'
                            ? activeTab.headers.filter(h => h.key.trim() !== '').length
                            : 0;

                        return (
                          <button
                            key={tabName}
                            onClick={() => setReqSubTab(tabName)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                              reqSubTab === tabName
                                ? 'bg-zinc-900 text-cyan-400 border border-zinc-800'
                                : 'text-zinc-550 hover:text-zinc-300'
                            }`}
                          >
                            <span>{tabName === 'auth' ? 'Authorization' : tabName}</span>
                            {countBadge > 0 && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-cyan-950 text-cyan-400 rounded-full border border-cyan-800/30 font-mono">
                                {countBadge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-5 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                      
                      {/* Grid 1: Params */}
                      {reqSubTab === 'params' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Query Parameters Table</span>
                            <button
                              onClick={handleAddParamRow}
                              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Parameter</span>
                            </button>
                          </div>

                          <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/40">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-zinc-900 bg-zinc-950/80 text-zinc-500 font-bold">
                                  <th className="px-4 py-2.5 w-1/4">Key</th>
                                  <th className="px-4 py-2.5 w-1/3">Value</th>
                                  <th className="px-4 py-2.5">Description</th>
                                  <th className="px-4 py-2.5 w-16 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeTab.queryParams.map((p, idx) => (
                                  <tr key={idx} className="border-b border-zinc-900 hover:bg-zinc-900/10">
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        placeholder="key"
                                        value={p.key}
                                        onChange={(e) => handleParamChange(idx, 'key', e.target.value)}
                                        className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-zinc-850 focus:border-cyan-500/50 focus:bg-zinc-950 focus:outline-none font-mono text-[11px] text-zinc-200"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        placeholder="value"
                                        value={p.value}
                                        onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                                        className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-zinc-850 focus:border-cyan-500/50 focus:bg-zinc-950 focus:outline-none font-mono text-[11px] text-zinc-200"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        placeholder="parameter description"
                                        value={p.description || ''}
                                        onChange={(e) => handleParamChange(idx, 'description', e.target.value)}
                                        className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-zinc-850 focus:border-cyan-500/50 focus:bg-zinc-950 focus:outline-none text-[11px] text-zinc-300"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        onClick={() => handleRemoveParamRow(idx)}
                                        className="p-1 text-zinc-550 hover:text-red-400 hover:bg-zinc-900 rounded transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {activeTab.queryParams.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="text-center py-6 text-zinc-600 italic">
                                      No query parameters configured. Click "Add Parameter" to construct search criteria.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Grid 2: Auth */}
                      {reqSubTab === 'auth' && (
                        <div className="space-y-4 max-w-xl">
                          <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Credential Injections</span>
                          
                          {(() => {
                            const api = gateways.find((g: any) => (g.id || g._id) === activeTab.gatewayId);
                            return (
                              <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-900 text-xs">
                                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                                  <span className="text-zinc-500 font-bold">Storage Type:</span>
                                  <span className="font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-800/20 text-[10px]">
                                    AES-256-GCM SECURED
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-500 font-bold">Header Key Injector:</span>
                                  <span className="font-mono text-zinc-300">{api?.credentialKeyName || 'Authorization'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-zinc-500 font-bold">Encrypted Token Value:</span>
                                  <span className="font-mono text-zinc-650">••••••••••••••••••••••••••••••••</span>
                                </div>
                                <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[10px] text-zinc-500 leading-relaxed flex items-start gap-2">
                                  <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                                  <span>
                                    ContextCut operates on zero-token exposure principles. Your sensitive API keys are encrypted at rest and injected directly into target servers on the backend, safeguarding credentials in transit.
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Grid 3: Headers Override */}
                      {reqSubTab === 'headers' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Custom Request Headers Override</span>
                            <button
                              onClick={handleAddHeaderRow}
                              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Header</span>
                            </button>
                          </div>

                          <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/40">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-zinc-900 bg-zinc-950/80 text-zinc-500 font-bold">
                                  <th className="px-4 py-2.5 w-1/4">Key Override</th>
                                  <th className="px-4 py-2.5 w-1/3">Value Override</th>
                                  <th className="px-4 py-2.5">Description</th>
                                  <th className="px-4 py-2.5 w-16 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeTab.headers.map((h, idx) => (
                                  <tr key={idx} className="border-b border-zinc-900 hover:bg-zinc-900/10">
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        placeholder="x-header"
                                        value={h.key}
                                        onChange={(e) => handleHeaderChange(idx, 'key', e.target.value)}
                                        className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-zinc-850 focus:border-cyan-500/50 focus:bg-zinc-950 focus:outline-none font-mono text-[11px] text-zinc-200"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        placeholder="override-value"
                                        value={h.value}
                                        onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                                        className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-zinc-850 focus:border-cyan-500/50 focus:bg-zinc-950 focus:outline-none font-mono text-[11px] text-zinc-200"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        placeholder="Header notes"
                                        value={h.description || ''}
                                        onChange={(e) => handleHeaderChange(idx, 'description', e.target.value)}
                                        className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-zinc-850 focus:border-cyan-500/50 focus:bg-zinc-950 focus:outline-none text-[11px] text-zinc-350"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        onClick={() => handleRemoveHeaderRow(idx)}
                                        className="p-1 text-zinc-550 hover:text-red-400 hover:bg-zinc-900 rounded transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {activeTab.headers.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="text-center py-6 text-zinc-650 italic">
                                      No headers overridden. Core gateway credentials (decrypted on proxy) are injected automatically.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Grid 4: Body Textbox */}
                      {reqSubTab === 'body' && (
                        <div className="space-y-3 flex-1 flex flex-col min-h-[160px]">
                          <div className="flex items-center justify-between select-none">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">JSON Body Payload</span>
                              {activeTab.body.trim() !== '' && (() => {
                                try {
                                  JSON.parse(activeTab.body);
                                  return <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800/30">JSON Verified</span>;
                                } catch (_) {
                                  return <span className="text-[9px] px-1.5 py-0.2 bg-red-950 text-red-400 rounded-full border border-red-800/30">JSON Syntax Error</span>;
                                }
                              })()}
                            </div>
                            {activeTab.body.trim() !== '' && (
                              <button
                                onClick={handleFormatBodyJson}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                              >
                                Format Pretty
                              </button>
                            )}
                          </div>

                          <textarea
                            value={activeTab.body}
                            onChange={(e) => updateActiveTab({ body: e.target.value })}
                            placeholder={`{\n  "field": "value"\n}`}
                            className="w-full flex-1 min-h-[100px] bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all duration-200 resize-none"
                          />
                        </div>
                      )}

                      {/* Grid 5: Specs Docs */}
                      {reqSubTab === 'docs' && (
                        <div className="space-y-4 text-xs leading-relaxed text-zinc-350">
                          {(() => {
                            const docs = getEndpointDocs(activeTab.gatewayId, activeTab.path, activeTab.method);
                            if (!docs) {
                              return (
                                <div className="text-center py-6 text-zinc-650 italic">
                                  No OpenAPI specification logs cached for this connection path.
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-4">
                                <div className="flex items-start justify-between border-b border-zinc-900 pb-3">
                                  {isEditingDocs ? (
                                    <div className="space-y-3 w-full mr-4">
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block">Endpoint Summary</label>
                                        <input
                                          type="text"
                                          value={editDocsSummary}
                                          onChange={(e) => setEditDocsSummary(e.target.value)}
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block">Detailed Tool Description</label>
                                        <textarea
                                          value={editDocsDescription}
                                          onChange={(e) => setEditDocsDescription(e.target.value)}
                                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all h-16 resize-none leading-relaxed"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <h3 className="text-sm font-bold text-white tracking-wide">{docs.summary}</h3>
                                      {docs.description && <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{docs.description}</p>}
                                    </div>
                                  )}
                                  
                                  <button
                                    onClick={() => toggleEditDocsMode(docs)}
                                    className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                                      isEditingDocs
                                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                                        : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/20'
                                    }`}
                                  >
                                    <Settings className="w-3.5 h-3.5" />
                                    <span>{isEditingDocs ? 'Cancel Edit' : 'Edit Docs'}</span>
                                  </button>
                                </div>

                                {docs.parameters && docs.parameters.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Query / Path parameters</span>
                                    <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/40">
                                      <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                          <tr className="bg-zinc-950/80 border-b border-zinc-900 text-zinc-550 font-bold">
                                            <th className="px-3 py-2 w-1/4">Name</th>
                                            <th className="px-3 py-2 w-16">In</th>
                                            <th className="px-3 py-2 w-16">Type</th>
                                            <th className="px-3 py-2 w-16">Required</th>
                                            <th className="px-3 py-2">Description</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(isEditingDocs ? editDocsParameters : (docs.parameters || [])).map((param: any, pidx: number) => (
                                            <tr key={pidx} className="border-b border-zinc-900 hover:bg-zinc-900/5">
                                              <td className="px-3 py-2 font-mono text-[11px] text-cyan-400 font-bold">
                                                {isEditingDocs ? (
                                                  <input
                                                    type="text"
                                                    value={param.name ?? ''}
                                                    onChange={(e) => {
                                                      const updated = [...editDocsParameters];
                                                      updated[pidx] = { ...updated[pidx], name: e.target.value };
                                                      setEditDocsParameters(updated);
                                                    }}
                                                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-[11px] text-cyan-455 font-bold outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
                                                  />
                                                ) : (
                                                  param.name
                                                )}
                                              </td>
                                              <td className="px-3 py-2 font-mono text-[10px] text-zinc-400">
                                                {isEditingDocs ? (
                                                  <select
                                                    value={param.in ?? 'query'}
                                                    onChange={(e) => {
                                                      const updated = [...editDocsParameters];
                                                      updated[pidx] = { ...updated[pidx], in: e.target.value };
                                                      setEditDocsParameters(updated);
                                                    }}
                                                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-1 px-1.5 py-1 text-[11px] text-zinc-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
                                                  >
                                                    <option value="query">query</option>
                                                    <option value="path">path</option>
                                                    <option value="header">header</option>
                                                    <option value="cookie">cookie</option>
                                                  </select>
                                                ) : (
                                                  param.in
                                                )}
                                              </td>
                                              <td className="px-3 py-2 font-mono text-[10px] text-zinc-400">
                                                {isEditingDocs ? (
                                                  <select
                                                    value={param.schema?.type || param.type || 'string'}
                                                    onChange={(e) => {
                                                      const updated = [...editDocsParameters];
                                                      const newType = e.target.value;
                                                      const schema = updated[pidx].schema ? { ...updated[pidx].schema, type: newType } : { type: newType };
                                                      updated[pidx] = { ...updated[pidx], type: newType, schema };
                                                      setEditDocsParameters(updated);
                                                    }}
                                                    className="w-full bg-zinc-900 border border-zinc-850 rounded px-1 px-1.5 py-1 text-[11px] text-zinc-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
                                                  >
                                                    <option value="string">string</option>
                                                    <option value="number">number</option>
                                                    <option value="boolean">boolean</option>
                                                    <option value="integer">integer</option>
                                                    <option value="array">array</option>
                                                    <option value="object">object</option>
                                                  </select>
                                                ) : (
                                                  param.schema?.type || param.type || 'string'
                                                )}
                                              </td>
                                              <td className="px-3 py-2">
                                                {isEditingDocs ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const updated = [...editDocsParameters];
                                                      updated[pidx] = { ...updated[pidx], required: !updated[pidx].required };
                                                      setEditDocsParameters(updated);
                                                    }}
                                                    className={`text-[9px] px-2 py-0.5 rounded font-extrabold cursor-pointer transition-all border ${
                                                      param.required
                                                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                                                        : 'text-zinc-500 bg-zinc-900 border-zinc-800 hover:text-zinc-300'
                                                    }`}
                                                  >
                                                    {param.required ? 'YES' : 'NO'}
                                                  </button>
                                                ) : (
                                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${param.required ? 'text-amber-400 bg-amber-500/5' : 'text-zinc-650 bg-zinc-950'}`}>
                                                    {param.required ? 'YES' : 'NO'}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-zinc-455">
                                                {isEditingDocs ? (
                                                  <input
                                                    type="text"
                                                    value={param.description ?? ''}
                                                    onChange={(e) => {
                                                      const updated = [...editDocsParameters];
                                                      updated[pidx] = { ...updated[pidx], description: e.target.value };
                                                      setEditDocsParameters(updated);
                                                    }}
                                                    placeholder="Provide parameter guideline for the LLM..."
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-[11px] text-zinc-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                                  />
                                                ) : (
                                                  param.description || 'No description.'
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {docs.requestBody && docs.requestBody.content?.['application/json']?.schema && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">Expected Request Body properties</span>
                                    <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/40 p-4">
                                      {(() => {
                                        const schema = docs.requestBody.content['application/json'].schema;
                                        if (schema.properties) {
                                          return (
                                            <div className="space-y-3">
                                              <div className="text-[11px] text-zinc-550">
                                                Body Format: <span className="font-mono font-bold text-white">{schema.type || 'object'}</span>
                                              </div>
                                              <div className="grid grid-cols-1 gap-2.5">
                                                {Object.keys(schema.properties).map((propKey) => {
                                                  const prop = schema.properties[propKey];
                                                  const isReq = schema.required?.includes(propKey);
                                                  return (
                                                    <div key={propKey} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-2 bg-zinc-900/30 border border-zinc-900 rounded-lg">
                                                      <span className="font-mono text-xs text-amber-400 font-bold w-1/4 truncate">{propKey}</span>
                                                      <span className="font-mono text-[10px] text-zinc-550 w-16">{prop.type || 'string'}</span>
                                                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded w-12 text-center shrink-0 ${isReq ? 'text-amber-500 bg-amber-500/5 animate-pulse' : 'text-zinc-650'}`}>
                                                        {isReq ? 'Required' : 'Optional'}
                                                      </span>
                                                      <div className="flex-1">
                                                        {isEditingDocs ? (
                                                          <input
                                                            type="text"
                                                            value={editDocsBodyProps[propKey] ?? ''}
                                                            onChange={(e) => {
                                                              setEditDocsBodyProps({
                                                                ...editDocsBodyProps,
                                                                [propKey]: e.target.value
                                                              });
                                                            }}
                                                            placeholder="Provide property guideline for the LLM..."
                                                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-[11px] text-zinc-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                                          />
                                                        ) : (
                                                          <span className="text-[11px] text-zinc-400">{prop.description || 'No property description.'}</span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        }
                                        return <pre className="text-[10px] font-mono text-zinc-450">{JSON.stringify(schema, null, 2)}</pre>;
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Save / Cancel Documentation Action bar */}
                                {isEditingDocs && (
                                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
                                    <button
                                      onClick={() => setIsEditingDocs(false)}
                                      className="px-4 py-2 border border-zinc-800 hover:bg-zinc-850 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleSaveDocs}
                                      disabled={isSavingDocs}
                                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                                    >
                                      {isSavingDocs ? (
                                        <>
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          <span>Saving Documentation...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Save Documentation</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Downstream Response pane */}
                  <div className="border border-zinc-850 rounded-2xl bg-zinc-950/20 backdrop-blur-md overflow-hidden flex flex-col min-h-[300px]">
                    <div className="bg-zinc-950/60 border-b border-zinc-850 px-4 py-2 flex items-center justify-between select-none h-11 shrink-0">
                      <span className="text-xs font-bold text-zinc-300">Downstream Response Pane</span>
                      
                      {activeTab.response && (
                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <span className={`px-2 py-0.5 rounded-lg border font-mono ${
                            activeTab.response!.status >= 200 && activeTab.response!.status < 300
                              ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10'
                              : 'text-red-400 bg-red-500/5 border-red-500/10'
                          }`}>
                            {activeTab.response!.status} {activeTab.response!.statusText}
                          </span>
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Clock className="w-3.5 h-3.5 text-zinc-550" />
                            {activeTab.response!.latencyMs} ms
                          </span>
                          <span className="flex items-center gap-1 text-zinc-400">
                            <FileText className="w-3.5 h-3.5 text-zinc-550" />
                            {formatSize(activeTab.response!.sizeBytes)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col p-5 overflow-y-auto">
                      {activeTab.isLoading ? (
                        /* Spinner Loader */
                        <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-3">
                          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                          <div className="space-y-0.5 text-center">
                            <p className="text-xs font-bold text-zinc-200 animate-pulse">Relaying request downstream...</p>
                            <p className="text-[10px] text-zinc-500">Injecting encrypted key parameters and loading JSON payloads...</p>
                          </div>
                        </div>
                      ) : activeTab.response ? (
                        /* Live response received */
                        <div className="space-y-4 flex-1 flex flex-col min-h-0">
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 select-none shrink-0">
                            <div className="flex items-center gap-1.5">
                              {(['body', 'headers', 'toon'] as const).map((rTab) => {
                                if (rTab === 'toon' && !activeTab.response!.data) return null;
                                return (
                                  <button
                                    key={rTab}
                                    onClick={() => setResSubTab(rTab)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                                      resSubTab === rTab
                                        ? 'bg-zinc-900 text-cyan-400 border border-zinc-800'
                                        : 'text-zinc-550 hover:text-zinc-300'
                                    }`}
                                  >
                                    {rTab === 'toon' ? 'TOON Compression' : rTab === 'body' ? 'Response Body' : rTab}
                                  </button>
                                );
                              })}
                            </div>
                            
                            {resSubTab === 'body' && (
                              <button
                                onClick={() => {
                                  const text = typeof activeTab.response!.data === 'string'
                                    ? activeTab.response!.data
                                    : JSON.stringify(activeTab.response!.data, null, 2);
                                  navigator.clipboard.writeText(text);
                                  alert('Response payload copied!');
                                }}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] text-zinc-400 hover:text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Response</span>
                              </button>
                            )}
                          </div>

                          {/* Pretty JSON Response Body */}
                          {resSubTab === 'body' && (
                            <pre className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 overflow-auto font-mono text-[11px] text-emerald-400 leading-relaxed max-h-[300px] flex-1">
                              {typeof activeTab.response!.data === 'string'
                                ? activeTab.response!.data
                                : JSON.stringify(activeTab.response!.data, null, 2)}
                            </pre>
                          )}

                          {/* Response Headers */}
                          {resSubTab === 'headers' && (
                            <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/40 text-xs flex-1 max-h-[300px] overflow-y-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-zinc-950/80 border-b border-zinc-900 text-zinc-550 font-bold">
                                    <th className="px-4 py-2.5 w-1/3">Header Name</th>
                                    <th className="px-4 py-2.5">Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.keys(activeTab.response!.headers || {}).map((hKey) => (
                                    <tr key={hKey} className="border-b border-zinc-900 hover:bg-zinc-900/10 font-mono text-[11px]">
                                      <td className="px-4 py-2 text-zinc-400 font-semibold">{hKey}</td>
                                      <td className="px-4 py-2 text-zinc-300 break-all">{activeTab.response!.headers[hKey]}</td>
                                    </tr>
                                  ))}
                                  {Object.keys(activeTab.response!.headers || {}).length === 0 && (
                                    <tr>
                                      <td colSpan={2} className="text-center py-6 text-zinc-650 italic">
                                        No response headers returned.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Space-Saving TOON format preview */}
                          {resSubTab === 'toon' && (() => {
                            const rawStr = JSON.stringify(activeTab.response!.data || {});
                            const rawBytes = getStringSize(rawStr);
                            const rawTokens = estimateTokens(rawBytes);
                            
                            let toonResult = '';
                            try {
                              toonResult = convertToToon(activeTab.response!.data);
                            } catch (err) {
                              toonResult = 'Serialization error: ' + err;
                            }
                            
                            const toonBytes = getStringSize(toonResult);
                            const toonTokens = estimateTokens(toonBytes);
                            
                            const savingsRatio = rawBytes > 0 ? (rawBytes / toonBytes) : 1;
                            const savingsPercent = rawBytes > 0 ? Math.max(0, Math.round((1 - toonBytes / rawBytes) * 100)) : 0;

                            return (
                              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                {/* Token savings analysis cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                                  
                                  {/* Original JSON */}
                                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 flex flex-col justify-between">
                                    <span className="text-[8px] uppercase tracking-wider text-zinc-550 font-extrabold block">Original JSON Format</span>
                                    <span className="text-zinc-400 font-extrabold text-sm block mt-1">{formatSize(rawBytes)}</span>
                                    <span className="text-zinc-655 font-mono text-[9px] block">≈ {rawTokens.toLocaleString()} tokens</span>
                                  </div>

                                  {/* TOON Serialization */}
                                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 ring-1 ring-emerald-500/20 flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] uppercase tracking-wider text-emerald-400/80 font-extrabold block">TOON Serialization</span>
                                    <span className="text-emerald-305 font-extrabold text-sm block mt-1">{formatSize(toonBytes)}</span>
                                    <span className="text-emerald-600 font-mono text-[9px] block">≈ {toonTokens.toLocaleString()} tokens</span>
                                  </div>

                                  {/* Token savings ratio */}
                                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 ring-1 ring-cyan-500/20 flex flex-col justify-between relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-cyan-500" />
                                    <span className="text-[8px] uppercase tracking-wider text-cyan-400/80 font-extrabold block">Token savings ratio</span>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 font-black text-sm block mt-1">
                                      {savingsPercent}% Savings
                                    </span>
                                    <span className="text-cyan-600 font-mono text-[9px] block">≈ {savingsRatio.toFixed(1)}x space efficiency</span>
                                  </div>

                                </div>

                                {/* Pretty TOON format view */}
                                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                                  <div className="flex items-center justify-between shrink-0">
                                    <span className="text-[9px] uppercase tracking-wider text-zinc-550 font-bold">Tabular Notation Compression Output</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(toonResult);
                                        alert('TOON serialized payload copied!');
                                      }}
                                      className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[9px] text-zinc-400 hover:text-white rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3 h-3" />
                                      <span>Copy TOON</span>
                                    </button>
                                  </div>
                                  <pre className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 overflow-auto font-mono text-[11px] text-cyan-400 max-h-[160px] leading-relaxed flex-1">
                                    {toonResult}
                                  </pre>
                                </div>

                                <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl text-[10px] text-zinc-500 leading-relaxed flex items-start gap-2 shrink-0">
                                  <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
                                  <span>
                                    💡 <strong>Token savings insight:</strong> Tabular Object-Oriented Notation (TOON) compresses standard raw JSON response feeds (by stripping brackets, quotation bounds, nesting structures, and key paths) into compact lists, helping to conserve context counts by up to 90%.
                                  </span>
                                </div>
                              </div>
                            );
                          })()}

                        </div>
                      ) : (
                        /* Blank Slate */
                        <div className="flex-1 flex flex-col items-center justify-center py-16 text-zinc-650 text-xs space-y-4 select-none">
                          <Terminal className="w-10 h-10 text-zinc-800 animate-pulse shrink-0" />
                          <div className="text-center space-y-1">
                            <p className="font-bold text-zinc-550">Response Console Offline</p>
                            <p className="text-[10px] max-w-sm text-zinc-600">Enter a target address, body payloads, or headers override above, then click "Send" to trigger a functional REST execution Proxy relay.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )
            )}

          </div>
        </main>

      </div>

      <TraceparentModal />
    </div>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
