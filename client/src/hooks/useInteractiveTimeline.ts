import { useState, useCallback, useMemo } from 'react';
import { TimelineItem, TimelineViewport } from '../components/InteractiveTimeline';
import { addDays, startOfYear, endOfYear } from 'date-fns';

export interface UseInteractiveTimelineProps {
  // Data
  items?: TimelineItem[];
  
  // Initial viewport
  initialStartDate?: Date;
  initialEndDate?: Date;
  initialPixelsPerDay?: number;
  
  // Configuration
  autoFitViewport?: boolean;
  minPixelsPerDay?: number;
  maxPixelsPerDay?: number;
  
  // Callbacks for phase management
  onItemsChange?: (items: TimelineItem[]) => void;
}

export interface UseInteractiveTimelineReturn {
  // State
  items: TimelineItem[];
  viewport: TimelineViewport;
  
  // Viewport controls
  setViewportDates: (startDate: Date, endDate: Date) => void;
  setPixelsPerDay: (pixelsPerDay: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  panLeft: () => void;
  panRight: () => void;
  jumpToToday: () => void;
  jumpToDate: (date: Date) => void;
  
  // Item management
  addItem: (item: Omit<TimelineItem, 'id'>) => string;
  updateItem: (itemId: string, updates: Partial<TimelineItem>) => void;
  removeItem: (itemId: string) => void;
  moveItem: (itemId: string, newStartDate: Date, newEndDate: Date) => void;
  duplicateItem: (itemId: string) => string;
  
  // Brush integration
  brushRange: { start: number; end: number };
  setBrushRange: (start: number, end: number) => void;
  getFilteredData: <T>(data: T[], dateAccessor: (item: T) => Date) => T[];
  
  // Utility functions
  dateToPixels: (date: Date) => number;
  pixelsToDate: (pixels: number) => Date;
  getVisibleDateRange: () => { startDate: Date; endDate: Date };
}

export function useInteractiveTimeline({
  items: initialItems = [],
  initialStartDate,
  initialEndDate,
  initialPixelsPerDay = 2,
  autoFitViewport = true,
  minPixelsPerDay = 0.5,
  maxPixelsPerDay = 20,
  onItemsChange
}: UseInteractiveTimelineProps = {}): UseInteractiveTimelineReturn {
  
  // Calculate default viewport dates based on items
  const defaultViewport = useMemo(() => {
    if (initialStartDate && initialEndDate) {
      return {
        startDate: initialStartDate,
        endDate: initialEndDate
      };
    }
    
    if (initialItems.length === 0) {
      const today = new Date();
      return {
        startDate: startOfYear(today),
        endDate: endOfYear(today)
      };
    }
    
    const dates = initialItems.flatMap(item => [item.startDate, item.endDate]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add some padding
    const paddingDays = Math.max(7, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) * 0.1));
    
    return {
      startDate: addDays(minDate, -paddingDays),
      endDate: addDays(maxDate, paddingDays)
    };
  }, [initialItems, initialStartDate, initialEndDate]);
  
  // State
  const [items, setItems] = useState<TimelineItem[]>(initialItems);
  const [viewport, setViewport] = useState<TimelineViewport>({
    startDate: defaultViewport.startDate,
    endDate: defaultViewport.endDate,
    pixelsPerDay: initialPixelsPerDay
  });
  const [brushRange, setBrushRangeState] = useState({ start: 0, end: 0 });
  
  // Notify parent of items changes
  const updateItems = useCallback((newItems: TimelineItem[]) => {
    setItems(newItems);
    onItemsChange?.(newItems);
  }, [onItemsChange]);
  
  // Viewport controls
  const setViewportDates = useCallback((startDate: Date, endDate: Date) => {
    setViewport(prev => ({
      ...prev,
      startDate,
      endDate
    }));
  }, []);
  
  const setPixelsPerDay = useCallback((pixelsPerDay: number) => {
    const clampedPixelsPerDay = Math.max(minPixelsPerDay, Math.min(maxPixelsPerDay, pixelsPerDay));
    setViewport(prev => ({
      ...prev,
      pixelsPerDay: clampedPixelsPerDay
    }));
  }, [minPixelsPerDay, maxPixelsPerDay]);
  
  const zoomIn = useCallback(() => {
    setPixelsPerDay(viewport.pixelsPerDay * 1.5);
  }, [viewport.pixelsPerDay, setPixelsPerDay]);
  
  const zoomOut = useCallback(() => {
    setPixelsPerDay(viewport.pixelsPerDay / 1.5);
  }, [viewport.pixelsPerDay, setPixelsPerDay]);
  
  const zoomToFit = useCallback(() => {
    if (items.length === 0) return;
    
    const dates = items.flatMap(item => [item.startDate, item.endDate]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add some padding
    const paddingDays = Math.max(3, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) * 0.05));
    const startDate = addDays(minDate, -paddingDays);
    const endDate = addDays(maxDate, paddingDays);
    
    setViewportDates(startDate, endDate);
    
    // Auto-adjust pixels per day for optimal viewing
    if (autoFitViewport) {
      const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const optimalPixelsPerDay = Math.max(minPixelsPerDay, Math.min(maxPixelsPerDay, 800 / totalDays));
      setPixelsPerDay(optimalPixelsPerDay);
    }
  }, [items, autoFitViewport, minPixelsPerDay, maxPixelsPerDay, setViewportDates, setPixelsPerDay]);
  
  const panLeft = useCallback(() => {
    const totalDays = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const panDays = Math.ceil(totalDays * 0.25);
    setViewportDates(
      addDays(viewport.startDate, -panDays),
      addDays(viewport.endDate, -panDays)
    );
  }, [viewport, setViewportDates]);
  
  const panRight = useCallback(() => {
    const totalDays = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const panDays = Math.ceil(totalDays * 0.25);
    setViewportDates(
      addDays(viewport.startDate, panDays),
      addDays(viewport.endDate, panDays)
    );
  }, [viewport, setViewportDates]);
  
  const jumpToToday = useCallback(() => {
    const today = new Date();
    const totalDays = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const halfRange = Math.ceil(totalDays / 2);
    
    setViewportDates(
      addDays(today, -halfRange),
      addDays(today, halfRange)
    );
  }, [viewport, setViewportDates]);
  
  const jumpToDate = useCallback((date: Date) => {
    const totalDays = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const halfRange = Math.ceil(totalDays / 2);
    
    setViewportDates(
      addDays(date, -halfRange),
      addDays(date, halfRange)
    );
  }, [viewport, setViewportDates]);
  
  // Item management
  const addItem = useCallback((item: Omit<TimelineItem, 'id'>): string => {
    const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem: TimelineItem = { ...item, id };
    updateItems([...items, newItem]);
    return id;
  }, [items, updateItems]);
  
  const updateItem = useCallback((itemId: string, updates: Partial<TimelineItem>) => {
    updateItems(items.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, [items, updateItems]);
  
  const removeItem = useCallback((itemId: string) => {
    updateItems(items.filter(item => item.id !== itemId));
  }, [items, updateItems]);
  
  const moveItem = useCallback((itemId: string, newStartDate: Date, newEndDate: Date) => {
    updateItem(itemId, { startDate: newStartDate, endDate: newEndDate });
  }, [updateItem]);
  
  const duplicateItem = useCallback((itemId: string): string => {
    const item = items.find(i => i.id === itemId);
    if (!item) return '';
    
    // Calculate duration and place duplicate after original
    const duration = item.endDate.getTime() - item.startDate.getTime();
    const newStartDate = new Date(item.endDate.getTime() + 24 * 60 * 60 * 1000); // Next day
    const newEndDate = new Date(newStartDate.getTime() + duration);
    
    return addItem({
      ...item,
      name: `${item.name} (Copy)`,
      startDate: newStartDate,
      endDate: newEndDate
    });
  }, [items, addItem]);
  
  // Brush integration
  const setBrushRange = useCallback((start: number, end: number) => {
    setBrushRangeState({ start, end });
  }, []);
  
  const getFilteredData = useCallback(<T>(data: T[], dateAccessor: (item: T) => Date): T[] => {
    if (brushRange.start === brushRange.end) return data;
    
    const totalDays = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const brushStartDate = addDays(viewport.startDate, brushRange.start * totalDays);
    const brushEndDate = addDays(viewport.startDate, brushRange.end * totalDays);
    
    return data.filter(item => {
      const itemDate = dateAccessor(item);
      return itemDate >= brushStartDate && itemDate <= brushEndDate;
    });
  }, [brushRange, viewport]);
  
  // Utility functions
  const dateToPixels = useCallback((date: Date): number => {
    const days = (date.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return days * viewport.pixelsPerDay;
  }, [viewport]);
  
  const pixelsToDate = useCallback((pixels: number): Date => {
    const days = pixels / viewport.pixelsPerDay;
    return addDays(viewport.startDate, days);
  }, [viewport]);
  
  const getVisibleDateRange = useCallback(() => {
    return {
      startDate: viewport.startDate,
      endDate: viewport.endDate
    };
  }, [viewport]);
  
  return {
    // State
    items,
    viewport,
    
    // Viewport controls
    setViewportDates,
    setPixelsPerDay,
    zoomIn,
    zoomOut,
    zoomToFit,
    panLeft,
    panRight,
    jumpToToday,
    jumpToDate,
    
    // Item management
    addItem,
    updateItem,
    removeItem,
    moveItem,
    duplicateItem,
    
    // Brush integration
    brushRange,
    setBrushRange,
    getFilteredData,
    
    // Utility functions
    dateToPixels,
    pixelsToDate,
    getVisibleDateRange
  };
}

export default useInteractiveTimeline;