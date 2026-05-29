'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const DashboardContext = createContext<any>(null);

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {

  const [activeTab, setActiveTab] = useState<'dashboard' | 'connect'>('dashboard');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalRequests: 1584,
    averageCompressionRatio: 4.15,
    activeConnectionsCount: 0,
    liveRequestTracker: []
  });

  // User Session & Auth state
  const [user, setUser] = useState<{ id: string; email: string; isVerified: boolean } | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'otp'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(''));
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [sessionApiKey, setSessionApiKey] = useState<string | null>(null);

  // Wizard state
  const [apiUrl, setApiUrl] = useState('');
  const [gatewayName, setGatewayName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [availablePaths, setAvailablePaths] = useState<PathConfig[]>([]);
  const [credentialKeyName, setCredentialKeyName] = useState('Authorization');
  const [credentialValue, setCredentialValue] = useState('');
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [newGatewayId, setNewGatewayId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<any | null>(null);
  const [traceTab, setTraceTab] = useState<'request' | 'raw_response' | 'optimized_response' | 'toon_response'>('request');
  const [enableToonCompression, setEnableToonCompression] = useState<boolean>(false);
  const [editingGateway, setEditingGateway] = useState<Gateway | null>(null);

  // Manual API Designer state
  const [connectMethod, setConnectMethod] = useState<'url' | 'manual'>('url');
  const [baseUrl, setBaseUrl] = useState('');
  const [customHeadersList, setCustomHeadersList] = useState<{ key: string; value: string }[]>([
    { key: 'X-Rapidapi-Host', value: 'imdb232.p.rapidapi.com' }
  ]);
  const [manualEndpoints, setManualEndpoints] = useState<any[]>([
    {
      path: '/current',
      method: 'get',
      description: 'Get current information',
      parameters: [
        { name: 'city', in: 'query', type: 'string', required: true, description: 'Target city name' }
      ]
    }
  ]);

  const synthesizeOpenApiSpec = (name: string, urlBase: string, endpoints: any[]) => {
    const paths: Record<string, any> = {};

    endpoints.forEach((ep) => {
      const pathKey = ep.path.startsWith('/') ? ep.path : `/${ep.path}`;
      const methodKey = ep.method.toLowerCase();
      
      const parameters: any[] = [];
      const bodyProperties: Record<string, any> = {};
      const bodyRequired: string[] = [];

      ep.parameters.forEach((param: any) => {
        if (param.in === 'body') {
          bodyProperties[param.name] = {
            type: param.type || 'string',
            description: param.description || ''
          };
          if (param.required) {
            bodyRequired.push(param.name);
          }
        } else {
          parameters.push({
            name: param.name,
            in: param.in,
            required: param.required,
            schema: { type: param.type || 'string' },
            description: param.description || ''
          });
        }
      });

      const operation: any = {
        summary: ep.description || `Execute ${methodKey.toUpperCase()} ${pathKey}`,
        responses: {
          '200': {
            description: 'Successful response'
          }
        }
      };

      if (parameters.length > 0) {
        operation.parameters = parameters;
      }

      if (Object.keys(bodyProperties).length > 0) {
        operation.requestBody = {
          required: bodyRequired.length > 0,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: bodyProperties,
                required: bodyRequired.length > 0 ? bodyRequired : undefined
              }
            }
          }
        };
      }

      if (!paths[pathKey]) {
        paths[pathKey] = {};
      }
      paths[pathKey][methodKey] = operation;
    });

    return {
      openapi: '3.0.0',
      info: {
        title: name,
        version: '1.0.0',
        description: `Manually designed API connection for ${name}`
      },
      servers: [
        {
          url: urlBase || 'http://localhost'
        }
      ],
      paths
    };
  };

  // Simulation status
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  // API base URL
  const BACKEND_URL = 'http://localhost:3001';

  // Load and refresh data
  const fetchData = async (showSilently = false) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (sessionApiKey) {
        headers['Authorization'] = `Bearer ${sessionApiKey}`;
      }

      const gatewaysRes = await fetch(`${BACKEND_URL}/api/gateways`, {
        credentials: 'include',
        headers
      });
      if (!gatewaysRes.ok) throw new Error('Backend error');
      const gatewaysData = await gatewaysRes.json();
      setGateways(gatewaysData);

      const analyticsRes = await fetch(`${BACKEND_URL}/api/analytics`, {
        credentials: 'include',
        headers
      });
      if (!analyticsRes.ok) throw new Error('Backend error');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      setIsBackendConnected(true);
      setIsDemoMode(false);
    } catch (err) {
      setIsBackendConnected(false);
      setIsDemoMode(true);
      // Backend is down: load from LocalStorage or initialize with beautiful demo data
      loadDemoData();
    }
  };

  const loadDemoData = () => {
    const savedGateways = localStorage.getItem('omni_mcp_gateways');
    let localGateways: Gateway[] = [];

    if (savedGateways) {
      localGateways = JSON.parse(savedGateways);
    } else {
      // Default dummy gateways
      localGateways = [
        {
          id: 'gt_stripe',
          name: 'Stripe Core API',
          openApiUrl: 'https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json',
          paths: [
            { path: '/v1/charges', method: 'get', isEnabled: true, isWritable: false },
            { path: '/v1/charges', method: 'post', isEnabled: true, isWritable: true },
            { path: '/v1/customers', method: 'get', isEnabled: true, isWritable: false },
            { path: '/v1/refunds', method: 'post', isEnabled: false, isWritable: true }
          ],
          credentialKeyName: 'Authorization',
          totalRequests: 942,
          averageCompressionRatio: 4.22,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
        },
        {
          id: 'gt_github',
          name: 'GitHub REST API',
          openApiUrl: 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json',
          paths: [
            { path: '/repos/{owner}/{repo}', method: 'get', isEnabled: true, isWritable: false },
            { path: '/repos/{owner}/{repo}/issues', method: 'get', isEnabled: true, isWritable: false },
            { path: '/repos/{owner}/{repo}/issues', method: 'post', isEnabled: true, isWritable: true }
          ],
          credentialKeyName: 'Authorization',
          totalRequests: 642,
          averageCompressionRatio: 4.08,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        }
      ];
      localStorage.setItem('omni_mcp_gateways', JSON.stringify(localGateways));
    }

    setGateways(localGateways);

    const savedLogs = localStorage.getItem('omni_mcp_logs');
    let localLogs: RequestLog[] = [];

    if (savedLogs) {
      localLogs = JSON.parse(savedLogs);
    } else {
      localLogs = [
        {
          timestamp: new Date(Date.now() - 30000).toISOString(),
          gatewayName: 'Stripe Core API',
          method: 'GET',
          path: '/v1/charges',
          status: 200,
          originalSize: 45000,
          prunedSize: 10800,
          compressionRatio: 4.16
        },
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          gatewayName: 'GitHub REST API',
          method: 'GET',
          path: '/repos/{owner}/{repo}/issues',
          status: 200,
          originalSize: 92000,
          prunedSize: 22000,
          compressionRatio: 4.18
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          gatewayName: 'Stripe Core API',
          method: 'POST',
          path: '/v1/charges',
          status: 200,
          originalSize: 8400,
          prunedSize: 2100,
          compressionRatio: 4.0
        }
      ];
      localStorage.setItem('omni_mcp_logs', JSON.stringify(localLogs));
    }

    // Compute sums for demo dashboard
    let totalReqs = 1584;
    let ratioSum = 0;
    localGateways.forEach(g => {
      totalReqs += g.totalRequests;
      ratioSum += g.averageCompressionRatio;
    });

    const avgRatio = localGateways.length > 0 ? Number((ratioSum / localGateways.length).toFixed(2)) : 4.15;

    setAnalytics({
      totalRequests: totalReqs,
      averageCompressionRatio: avgRatio,
      activeConnectionsCount: localGateways.length,
      liveRequestTracker: localLogs
    });
  };

  // Session Check Guard on Mount
  const checkSession = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSessionApiKey(data.apiKey || data.user.apiKey);
        setIsBackendConnected(true);
        setIsDemoMode(false);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.log('Backend offline or network error, checking local storage session');
      const savedSession = localStorage.getItem('omni_mcp_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        setUser(parsed.user);
        setSessionApiKey(parsed.apiKey);
      }
      setIsBackendConnected(false);
      setIsDemoMode(true);
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth Operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    setAuthLoading(true);
    setAuthError('');
    setDevOtpCode(null);

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
            setAuthScreen('otp');
            setOtpResendTimer(60);
            if (data.otp) {
              setDevOtpCode(data.otp);
            }
            return;
          }
          throw new Error(data.error || 'Login failed.');
        }

        if (data.otpRequired) {
          setAuthScreen('otp');
          setOtpResendTimer(60);
          if (data.otp) {
            setDevOtpCode(data.otp);
          }
        } else {
          setUser(data.user);
          setSessionApiKey(data.apiKey || data.user.apiKey);
        }
      } else {
        // Local Sandbox simulation
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (authEmail === 'developer@omnimcp.local' && authPassword === 'developer123') {
          setAuthScreen('otp');
          setOtpResendTimer(60);
          setDevOtpCode('123456');
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !authConfirmPassword) return;

    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setDevOtpCode(null);

    try {
      if (!isDemoMode) {
        const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
          credentials: 'include'
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed.');

        if (data.otpRequired || (data.user && !data.user.isVerified)) {
          setAuthScreen('otp');
          setOtpResendTimer(60);
          if (data.otp) {
            setDevOtpCode(data.otp);
          }
        } else {
          setUser(data.user);
          setSessionApiKey(data.apiKey);
        }
      } else {
        // Sandbox signup simulation
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAuthScreen('otp');
        setOtpResendTimer(60);
        setDevOtpCode('123456');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during registration.');
    } finally {
      setAuthLoading(false);
    }
  };

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

        // Successfully authenticated
        setUser(data.user);
        setSessionApiKey(data.apiKey || data.user?.apiKey);
      } else {
        // Sandbox OTP verification
        await new Promise(resolve => setTimeout(resolve, 800));
        if (otp === '123456') {
          const mockUser = { id: 'dev_user_1', email: authEmail, isVerified: true };
          const mockApiKey = 'omni_gt_developer_key_123456';
          setUser(mockUser);
          setSessionApiKey(mockApiKey);
          localStorage.setItem('omni_mcp_session', JSON.stringify({ user: mockUser, apiKey: mockApiKey }));
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

  const handleLogout = async () => {
    try {
      if (!isDemoMode) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setSessionApiKey(null);
      setAuthScreen('login');
      setAuthEmail('');
      setAuthPassword('');
      setAuthConfirmPassword('');
      setOtpCode(Array(6).fill(''));
      localStorage.removeItem('omni_mcp_session');
    }
  };

  // OTP Shift focus utilities
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);

    // Auto-focus next input
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

  // OTP resend countdown trigger
  useEffect(() => {
    if (otpResendTimer > 0) {
      const timer = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendTimer]);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user || isDemoMode) {
      fetchData();
      const interval = setInterval(() => fetchData(true), 8005);
      return () => clearInterval(interval);
    }
  }, [user, isDemoMode]);

  // Handle URL Validation
  const handleValidateUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiUrl) return;

    setIsValidating(true);
    setValidationError('');

    try {
      if (!isDemoMode) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (sessionApiKey) {
          headers['Authorization'] = `Bearer ${sessionApiKey}`;
        }
        const res = await fetch(`${BACKEND_URL}/api/gateways/validate`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ url: apiUrl })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to parse specification.');
        }

        const data = await res.json();
        const title = data.spec?.info?.title || data.title || 'Connected Gateway';
        setGatewayName(title);
        setAvailablePaths(data.paths || []);
        setWizardStep(2);
      } else {
        // Simulated validation for demo mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let title = 'Custom API';
        if (apiUrl.includes('petstore')) title = 'Swagger Petstore';
        else if (apiUrl.includes('weather')) title = 'Weather Stack API';
        else if (apiUrl.includes('stripe')) title = 'Stripe Payments';
        else if (apiUrl.includes('github')) title = 'GitHub Developer REST';

        const mockPaths: PathConfig[] = [
          { path: '/users', method: 'get', isEnabled: true, isWritable: false },
          { path: '/users', method: 'post', isEnabled: true, isWritable: true },
          { path: '/users/{id}', method: 'get', isEnabled: true, isWritable: false },
          { path: '/users/{id}', method: 'put', isEnabled: true, isWritable: true },
          { path: '/users/{id}', method: 'delete', isEnabled: true, isWritable: true },
          { path: '/transactions', method: 'get', isEnabled: true, isWritable: false },
          { path: '/transactions', method: 'post', isEnabled: true, isWritable: true },
          { path: '/status', method: 'get', isEnabled: true, isWritable: false }
        ];

        setGatewayName(title);
        setAvailablePaths(mockPaths);
        setWizardStep(2);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Unable to load. Ensure it is a valid JSON OpenAPI specification.');
    } finally {
      setIsValidating(false);
    }
  };

  // Toggle paths in grid
  const togglePathEnabled = (index: number) => {
    const updated = [...availablePaths];
    updated[index].isEnabled = !updated[index].isEnabled;
    setAvailablePaths(updated);
  };

  const togglePathWritable = (index: number) => {
    const updated = [...availablePaths];
    updated[index].isWritable = !updated[index].isWritable;
    setAvailablePaths(updated);
  };

  // Handle gateway creation
  const handleCreateGateway = async () => {
    if (!gatewayName) return;

    try {
      let payload: any = {
        name: gatewayName,
        credentialKeyName,
        credentialValue
      };

      if (connectMethod === 'manual') {
        const spec = synthesizeOpenApiSpec(gatewayName, baseUrl, manualEndpoints);
        const pathsForConfig = manualEndpoints.map((ep) => ({
          path: ep.path.startsWith('/') ? ep.path : `/${ep.path}`,
          method: ep.method.toLowerCase(),
          isEnabled: true,
          isWritable: ep.method.toLowerCase() !== 'get'
        }));

        const customHeadersMap: Record<string, string> = {};
        customHeadersList.forEach((h) => {
          if (h.key && h.value) {
            customHeadersMap[h.key] = h.value;
          }
        });

        payload = {
          ...payload,
          isManual: true,
          openApiUrl: baseUrl || 'manual',
          specUrl: baseUrl || 'manual',
          rawSpec: spec,
          paths: pathsForConfig,
          customHeaders: customHeadersMap
        };
      } else {
        payload = {
          ...payload,
          openApiUrl: apiUrl,
          paths: availablePaths
        };
      }

      if (editingGateway) {
        payload = {
          ...payload,
          enableToonCompression
        };
      }

      if (!isDemoMode) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (sessionApiKey) {
          headers['Authorization'] = `Bearer ${sessionApiKey}`;
        }
        
        const isEditing = !!editingGateway;
        const targetUrl = isEditing 
          ? `${BACKEND_URL}/api/gateways/${editingGateway._id || editingGateway.id}`
          : `${BACKEND_URL}/api/gateways`;

        const res = await fetch(targetUrl, {
          method: isEditing ? 'PUT' : 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Failed to ${isEditing ? 'update' : 'host'} gateway.`);
        }

        const data = await res.json();
        alert(isEditing ? 'Connection successfully updated!' : 'Connection successfully hosted!');
        
        const createdApi = data.connectedApi || data.gateway;
        const newId = createdApi ? (createdApi._id || createdApi.id) : null;
        setNewGatewayId(newId);
        
        resetWizard();
        setActiveTab('dashboard');
        fetchData();
      } else {
        if (editingGateway) {
          const updatedGts = gateways.map(g => {
            const match = g.id === editingGateway.id || g._id === editingGateway.id || (editingGateway._id && g._id === editingGateway._id);
            if (match) {
              return {
                ...g,
                name: gatewayName,
                openApiUrl: connectMethod === 'manual' ? (baseUrl || 'manual') : apiUrl,
                paths: connectMethod === 'manual'
                  ? manualEndpoints.map(ep => ({ path: ep.path, method: ep.method, isEnabled: true, isWritable: ep.method !== 'get' }))
                  : availablePaths,
                credentialKeyName: credentialKeyName || undefined
              };
            }
            return g;
          });
          localStorage.setItem('omni_mcp_gateways', JSON.stringify(updatedGts));
          setGateways(updatedGts);
          setNewGatewayId(editingGateway.id || editingGateway._id || null);
          alert('Simulated Connection successfully updated!');
          resetWizard();
          setActiveTab('dashboard');
        } else {
          // Simulated create
          const newId = 'gt_' + Math.random().toString(36).substr(2, 9);
          const newGateway: Gateway = {
            id: newId,
            name: gatewayName,
            openApiUrl: connectMethod === 'manual' ? (baseUrl || 'manual') : apiUrl,
            paths: connectMethod === 'manual'
              ? manualEndpoints.map(ep => ({ path: ep.path, method: ep.method, isEnabled: true, isWritable: ep.method !== 'get' }))
              : availablePaths,
            credentialKeyName: credentialKeyName || undefined,
            totalRequests: 0,
            averageCompressionRatio: 0,
            createdAt: new Date().toISOString()
          };

          const localGts = [newGateway, ...gateways];
          localStorage.setItem('omni_mcp_gateways', JSON.stringify(localGts));
          setGateways(localGts);
          setNewGatewayId(newId);

          // Update analytics counts
          setAnalytics(prev => ({
            ...prev,
            activeConnectionsCount: localGts.length
          }));
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving gateway');
    }
  };

  // Delete gateway
  const handleDeleteGateway = async (id: string) => {
    if (!confirm('Are you sure you want to remove this hosted connection?')) return;

    try {
      if (!isDemoMode) {
        const headers: Record<string, string> = {};
        if (sessionApiKey) {
          headers['Authorization'] = `Bearer ${sessionApiKey}`;
        }
        const res = await fetch(`${BACKEND_URL}/api/gateways/${id}`, {
          method: 'DELETE',
          headers,
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete');
        fetchData();
      } else {
        const filtered = gateways.filter(g => (g.id !== id && g._id !== id));
        localStorage.setItem('omni_mcp_gateways', JSON.stringify(filtered));
        setGateways(filtered);

        setAnalytics(prev => ({
          ...prev,
          activeConnectionsCount: filtered.length
        }));
      }
    } catch (err: any) {
      alert('Failed to delete gateway connection: ' + err.message);
    }
  };

  // Simulate API Request
  const handleSimulateRequest = async (gatewayId: string) => {
    setSimulatingId(gatewayId);
    try {
      if (!isDemoMode) {
        const headers: Record<string, string> = {};
        if (sessionApiKey) {
          headers['Authorization'] = `Bearer ${sessionApiKey}`;
        }
        const res = await fetch(`${BACKEND_URL}/api/gateways/${gatewayId}/simulate`, {
          method: 'POST',
          headers,
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Simulation failed');
        fetchData();
      } else {
        // Simulate local request
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const targetGt = gateways.find(g => g.id === gatewayId || g._id === gatewayId);
        if (!targetGt) return;

        const enabledPaths = targetGt.paths.filter(p => p.isEnabled);
        if (enabledPaths.length === 0) {
          alert('No paths are enabled on this gateway to simulate requests!');
          return;
        }

        const pathConfig = enabledPaths[Math.floor(Math.random() * enabledPaths.length)];
        const originalSize = Math.floor(Math.random() * 80000) + 1500;
        const compressionRatio = Number((Math.random() * 3 + 2.5).toFixed(2));
        const prunedSize = Math.floor(originalSize / compressionRatio);

        // Update target gateway metrics in state
        const updatedGts = gateways.map(g => {
          if (g.id === gatewayId || g._id === gatewayId) {
            const currentTotal = g.totalRequests + 1;
            const currentAvg = g.totalRequests > 0 
              ? Number(((g.averageCompressionRatio * g.totalRequests + compressionRatio) / currentTotal).toFixed(2))
              : compressionRatio;
            return {
              ...g,
              totalRequests: currentTotal,
              averageCompressionRatio: currentAvg
            };
          }
          return g;
        });

        localStorage.setItem('omni_mcp_gateways', JSON.stringify(updatedGts));
        setGateways(updatedGts);

        // Append to logs
        const newLog: RequestLog = {
          timestamp: new Date().toISOString(),
          gatewayName: targetGt.name,
          method: pathConfig.method.toUpperCase(),
          path: pathConfig.path,
          status: 200,
          originalSize,
          prunedSize,
          compressionRatio
        };

        const logs = JSON.parse(localStorage.getItem('omni_mcp_logs') || '[]');
        logs.unshift(newLog);
        const cappedLogs = logs.slice(0, 20);
        localStorage.setItem('omni_mcp_logs', JSON.stringify(cappedLogs));

        // Recompute sums
        let totalReqs = 1584;
        let ratioSum = 0;
        updatedGts.forEach(g => {
          totalReqs += g.totalRequests;
          ratioSum += g.averageCompressionRatio;
        });
        const avgRatio = updatedGts.length > 0 ? Number((ratioSum / updatedGts.length).toFixed(2)) : 4.15;

        setAnalytics({
          totalRequests: totalReqs,
          averageCompressionRatio: avgRatio,
          activeConnectionsCount: updatedGts.length,
          liveRequestTracker: cappedLogs
        });
      }
    } catch (err: any) {
      alert('Failed to process simulation: ' + err.message);
    } finally {
      setSimulatingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetWizard = () => {
    setApiUrl('');
    setGatewayName('');
    setAvailablePaths([]);
    setCredentialValue('');
    setWizardStep(1);
    setNewGatewayId(null);
    setEditingGateway(null);
    setEnableToonCompression(false);
  };

  const handleStartEditGateway = (gt: any) => {
    setEditingGateway(gt);
    
    // Populate basic fields
    setGatewayName(gt.name || '');
    setCredentialKeyName(gt.credentialKeyName || 'Authorization');
    setCredentialValue(''); // Clear to avoid showing asterisk placeholders
    setEnableToonCompression(gt.enableToonCompression || false);

    // Detect if manual OpenAPI specification definition
    const url = gt.specUrl || gt.openApiUrl || '';
    const isManual = gt.isManual || url === 'manual' || !url || !url.startsWith('http');
    if (isManual) {
      setConnectMethod('manual');
      setBaseUrl(url === 'manual' ? '' : url);
      
      // Parse header configurations map
      const customHeaders = gt.customHeaders || {};
      const headersArray = Object.keys(customHeaders).map(key => ({
        key,
        value: customHeaders[key]
      }));
      setCustomHeadersList(headersArray.length > 0 ? headersArray : [{ key: '', value: '' }]);

      // Deconstruct standard OpenAPI specification back into endpoints designer form
      const spec = gt.rawSpec || {};
      const pathsObj = spec.paths || {};
      const endpointsList: any[] = [];

      Object.keys(pathsObj).forEach(path => {
        const methods = pathsObj[path];
        Object.keys(methods).forEach(method => {
          const methodData = methods[method];
          const parameters = methodData.parameters || [];
          
          // Map body variables
          const bodyParams: any[] = [];
          if (methodData.requestBody && methodData.requestBody.content) {
            const jsonContent = methodData.requestBody.content['application/json'];
            if (jsonContent && jsonContent.schema && jsonContent.schema.properties) {
              const props = jsonContent.schema.properties;
              const reqs = jsonContent.schema.required || [];
              Object.keys(props).forEach(name => {
                bodyParams.push({
                  name,
                  in: 'body',
                  type: props[name].type || 'string',
                  required: reqs.includes(name),
                  description: props[name].description || ''
                });
              });
            }
          }

          // Map query/path parameters
          const otherParams = parameters.map((p: any) => ({
            name: p.name,
            in: p.in,
            type: p.schema?.type || 'string',
            required: p.required || false,
            description: p.description || ''
          }));

          endpointsList.push({
            path,
            method: method.toUpperCase(),
            description: methodData.summary || '',
            parameters: [...otherParams, ...bodyParams]
          });
        });
      });

      setManualEndpoints(endpointsList.length > 0 ? endpointsList : [
        {
          path: '/current',
          method: 'GET',
          description: 'Get current information',
          parameters: [
            { name: 'city', in: 'query', type: 'string', required: true, description: 'Target city name' }
          ]
        }
      ]);

      setWizardStep(1); // Manual step
    } else {
      setConnectMethod('url');
      setApiUrl(gt.specUrl || gt.openApiUrl || '');
      setAvailablePaths(gt.paths || []);
      setWizardStep(2); // URL step 2
    }

    // Go to Connect tab
    setActiveTab('connect');
  };

  const pathKey = ''; // helper placeholder, not actually used standalone
  const methodKey = ''; // helper placeholder, not actually used standalone
  const isSimulating = simulatingId !== null;

  return (
    <DashboardContext.Provider value={{
      activeTab, setActiveTab, isBackendConnected, setIsBackendConnected, isDemoMode, setIsDemoMode,
      gateways, setGateways, analytics, setAnalytics, user, setUser,
      authScreen, setAuthScreen, authEmail, setAuthEmail, authPassword, setAuthPassword,
      authConfirmPassword, setAuthConfirmPassword, otpCode, setOtpCode, otpResendTimer, setOtpResendTimer,
      authError, setAuthError, authLoading, setAuthLoading, devOtpCode, setDevOtpCode,
      sessionApiKey, setSessionApiKey, apiUrl, setApiUrl, gatewayName, setGatewayName,
      isValidating, setIsValidating, validationError, setValidationError,
      availablePaths, setAvailablePaths, credentialKeyName, setCredentialKeyName,
      credentialValue, setCredentialValue, wizardStep, setWizardStep, newGatewayId, setNewGatewayId,
      copiedId, setCopiedId, selectedTrace, setSelectedTrace, traceTab, setTraceTab,
      enableToonCompression, setEnableToonCompression, editingGateway, setEditingGateway,
      connectMethod, setConnectMethod, baseUrl, setBaseUrl, customHeadersList, setCustomHeadersList,
      manualEndpoints, setManualEndpoints, synthesizeOpenApiSpec,
      simulatingId, setSimulatingId, isSimulating,
      BACKEND_URL, fetchData, loadDemoData, checkSession,
      handleLogin, handleSignup, handleVerifyOtp, handleResendOtp, handleLogout,
      handleOtpChange, handleOtpKeyDown,
      handleValidateUrl, togglePathEnabled, togglePathWritable,
      handleCreateGateway, handleDeleteGateway, handleSimulateRequest,
      copyToClipboard, resetWizard, handleStartEditGateway,
      pathKey, methodKey
    }}>
      {children}
    </DashboardContext.Provider>
  );
};
