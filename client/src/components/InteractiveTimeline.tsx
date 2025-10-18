import React, { useState, useRef, useCallback, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { formatDateSafe, parseDateSafe, addDaysSafe } from '../utils/date';
import './InteractiveTimeline.css';

export interface TimelineItem {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  data?: any; // Additional data for the item
}

export interface TimelineViewport {
  startDate: Date;
  endDate: Date;
  pixelsPerDay: number;
}

export interface DependencyLine {
  id: string;
  predecessorId: string;
  successorId: string;
  dependencyType: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays?: number;
}

export interface InteractiveTimelineProps {
  items: TimelineItem[];
  viewport: TimelineViewport;
  height?: number;
  width?: number; // Explicit width for precise alignment (bypasses container measurement)

  // Mode configuration
  mode: 'brush' | 'phase-manager' | 'roadmap';

  // Brush mode props
  brushRange?: { start: number; end: number };
  onBrushChange?: (start: number, end: number) => void;

  // Phase management props
  onItemAdd?: (afterItemId?: string, position?: { x: number, date: Date }) => void;
  onItemEdit?: (itemId: string) => void;
  onItemDelete?: (itemId: string) => void;
  onItemMove?: (itemId: string, newStartDate: Date, newEndDate: Date) => void;
  onItemResize?: (itemId: string, newStartDate: Date, newEndDate: Date) => void;

  // Dependencies
  dependencies?: DependencyLine[];
  onDependencyCreate?: (predecessorId: string, successorId: string, dependencyType: 'FS' | 'SS' | 'FF' | 'SF') => void;

  // Visual configuration
  showGrid?: boolean;
  showToday?: boolean;
  allowOverlap?: boolean;
  minItemDuration?: number; // in days

  // Chart alignment
  chartTimeData?: Array<{ date: string; [key: string]: any }>; // For aligning with chart time axis

  // Styling
  className?: string;
  style?: React.CSSProperties;
}

// Utility functions
const calculateItemPosition = (item: TimelineItem, viewport: TimelineViewport) => {
  const startDays = (item.startDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
  const endDays = (item.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return {
    left: startDays * viewport.pixelsPerDay,
    width: Math.max((endDays - startDays) * viewport.pixelsPerDay, 20), // Minimum width
    startDays,
    endDays
  };
};

const dateFromPixelPosition = (pixelX: number, viewport: TimelineViewport): Date => {
  const days = Math.round(pixelX / viewport.pixelsPerDay);
  // Snap to day boundaries since phases are stored with day precision
  const result = new Date(viewport.startDate);
  result.setDate(result.getDate() + days);
  result.setHours(0, 0, 0, 0);
  return result;
};

// Calculate dependency line connection points based on dependency type
const calculateDependencyPoints = (
  predecessor: TimelineItem,
  successor: TimelineItem,
  dependency: DependencyLine,
  viewport: TimelineViewport,
  itemHeight: number
) => {
  const predPosition = calculateItemPosition(predecessor, viewport);
  const succPosition = calculateItemPosition(successor, viewport);
  
  const predCenter = predPosition.left + predPosition.width / 2;
  const succCenter = succPosition.left + succPosition.width / 2;
  
  let startPoint: { x: number; y: number };
  let endPoint: { x: number; y: number };
  
  const verticalOffset = 8; // Distance from phase bars
  const predTop = verticalOffset;
  const predBottom = predTop + itemHeight - 16;
  const succTop = verticalOffset; 
  const succBottom = succTop + itemHeight - 16;
  
  switch (dependency.dependencyType) {
    case 'FS': // Finish-to-Start
      startPoint = { x: predPosition.left + predPosition.width, y: predTop + (itemHeight - 16) / 2 };
      endPoint = { x: succPosition.left, y: succTop + (itemHeight - 16) / 2 };
      break;
    case 'SS': // Start-to-Start
      startPoint = { x: predPosition.left, y: predTop + (itemHeight - 16) / 2 };
      endPoint = { x: succPosition.left, y: succTop + (itemHeight - 16) / 2 };
      break;
    case 'FF': // Finish-to-Finish
      startPoint = { x: predPosition.left + predPosition.width, y: predTop + (itemHeight - 16) / 2 };
      endPoint = { x: succPosition.left + succPosition.width, y: succTop + (itemHeight - 16) / 2 };
      break;
    case 'SF': // Start-to-Finish
      startPoint = { x: predPosition.left, y: predTop + (itemHeight - 16) / 2 };
      endPoint = { x: succPosition.left + succPosition.width, y: succTop + (itemHeight - 16) / 2 };
      break;
    default:
      startPoint = { x: predCenter, y: predTop + (itemHeight - 16) / 2 };
      endPoint = { x: succCenter, y: succTop + (itemHeight - 16) / 2 };
  }
  
  return { startPoint, endPoint, dependency };
};

// NOTE: This component uses hex color values instead of CSS variables because
// it may use canvas rendering for performance, where CSS variables cannot be resolved.
// All colors in this component must be specified as hex values.
export function InteractiveTimeline({
  items,
  viewport,
  height = 60,
  width,
  mode,
  brushRange,
  onBrushChange,
  onItemAdd,
  onItemEdit,
  onItemDelete,
  onItemMove,
  onItemResize,
  dependencies = [],
  onDependencyCreate,
  showGrid = true,
  showToday = true,
  allowOverlap = false,
  minItemDuration = 1,
  chartTimeData,
  className = '',
  style = {}
}: InteractiveTimelineProps) {
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-start' | 'resize-end' | 'brush' | 'boundary' | null;
    itemId?: string;
    startX?: number;
    currentX?: number;
    originalStart?: Date;
    originalEnd?: Date;
    previewStart?: Date;
    previewEnd?: Date;
    adjacentPhases?: {
      previous?: {
        id: string;
        newEndDate: Date;
      };
      next?: {
        id: string;
        newStartDate: Date;
      };
    };
    boundaryData?: {
      leftPhaseId: string;
      rightPhaseId: string;
      originalLeftEnd: Date;
      originalRightStart: Date;
    };
  }>({ type: null });
  
  const [hoverItemId, setHoverItemId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: React.ReactNode;
  }>({ visible: false, x: 0, y: 0, content: null });

  // Phase boundary handle state - new approach with visual handles
  const [hoveredHandle, setHoveredHandle] = useState<{
    phaseId: string;
    handleType: 'resize-left' | 'resize-right' | 'extend-left' | 'extend-right' | 'adjust-both';
    position: number;
  } | null>(null);

  // Note: Scroll detection logic removed - now using z-index layering for proper handle positioning

  // Calculate timeline width - use explicit width prop first for precise alignment
  const calculateTimelineWidth = () => {
    // Priority 1: Use explicit width prop if provided (for precise chart alignment)
    if (width !== undefined && width > 0) {
      return width;
    }

    // Priority 2: If we have a container, use its actual width for perfect alignment
    if (timelineRef.current?.parentElement) {
      const containerWidth = timelineRef.current.parentElement.getBoundingClientRect().width;
      if (containerWidth > 0) {
        return containerWidth;
      }
    }

    // Priority 3: Fallback to natural width based on viewport
    const naturalWidth = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24) * viewport.pixelsPerDay;
    return Math.max(naturalWidth, 200); // Reduced minimum for better alignment
  };
  
  const [timelineWidth, setTimelineWidth] = useState(400); // Start with default
  
  // Recalculate width when container resizes, viewport changes, or explicit width prop changes
  useEffect(() => {
    const updateWidth = () => {
      const newWidth = calculateTimelineWidth();
      // Only update if the width actually changed to prevent unnecessary re-renders
      setTimelineWidth(prevWidth => {
        if (Math.abs(newWidth - prevWidth) > 1) { // Allow 1px tolerance
          console.log('📏 InteractiveTimeline width updated:', prevWidth, '→', newWidth, width ? '(from explicit prop)' : '(from measurement)');
          return newWidth;
        }
        return prevWidth;
      });
    };

    // Update immediately
    updateWidth();

    // Use ResizeObserver if available, otherwise fallback to window resize only
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      try {
        resizeObserver = new ResizeObserver(updateWidth);
        if (timelineRef.current?.parentElement) {
          resizeObserver.observe(timelineRef.current.parentElement);
        }
      } catch (error) {
        console.warn('ResizeObserver failed to initialize, using window resize fallback:', error);
        resizeObserver = null;
      }
    }

    // Always listen to window resize as fallback
    window.addEventListener('resize', updateWidth);

    // Additional fallback: check for size changes periodically if ResizeObserver is unavailable
    let intervalId: NodeJS.Timeout | null = null;
    if (!resizeObserver) {
      intervalId = setInterval(updateWidth, 5000); // Check every 5 seconds as last resort (reduced frequency)
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateWidth);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [viewport, width]);

  // Generate grid lines for visual reference
  const generateGridLines = useCallback(() => {
    const lines: Array<{ date: Date; label: string; type: 'major' | 'minor' }> = [];
    
    // If we have chart time data, use its time points for exact alignment
    if (chartTimeData && chartTimeData.length > 0) {
      // Sample every few data points to avoid overcrowding - use fewer samples for better spacing
      const sampleInterval = Math.max(1, Math.floor(chartTimeData.length / 6));
      
      chartTimeData.forEach((dataPoint, index) => {
        if (index % sampleInterval === 0) {
          const date = new Date(dataPoint.date);
          const isFirstOrLast = index === 0 || index === chartTimeData.length - 1;
          const isMonthStart = date.getDate() <= 7; // Approximate month start
          
          // Create shorter labels to prevent wrapping
          let label;
          if (isFirstOrLast || isMonthStart) {
            label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            label = date.toLocaleDateString('en-US', { day: 'numeric' });
          }
          
          lines.push({
            date: date,
            label: label,
            type: (isFirstOrLast || isMonthStart) ? 'major' : 'minor'
          });
        }
      });
      
      return lines;
    }
    
    // Fallback to original grid generation
    const current = new Date(viewport.startDate);
    
    // Determine grid granularity based on zoom level
    const totalDays = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (totalDays <= 60) {
      // Daily grid for short ranges
      while (current <= viewport.endDate) {
        const isWeekStart = current.getDay() === 0;
        lines.push({
          date: new Date(current),
          label: format(current, isWeekStart ? 'MMM d' : 'd'),
          type: isWeekStart ? 'major' : 'minor'
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (totalDays <= 365) {
      // Weekly grid for medium ranges
      while (current <= viewport.endDate) {
        const weekStart = startOfWeek(current);
        const isMonthStart = weekStart.getDate() <= 7;
        lines.push({
          date: new Date(weekStart),
          label: format(weekStart, isMonthStart ? 'MMM' : 'd'),
          type: isMonthStart ? 'major' : 'minor'
        });
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Monthly grid for long ranges
      while (current <= viewport.endDate) {
        const monthStart = startOfMonth(current);
        const isYearStart = monthStart.getMonth() === 0;
        lines.push({
          date: new Date(monthStart),
          label: format(monthStart, isYearStart ? 'yyyy' : 'MMM'),
          type: isYearStart ? 'major' : 'minor'
        });
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return lines;
  }, [viewport, chartTimeData]);

  const gridLines = showGrid ? generateGridLines() : [];

  // Generate visual handles for phase boundaries - new intuitive approach
  const generatePhaseHandles = useCallback(() => {
    if (mode !== 'phase-manager' && mode !== 'roadmap') return [];
    if (!items.length) return [];

    const handles: Array<{
      id: string;
      phaseId: string;
      handleType: 'extend-left' | 'extend-right' | 'adjust-both';
      position: number;
      x: number;
      adjacentPhaseId?: string;
    }> = [];

    // Sort items by start date to ensure correct adjacency
    const sortedItems = [...items].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    // Debug logging disabled - uncomment if needed for debugging
    // console.log('🔧 Handle generation debug:', { 
    //   mode, 
    //   itemsCount: items.length, 
    //   sortedItemsCount: sortedItems.length,
    //   items: sortedItems.map(item => ({
    //     id: item.id,
    //     name: item.name,
    //     start: item.startDate.toISOString().split('T')[0],
    //     end: item.endDate.toISOString().split('T')[0]
    //   }))
    // });

    // Debug handles removed - they were causing UI overlap issues

    for (let i = 0; i < sortedItems.length; i++) {
      const currentItem = sortedItems[i];
      const prevItem = i > 0 ? sortedItems[i - 1] : null;
      const nextItem = i < sortedItems.length - 1 ? sortedItems[i + 1] : null;
      
      const currentPosition = calculateItemPosition(currentItem, viewport);
      
      // Left extend handle - show if there's a gap to the left OR if we want to allow extending into previous phase
      if (prevItem) {
        const prevEndTime = prevItem.endDate.getTime();
        const currentStartTime = currentItem.startDate.getTime();
        const timeDiff = currentStartTime - prevEndTime;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        // console.log(`📐 Left handle check for ${currentItem.name}:`, {
        //   prevPhase: prevItem.name,
        //   prevEndTime: prevItem.endDate.toISOString().split('T')[0],
        //   currentStartTime: currentItem.startDate.toISOString().split('T')[0],
        //   daysDiff: Math.round(daysDiff * 10) / 10
        // });
        
        if (daysDiff > 0.001) { // Show if there's any gap (temporary for testing)
          // There's a gap - show extend-left handle
          const gapStartX = calculateItemPosition(prevItem, viewport).left + calculateItemPosition(prevItem, viewport).width;
          const handleX = gapStartX + (currentPosition.left - gapStartX) / 2;
          
          // Only show handle if it's within visible area and not overlapping with project panel
          if (handleX >= 340 && handleX <= timelineWidth) {
            handles.push({
              id: `extend-left-${currentItem.id}`,
              phaseId: currentItem.id,
              handleType: 'extend-left',
              position: currentStartTime,
              x: handleX,
              adjacentPhaseId: prevItem.id
            });
          }
          
          // console.log(`✅ Added extend-left handle for ${currentItem.name}`);
        }
      }
      
      // Right extend handle - show if there's a gap to the right
      if (nextItem) {
        const currentEndTime = currentItem.endDate.getTime();
        const nextStartTime = nextItem.startDate.getTime();
        const timeDiff = nextStartTime - currentEndTime;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        // console.log(`📐 Right handle check for ${currentItem.name}:`, {
        //   nextPhase: nextItem.name,
        //   currentEndTime: currentItem.endDate.toISOString().split('T')[0],
        //   nextStartTime: nextItem.startDate.toISOString().split('T')[0],
        //   daysDiff: Math.round(daysDiff * 10) / 10
        // });
        
        if (daysDiff > 0.001) { // Show if there's any gap (temporary for testing)
          // There's a gap - show extend-right handle
          const currentEndX = currentPosition.left + currentPosition.width;
          const nextStartX = calculateItemPosition(nextItem, viewport).left;
          const handleX = currentEndX + (nextStartX - currentEndX) / 2;
          
          // Only show handle if it's within visible area and not overlapping with project panel
          if (handleX >= 340 && handleX <= timelineWidth) {
            handles.push({
              id: `extend-right-${currentItem.id}`,
              phaseId: currentItem.id,
              handleType: 'extend-right',
              position: currentEndTime,
              x: handleX,
              adjacentPhaseId: nextItem.id
            });
          }
          
          // console.log(`✅ Added extend-right handle for ${currentItem.name}`);
        } else if (Math.abs(daysDiff) <= 7) { // Adjacent or overlapping within 7 days (temporary for testing)
          // Phases are adjacent or slightly overlapping - show adjust-both handle
          const boundaryX = currentPosition.left + currentPosition.width;
          
          // Only show handle if it's within visible area and not overlapping with project panel
          if (boundaryX >= 340 && boundaryX <= timelineWidth) {
            handles.push({
              id: `adjust-both-${currentItem.id}-${nextItem.id}`,
              phaseId: currentItem.id,
              handleType: 'adjust-both',
              position: currentEndTime,
              x: boundaryX,
              adjacentPhaseId: nextItem.id
            });
          }
          
          // console.log(`✅ Added adjust-both handle between ${currentItem.name} and ${nextItem.name}`);
        }
      }
    }

    // console.log('🎯 Generated handles:', handles.length, handles.map(h => ({ id: h.id, type: h.handleType, phase: h.phaseId })));
    return handles;
  }, [items, viewport, mode]);

  const phaseHandles = generatePhaseHandles();

  // Calculate dependency lines for visual rendering
  const dependencyLines = React.useMemo(() => {
    if (!dependencies || dependencies.length === 0) return [];
    
    const lines = [];
    for (const dependency of dependencies) {
      const predecessor = items.find(item => item.id === dependency.predecessorId);
      const successor = items.find(item => item.id === dependency.successorId);
      
      if (predecessor && successor) {
        const points = calculateDependencyPoints(predecessor, successor, dependency, viewport, height);
        lines.push(points);
      }
    }
    
    return lines;
  }, [dependencies, items, viewport, height]);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent, itemId?: string, action?: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    
    if (mode === 'brush' && !itemId) {
      // Start brush selection
      setDragState({
        type: 'brush',
        startX
      });
    } else if (itemId && (mode === 'phase-manager' || mode === 'roadmap')) {
      // Start item manipulation
      const item = items.find(i => i.id === itemId);
      if (item) {
        // Initialize adjacent phases for gap maintenance
        const adjacentPhases: any = {};
        if (action === 'resize-start' || action === 'resize-end') {
          const sortedItems = [...items].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
          const currentIndex = sortedItems.findIndex(i => i.id === itemId);
          
          if (action === 'resize-start' && currentIndex > 0) {
            const prevPhase = sortedItems[currentIndex - 1];
            adjacentPhases.previousPhase = {
              id: prevPhase.id,
              originalEndDate: new Date(prevPhase.endDate),
              gap: Math.round((item.startDate.getTime() - prevPhase.endDate.getTime()) / (1000 * 60 * 60 * 24))
            };
          }
          
          if (action === 'resize-end' && currentIndex < sortedItems.length - 1) {
            const nextPhase = sortedItems[currentIndex + 1];
            adjacentPhases.nextPhase = {
              id: nextPhase.id,
              originalStartDate: new Date(nextPhase.startDate),
              gap: Math.round((nextPhase.startDate.getTime() - item.endDate.getTime()) / (1000 * 60 * 60 * 24))
            };
          }
        }
        
        setDragState({
          type: action || 'move',
          itemId,
          startX,
          originalStart: new Date(item.startDate),
          originalEnd: new Date(item.endDate),
          adjacentPhases
        });
      }
    }
  }, [mode, items]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    
    // Check for handle hover when not dragging
    if (!dragState.type && (mode === 'phase-manager' || mode === 'roadmap')) {
      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Check if mouse is over a phase handle (±12px horizontal, and in handle vertical area)
      const hoveredHandle = phaseHandles.find(handle => {
        const horizontalMatch = Math.abs(mouseX - handle.x) <= 12;
        const verticalMatch = mouseY >= 5 && mouseY <= 25; // Handle area: top 5 to 25 (within padding)
        return horizontalMatch && verticalMatch;
      });
      
      if (hoveredHandle) {
        setHoveredHandle({
          phaseId: hoveredHandle.phaseId,
          handleType: hoveredHandle.handleType,
          position: hoveredHandle.x
        });
      } else {
        setHoveredHandle(null);
      }
    }
    
    if (!dragState.type) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const deltaX = currentX - (dragState.startX || 0);
    const deltaDays = deltaX / viewport.pixelsPerDay;
    
    if (dragState.type === 'brush' && onBrushChange) {
      // Update brush selection
      const startDate = dateFromPixelPosition(Math.min(dragState.startX || 0, currentX), viewport);
      const endDate = dateFromPixelPosition(Math.max(dragState.startX || 0, currentX), viewport);
      
      // Convert to indices if needed
      const startIndex = Math.max(0, Math.floor((startDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const endIndex = Math.min(
        Math.floor((viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24)),
        Math.floor((endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      
      onBrushChange(startIndex, endIndex);
    } else if (dragState.itemId && dragState.originalStart && dragState.originalEnd) {
      // Update item position/size
      let newStartDate = new Date(dragState.originalStart);
      let newEndDate = new Date(dragState.originalEnd);
      
      if (dragState.type === 'move') {
        // For move, calculate based on pixel position to maintain exact visual position
        newStartDate = dateFromPixelPosition(currentX - (dragState.startX || 0) + 
          calculateItemPosition({ ...items.find(i => i.id === dragState.itemId)!, startDate: dragState.originalStart, endDate: dragState.originalEnd }, viewport).left, viewport);
        const duration = dragState.originalEnd.getTime() - dragState.originalStart.getTime();
        newEndDate = new Date(newStartDate.getTime() + duration);
      } else if (dragState.type === 'resize-start') {
        // For resize start, calculate new start date
        const deltaDaysRounded = Math.round(deltaDays);
        newStartDate = new Date(dragState.originalStart);
        newStartDate.setDate(newStartDate.getDate() + deltaDaysRounded);
        newStartDate.setHours(0, 0, 0, 0);
        newEndDate = new Date(dragState.originalEnd);
        newEndDate.setHours(0, 0, 0, 0);
        
        // Ensure minimum duration
        const durationDays = Math.round((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24));
        if (durationDays < minItemDuration) {
          newStartDate = new Date(newEndDate);
          newStartDate.setDate(newStartDate.getDate() - minItemDuration);
          newStartDate.setHours(0, 0, 0, 0);
        }
        
        // When dragging start edge, shift all previous phases by the same amount
        const shiftAmount = deltaDaysRounded;
        if (shiftAmount !== 0) {
          const sortedItems = [...items].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
          const currentIndex = sortedItems.findIndex(item => item.id === dragState.itemId);
          
          if (!dragState.adjacentPhases.updates) {
            dragState.adjacentPhases.updates = {};
          }
          dragState.adjacentPhases.shiftedPhases = [];
          
          // Shift all phases to the left of the current phase
          for (let i = 0; i < currentIndex; i++) {
            const phase = sortedItems[i];
            const newPhaseStartDate = new Date(phase.startDate);
            newPhaseStartDate.setDate(newPhaseStartDate.getDate() + shiftAmount);
            newPhaseStartDate.setHours(0, 0, 0, 0);
            
            const newPhaseEndDate = new Date(phase.endDate);
            newPhaseEndDate.setDate(newPhaseEndDate.getDate() + shiftAmount);
            newPhaseEndDate.setHours(0, 0, 0, 0);
            
            dragState.adjacentPhases.shiftedPhases.push({
              id: phase.id,
              newStartDate: newPhaseStartDate,
              newEndDate: newPhaseEndDate
            });
          }
        }
      } else if (dragState.type === 'resize-end') {
        // For resize end, calculate new end date
        const deltaDaysRounded = Math.round(deltaDays);
        newStartDate = new Date(dragState.originalStart);
        newStartDate.setHours(0, 0, 0, 0);
        newEndDate = new Date(dragState.originalEnd);
        newEndDate.setDate(newEndDate.getDate() + deltaDaysRounded);
        newEndDate.setHours(0, 0, 0, 0);
        
        // Ensure minimum duration
        const durationDays = Math.round((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24));
        if (durationDays < minItemDuration) {
          newEndDate = new Date(newStartDate);
          newEndDate.setDate(newEndDate.getDate() + minItemDuration);
          newEndDate.setHours(0, 0, 0, 0);
        }
        
        // When dragging end edge, shift all subsequent phases by the same amount
        const shiftAmount = deltaDaysRounded;
        if (shiftAmount !== 0) {
          const sortedItems = [...items].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
          const currentIndex = sortedItems.findIndex(item => item.id === dragState.itemId);
          
          if (!dragState.adjacentPhases.updates) {
            dragState.adjacentPhases.updates = {};
          }
          dragState.adjacentPhases.shiftedPhases = [];
          
          // Shift all phases to the right of the current phase
          for (let i = currentIndex + 1; i < sortedItems.length; i++) {
            const phase = sortedItems[i];
            const newPhaseStartDate = new Date(phase.startDate);
            newPhaseStartDate.setDate(newPhaseStartDate.getDate() + shiftAmount);
            newPhaseStartDate.setHours(0, 0, 0, 0);
            
            const newPhaseEndDate = new Date(phase.endDate);
            newPhaseEndDate.setDate(newPhaseEndDate.getDate() + shiftAmount);
            newPhaseEndDate.setHours(0, 0, 0, 0);
            
            dragState.adjacentPhases.shiftedPhases.push({
              id: phase.id,
              newStartDate: newPhaseStartDate,
              newEndDate: newPhaseEndDate
            });
          }
        }
      }
      
      // Update preview dates for visual feedback
      setDragState(prev => ({
        ...prev,
        currentX: currentX,
        previewStart: newStartDate,
        previewEnd: newEndDate
      }));
      
      // Check for overlaps if not allowed
      if (!allowOverlap) {
        // TODO: Implement overlap prevention logic
      }
      
      // Don't trigger callbacks during drag - wait for mouse up
    } else if (dragState.type === 'boundary' && dragState.boundaryData) {
      // Handle boundary drag - just update the drag state for visual feedback
      setDragState(prev => ({
        ...prev,
        currentX: currentX
      }));
    }
  }, [dragState, viewport, onBrushChange, onItemMove, onItemResize, minItemDuration, allowOverlap, mode, phaseHandles, items]);

  const handleMouseUp = useCallback(() => {
    // Trigger callbacks with final positions before clearing drag state
    if (dragState.type && dragState.itemId && dragState.previewStart && dragState.previewEnd) {
      if (dragState.type === 'move' && onItemMove) {
        onItemMove(dragState.itemId, dragState.previewStart, dragState.previewEnd);
      } else if ((dragState.type === 'resize-start' || dragState.type === 'resize-end') && onItemResize) {
        // Update the main phase
        onItemResize(dragState.itemId, dragState.previewStart, dragState.previewEnd);
        
        // Update adjacent phases to maintain gaps
        if (dragState.adjacentPhases?.updates) {
          if (dragState.adjacentPhases.updates.previous) {
            const { id, newEndDate } = dragState.adjacentPhases.updates.previous;
            const prevPhase = items.find(item => item.id === id);
            if (prevPhase) {
              onItemResize(id, prevPhase.startDate, newEndDate);
            }
          }
          if (dragState.adjacentPhases.updates.next) {
            const { id, newStartDate } = dragState.adjacentPhases.updates.next;
            const nextPhase = items.find(item => item.id === id);
            if (nextPhase) {
              // Calculate new end date maintaining duration
              const duration = nextPhase.endDate.getTime() - nextPhase.startDate.getTime();
              const newEndDate = new Date(newStartDate.getTime() + duration);
              onItemResize(id, newStartDate, newEndDate);
            }
          }
        }
        
        // Apply cascading updates to all shifted phases
        if (dragState.adjacentPhases?.shiftedPhases) {
          // console.log('🔄 Applying cascading updates to', dragState.adjacentPhases.shiftedPhases.length, 'phases');
          
          // Sort phases by their position to apply updates in order
          const sortedShiftedPhases = [...dragState.adjacentPhases.shiftedPhases].sort((a, b) => {
            const phaseA = items.find(item => item.id === a.id);
            const phaseB = items.find(item => item.id === b.id);
            if (!phaseA || !phaseB) return 0;
            return phaseA.startDate.getTime() - phaseB.startDate.getTime();
          });
          
          // Apply updates to all shifted phases
          sortedShiftedPhases.forEach(shiftedPhase => {
            // console.log(`📅 Updating phase ${shiftedPhase.id}:`, {
            //   newStart: shiftedPhase.newStartDate.toISOString().split('T')[0],
            //   newEnd: shiftedPhase.newEndDate.toISOString().split('T')[0]
            // });
            onItemResize(shiftedPhase.id, shiftedPhase.newStartDate, shiftedPhase.newEndDate);
          });
        }
      }
    } else if (dragState.type === 'boundary' && dragState.boundaryData && onItemResize) {
      // For boundary drag, trigger the final resize callbacks
      const currentX = dragState.currentX || dragState.startX || 0;
      const newBoundaryDate = dateFromPixelPosition(currentX, viewport);
      
      const { leftPhaseId, rightPhaseId } = dragState.boundaryData;
      const leftPhase = items.find(item => item.id === leftPhaseId);
      const rightPhase = items.find(item => item.id === rightPhaseId);
      
      if (leftPhase) {
        onItemResize(leftPhaseId, leftPhase.startDate, newBoundaryDate);
      }
      if (rightPhase) {
        onItemResize(rightPhaseId, newBoundaryDate, rightPhase.endDate);
      }
    }
    
    setDragState({ type: null });
  }, [dragState, onItemMove, onItemResize, viewport, items]);

  const handleDoubleClick = useCallback((e: React.MouseEvent, itemId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (itemId && onItemEdit) {
      onItemEdit(itemId);
    } else if (!itemId && onItemAdd) {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left;
        const clickDate = dateFromPixelPosition(clickX, viewport);
        onItemAdd(undefined, { x: clickX, date: clickDate });
      }
    }
  }, [onItemEdit, onItemAdd, viewport]);

  const handleRightClick = useCallback((e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    if (onItemDelete) {
      onItemDelete(itemId);
    }
  }, [onItemDelete]);

  // Handle direct phase boundary actions with visual handles
  const handlePhaseAction = useCallback((handle: { phaseId: string; handleType: string; adjacentPhaseId?: string }) => {
    // console.log('🎯 Direct phase action triggered:', handle);
    
    const phase = items.find(item => item.id === handle.phaseId);
    const adjacentPhase = handle.adjacentPhaseId ? items.find(item => item.id === handle.adjacentPhaseId) : null;
    
    if (!phase) {
      // console.log('⚠️ Could not find phase');
      return;
    }
    
    switch (handle.handleType) {
      case 'extend-left':
        if (adjacentPhase) {
          // Extend current phase left to meet the adjacent phase
          const newStartDate = adjacentPhase.endDate;
          // console.log('🔸 Extending phase left to adjacent phase end');
          if (onItemResize) {
            onItemResize(phase.id, newStartDate, phase.endDate);
          }
        }
        break;
        
      case 'extend-right':
        if (adjacentPhase) {
          // Extend current phase right to meet the adjacent phase
          const newEndDate = adjacentPhase.startDate;
          // console.log('🔸 Extending phase right to adjacent phase start');
          if (onItemResize) {
            onItemResize(phase.id, phase.startDate, newEndDate);
          }
        }
        break;
        
      case 'adjust-both':
        if (adjacentPhase) {
          // Calculate midpoint using timezone-safe date arithmetic
          const phaseEndStr = formatDateSafe(phase.endDate);
          const adjacentStartStr = formatDateSafe(adjacentPhase.startDate);
          
          // Calculate days between the phases  
          const daysBetween = Math.round((adjacentPhase.startDate.getTime() - phase.endDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Handle edge case: if phases are already adjacent or overlapping
          if (daysBetween <= 0) {
            // console.log('🔗 Phases are already adjacent, no adjustment needed');
            return;
          }
          
          const midpointOffset = Math.floor(daysBetween / 2);
          
          // Calculate new boundary date (timezone-safe)
          const newBoundaryStr = addDaysSafe(phaseEndStr, midpointOffset);
          const newBoundaryDate = parseDateSafe(newBoundaryStr);
          
          // console.log('🔗 Adjusting both phases with dependency-safe midpoint:', {
          //   phaseEnds: phaseEndStr,
          //   adjacentStarts: adjacentStartStr,
          //   daysBetween,
          //   midpointOffset,
          //   newBoundary: newBoundaryStr,
          //   maintainsFSDependency: true
          // });
          
          if (onItemResize) {
            // Validate that the new arrangement maintains FS dependency constraints
            const predecessorEndsStr = formatDateSafe(newBoundaryDate);
            const successorStartsStr = formatDateSafe(newBoundaryDate);
            
            // For FS dependency, successor must start on the same day or after predecessor ends
            // This should always be true since we use the same date, but let's validate
            if (predecessorEndsStr <= successorStartsStr) {
              // console.log('✅ FS dependency maintained - applying adjustment');
              onItemResize(phase.id, phase.startDate, newBoundaryDate);
              onItemResize(adjacentPhase.id, newBoundaryDate, adjacentPhase.endDate);
            } else {
              console.error('❌ FS dependency violation prevented:', {
                predecessorEnds: predecessorEndsStr,
                successorStarts: successorStartsStr
              });
              // Fallback: don't adjust if it would violate dependencies
            }
          }
        }
        break;
    }
    
    // Clear hover state after action
    setHoveredHandle(null);
    // console.log('✅ Phase action completed:', handle.handleType);
  }, [items, onItemResize]);

  // Handle drag start for phase boundary adjustments
  const handlePhaseHandleMouseDown = useCallback((e: React.MouseEvent, handle: { phaseId: string; handleType: string; adjacentPhaseId?: string }) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!timelineRef.current) return;
    
    const phase = items.find(item => item.id === handle.phaseId);
    const adjacentPhase = handle.adjacentPhaseId ? items.find(item => item.id === handle.adjacentPhaseId) : null;
    
    if (!phase) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    
    if (handle.handleType === 'adjust-both' && adjacentPhase) {
      setDragState({
        type: 'boundary',
        startX,
        boundaryData: {
          leftPhaseId: handle.phaseId,
          rightPhaseId: adjacentPhase.id,
          originalLeftEnd: new Date(phase.endDate),
          originalRightStart: new Date(adjacentPhase.startDate)
        }
      });
    } else {
      // For extend handles, use regular resize behavior
      const resizeType = handle.handleType === 'extend-left' ? 'resize-start' : 'resize-end';
      setDragState({
        type: resizeType,
        itemId: phase.id,
        startX,
        originalStart: new Date(phase.startDate),
        originalEnd: new Date(phase.endDate)
      });
    }
  }, [items]);

  // Handle keyboard shortcuts for quick actions
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (hoveredHandle && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const phase = items.find(item => item.id === hoveredHandle.phaseId);
      if (phase) {
        const handle = phaseHandles.find(h => 
          h.phaseId === hoveredHandle.phaseId && 
          h.handleType === hoveredHandle.handleType
        );
        if (handle) {
          handlePhaseAction(handle);
        }
      }
    }
  }, [hoveredHandle, items, phaseHandles, handlePhaseAction]);

  // Add keyboard event listeners for shortcuts
  useEffect(() => {
    if (hoveredHandle) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [hoveredHandle, handleKeyDown]);

  // Add global mouse events
  useEffect(() => {
    if (dragState.type) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMouseMove(e as any);
      };
      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [dragState.type, handleMouseMove, handleMouseUp]);

  return (
    <div 
      className={`interactive-timeline ${className}`}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: mode === 'roadmap' ? height : height + 40, // Extra space for labels only in non-roadmap modes
        overflow: 'visible', // Allow handles to show above
        cursor: mode === 'brush' ? 'crosshair' : 'default',
        ...style 
      }}
    >
      {/* Timeline container */}
      <div
        ref={timelineRef}
        className="timeline-container"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '100%', // Ensure it doesn't exceed container
          height: height,
          backgroundColor: 'transparent',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          overflow: 'visible', // Allow handles to show above within timeline bounds
          paddingTop: mode === 'phase-manager' ? '30px' : '0px' // Space for handles (not needed in roadmap mode)
        }}
        onMouseDown={(e) => handleMouseDown(e)}
        onDoubleClick={(e) => handleDoubleClick(e)}
      >
        {/* Grid lines */}
        {gridLines.map((line, index) => {
          const position = ((line.date.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24)) * viewport.pixelsPerDay;
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: position,
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: line.type === 'major' ? 'hsl(var(--muted))' : 'hsl(var(--muted) / 0.8)',
                opacity: line.type === 'major' ? 0.8 : 0.5
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -25,
                  left: 2,
                  fontSize: '10px',
                  color: line.type === 'major' ? '#374151' : '#6b7280',
                  fontWeight: line.type === 'major' ? 500 : 400,
                  whiteSpace: 'nowrap',
                  maxWidth: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {line.label}
              </div>
            </div>
          );
        })}

        {/* Today line */}
        {showToday && (
          (() => {
            const today = new Date();
            const todayPosition = ((today.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24)) * viewport.pixelsPerDay;
            
            if (todayPosition >= 0 && todayPosition <= timelineWidth) {
              return (
                <div
                  style={{
                    position: 'absolute',
                    left: todayPosition,
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: 'hsl(var(--destructive))',
                    opacity: 0.8,
                    zIndex: 10
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -20,
                      left: -15,
                      fontSize: '10px',
                      color: '#ef4444',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Today
                  </div>
                </div>
              );
            }
            return null;
          })()
        )}

        {/* Dependency Lines */}
        {dependencyLines.map((line, index) => {
          const { startPoint, endPoint, dependency } = line;
          
          // Calculate line path - use simple straight line for now, can enhance with curved paths later
          const pathData = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
          
          // Get line color based on dependency type
          const getLineColor = (type: string) => {
            switch (type) {
              case 'FS': return '#3b82f6'; // blue for finish-to-start
              case 'SS': return '#10b981'; // green for start-to-start  
              case 'FF': return '#f59e0b'; // orange for finish-to-finish
              case 'SF': return '#8b5cf6'; // purple for start-to-finish
              default: return '#6b7280'; // gray for unknown
            }
          };
          
          const lineColor = getLineColor(dependency.dependencyType);
          
          return (
            <svg
              key={`dependency-${dependency.id || index}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2 // Above phase bars but below handles
              }}
            >
              {/* Main dependency line */}
              <path
                d={pathData}
                stroke={lineColor}
                strokeWidth="2"
                fill="none"
                strokeDasharray={dependency.lagDays && dependency.lagDays > 0 ? "5,3" : undefined}
                opacity="0.8"
              />
              
              {/* Arrow head at end point */}
              <polygon
                points={`${endPoint.x-6},${endPoint.y-3} ${endPoint.x},${endPoint.y} ${endPoint.x-6},${endPoint.y+3}`}
                fill={lineColor}
                opacity="0.8"
              />
              
              {/* Dependency type label at midpoint */}
              <text
                x={(startPoint.x + endPoint.x) / 2}
                y={(startPoint.y + endPoint.y) / 2 - 8}
                fontSize="10"
                fill={lineColor}
                textAnchor="middle"
                fontWeight="600"
                style={{ userSelect: 'none' }}
              >
                {dependency.dependencyType}{dependency.lagDays ? `+${dependency.lagDays}d` : ''}
              </text>
            </svg>
          );
        })}

        {/* Timeline items */}
        {items.map((item) => {
          const basePosition = calculateItemPosition(item, viewport);
          const isHovered = hoverItemId === item.id;
          const isBeingDragged = dragState.itemId === item.id;
          
          // Check if this is an adjacent phase being affected by drag
          const isAdjacentPhase = dragState.adjacentPhases?.updates && (
            (dragState.adjacentPhases.updates.previous?.id === item.id) ||
            (dragState.adjacentPhases.updates.next?.id === item.id)
          );
          
          // Check if this phase is part of the cascading shift
          const shiftedPhaseInfo = dragState.adjacentPhases?.shiftedPhases?.find(sp => sp.id === item.id);
          const isShiftedPhase = !!shiftedPhaseInfo;
          
          // Calculate actual position - if being dragged or affected, show at new position
          let position = basePosition;
          if (isBeingDragged && dragState.currentX !== undefined && dragState.startX !== undefined) {
            if (dragState.type === 'move') {
              // For move, shift the entire item
              const deltaX = dragState.currentX - dragState.startX;
              position = {
                ...basePosition,
                left: basePosition.left + deltaX,
                width: basePosition.width
              };
            } else if ((dragState.type === 'resize-start' || dragState.type === 'resize-end') && dragState.previewStart && dragState.previewEnd) {
              // For resize, use the preview dates to calculate new position
              const previewPosition = calculateItemPosition({
                ...item,
                startDate: dragState.previewStart,
                endDate: dragState.previewEnd
              }, viewport);
              position = previewPosition;
            }
          } else if (isAdjacentPhase && dragState.adjacentPhases?.updates) {
            // Show adjacent phases in their new positions during drag
            if (dragState.adjacentPhases.updates.previous?.id === item.id) {
              const { newEndDate } = dragState.adjacentPhases.updates.previous;
              const previewPosition = calculateItemPosition({
                ...item,
                endDate: newEndDate
              }, viewport);
              position = previewPosition;
            } else if (dragState.adjacentPhases.updates.next?.id === item.id) {
              const { newStartDate } = dragState.adjacentPhases.updates.next;
              const duration = item.endDate.getTime() - item.startDate.getTime();
              const newEndDate = new Date(newStartDate.getTime() + duration);
              const previewPosition = calculateItemPosition({
                ...item,
                startDate: newStartDate,
                endDate: newEndDate
              }, viewport);
              position = previewPosition;
            }
          } else if (isShiftedPhase && shiftedPhaseInfo) {
            // Show shifted phases in their new positions during drag
            const previewPosition = calculateItemPosition({
              ...item,
              startDate: shiftedPhaseInfo.newStartDate,
              endDate: shiftedPhaseInfo.newEndDate
            }, viewport);
            position = previewPosition;
          }
          
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: position.left,
                width: position.width,
                top: 8,
                height: height - 16,
                backgroundColor: item.color || 'hsl(var(--primary))',
                border: (isAdjacentPhase || isShiftedPhase) ? '2px dashed rgba(0,0,0,0.3)' : '1px solid rgba(0,0,0,0.1)',
                borderRadius: '4px',
                cursor: mode === 'brush' ? 'crosshair' : 'pointer',
                opacity: isBeingDragged ? 0.9 : ((isAdjacentPhase || isShiftedPhase) ? 0.7 : 1),
                transform: isBeingDragged ? 'translateY(-2px) scale(1.02)' : (isHovered ? 'translateY(-1px)' : 'none'),
                boxShadow: isBeingDragged ? '0 8px 24px rgba(0,0,0,0.2)' : (isHovered ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'),
                transition: (isBeingDragged || isAdjacentPhase || isShiftedPhase) ? 'none' : 'all 0.2s ease',
                zIndex: isHovered || isBeingDragged || isAdjacentPhase || isShiftedPhase ? 5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 500,
                overflow: 'hidden',
                userSelect: 'none'
              }}
              onMouseDown={(e) => handleMouseDown(e, item.id, 'move')}
              onDoubleClick={(e) => handleDoubleClick(e, item.id)}
              onContextMenu={(e) => handleRightClick(e, item.id)}
              onMouseEnter={(e) => {
                setHoverItemId(item.id);
                if ((mode === 'phase-manager' || mode === 'roadmap') && item.data) {
                  const rect = timelineRef.current?.getBoundingClientRect();
                  if (rect) {
                    const phase = item.data as any;
                    const startDate = new Date(phase.start_date);
                    const endDate = new Date(phase.end_date);
                    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // Calculate working days (excluding weekends)
                    const workingDays = Math.ceil(duration * 5/7); // Rough estimate
                    
                    // Calculate tooltip position using viewport coordinates (fixed positioning)
                    const tooltipWidth = 280; // Increased for more content
                    const tooltipHeight = 250; // Increased for additional sections - was too small
                    
                    // Use global mouse coordinates for fixed positioning
                    const tooltipX = e.clientX + 10;
                    const tooltipY = e.clientY - 10;
                    
                    // Adjust if tooltip would go off-screen
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    
                    let finalX = tooltipX;
                    let finalY = tooltipY;
                    
                    // Position tooltip to the left if it would overflow on the right
                    if (tooltipX + tooltipWidth > viewportWidth) {
                      finalX = e.clientX - tooltipWidth - 10;
                    }
                    
                    // Position tooltip below if it would overflow at the top
                    if (tooltipY + tooltipHeight > viewportHeight) {
                      finalY = e.clientY - tooltipHeight - 10;
                    }
                    
                    // Ensure tooltip stays within viewport bounds
                    finalX = Math.max(5, Math.min(finalX, viewportWidth - tooltipWidth - 5));
                    finalY = Math.max(5, Math.min(finalY, viewportHeight - tooltipHeight - 5));
                    
                    setTooltip({
                      visible: true,
                      x: finalX,
                      y: finalY,
                      content: (
                        <div style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.92)',
                          color: 'white',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          minWidth: '280px',
                          maxWidth: '350px',
                          minHeight: '200px',
                          maxHeight: '400px',
                          overflow: 'visible',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          lineHeight: '1.4'
                        }}>
                          {/* Phase Header */}
                          <div style={{ 
                            fontWeight: 700, 
                            marginBottom: '8px', 
                            fontSize: '14px',
                            color: '#ffffff',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                            paddingBottom: '6px'
                          }}>
                            {phase.phase_name}
                          </div>
                          
                          {/* Project Context */}
                          {phase.projectId && (
                            <div style={{ 
                              fontSize: '11px', 
                              opacity: 0.8, 
                              marginBottom: '8px',
                              fontStyle: 'italic'
                            }}>
                              Project ID: {phase.projectId}
                            </div>
                          )}
                          
                          {/* Timeline Information */}
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ marginBottom: '2px' }}>
                              <span style={{ opacity: 0.8 }}>Start:</span> {format(startDate, 'MMM dd, yyyy (EEE)')}
                            </div>
                            <div style={{ marginBottom: '2px' }}>
                              <span style={{ opacity: 0.8 }}>End:</span> {format(endDate, 'MMM dd, yyyy (EEE)')}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              fontSize: '12px',
                              marginTop: '4px'
                            }}>
                              <span><span style={{ opacity: 0.8 }}>Duration:</span> {duration} days</span>
                              <span style={{ opacity: 0.7 }}>~{workingDays} work days</span>
                            </div>
                          </div>
                          
                          {/* Phase Description */}
                          {(phase.phase_description || phase.description) && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ 
                                fontSize: '11px', 
                                opacity: 0.8, 
                                fontWeight: 600,
                                marginBottom: '3px'
                              }}>
                                Description:
                              </div>
                              <div style={{ 
                                fontSize: '12px',
                                opacity: 0.9,
                                fontStyle: 'italic'
                              }}>
                                {phase.phase_description || phase.description}
                              </div>
                            </div>
                          )}
                          
                          {/* Phase Notes */}
                          {phase.notes && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ 
                                fontSize: '11px', 
                                opacity: 0.8, 
                                fontWeight: 600,
                                marginBottom: '3px'
                              }}>
                                Notes:
                              </div>
                              <div style={{ 
                                fontSize: '12px',
                                opacity: 0.9,
                                fontStyle: 'italic'
                              }}>
                                {phase.notes}
                              </div>
                            </div>
                          )}
                          
                          {/* Phase Order/Sequence */}
                          {(phase.phase_order || phase.order_index) && (
                            <div style={{ 
                              fontSize: '11px', 
                              opacity: 0.7,
                              marginBottom: '8px'
                            }}>
                              Phase #{phase.phase_order || phase.order_index} in project sequence
                            </div>
                          )}
                          
                          {/* Dependencies Info */}
                          {(phase.dependencies && phase.dependencies.length > 0) && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ 
                                fontSize: '11px', 
                                opacity: 0.8, 
                                fontWeight: 600,
                                marginBottom: '3px'
                              }}>
                                Dependencies:
                              </div>
                              <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                {phase.dependencies.length} dependency/dependencies
                              </div>
                            </div>
                          )}
                          
                          {/* Action Hints */}
                          <div style={{ 
                            fontSize: '10px', 
                            opacity: 0.6, 
                            marginTop: '10px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            paddingTop: '6px',
                            textAlign: 'center'
                          }}>
                            {mode === 'phase-manager' ? 
                              'Double-click to edit • Right-click for options' : 
                              'Click to view project details'
                            }
                          </div>
                        </div>
                      )
                    });
                  }
                }
              }}
              onMouseLeave={() => {
                setHoverItemId(null);
                setTooltip({ visible: false, x: 0, y: 0, content: null });
              }}
              onMouseMove={(e) => {
                if ((mode === 'phase-manager' || mode === 'roadmap') && item.data && tooltip.visible) {
                  // Calculate tooltip position using viewport coordinates (fixed positioning)
                  const tooltipWidth = 280; // Updated for enhanced tooltip
                  const tooltipHeight = 250; // Updated for enhanced tooltip - was too small
                  
                  // Use global mouse coordinates for fixed positioning
                  const tooltipX = e.clientX + 10;
                  const tooltipY = e.clientY - 10;
                  
                  // Adjust if tooltip would go off-screen
                  const viewportWidth = window.innerWidth;
                  const viewportHeight = window.innerHeight;
                  
                  let finalX = tooltipX;
                  let finalY = tooltipY;
                  
                  // Position tooltip to the left if it would overflow on the right
                  if (tooltipX + tooltipWidth > viewportWidth) {
                    finalX = e.clientX - tooltipWidth - 10;
                  }
                  
                  // Position tooltip below if it would overflow at the top
                  if (tooltipY + tooltipHeight > viewportHeight) {
                    finalY = e.clientY - tooltipHeight - 10;
                  }
                  
                  // Ensure tooltip stays within viewport bounds
                  finalX = Math.max(5, Math.min(finalX, viewportWidth - tooltipWidth - 5));
                  finalY = Math.max(5, Math.min(finalY, viewportHeight - tooltipHeight - 5));
                  
                  setTooltip(prev => ({
                    ...prev,
                    x: finalX,
                    y: finalY
                  }));
                }
              }}
            >
              {/* Item name */}
              <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {item.name}
              </span>

              {/* Resize handles for phase management modes */}
              {(mode === 'phase-manager' || mode === 'roadmap') && position.width > 40 && (
                <>
                  {/* Left resize handle */}
                  <div
                    style={{
                      position: 'absolute',
                      left: -2,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      cursor: 'ew-resize',
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity 0.2s ease'
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, item.id, 'resize-start');
                    }}
                  />
                  
                  {/* Right resize handle */}
                  <div
                    style={{
                      position: 'absolute',
                      right: -2,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      cursor: 'ew-resize',
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity 0.2s ease'
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, item.id, 'resize-end');
                    }}
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Visual handles for phase boundary actions - new intuitive approach */}
        {(mode === 'phase-manager' || mode === 'roadmap') && phaseHandles.map((handle) => {
          const isHovered = hoveredHandle && 
            hoveredHandle.phaseId === handle.phaseId && 
            hoveredHandle.handleType === handle.handleType;
          
          // console.log('🎨 Rendering handle:', { id: handle.id, type: handle.handleType, isHovered, x: handle.x });
          
          // Get handle appearance based on type - positioned above the phases
          const getHandleStyle = () => {
            const baseStyle = {
              position: 'absolute' as const,
              left: handle.x - 12, // 24px wide zone (±12px from center) - smaller
              width: 24,
              top: 5, // Position within the 30px padding at top
              height: 20, // Much smaller height
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 8,
              transition: 'all 0.2s ease, opacity 0.15s ease-out',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              opacity: 1
            };
            
            if (handle.handleType === 'extend-left') {
              return {
                ...baseStyle,
                backgroundColor: isHovered ? 'hsl(142 71% 45%)' : 'hsl(142 71% 55%)',
                color: 'white',
                border: 'none',
                boxShadow: isHovered ? '0 2px 8px rgba(16, 185, 129, 0.4)' : '0 1px 4px rgba(16, 185, 129, 0.3)',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
              };
            } else if (handle.handleType === 'extend-right') {
              return {
                ...baseStyle,
                backgroundColor: isHovered ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.9)',
                color: 'white',
                border: 'none',
                boxShadow: isHovered ? '0 2px 8px rgba(59, 130, 246, 0.4)' : '0 1px 4px rgba(59, 130, 246, 0.3)',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
              };
            } else { // adjust-both
              return {
                ...baseStyle,
                backgroundColor: isHovered ? 'hsl(262 83% 58%)' : 'hsl(262 83% 68%)',
                color: 'white',
                border: 'none',
                boxShadow: isHovered ? '0 2px 8px rgba(168, 85, 247, 0.4)' : '0 1px 4px rgba(168, 85, 247, 0.3)',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)'
              };
            }
          };
          
          // Get handle icon and text
          const getHandleContent = () => {
            if (handle.handleType === 'extend-left') {
              return {
                icon: '←',
                text: 'Extend Left',
                color: '#10b981'
              };
            } else if (handle.handleType === 'extend-right') {
              return {
                icon: '→',
                text: 'Extend Right', 
                color: '#3b82f6'
              };
            } else {
              return {
                icon: '↔',
                text: 'Adjust Both',
                color: '#a855f7'
              };
            }
          };
          
          const content = getHandleContent();
          
          return (
            <div
              key={handle.id}
              style={getHandleStyle()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // console.log('🎯 Handle clicked:', handle);
                if (!dragState.type) {
                  handlePhaseAction(handle);
                }
              }}
              onMouseDown={(e) => {
                if (handle.handleType === 'adjust-both') {
                  handlePhaseHandleMouseDown(e, handle);
                }
              }}
              title={`${content.text} - Click to apply or drag to adjust`}
            >
              {/* Handle icon - compact design */}
              <span style={{
                fontSize: isHovered ? '14px' : '12px',
                lineHeight: 1,
                transition: 'all 0.2s ease'
              }}>
                {content.icon}
              </span>
            </div>
          );
        })}


        {/* Brush overlay for brush mode */}
        {mode === 'brush' && brushRange && (
          <div
            style={{
              position: 'absolute',
              left: brushRange.start * viewport.pixelsPerDay,
              width: (brushRange.end - brushRange.start) * viewport.pixelsPerDay,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              border: '2px solid #3b82f6',
              borderRadius: '4px',
              pointerEvents: 'none'
            }}
          />
        )}

      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 9999,
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Handle tooltip - shows keyboard shortcut hint */}
      {hoveredHandle && (
        <div
          style={{
            position: 'absolute',
            left: hoveredHandle.position - 50,
            top: 5, // Position above the timeline, below the handles
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          Press Enter or Space to apply
        </div>
      )}
    </div>
  );
}

export default InteractiveTimeline;