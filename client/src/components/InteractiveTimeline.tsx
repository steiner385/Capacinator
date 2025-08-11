import React, { useState, useRef, useCallback, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

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

export interface InteractiveTimelineProps {
  items: TimelineItem[];
  viewport: TimelineViewport;
  height?: number;
  
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
  const startDays = Math.floor((item.startDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24));
  const endDays = Math.floor((item.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    left: startDays * viewport.pixelsPerDay,
    width: Math.max((endDays - startDays) * viewport.pixelsPerDay, 20), // Minimum width
    startDays,
    endDays
  };
};

const dateFromPixelPosition = (pixelX: number, viewport: TimelineViewport): Date => {
  const days = Math.round(pixelX / viewport.pixelsPerDay);
  return addDays(viewport.startDate, days);
};

export function InteractiveTimeline({
  items,
  viewport,
  height = 60,
  mode,
  brushRange,
  onBrushChange,
  onItemAdd,
  onItemEdit,
  onItemDelete,
  onItemMove,
  onItemResize,
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
    type: 'move' | 'resize-start' | 'resize-end' | 'brush' | null;
    itemId?: string;
    startX?: number;
    originalStart?: Date;
    originalEnd?: Date;
    previewStart?: Date;
    previewEnd?: Date;
  }>({ type: null });
  
  const [hoverItemId, setHoverItemId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: React.ReactNode;
  }>({ visible: false, x: 0, y: 0, content: null });

  // Calculate timeline width - use container width when available for precise alignment
  const calculateTimelineWidth = () => {
    // If we have a container, use its actual width for perfect alignment
    if (timelineRef.current?.parentElement) {
      const containerWidth = timelineRef.current.parentElement.getBoundingClientRect().width;
      if (containerWidth > 0) {
        return containerWidth;
      }
    }
    
    // Fallback to natural width based on viewport
    const naturalWidth = (viewport.endDate.getTime() - viewport.startDate.getTime()) / (1000 * 60 * 60 * 24) * viewport.pixelsPerDay;
    return Math.max(naturalWidth, 200); // Reduced minimum for better alignment
  };
  
  const [timelineWidth, setTimelineWidth] = useState(400); // Start with default
  
  // Recalculate width when container resizes or viewport changes
  useEffect(() => {
    const updateWidth = () => {
      const newWidth = calculateTimelineWidth();
      setTimelineWidth(newWidth);
      console.log('📏 InteractiveTimeline width updated:', newWidth);
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
      intervalId = setInterval(updateWidth, 1000); // Check every second as last resort
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
  }, [viewport]);

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
        setDragState({
          type: action || 'move',
          itemId,
          startX,
          originalStart: new Date(item.startDate),
          originalEnd: new Date(item.endDate)
        });
      }
    }
  }, [mode, items]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.type || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const deltaX = currentX - (dragState.startX || 0);
    const deltaDays = Math.round(deltaX / viewport.pixelsPerDay);
    
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
        newStartDate = addDays(dragState.originalStart, deltaDays);
        newEndDate = addDays(dragState.originalEnd, deltaDays);
      } else if (dragState.type === 'resize-start') {
        newStartDate = addDays(dragState.originalStart, deltaDays);
        // Ensure minimum duration
        if ((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24) < minItemDuration) {
          newStartDate = addDays(newEndDate, -minItemDuration);
        }
      } else if (dragState.type === 'resize-end') {
        newEndDate = addDays(dragState.originalEnd, deltaDays);
        // Ensure minimum duration
        if ((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24) < minItemDuration) {
          newEndDate = addDays(newStartDate, minItemDuration);
        }
      }
      
      // Update preview dates for visual feedback
      setDragState(prev => ({
        ...prev,
        previewStart: newStartDate,
        previewEnd: newEndDate
      }));
      
      // Check for overlaps if not allowed
      if (!allowOverlap) {
        // TODO: Implement overlap prevention logic
      }
      
      // Trigger appropriate callback
      if (dragState.type === 'move' && onItemMove) {
        onItemMove(dragState.itemId, newStartDate, newEndDate);
      } else if ((dragState.type === 'resize-start' || dragState.type === 'resize-end') && onItemResize) {
        onItemResize(dragState.itemId, newStartDate, newEndDate);
      }
    }
  }, [dragState, viewport, onBrushChange, onItemMove, onItemResize, minItemDuration, allowOverlap]);

  const handleMouseUp = useCallback(() => {
    setDragState({ type: null });
  }, []);

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
        height: height + 40, // Extra space for labels
        overflow: 'hidden',
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
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          overflow: 'hidden' // Prevent content from overflowing
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
                backgroundColor: line.type === 'major' ? '#cbd5e1' : '#e2e8f0',
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
                    backgroundColor: '#ef4444',
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

        {/* Timeline items */}
        {items.map((item) => {
          const position = calculateItemPosition(item, viewport);
          const isHovered = hoverItemId === item.id;
          const isBeingDragged = dragState.itemId === item.id;
          
          return (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                left: position.left,
                width: position.width,
                top: 8,
                height: height - 16,
                backgroundColor: item.color || '#3b82f6',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '4px',
                cursor: mode === 'brush' ? 'crosshair' : 'pointer',
                opacity: isBeingDragged ? 0.7 : 1,
                transform: isHovered ? 'translateY(-1px)' : 'none',
                boxShadow: isHovered ? '0 4px 8px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
                transition: isBeingDragged ? 'none' : 'all 0.2s ease',
                zIndex: isHovered || isBeingDragged ? 5 : 1,
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
                if (mode === 'phase-manager' && item.data) {
                  const rect = timelineRef.current?.getBoundingClientRect();
                  if (rect) {
                    const phase = item.data as any;
                    const startDate = new Date(phase.start_date);
                    const endDate = new Date(phase.end_date);
                    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // Calculate tooltip position with boundary checking
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    const tooltipWidth = 200; // minWidth from style
                    const tooltipHeight = 120; // estimated height
                    
                    // Position tooltip to the left if it would overflow on the right
                    let tooltipX = mouseX + 10;
                    if (tooltipX + tooltipWidth > rect.width) {
                      tooltipX = mouseX - tooltipWidth - 10;
                    }
                    
                    // Position tooltip below if it would overflow at the top
                    let tooltipY = mouseY - 10;
                    if (tooltipY < 0) {
                      tooltipY = mouseY + 20;
                    }
                    
                    // Ensure tooltip doesn't go beyond container bounds
                    tooltipX = Math.max(5, Math.min(tooltipX, rect.width - tooltipWidth - 5));
                    tooltipY = Math.max(5, Math.min(tooltipY, rect.height - tooltipHeight - 5));
                    
                    setTooltip({
                      visible: true,
                      x: tooltipX,
                      y: tooltipY,
                      content: (
                        <div style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.9)',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          minWidth: '200px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{phase.phase_name}</div>
                          <div>Start: {format(startDate, 'MMM dd, yyyy')}</div>
                          <div>End: {format(endDate, 'MMM dd, yyyy')}</div>
                          <div>Duration: {duration} days</div>
                          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                            Double-click to edit • Right-click for options
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
                if (mode === 'phase-manager' && item.data && tooltip.visible) {
                  const rect = timelineRef.current?.getBoundingClientRect();
                  if (rect) {
                    // Calculate tooltip position with boundary checking for mouse move
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;
                    const tooltipWidth = 200; // minWidth from style
                    const tooltipHeight = 120; // estimated height
                    
                    // Position tooltip to the left if it would overflow on the right
                    let tooltipX = mouseX + 10;
                    if (tooltipX + tooltipWidth > rect.width) {
                      tooltipX = mouseX - tooltipWidth - 10;
                    }
                    
                    // Position tooltip below if it would overflow at the top
                    let tooltipY = mouseY - 10;
                    if (tooltipY < 0) {
                      tooltipY = mouseY + 20;
                    }
                    
                    // Ensure tooltip doesn't go beyond container bounds
                    tooltipX = Math.max(5, Math.min(tooltipX, rect.width - tooltipWidth - 5));
                    tooltipY = Math.max(5, Math.min(tooltipY, rect.height - tooltipHeight - 5));
                    
                    setTooltip(prev => ({
                      ...prev,
                      x: tooltipX,
                      y: tooltipY
                    }));
                  }
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

        {/* Preview overlay during drag */}
        {dragState.itemId && dragState.previewStart && dragState.previewEnd && (
          (() => {
            const previewPosition = calculateItemPosition(
              {
                id: 'preview',
                name: '',
                startDate: dragState.previewStart,
                endDate: dragState.previewEnd
              },
              viewport
            );
            
            return (
              <div
                style={{
                  position: 'absolute',
                  left: previewPosition.left,
                  width: previewPosition.width,
                  top: 8,
                  height: height - 16,
                  backgroundColor: 'rgba(59, 130, 246, 0.3)',
                  border: '2px dashed #3b82f6',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: '#1e40af',
                  fontWeight: 600
                }}
              >
                {format(dragState.previewStart, 'MMM dd')} - {format(dragState.previewEnd, 'MMM dd')}
              </div>
            );
          })()
        )}

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
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

export default InteractiveTimeline;