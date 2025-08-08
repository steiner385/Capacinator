import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea, BarChart, Bar, Brush } from 'recharts';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';
import { TimelineViewport } from './InteractiveTimeline';
import VisualPhaseManager from './VisualPhaseManager';
import './InteractiveTimeline.css';

interface ProjectDemandChartProps {
  projectId: string;
  projectName: string;
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  [roleName: string]: any;
}

interface PhaseInfo {
  id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  phase_order: number;
}

type ChartView = 'demand' | 'capacity' | 'gaps';

// Simple Brush Control Component for timeline selection
const SimpleBrushControl = ({ 
  data, 
  brushStart, 
  brushEnd, 
  onBrushChange 
}: {
  data: ChartDataPoint[];
  brushStart: number;
  brushEnd: number;
  onBrushChange: (start: number, end: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    type: 'start' | 'end' | 'range' | null;
    startX: number;
    originalStart: number;
    originalEnd: number;
  }>({ type: null, startX: 0, originalStart: 0, originalEnd: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    
    setDragging({
      type,
      startX,
      originalStart: brushStart,
      originalEnd: brushEnd
    });
  }, [brushStart, brushEnd]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.type || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const deltaX = currentX - dragging.startX;
    const containerWidth = rect.width; // Full container width
    const deltaPercent = (deltaX / containerWidth) * 100;
    const deltaIndex = Math.round((deltaPercent / 100) * (data.length - 1));
    
    let newStart = dragging.originalStart;
    let newEnd = dragging.originalEnd;
    
    if (dragging.type === 'start') {
      newStart = Math.max(0, Math.min(dragging.originalStart + deltaIndex, dragging.originalEnd - 1));
    } else if (dragging.type === 'end') {
      newEnd = Math.min(data.length - 1, Math.max(dragging.originalEnd + deltaIndex, dragging.originalStart + 1));
    } else if (dragging.type === 'range') {
      const rangeSize = dragging.originalEnd - dragging.originalStart;
      newStart = Math.max(0, Math.min(dragging.originalStart + deltaIndex, data.length - 1 - rangeSize));
      newEnd = newStart + rangeSize;
    }
    
    onBrushChange(newStart, newEnd);
  }, [dragging, data.length, onBrushChange])

  const handleMouseUp = useCallback(() => {
    setDragging({ type: null, startX: 0, originalStart: 0, originalEnd: 0 });
  }, []);

  // Add global mouse events
  useEffect(() => {
    if (dragging.type) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging.type, handleMouseMove, handleMouseUp]);

  if (data.length === 0) return null;

  const startPercent = (brushStart / Math.max(1, data.length - 1)) * 100;
  const endPercent = (brushEnd / Math.max(1, data.length - 1)) * 100;
  const rangeWidth = endPercent - startPercent;

  return (
    <div style={{ position: 'relative', height: '60px' }}>
      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          height: '40px',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          margin: '0 20px', // Space for handles that extend beyond
          cursor: 'default',
          overflow: 'visible'
        }}
      >
        {/* Background timeline */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '0',
          right: '0',
          height: '8px',
          backgroundColor: '#cbd5e1',
          borderRadius: '4px'
        }} />
        
        {/* Selected range */}
        <div 
          style={{
            position: 'absolute',
            top: '16px',
            left: `${startPercent}%`,
            width: `${rangeWidth}%`,
            height: '8px',
            backgroundColor: '#3b82f6',
            borderRadius: '4px',
            cursor: 'grab'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'range')}
        />
        
        {/* Start handle */}
        <div 
          style={{
            position: 'absolute',
            top: '6px',
            left: `calc(${startPercent}% - 8px)`,
            width: '16px',
            height: '28px',
            backgroundColor: '#1e40af',
            borderRadius: '8px',
            cursor: 'ew-resize',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          ‖
        </div>
        
        {/* End handle */}
        <div 
          style={{
            position: 'absolute',
            top: '6px',
            left: `calc(${endPercent}% - 8px)`,
            width: '16px',
            height: '28px',
            backgroundColor: '#1e40af',
            borderRadius: '8px',
            cursor: 'ew-resize',
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 10
          }}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          ‖
        </div>
      </div>
      
      {/* Date labels */}
      <div style={{
        position: 'relative',
        height: '20px',
        margin: '0 20px'
      }}>
        <div style={{
          position: 'absolute',
          top: '5px',
          left: `${startPercent}%`,
          fontSize: '11px',
          color: '#6b7280',
          transform: 'translateX(-50%)'
        }}>
          {formatDate(data[brushStart]?.date || '')}
        </div>
        
        <div style={{
          position: 'absolute',
          top: '5px',
          left: `${endPercent}%`,
          fontSize: '11px',
          color: '#6b7280',
          transform: 'translateX(-50%)'
        }}>
          {formatDate(data[brushEnd]?.date || '')}
        </div>
      </div>
    </div>
  );
};

export function ProjectDemandChart({ projectId, projectName }: ProjectDemandChartProps) {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional logic or early returns
  const queryClient = useQueryClient();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; left: number; right: number } | null>(null);
  const [currentView, setCurrentView] = useState<ChartView>('demand');
  const [brushStart, setBrushStart] = useState<number>(0);
  const [brushEnd, setBrushEnd] = useState<number>(0);
  const [sharedViewport, setSharedViewport] = useState<TimelineViewport | null>(null);
  
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ['project-demand', projectId],
    queryFn: async () => {
      const response = await api.demands.getProjectDemands(projectId);
      return response.data;
    }
  });

  // Get project assignments for capacity calculation
  const { data: assignmentsResponse, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['project-assignments', projectId],
    queryFn: async () => {
      const response = await api.assignments.list({ project_id: projectId });
      return response.data;
    }
  });

  // Process data for all three views: demand, capacity, and gaps
  const { demandData, capacityData, gapsData, phases, dateRange } = React.useMemo(() => {
    if (!apiResponse || !apiResponse.phases || !Array.isArray(apiResponse.phases)) {
      return { 
        demandData: [], 
        capacityData: [], 
        gapsData: [], 
        phases: [], 
        dateRange: { start: new Date(), end: new Date() } 
      };
    }

    // Extract phase information for the roadmap overlay
    const phases: PhaseInfo[] = apiResponse.phases.map((phase: any) => ({
      id: phase.phase_id,
      phase_name: phase.phase_name,
      start_date: phase.start_date,
      end_date: phase.end_date,
      phase_order: phase.phase_order
    })).sort((a, b) => a.phase_order - b.phase_order);

    // Find the overall date range for the project
    const allDates = phases.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Create daily data points across the entire project timeline
    const createEmptyTimeline = () => {
      const timeline: { [dateKey: string]: ChartDataPoint } = {};
      const currentDate = new Date(minDate);
      const maxDatePlusOne = new Date(maxDate);
      maxDatePlusOne.setDate(maxDatePlusOne.getDate() + 1);
      
      while (currentDate < maxDatePlusOne) {
        const dateKey = currentDate.toISOString().split('T')[0];
        timeline[dateKey] = {
          date: dateKey,
          timestamp: currentDate.getTime()
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return timeline;
    };

    // 1. DEMAND DATA - convert allocation percentages to FTE
    const demandTimeline = createEmptyTimeline();
    apiResponse.demands.forEach((demand: any) => {
      const phaseStart = new Date(demand.start_date);
      const phaseEnd = new Date(demand.end_date);
      const roleName = demand.role_name;
      const allocation = demand.allocation_percentage || 0;
      
      const currentDay = new Date(phaseStart);
      while (currentDay <= phaseEnd) {
        const dayKey = currentDay.toISOString().split('T')[0];
        if (demandTimeline[dayKey]) {
          if (!demandTimeline[dayKey][roleName]) {
            demandTimeline[dayKey][roleName] = 0;
          }
          demandTimeline[dayKey][roleName] += allocation / 100; // Convert percentage to FTE
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });

    // 2. CAPACITY DATA - calculate from project assignments
    const capacityTimeline = createEmptyTimeline();
    const uniqueRoles = [...new Set(apiResponse.demands.map((d: any) => d.role_name))];
    
    // Calculate capacity from people assigned to this specific project
    if (assignmentsResponse?.data && assignmentsResponse.data.length > 0) {
      assignmentsResponse.data.forEach((assignment: any) => {
        const assignmentStart = new Date(assignment.computed_start_date || assignment.start_date);
        const assignmentEnd = new Date(assignment.computed_end_date || assignment.end_date);
        const roleName = assignment.role_name;
        const allocationPercentage = assignment.allocation_percentage || 0;
        
        // Only include if role is relevant to demand data
        if (roleName && uniqueRoles.includes(roleName)) {
          // Apply allocation across assignment date range
          const currentDay = new Date(assignmentStart);
          while (currentDay <= assignmentEnd) {
            const dayKey = currentDay.toISOString().split('T')[0];
            if (capacityTimeline[dayKey]) {
              if (!capacityTimeline[dayKey][roleName]) {
                capacityTimeline[dayKey][roleName] = 0;
              }
              // Add this person's allocation as FTE to the role's total capacity for this day
              capacityTimeline[dayKey][roleName] += allocationPercentage / 100; // Convert percentage to FTE
            }
            currentDay.setDate(currentDay.getDate() + 1);
          }
        }
      });
    } else {
      // No assignments found - show zero capacity for all roles
      // This makes it clear that there is no capacity assigned to this project
      Object.keys(capacityTimeline).forEach(dateKey => {
        uniqueRoles.forEach(roleName => {
          capacityTimeline[dateKey][roleName] = 0; // Already in FTE (0 people)
        });
      });
    }

    // 3. GAPS DATA - demand minus capacity (shortfalls)
    const gapsTimeline = createEmptyTimeline();
    Object.keys(gapsTimeline).forEach(dateKey => {
      const demandDay = demandTimeline[dateKey];
      const capacityDay = capacityTimeline[dateKey];
      
      // Calculate gaps for each role that has demand
      uniqueRoles.forEach(roleName => {
        const demand = demandDay[roleName] || 0;
        const capacity = capacityDay[roleName] || 0;
        const gap = demand - capacity;
        
        // Only show shortfalls (positive gaps) where demand exceeds capacity
        if (gap > 0) {
          gapsTimeline[dateKey][roleName] = gap; // Already in FTE from calculation above
        }
        // For negative gaps (surplus capacity), we don't show them in this view
        // as it represents resource availability, not shortage
      });
    });

    // Convert to arrays and sort by date
    const demandData = Object.values(demandTimeline).sort((a, b) => a.timestamp - b.timestamp);
    const capacityData = Object.values(capacityTimeline).sort((a, b) => a.timestamp - b.timestamp);
    const gapsData = Object.values(gapsTimeline).sort((a, b) => a.timestamp - b.timestamp);

    return {
      demandData,
      capacityData,
      gapsData,
      phases,
      dateRange: { start: minDate, end: maxDate }
    };
  }, [apiResponse, assignmentsResponse, currentView]);

  // Variable granularity functions (copied from PersonAllocationChart)
  const getGranularity = (startMonth: string, endMonth: string) => {
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    
    if (monthsDiff <= 3) return 'daily';     // 3 months or less: daily
    if (monthsDiff <= 12) return 'weekly';   // 4-12 months: weekly
    if (monthsDiff <= 24) return 'monthly';  // 13-24 months: monthly
    return 'quarterly';                      // > 24 months: quarterly
  };

  // Generate date points based on granularity
  const generateDatePoints = (startMonth: string, endMonth: string, granularity: string) => {
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    end.setMonth(end.getMonth() + 1, 0); // Last day of end month
    
    const points: string[] = [];
    const current = new Date(start);
    
    if (granularity === 'weekly') {
      // Start from the beginning of the week containing the start date
      const startOfWeek = new Date(current);
      startOfWeek.setDate(current.getDate() - current.getDay()); // Go to Sunday
      
      current.setTime(startOfWeek.getTime());
      
      while (current <= end) {
        points.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 7); // Add 7 days for weekly
      }
    } else if (granularity === 'daily') {
      while (current <= end) {
        points.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else { // monthly or quarterly
      while (current <= end) {
        const year = current.getFullYear();
        const month = (current.getMonth() + 1).toString().padStart(2, '0');
        points.push(`${year}-${month}`);
        
        if (granularity === 'quarterly') {
          current.setMonth(current.getMonth() + 3);
        } else {
          current.setMonth(current.getMonth() + 1);
        }
      }
    }
    
    return points.sort();
  };

  // Get unique roles for stacked areas (must be defined before processedDataWithGranularity)
  const allRoles = React.useMemo(() => {
    return [...new Set(demandData.flatMap(d => 
      Object.keys(d).filter(key => 
        !['date', 'timestamp'].includes(key)
      )
    ))];
  }, [demandData]); // Use demandData to get all roles consistently

  // Process data with variable granularity - convert daily data to appropriate granularity
  const processedDataWithGranularity = React.useMemo(() => {
    const baseData = (() => {
      switch (currentView) {
        case 'demand': return demandData;
        case 'capacity': return capacityData;
        case 'gaps': return gapsData;
        default: return demandData;
      }
    })();

    if (baseData.length === 0) return [];

    // Determine appropriate granularity based on date range
    const startDate = new Date(baseData[0].date);
    const endDate = new Date(baseData[baseData.length - 1].date);
    const startMonth = startDate.getFullYear() + '-' + (startDate.getMonth() + 1).toString().padStart(2, '0');
    const endMonth = endDate.getFullYear() + '-' + (endDate.getMonth() + 1).toString().padStart(2, '0');
    const granularity = getGranularity(startMonth, endMonth);

    // If already daily and that's appropriate, return as-is
    if (granularity === 'daily') {
      return baseData.map(d => ({ ...d, granularity }));
    }

    // Aggregate data based on granularity
    const datePoints = generateDatePoints(startMonth, endMonth, granularity);
    
    return datePoints.map(datePoint => {
      let periodStart: Date;
      let periodEnd: Date;
      let displayDate: string;
      
      if (granularity === 'weekly') {
        const pointDate = new Date(datePoint);
        periodStart = new Date(pointDate);
        periodEnd = new Date(pointDate);
        periodEnd.setDate(periodEnd.getDate() + 6);
        displayDate = datePoint;
      } else if (granularity === 'monthly') {
        const [year, monthNum] = datePoint.split('-').map(Number);
        periodStart = new Date(year, monthNum - 1, 1);
        periodEnd = new Date(year, monthNum, 0); // Last day of month
        displayDate = datePoint;
      } else { // quarterly
        const [year, monthNum] = datePoint.split('-').map(Number);
        periodStart = new Date(year, monthNum - 1, 1);
        periodEnd = new Date(year, monthNum - 1 + 3, 0); // Last day of quarter
        displayDate = datePoint;
      }
      
      // Aggregate data for this period by averaging daily values
      const periodData: ChartDataPoint = {
        date: displayDate,
        timestamp: periodStart.getTime(),
        granularity
      };
      
      // For each role, calculate average value over the period
      allRoles.forEach(role => {
        const relevantDays = baseData.filter(d => {
          const dayDate = new Date(d.date);
          return dayDate >= periodStart && dayDate <= periodEnd;
        });
        
        if (relevantDays.length > 0) {
          const totalValue = relevantDays.reduce((sum, day) => sum + (day[role] || 0), 0);
          periodData[role] = totalValue / relevantDays.length; // Average over the period
        } else {
          periodData[role] = 0;
        }
      });
      
      return periodData;
    });
  }, [demandData, capacityData, gapsData, currentView, allRoles]);

  // Handle brush changes from InteractiveTimeline
  const handleBrushChange = React.useCallback((start: number, end: number) => {
    setBrushStart(start);
    setBrushEnd(end);
    
    // Update shared viewport when brush changes
    if (processedDataWithGranularity.length > 0) {
      const startIndex = Math.max(0, Math.min(start, end));
      const endIndex = Math.min(processedDataWithGranularity.length - 1, Math.max(start, end));
      
      if (startIndex < processedDataWithGranularity.length && endIndex < processedDataWithGranularity.length) {
        const startDate = new Date(processedDataWithGranularity[startIndex].date);
        const endDate = new Date(processedDataWithGranularity[endIndex].date);
        
        // Calculate appropriate pixels per day for the selected range
        const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const pixelsPerDay = Math.max(1, Math.min(20, 1400 / totalDays));
        
        setSharedViewport({
          startDate,
          endDate,
          pixelsPerDay
        });
      }
    }
  }, [processedDataWithGranularity]);

  // Handle viewport changes from VisualPhaseManager
  const handleViewportChange = React.useCallback((viewport: TimelineViewport) => {
    setSharedViewport(viewport);
    
    // Update brush range to match the viewport if we have data
    if (processedDataWithGranularity.length > 0) {
      // Find the data indices that correspond to the viewport dates
      const startIndex = processedDataWithGranularity.findIndex(d => new Date(d.date) >= viewport.startDate);
      const endIndex = processedDataWithGranularity.findIndex(d => new Date(d.date) >= viewport.endDate);
      
      if (startIndex !== -1) {
        const actualEndIndex = endIndex !== -1 ? endIndex - 1 : processedDataWithGranularity.length - 1;
        setBrushStart(Math.max(0, startIndex));
        setBrushEnd(Math.max(0, actualEndIndex));
      }
    }
  }, [processedDataWithGranularity]);

  // Initialize brush range and shared viewport when data loads
  React.useEffect(() => {
    if (processedDataWithGranularity.length > 0 && brushEnd === 0) {
      const initialStart = Math.max(0, Math.floor(processedDataWithGranularity.length * 0.1));
      const initialEnd = processedDataWithGranularity.length - 1;
      setBrushStart(initialStart);
      setBrushEnd(initialEnd);
      
      // Initialize shared viewport if not already set
      if (!sharedViewport) {
        const startDate = new Date(processedDataWithGranularity[0].date);
        const endDate = new Date(processedDataWithGranularity[processedDataWithGranularity.length - 1].date);
        const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        setSharedViewport({
          startDate,
          endDate,
          pixelsPerDay: Math.max(1, Math.min(12, 1400 / totalDays))
        });
      }
    }
  }, [processedDataWithGranularity, brushEnd, sharedViewport]);

  // Create filtered data based on brush selection
  const displayData = React.useMemo(() => {
    if (processedDataWithGranularity.length === 0 || brushStart === brushEnd) return processedDataWithGranularity;
    const start = Math.max(0, Math.min(brushStart, brushEnd));
    const end = Math.min(processedDataWithGranularity.length - 1, Math.max(brushStart, brushEnd));
    return processedDataWithGranularity.slice(start, end + 1);
  }, [processedDataWithGranularity, brushStart, brushEnd]);

  // Get current dataset for display
  const currentData = displayData;



  // Measure chart dimensions after render for precise alignment
  useEffect(() => {
    if (!chartContainerRef.current || currentData.length === 0) return;
    
    const measureChart = () => {
      const container = chartContainerRef.current;
      if (!container) return;
      
      // Find the actual chart area (SVG) within the ResponsiveContainer
      const svg = container.querySelector('svg');
      if (!svg) return;
      
      // Find the actual plotting area by looking for X-axis ticks
      const xAxisGroup = svg.querySelector('.recharts-xAxis');
      const plotArea = svg.querySelector('.recharts-cartesian-grid');
      
      if (xAxisGroup && plotArea) {
        const containerRect = container.getBoundingClientRect();
        const plotRect = plotArea.getBoundingClientRect();
        
        // DEBUGGING: Inspect actual Recharts tick positions
        const ticks = xAxisGroup.querySelectorAll('.recharts-cartesian-axis-tick');
        console.log('🔍 RECHARTS TICK ANALYSIS:');
        console.log(`Found ${ticks.length} X-axis ticks`);
        
        ticks.forEach((tick, index) => {
          const tickRect = tick.getBoundingClientRect();
          const relativeX = tickRect.left - plotRect.left;
          const percentageX = (relativeX / plotRect.width) * 100;
          
          // Get the tick's text content (date)
          const textElement = tick.querySelector('text');
          const tickText = textElement ? textElement.textContent : 'N/A';
          
          console.log(`Tick ${index}: "${tickText}" at ${relativeX.toFixed(1)}px = ${percentageX.toFixed(1)}%`);
          
          // Compare with our calculated positions for key dates
          if (index === 0) {
            console.log(`  → First tick (should align with Business Planning start)`);
          } else if (index === ticks.length - 1) {
            console.log(`  → Last tick (should align with Cutover end)`);
          }
        });
        
        console.log(`Plot area: ${plotRect.width.toFixed(1)}px wide`);
        
        // Calculate precise positioning based on actual plot area
        setChartDimensions({
          width: plotRect.width,
          left: plotRect.left - containerRect.left,
          right: plotRect.right - containerRect.left
        });
        
        console.log('Chart dimensions measured:', {
          containerWidth: containerRect.width,
          plotWidth: plotRect.width,
          plotLeft: plotRect.left - containerRect.left,
          plotRight: plotRect.right - containerRect.left
        });
      }
    };
    
    // Measure after a longer delay to ensure Recharts is fully rendered
    const timer = setTimeout(measureChart, 500);
    
    // Also measure on resize
    window.addEventListener('resize', measureChart);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureChart);
    };
  }, [currentData]); // Re-measure when data changes
  
  const roleColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ff8c00', '#9932cc'];

  // Phase colors matching the roadmap component
  const phaseColors: Record<string, string> = {
    'pending': '#64748b',
    'business planning': '#3b82f6',
    'development': '#10b981',
    'system integration testing': '#f59e0b',
    'user acceptance testing': '#8b5cf6',
    'validation': '#ec4899',
    'cutover': '#ef4444',
    'hypercare': '#06b6d4',
    'support': '#84cc16'
  };


  // Calculate summary stats based on current view
  const { totalRoles, peakValue, avgValue, summaryLabels } = React.useMemo(() => {
    const totalRoles = allRoles.length;
    const peakValue = Math.max(...currentData.map(d => 
      allRoles.reduce((sum, role) => sum + (d[role] || 0), 0)
    ));
    const avgValue = currentData.length > 0 ? 
      currentData.reduce((sum, d) => 
        sum + allRoles.reduce((roleSum, role) => roleSum + (d[role] || 0), 0), 0
      ) / currentData.length : 0;

    // Dynamic labels based on current view
    const summaryLabels = {
      demand: { peak: 'Peak Daily Demand (FTE)', avg: 'Average Daily Demand (FTE)', title: 'Resource Demand Over Time' },
      capacity: { peak: 'Peak Available Capacity (FTE)', avg: 'Average Available Capacity (FTE)', title: 'Available Resource Capacity by Role' },
      gaps: { peak: 'Peak Resource Shortfall (FTE)', avg: 'Average Resource Shortfall (FTE)', title: 'Resource Capacity Gaps (Shortfalls)' }
    };

    return { totalRoles, peakValue, avgValue, summaryLabels: summaryLabels[currentView] };
  }, [currentData, allRoles, currentView]);

  // Loading state
  if (isLoading) {
    return <div>Loading demand data...</div>;
  }

  // Error state
  if (error) {
    return <div>Error loading demand data: {error.message}</div>;
  }

  // No data state
  if (!apiResponse) {
    return <div>No demand data available for this project.</div>;
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h3>{summaryLabels.title}</h3>
            <p className="chart-subtitle">
              Showing {currentView} by role stacked over project timeline for {projectName}
            </p>
          </div>
          
          {/* View Toggle Buttons */}
          <div className="view-toggle" style={{
            display: 'flex',
            gap: '4px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '2px',
            backgroundColor: '#f8fafc'
          }}>
            {(['demand', 'capacity', 'gaps'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: currentView === view ? '#3b82f6' : 'transparent',
                  color: currentView === view ? 'white' : '#64748b',
                  transition: 'all 0.2s ease'
                }}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Integrated Phase Management Timeline */}
      <div className="phase-timeline-container" style={{ 
        marginBottom: '20px',
        position: 'relative'
      }}>
        <VisualPhaseManager 
          projectId={projectId} 
          projectName={projectName}
          compact={true}
          externalViewport={sharedViewport || undefined}
          onViewportChange={handleViewportChange}
          alignmentDimensions={chartDimensions ? {
            left: chartDimensions.left,
            width: chartDimensions.width
          } : undefined}
          onPhasesChange={() => {
            // Refresh demand data when phases change to reflect new demand profile
            queryClient.invalidateQueries({ queryKey: ['project-demand', projectId] });
          }}
        />
      </div>
      
      <div className="chart-content" ref={chartContainerRef} style={{
        position: 'relative',
        marginLeft: chartDimensions ? `${chartDimensions.left}px` : '0',
        width: chartDimensions ? `${chartDimensions.width}px` : '100%'
      }}>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart 
            data={currentData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              type="category"
              scale="point"
              tickFormatter={(value) => {
                // Find the data point by value to get granularity
                const dataPoint = currentData.find(d => d.date === value) || currentData[0];
                if (!dataPoint) return value;
                
                const granularity = dataPoint.granularity || 'daily';
                
                if (granularity === 'weekly') {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (granularity === 'daily') {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (granularity === 'monthly') {
                  const date = new Date(value + '-01');
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                } else { // quarterly
                  const date = new Date(value + '-01');
                  return 'Q' + Math.ceil(date.getMonth() / 3 + 1) + ' ' + date.getFullYear().toString().slice(-2);
                }
              }}
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={11}
              interval="preserveStartEnd"
            />
            <YAxis 
              label={{ value: 'FTE (People)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [`${value?.toFixed(1)} FTE`, name]}
              labelFormatter={(label) => {
                const dataPoint = currentData.find(d => d.date === label);
                if (!dataPoint) return `Date: ${formatDate(label as string)}`;
                
                const granularity = dataPoint.granularity || 'daily';
                
                if (granularity === 'weekly') {
                  const startDate = new Date(label);
                  const endDate = new Date(startDate);
                  endDate.setDate(endDate.getDate() + 6);
                  return `Week: ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                } else if (granularity === 'daily') {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                } else if (granularity === 'monthly') {
                  const date = new Date(label + '-01');
                  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                } else { // quarterly
                  const date = new Date(label + '-01');
                  const quarter = Math.ceil((date.getMonth() + 1) / 3);
                  return `Q${quarter} ${date.getFullYear()}`;
                }
              }}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc', 
                borderRadius: '4px' 
              }}
            />
            <Legend />
            
            {/* Stacked areas for each role */}
            {allRoles.map((role, index) => (
              <Area 
                key={role}
                dataKey={role}
                stackId="demand"
                stroke={roleColors[index % roleColors.length]}
                fill={roleColors[index % roleColors.length]}
                name={role}
                connectNulls={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Simple Brush Control with drag handles */}
      {processedDataWithGranularity.length > 2 && (
        <div style={{ 
          marginTop: '20px', 
          marginLeft: chartDimensions ? `${chartDimensions.left}px` : '20px',
          width: chartDimensions ? `${chartDimensions.width}px` : 'calc(100% - 40px)',
          position: 'relative'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Drag the timeline range selectors to focus on specific time periods
          </div>
          <SimpleBrushControl
            data={processedDataWithGranularity}
            brushStart={brushStart}
            brushEnd={brushEnd}
            onBrushChange={handleBrushChange}
          />
        </div>
      )}
      
      <div className="chart-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">
              {peakValue.toFixed(1)} FTE
            </div>
            <div className="summary-label">{summaryLabels.peak}</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {avgValue.toFixed(1)} FTE
            </div>
            <div className="summary-label">{summaryLabels.avg}</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{totalRoles}</div>
            <div className="summary-label">Roles Involved</div>
          </div>
        </div>
      </div>
    </div>
  );
}