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
  ChevronLeft
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
  paths: PathConfig[];
  credentialKeyName?: string;
  totalRequests: number;
  averageCompressionRatio: number;
  createdAt: string;
}

interface RequestLog {
  timestamp: string;
  gatewayName: string;
  method: string;
  path: string;
  status: number;
  originalSize: number;
  prunedSize: number;
  compressionRatio: number;
}

interface Analytics {
  totalRequests: number;
  averageCompressionRatio: number;
  activeConnectionsCount: number;
  liveRequestTracker: RequestLog[];
}

export default function Dashboard() {
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

  // Manual API Designer state
  const [connectMethod, setConnectMethod] = useState<'url' | 'manual'>('url');
  const [baseUrl, setBaseUrl] = useState('');
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

        payload = {
          ...payload,
          isManual: true,
          openApiUrl: baseUrl || 'manual',
          specUrl: baseUrl || 'manual',
          rawSpec: spec,
          paths: pathsForConfig
        };
      } else {
        payload = {
          ...payload,
          openApiUrl: apiUrl,
          paths: availablePaths
        };
      }

      if (!isDemoMode) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (sessionApiKey) {
          headers['Authorization'] = `Bearer ${sessionApiKey}`;
        }
        const res = await fetch(`${BACKEND_URL}/api/gateways`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to host gateway.');
        }

        const data = await res.json();
        const createdApi = data.connectedApi || data.gateway;
        const newId = createdApi ? (createdApi._id || createdApi.id) : null;
        setNewGatewayId(newId);
        fetchData();
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
  };

  // Routing guard - if not logged in, render the premium glassmorphic Auth views
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden px-4">
        {/* Premium Ambient Background Glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none translate-y-1/3"></div>

        {/* Top Logo */}
        <div className="mb-8 text-center z-10">
          <div className="inline-flex bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl text-cyan-400 mb-4 shadow-xl relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <Cpu className="w-8 h-8 relative z-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Omni MCP Gateway
          </h1>
          <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase mt-1">Enterprise API Federation Platform</p>
        </div>

        {/* Central Glass Box */}
        <div className="w-full max-w-md bg-zinc-950/45 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative z-10 overflow-hidden">
          {/* Subtle gradient highlights */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/30 via-emerald-500/30 to-transparent"></div>

          {authScreen === 'otp' ? (
            /* SEGMENTED OTP SCREEN */
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

              {/* Dev OTP Box Helper */}
              {devOtpCode && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center text-xs text-emerald-400 font-semibold select-all">
                  Sandbox Testing OTP: <span className="font-mono text-sm tracking-widest text-emerald-300 font-bold ml-1">{devOtpCode}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* Segmented Inputs */}
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
                  onClick={() => {
                    setAuthScreen('login');
                    setAuthError('');
                  }}
                  className="text-zinc-400 hover:text-zinc-300 transition flex items-center gap-1 cursor-pointer font-medium"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </div>
            </div>
          ) : authScreen === 'signup' ? (
            /* SIGNUP SCREEN */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-zinc-100">Create Account</h2>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Join the federated MCP ecosystem with secure credentials.
                </p>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
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
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Secret Password</label>
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

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
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
                      <Plus className="w-4 h-4" />
                      Sign Up & Issue API Key
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-3 border-t border-zinc-900">
                <p className="text-xs text-zinc-400">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setAuthScreen('login');
                      setAuthError('');
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition cursor-pointer"
                  >
                    Login
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* LOGIN SCREEN */
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
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
                  </div>
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
                    onClick={() => {
                      setAuthScreen('signup');
                      setAuthError('');
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition cursor-pointer"
                  >
                    Register
                  </button>
                </p>
              </div>

              {isDemoMode && (
                <div className="border-t border-zinc-900/60 pt-4 text-center">
                  <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl text-center leading-normal mb-3">
                    <strong>Sandbox Demo Mode Active:</strong> Use credentials:<br/>
                    <span className="font-mono font-bold text-amber-300">developer@omnimcp.local</span> / <span className="font-mono font-bold text-amber-300">developer123</span><br/>
                    with OTP <span className="font-mono font-bold text-amber-300">123456</span> to access.
                  </div>
                  <button
                    onClick={() => {
                      const mockUser = { id: 'sandbox_user', email: 'sandbox@omnimcp.local', isVerified: true };
                      const mockApiKey = 'omni_gt_developer_key_123456';
                      setUser(mockUser);
                      setSessionApiKey(mockApiKey);
                      localStorage.setItem('omni_mcp_session', JSON.stringify({
                        user: mockUser,
                        apiKey: mockApiKey
                      }));
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    Quick Bypass (Demo Entry)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

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
                  setActiveTab('dashboard');
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
                  setActiveTab('connect');
                  resetWizard();
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
                      setActiveTab('connect');
                      resetWizard();
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
                      onClick={() => setActiveTab('connect')}
                      className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold rounded-xl text-cyan-400 transition duration-200 cursor-pointer"
                    >
                      Connect New API Spec
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {gateways.map((gt) => {
                      const id = gt.id || gt._id || 'mock';
                      const gatewayUrl = `${BACKEND_URL}/api/mcp/sse?apiKey=omni_gt_developer_key_123456`;
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
                              <p className="text-[10px] text-zinc-400 max-w-[200px] truncate" title={gt.openApiUrl}>
                                {gt.openApiUrl}
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
                              Active Endpoints ({gt.paths?.filter(p => p.isEnabled).length || 0})
                            </span>
                            <div className="flex flex-wrap gap-1 max-h-[50px] overflow-y-auto custom-scrollbar">
                              {gt.paths?.map((p, i) => (
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
                    analytics.liveRequestTracker.map((log, idx) => {
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
                          className="border border-zinc-850 bg-zinc-900/10 p-3 rounded-xl space-y-2 flex flex-col hover:border-zinc-800 transition duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${methodColors[log.method] || 'bg-zinc-800 text-zinc-400'}`}>
                              {log.method}
                            </span>
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
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Screen 2: Connect New API Wizard Tab */}
        {activeTab === 'connect' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold tracking-tight text-white">Connect & Host New API Gateway</h2>
              <p className="text-xs text-zinc-400">Bridge any third-party JSON OpenAPI specification instantly to standard MCP model tools.</p>
            </div>

            {/* Wizard Steps indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase border-b border-zinc-850 pb-3">
              <span className={wizardStep === 1 ? 'text-cyan-400 font-bold' : 'text-zinc-400'}>
                1. Validate Endpoint Spec
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className={wizardStep === 2 ? 'text-cyan-400 font-bold' : 'text-zinc-400'}>
                2. Select Paths & Build Gateway
              </span>
            </div>

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
                        : 'text-zinc-205'
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
                        : 'text-zinc-205'
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
                          {manualEndpoints.map((ep, epIdx) => (
                            <div key={epIdx} className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 md:p-5 space-y-4 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = manualEndpoints.filter((_, idx) => idx !== epIdx);
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
                        disabled={!gatewayName || !baseUrl || manualEndpoints.some(ep => !ep.path)}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all duration-300 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <span>Connect & Generate Tools</span>
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
                          placeholder="••••••••••••••"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm px-4 py-2.5 rounded-xl transition duration-200 outline-none text-white font-medium"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    Security Baseline: Credentials are encrypted via AES-256-GCM both in-transit and at-rest.
                  </p>
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
                    {availablePaths.map((p, idx) => {
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
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> Host Gateway
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
                        {availablePaths.filter(p => p.isEnabled).length} tools exposed to LLM client.
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Hosted MCP Gateway URL</span>
                      <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-850 px-3 py-2 rounded-xl">
                        <span className="text-[10px] font-mono text-cyan-400 truncate flex-1 select-all">
                          {`${BACKEND_URL}/api/mcp/sse?apiKey=omni_gt_developer_key_123456`}
                        </span>
                        <button
                          onClick={() => copyToClipboard(`${BACKEND_URL}/api/mcp/sse?apiKey=omni_gt_developer_key_123456`, 'mcp-url')}
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
                      setActiveTab('dashboard');
                      setNewGatewayId(null);
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

      </main>

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
