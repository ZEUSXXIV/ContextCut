import { useState, useEffect } from 'react';

export interface IRequestTab {
  id: string;
  gatewayId: string;
  gatewayName: string;
  title: string;
  path: string;
  method: string;
  queryParams: Array<{ key: string; value: string; description?: string }>;
  headers: Array<{ key: string; value: string; description?: string }>;
  body: string;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    latencyMs: number;
    sizeBytes: number;
  };
  isLoading?: boolean;
}

export function useTabs() {
  const [tabs, setTabs] = useState<IRequestTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedTabs = localStorage.getItem('omni_mcp_request_tabs');
      const savedActiveId = localStorage.getItem('omni_mcp_active_tab_id');
      if (savedTabs) {
        setTabs(JSON.parse(savedTabs));
      }
      if (savedActiveId) {
        setActiveTabId(savedActiveId);
      }
    } catch (err) {
      console.error('Failed to load tabs state from localStorage:', err);
    }
  }, []);

  // Save to localStorage on change
  const saveState = (newTabs: IRequestTab[], newActiveId: string) => {
    setTabs(newTabs);
    setActiveTabId(newActiveId);
    try {
      localStorage.setItem('omni_mcp_request_tabs', JSON.stringify(newTabs));
      localStorage.setItem('omni_mcp_active_tab_id', newActiveId);
    } catch (err) {
      console.error('Failed to save tabs state to localStorage:', err);
    }
  };

  const openTab = (
    gatewayId: string,
    gatewayName: string,
    path: string,
    method: string,
    description?: string,
    customHeaders?: Record<string, string>
  ) => {
    const tabId = `${gatewayId}-${method}-${path}`;
    const existing = tabs.find((t) => t.id === tabId);

    if (existing) {
      saveState(tabs, tabId);
      return;
    }

    const initialHeaders = customHeaders
      ? Object.entries(customHeaders).map(([k, v]) => ({
          key: k,
          value: v,
          description: 'Endpoint custom header'
        }))
      : [];

    const cleanTitle = `${method.toUpperCase()} ${path}`;
    const newTab: IRequestTab = {
      id: tabId,
      gatewayId,
      gatewayName,
      title: cleanTitle,
      path,
      method: method.toUpperCase(),
      queryParams: [],
      headers: initialHeaders,
      body: '',
      isLoading: false
    };

    // Pre-populate query params if there are any inside the spec path
    if (path.includes('?')) {
      try {
        const urlObj = new URL('http://temp.com' + path);
        newTab.path = urlObj.pathname;
        urlObj.searchParams.forEach((val, key) => {
          newTab.queryParams.push({ key, value: val, description: 'Query parameter' });
        });
      } catch (_) {}
    }

    const newTabs = [...tabs, newTab];
    saveState(newTabs, tabId);
  };

  const closeTab = (tabId: string) => {
    const index = tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return;

    const newTabs = tabs.filter((t) => t.id !== tabId);
    let newActiveId = activeTabId;

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        newActiveId = newTabs[Math.max(0, index - 1)].id;
      } else {
        newActiveId = '';
      }
    }

    saveState(newTabs, newActiveId);
  };

  const updateActiveTab = (updates: Partial<IRequestTab>) => {
    const newTabs = tabs.map((t) => {
      if (t.id === activeTabId) {
        return { ...t, ...updates };
      }
      return t;
    });
    saveState(newTabs, activeTabId);
  };

  const getActiveTab = (): IRequestTab | undefined => {
    return tabs.find((t) => t.id === activeTabId);
  };

  return {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    updateActiveTab,
    getActiveTab,
    setActiveTabId: (id: string) => saveState(tabs, id)
  };
}
