import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface TabConfig {
  id: string;
  label: string;
  component?: React.ComponentType;
}

export interface UseBookmarkableTabsOptions {
  tabs: TabConfig[];
  defaultTab: string;
  paramName?: string;
}

export interface UseBookmarkableTabsReturn {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isActiveTab: (tabId: string) => boolean;
  getTabFromUrl: () => string;
}

/**
 * Custom hook for managing bookmarkable tabs that sync with URL parameters
 * 
 * @param options Configuration object with tabs, defaultTab, and optional paramName
 * @returns Object with activeTab state and helper functions
 */
export function useBookmarkableTabs({
  tabs,
  defaultTab,
  paramName = 'tab'
}: UseBookmarkableTabsOptions): UseBookmarkableTabsReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get the current tab from URL parameters
  const getTabFromUrl = useCallback((): string => {
    const urlTab = searchParams.get(paramName);
    
    // Validate that the tab exists in our tab configuration
    const validTab = tabs.find(tab => tab.id === urlTab);
    
    return validTab ? urlTab! : defaultTab;
  }, [searchParams, paramName, tabs, defaultTab]);

  const activeTab = getTabFromUrl();

  // Function to change the active tab and update URL
  const setActiveTab = useCallback((tabId: string) => {
    // Validate the tab ID
    const validTab = tabs.find(tab => tab.id === tabId);
    if (!validTab) {
      console.warn(`Invalid tab ID: ${tabId}. Available tabs:`, tabs.map(t => t.id));
      return;
    }

    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (tabId === defaultTab) {
      // Remove the tab parameter if it's the default tab to keep URLs clean
      newSearchParams.delete(paramName);
    } else {
      newSearchParams.set(paramName, tabId);
    }
    
    setSearchParams(newSearchParams, { replace: false });
  }, [tabs, defaultTab, paramName, searchParams, setSearchParams]);

  // Helper function to check if a tab is active
  const isActiveTab = useCallback((tabId: string): boolean => {
    return activeTab === tabId;
  }, [activeTab]);

  // Effect to handle invalid tabs in URL (redirect to default)
  useEffect(() => {
    const urlTab = searchParams.get(paramName);
    if (urlTab && !tabs.find(tab => tab.id === urlTab)) {
      // Invalid tab in URL, redirect to default
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete(paramName);
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, paramName, tabs, setSearchParams]);

  return {
    activeTab,
    setActiveTab,
    isActiveTab,
    getTabFromUrl
  };
}

/**
 * Utility function to generate tab navigation URLs for links
 * 
 * @param baseUrl Base URL without parameters
 * @param tabId Tab ID to navigate to
 * @param currentParams Current URL search parameters
 * @param paramName Parameter name for tab (default: 'tab')
 * @returns Complete URL with tab parameter
 */
export function generateTabUrl(
  baseUrl: string,
  tabId: string,
  currentParams: URLSearchParams,
  paramName: string = 'tab'
): string {
  const newParams = new URLSearchParams(currentParams);
  newParams.set(paramName, tabId);
  const queryString = newParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Utility function to create tab-aware navigation
 * 
 * @param basePath Base path for the navigation
 * @param tabConfigs Array of tab configurations
 * @param defaultTab Default tab ID
 * @returns Object with navigation utilities
 */
export function createTabNavigation(
  basePath: string,
  tabConfigs: TabConfig[],
  defaultTab: string
) {
  return {
    getTabUrl: (tabId: string, additionalParams?: Record<string, string>) => {
      const params = new URLSearchParams(additionalParams);
      if (tabId !== defaultTab) {
        params.set('tab', tabId);
      }
      const queryString = params.toString();
      return queryString ? `${basePath}?${queryString}` : basePath;
    },
    
    validateTab: (tabId: string) => {
      return tabConfigs.some(tab => tab.id === tabId);
    },
    
    getDefaultUrl: (additionalParams?: Record<string, string>) => {
      const params = new URLSearchParams(additionalParams);
      const queryString = params.toString();
      return queryString ? `${basePath}?${queryString}` : basePath;
    }
  };
}