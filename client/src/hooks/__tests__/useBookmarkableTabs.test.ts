import { renderHook, act } from '@testing-library/react';
import { useSearchParams } from 'react-router-dom';
import {
  useBookmarkableTabs,
  generateTabUrl,
  createTabNavigation,
  TabConfig
} from '../useBookmarkableTabs';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useSearchParams: jest.fn()
}));

describe('useBookmarkableTabs', () => {
  let mockSearchParams: URLSearchParams;
  let mockSetSearchParams: jest.Mock;

  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'details', label: 'Details' },
    { id: 'settings', label: 'Settings' }
  ];

  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockSetSearchParams = jest.fn();
    (useSearchParams as jest.Mock).mockReturnValue([mockSearchParams, mockSetSearchParams]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return default tab when no URL parameter is set', () => {
      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(result.current.activeTab).toBe('overview');
    });

    it('should return tab from URL when valid', () => {
      mockSearchParams.set('tab', 'details');

      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(result.current.activeTab).toBe('details');
    });

    it('should return default tab when URL tab is invalid', () => {
      mockSearchParams.set('tab', 'invalid-tab');

      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(result.current.activeTab).toBe('overview');
    });

    it('should use custom paramName', () => {
      mockSearchParams.set('view', 'details');

      const { result } = renderHook(() =>
        useBookmarkableTabs({
          tabs,
          defaultTab: 'overview',
          paramName: 'view'
        })
      );

      expect(result.current.activeTab).toBe('details');
    });
  });

  describe('setActiveTab', () => {
    it('should update URL when setting a non-default tab', () => {
      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      act(() => {
        result.current.setActiveTab('details');
      });

      expect(mockSetSearchParams).toHaveBeenCalledWith(
        expect.any(URLSearchParams),
        { replace: false }
      );

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.get('tab')).toBe('details');
    });

    it('should remove tab parameter when setting default tab', () => {
      mockSearchParams.set('tab', 'details');

      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      act(() => {
        result.current.setActiveTab('overview');
      });

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.has('tab')).toBe(false);
    });

    it('should warn and not update when setting invalid tab', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      act(() => {
        result.current.setActiveTab('invalid-tab');
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid tab ID: invalid-tab. Available tabs:',
        ['overview', 'details', 'settings']
      );
      expect(mockSetSearchParams).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should preserve other URL parameters', () => {
      mockSearchParams.set('filter', 'active');
      mockSearchParams.set('sort', 'name');

      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      act(() => {
        result.current.setActiveTab('details');
      });

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.get('filter')).toBe('active');
      expect(callArgs.get('sort')).toBe('name');
      expect(callArgs.get('tab')).toBe('details');
    });
  });

  describe('isActiveTab', () => {
    it('should return true for active tab', () => {
      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(result.current.isActiveTab('overview')).toBe(true);
    });

    it('should return false for inactive tab', () => {
      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(result.current.isActiveTab('details')).toBe(false);
    });
  });

  describe('getTabFromUrl', () => {
    it('should return current tab from URL', () => {
      mockSearchParams.set('tab', 'settings');

      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(result.current.getTabFromUrl()).toBe('settings');
    });

    it('should return default tab when URL is invalid', () => {
      mockSearchParams.set('tab', 'nonexistent');

      const { result } = renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(result.current.getTabFromUrl()).toBe('overview');
    });
  });

  describe('useEffect for invalid tabs', () => {
    it('should clean up invalid tab from URL on mount', () => {
      mockSearchParams.set('tab', 'invalid-tab');

      renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(mockSetSearchParams).toHaveBeenCalledWith(
        expect.any(URLSearchParams),
        { replace: true }
      );

      const callArgs = mockSetSearchParams.mock.calls[0][0];
      expect(callArgs.has('tab')).toBe(false);
    });

    it('should not trigger effect when tab is valid', () => {
      mockSearchParams.set('tab', 'details');

      renderHook(() =>
        useBookmarkableTabs({ tabs, defaultTab: 'overview' })
      );

      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });
  });
});

describe('generateTabUrl', () => {
  it('should generate URL with tab parameter', () => {
    const params = new URLSearchParams();
    const url = generateTabUrl('/dashboard', 'details', params);

    expect(url).toBe('/dashboard?tab=details');
  });

  it('should preserve existing parameters', () => {
    const params = new URLSearchParams('filter=active&sort=name');
    const url = generateTabUrl('/dashboard', 'details', params);

    expect(url).toContain('filter=active');
    expect(url).toContain('sort=name');
    expect(url).toContain('tab=details');
  });

  it('should use custom parameter name', () => {
    const params = new URLSearchParams();
    const url = generateTabUrl('/dashboard', 'details', params, 'view');

    expect(url).toBe('/dashboard?view=details');
  });

  it('should include tab parameter even when empty', () => {
    const params = new URLSearchParams();
    const url = generateTabUrl('/dashboard', '', params);

    // Function always sets the tab parameter
    expect(url).toBe('/dashboard?tab=');
  });
});

describe('createTabNavigation', () => {
  const tabs: TabConfig[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' }
  ];

  it('should create navigation utilities', () => {
    const nav = createTabNavigation('/app', tabs, 'home');

    expect(nav).toHaveProperty('getTabUrl');
    expect(nav).toHaveProperty('validateTab');
    expect(nav).toHaveProperty('getDefaultUrl');
  });

  describe('getTabUrl', () => {
    it('should return base path for default tab', () => {
      const nav = createTabNavigation('/app', tabs, 'home');
      const url = nav.getTabUrl('home');

      expect(url).toBe('/app');
    });

    it('should include tab parameter for non-default tab', () => {
      const nav = createTabNavigation('/app', tabs, 'home');
      const url = nav.getTabUrl('about');

      expect(url).toBe('/app?tab=about');
    });

    it('should include additional parameters', () => {
      const nav = createTabNavigation('/app', tabs, 'home');
      const url = nav.getTabUrl('about', { filter: 'active' });

      expect(url).toContain('tab=about');
      expect(url).toContain('filter=active');
    });

    it('should handle default tab with additional parameters', () => {
      const nav = createTabNavigation('/app', tabs, 'home');
      const url = nav.getTabUrl('home', { sort: 'name' });

      expect(url).toBe('/app?sort=name');
    });
  });

  describe('validateTab', () => {
    it('should return true for valid tab', () => {
      const nav = createTabNavigation('/app', tabs, 'home');

      expect(nav.validateTab('home')).toBe(true);
      expect(nav.validateTab('about')).toBe(true);
    });

    it('should return false for invalid tab', () => {
      const nav = createTabNavigation('/app', tabs, 'home');

      expect(nav.validateTab('invalid')).toBe(false);
    });
  });

  describe('getDefaultUrl', () => {
    it('should return base path with no parameters', () => {
      const nav = createTabNavigation('/app', tabs, 'home');
      const url = nav.getDefaultUrl();

      expect(url).toBe('/app');
    });

    it('should include additional parameters', () => {
      const nav = createTabNavigation('/app', tabs, 'home');
      const url = nav.getDefaultUrl({ filter: 'all', page: '1' });

      expect(url).toContain('filter=all');
      expect(url).toContain('page=1');
      expect(url).not.toContain('tab=');
    });
  });
});
