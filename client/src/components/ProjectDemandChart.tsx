import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea, BarChart, Bar, Brush, ComposedChart, Cell, ReferenceLine } from 'recharts';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';
import { VisualPhaseManager } from './VisualPhaseManager';
import { TimelineViewport } from './InteractiveTimeline';

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
  dailyData,
  brushStart, 
  brushEnd, 
  onBrushChange 
}: {
  data: ChartDataPoint[];
  dailyData: ChartDataPoint[];
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
    const containerWidth = rect.width;
    
    // Use daily data for fine-grained control
    const totalDailyPoints = dailyData.length;
    const deltaPercent = (deltaX / containerWidth) * 100;
    const deltaIndex = Math.round((deltaPercent / 100) * (totalDailyPoints - 1));
    
    let newStart = dragging.originalStart;
    let newEnd = dragging.originalEnd;
    
    if (dragging.type === 'start') {
      newStart = Math.max(0, Math.min(dragging.originalStart + deltaIndex, dragging.originalEnd - 1));
    } else if (dragging.type === 'end') {
      newEnd = Math.min(totalDailyPoints - 1, Math.max(dragging.originalEnd + deltaIndex, dragging.originalStart + 1));
    } else if (dragging.type === 'range') {
      const rangeSize = dragging.originalEnd - dragging.originalStart;
      newStart = Math.max(0, Math.min(dragging.originalStart + deltaIndex, totalDailyPoints - 1 - rangeSize));
      newEnd = newStart + rangeSize;
    }
    
    onBrushChange(newStart, newEnd);
  }, [dragging, dailyData.length, onBrushChange])

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

  if (dailyData.length === 0) return null;

  // Use daily data for percentage calculations to get smooth positioning
  const startPercent = (brushStart / Math.max(1, dailyData.length - 1)) * 100;
  const endPercent = (brushEnd / Math.max(1, dailyData.length - 1)) * 100;
  const rangeWidth = endPercent - startPercent;

  return (
    <div style={{ position: 'relative', height: '60px' }}>
      <div 
        ref={containerRef}
        style={{
          position: 'relative',
          height: '40px',
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
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
          backgroundColor: 'hsl(var(--muted))',
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
            backgroundColor: 'hsl(var(--primary))',
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
            backgroundColor: 'hsl(var(--primary))',
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
            backgroundColor: 'hsl(var(--primary))',
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
          color: 'var(--text-tertiary)',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap'
        }}>
          {formatDate(dailyData[brushStart]?.date || '')}
        </div>
        
        <div style={{
          position: 'absolute',
          top: '5px',
          left: `${endPercent}%`,
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          transform: 'translateX(-50%)',
          whiteSpace: 'nowrap'
        }}>
          {formatDate(dailyData[brushEnd]?.date || '')}
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
    },
    enabled: !!projectId
  });

  // Get project assignments for capacity calculation
  const { data: assignmentsResponse, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['project-assignments', projectId],
    queryFn: async () => {
      const response = await api.assignments.list({ project_id: projectId });
      return response.data;
    },
    enabled: !!projectId
  });

  // Callback to refetch demand data when phases change
  const handlePhasesChange = useCallback(() => {
    // Invalidate demand data to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['project-demand', projectId] });
    // Also invalidate assignments as they might be affected
    queryClient.invalidateQueries({ queryKey: ['project-assignments', projectId] });
  }, [queryClient, projectId]);

  // Get project phases for integrated visualization
  const { data: phasesResponse } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      const response = await api.projectPhases.list({ project_id: projectId });
      return response.data;
    },
    enabled: !!projectId
  });

  // Phase colors matching the existing system
  const getPhaseColor = React.useCallback((phaseName: string): string => {
    const phaseColors: Record<string, string> = {
      'business planning': '#3b82f6',
      'development': '#10b981',
      'system integration testing': '#f59e0b',
      'user acceptance testing': '#8b5cf6',
      'validation': '#ec4899',
      'cutover': '#ef4444',
      'hypercare': '#06b6d4',
      'support': '#84cc16',
      'custom': '#6b7280'
    };
    
    const normalizedName = phaseName.toLowerCase();
    return phaseColors[normalizedName] || phaseColors['custom'];
  }, []);

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

    // Find the overall date range for the project - consider both phases AND demands/assignments
    const allDates = phases.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    
    // Also include dates from demands and assignments to ensure full coverage
    const demandDates = apiResponse.demands.flatMap(d => [new Date(d.start_date), new Date(d.end_date)]);
    const assignmentDates = assignmentsResponse?.data ? 
      assignmentsResponse.data.flatMap(a => [
        new Date(a.computed_start_date || a.start_date), 
        new Date(a.computed_end_date || a.end_date)
      ]) : [];
    
    const allProjectDates = [...allDates, ...demandDates, ...assignmentDates];
    const minDate = new Date(Math.min(...allProjectDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allProjectDates.map(d => d.getTime())));
    
    console.log('🗓️ Complete project date range:', { 
      minDate: minDate.toISOString().split('T')[0], 
      maxDate: maxDate.toISOString().split('T')[0],
      phases: phases.map(p => ({ name: p.phase_name, start: p.start_date, end: p.end_date })),
      demandDateRange: demandDates.length > 0 ? {
        min: new Date(Math.min(...demandDates.map(d => d.getTime()))).toISOString().split('T')[0],
        max: new Date(Math.max(...demandDates.map(d => d.getTime()))).toISOString().split('T')[0]
      } : 'none',
      assignmentDateRange: assignmentDates.length > 0 ? {
        min: new Date(Math.min(...assignmentDates.map(d => d.getTime()))).toISOString().split('T')[0],
        max: new Date(Math.max(...assignmentDates.map(d => d.getTime()))).toISOString().split('T')[0]
      } : 'none',
      totalDateSources: {
        phases: allDates.length,
        demands: demandDates.length,
        assignments: assignmentDates.length
      }
    });
    
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
    
    console.log('📊 Final data ranges:', {
      demandStart: demandData[0]?.date,
      demandEnd: demandData[demandData.length - 1]?.date,
      capacityStart: capacityData[0]?.date,
      capacityEnd: capacityData[capacityData.length - 1]?.date,
      dataLength: demandData.length
    });

    return {
      demandData,
      capacityData,
      gapsData,
      phases,
      dateRange: { start: minDate, end: maxDate }
    };
  }, [apiResponse, assignmentsResponse, currentView, phasesResponse, getPhaseColor]);

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

  // Generate date points based on granularity - original version using month boundaries
  const generateDatePoints = (startMonth: string, endMonth: string, granularity: string) => {
    const start = new Date(startMonth + '-01');
    const [year, month] = endMonth.split('-').map(Number);
    const end = new Date(year, month, 0); // Last day of the end month (month is 1-indexed here)
    
    console.log('🔧 Date calculation debug (generateDatePoints):', {
      endMonth,
      year, month,
      calculatedEndDate: end.toISOString().split('T')[0],
      endGetMonth: end.getMonth(),
      endGetDate: end.getDate(),
      context: 'generateDatePoints function - this determines the theoretical month end'
    });
    
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
      
      // Check if we need to add a partial week at the end
      const lastWeekStart = new Date(current);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7); // Go back to the last added week
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6); // End of that week
      
      // If the target end date is beyond the last complete week, add a partial week point
      if (end > lastWeekEnd && points.length > 0) {
        // Find a representative date within the partial week (could be the end date itself)
        const partialWeekStart = new Date(lastWeekEnd);
        partialWeekStart.setDate(partialWeekStart.getDate() + 1); // Day after last complete week
        points.push(partialWeekStart.toISOString().split('T')[0]);
        
        console.log('📅 Added partial week at end:', {
          lastCompleteWeekEnd: lastWeekEnd.toISOString().split('T')[0],
          partialWeekStart: partialWeekStart.toISOString().split('T')[0],
          targetEnd: end.toISOString().split('T')[0]
        });
      }
      
      console.log('📅 Weekly date points generated:', {
        startMonth, endMonth, granularity,
        actualStartDate: start.toISOString().split('T')[0],
        actualEndDate: end.toISOString().split('T')[0],
        totalPoints: points.length,
        firstFew: points.slice(0, 3),
        lastFew: points.slice(-3)
      });
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

  // Generate date points based on granularity - version that respects actual start and end dates  
  const generateDatePointsWithActualEnd = (actualStartDate: Date, actualEndDate: Date, granularity: string) => {
    const start = new Date(actualStartDate);
    const end = new Date(actualEndDate); 
    
    console.log('🔧 Date calculation debug (generateDatePointsWithActualEnd):', {
      actualStartDate: actualStartDate.toISOString().split('T')[0],
      actualEndDate: actualEndDate.toISOString().split('T')[0],
      granularity,
      context: 'Using actual data start and end dates instead of month boundaries'
    });
    
    const points: string[] = [];
    const current = new Date(start);
    
    if (granularity === 'weekly') {
      // Start from the beginning of the week containing the start date, but don't go before actual data start
      const startOfWeek = new Date(current);
      startOfWeek.setDate(current.getDate() - current.getDay()); // Go to Sunday
      
      // Don't start before the actual data start date
      if (startOfWeek < start) {
        current.setTime(start.getTime());
      } else {
        current.setTime(startOfWeek.getTime());
      }
      
      console.log('📅 Weekly start adjusted:', {
        originalStart: start.toISOString().split('T')[0],
        weekStart: startOfWeek.toISOString().split('T')[0],
        adjustedStart: current.toISOString().split('T')[0],
        context: 'Ensuring weekly data doesnt start before actual data'
      });
      
      while (current <= end) {
        points.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 7); // Add 7 days for weekly
      }
      
      // Check if we need to add a partial week at the end
      const lastWeekStart = new Date(current);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7); // Go back to the last added week
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6); // End of that week
      
      // If the target end date is beyond the last complete week, add a partial week point
      if (end > lastWeekEnd && points.length > 0) {
        // Find a representative date within the partial week (could be the end date itself)
        const partialWeekStart = new Date(lastWeekEnd);
        partialWeekStart.setDate(partialWeekStart.getDate() + 1); // Day after last complete week
        points.push(partialWeekStart.toISOString().split('T')[0]);
        
        console.log('📅 Added partial week at end (actualEnd version):', {
          lastCompleteWeekEnd: lastWeekEnd.toISOString().split('T')[0],
          partialWeekStart: partialWeekStart.toISOString().split('T')[0],
          targetEnd: end.toISOString().split('T')[0]
        });
      }
      
      console.log('📅 Weekly date points generated (actualEnd version):', {
        actualStartDate: actualStartDate.toISOString().split('T')[0],
        actualEndDate: actualEndDate.toISOString().split('T')[0], 
        granularity,
        totalPoints: points.length,
        firstFew: points.slice(0, 3),
        lastFew: points.slice(-3)
      });
    } else if (granularity === 'daily') {
      while (current <= end) {
        points.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else { // monthly or quarterly
      while (current <= end) {
        const year = current.getFullYear();
        const month = (current.getMonth() + 1).toString().padStart(2, '0');
        points.push(`${year}-${month}-01`);
        
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
    
    console.log('📅 Granularity calculation:', {
      baseDataStart: baseData[0]?.date,
      baseDataEnd: baseData[baseData.length - 1]?.date,
      baseDataLength: baseData.length,
      startMonth, endMonth, granularity,
      context: 'This endMonth determines what generateDatePoints will use',
      actualEndDateObject: endDate,
      calculatedEndMonth: endMonth
    });

    // If already daily and that's appropriate, return as-is
    if (granularity === 'daily') {
      return baseData.map(d => ({ ...d, granularity }));
    }

    // Aggregate data based on granularity - use actual start and end dates instead of month boundaries
    const datePoints = generateDatePointsWithActualEnd(startDate, endDate, granularity);
    
    const processedData = datePoints.map(datePoint => {
      let periodStart: Date;
      let periodEnd: Date;
      let displayDate: string;
      
      if (granularity === 'weekly') {
        const pointDate = new Date(datePoint);
        periodStart = new Date(pointDate);
        periodEnd = new Date(pointDate);
        periodEnd.setDate(periodEnd.getDate() + 6);
        
        // For partial weeks at the end, don't exceed the actual data end date
        const actualEndDate = new Date(baseData[baseData.length - 1].date);
        if (periodEnd > actualEndDate) {
          periodEnd = new Date(actualEndDate);
          // CRITICAL FIX: Use the actual end date as the display date for partial weeks
          displayDate = periodEnd.toISOString().split('T')[0];
          console.log('📅 Adjusted partial week end (CRITICAL FIX):', {
            weekStart: pointDate.toISOString().split('T')[0],
            originalWeekEnd: new Date(pointDate.getTime()).setDate(pointDate.getDate() + 6),
            adjustedWeekEnd: periodEnd.toISOString().split('T')[0],
            actualDataEnd: actualEndDate.toISOString().split('T')[0],
            displayDate: displayDate,
            context: 'Using actual end date as display date - should make chart show Dec 30'
          });
        } else {
          displayDate = datePoint;
        }
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
    
    console.log('📈 Processed data with granularity (DETAILED):', {
      granularity,
      length: processedData.length,
      start: processedData[0]?.date,
      end: processedData[processedData.length - 1]?.date,
      sample: processedData.slice(0, 3).map(d => d.date),
      endSample: processedData.slice(-3).map(d => d.date),
      baseDataRange: {
        start: baseData[0]?.date,
        end: baseData[baseData.length - 1]?.date,
        length: baseData.length
      },
      ALL_PROCESSED_DATES: processedData.map(d => d.date),
      context: 'This is what the chart will display'
    });
    
    return processedData;
  }, [demandData, capacityData, gapsData, currentView, allRoles]);

  // Handle brush changes
  const handleBrushChange = React.useCallback((start: number, end: number) => {
    setBrushStart(start);
    setBrushEnd(end);
    
    // Update the shared viewport to sync with phase diagram
    const currentDailyData = (
      currentView === 'demand' ? demandData :
      currentView === 'capacity' ? capacityData :
      gapsData
    );
    
    if (currentDailyData.length > 0 && start >= 0 && end < currentDailyData.length) {
      const startDate = new Date(currentDailyData[start].date);
      const endDate = new Date(currentDailyData[end].date);
      
      // Calculate pixels per day based on the selected range
      const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const availableWidth = chartDimensions?.width || 800;
      const pixelsPerDay = Math.max(0.5, Math.min(10, availableWidth / totalDays));
      
      const newViewport: TimelineViewport = {
        startDate,
        endDate,
        pixelsPerDay
      };
      
      console.log('🔄 Brush change updating viewport:', {
        brushIndices: { start, end },
        dateRange: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
        pixelsPerDay
      });
      
      setSharedViewport(newViewport);
    }
  }, [currentView, demandData, capacityData, gapsData, chartDimensions]);

  // Handle viewport changes from phase diagram
  const handleViewportChange = React.useCallback((viewport: TimelineViewport) => {
    setSharedViewport(viewport);
    
    // Convert viewport to brush indices for synchronization
    const currentDailyData = (
      currentView === 'demand' ? demandData :
      currentView === 'capacity' ? capacityData :
      gapsData
    );

    if (currentDailyData.length > 0) {
      const startDateStr = viewport.startDate.toISOString().split('T')[0];
      const endDateStr = viewport.endDate.toISOString().split('T')[0];
      
      const startIndex = currentDailyData.findIndex(d => d.date >= startDateStr);
      const endIndex = currentDailyData.findIndex(d => d.date > endDateStr) - 1;
      
      const validStartIndex = Math.max(0, startIndex !== -1 ? startIndex : 0);
      const validEndIndex = Math.min(currentDailyData.length - 1, endIndex !== -1 ? endIndex : currentDailyData.length - 1);
      
      console.log('🔄 Viewport synchronization:', {
        viewport: { start: startDateStr, end: endDateStr },
        dailyDataRange: { start: currentDailyData[0]?.date, end: currentDailyData[currentDailyData.length - 1]?.date },
        brushIndices: { start: validStartIndex, end: validEndIndex }
      });
      
      setBrushStart(validStartIndex);
      setBrushEnd(validEndIndex);
    }
  }, [currentView, demandData, capacityData, gapsData]);

  // Create initial viewport based on current chart data range
  const initialViewport = React.useMemo((): TimelineViewport => {
    const currentDailyData = (
      currentView === 'demand' ? demandData :
      currentView === 'capacity' ? capacityData :
      gapsData
    );

    if (currentDailyData.length === 0) {
      const today = new Date();
      return {
        startDate: new Date(today.getFullYear(), 0, 1),
        endDate: new Date(today.getFullYear() + 1, 11, 31),
        pixelsPerDay: 2
      };
    }

    const startDate = new Date(currentDailyData[0].date);
    const endDate = new Date(currentDailyData[currentDailyData.length - 1].date);
    
    // Calculate pixels per day based on available width
    const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const availableWidth = chartDimensions?.width || 800;
    const pixelsPerDay = Math.max(1, availableWidth / totalDays);

    return {
      startDate,
      endDate,
      pixelsPerDay
    };
  }, [currentView, demandData, capacityData, gapsData, chartDimensions]);


  // Initialize brush range when data loads
  React.useEffect(() => {
    if (processedDataWithGranularity.length > 0 && brushEnd === 0) {
      // Get current daily data for initialization
      const currentDailyData = (
        currentView === 'demand' ? demandData :
        currentView === 'capacity' ? capacityData :
        gapsData
      );
      
      // Use daily data length for brush indices for fine granularity
      const dailyDataLength = currentDailyData.length;
      const initialStart = 0; // Start from the beginning to show full date range
      const initialEnd = dailyDataLength - 1;
      setBrushStart(initialStart);
      setBrushEnd(initialEnd);
    }
  }, [processedDataWithGranularity, brushEnd, currentView, demandData.length, capacityData.length, gapsData.length]);

  // Measure chart dimensions for phase diagram alignment
  React.useEffect(() => {
    const measureChart = () => {
      if (chartContainerRef.current) {
        const container = chartContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        
        // Look for the actual chart area within the ResponsiveContainer
        const rechartWrapper = container.querySelector('.recharts-wrapper');
        const rechartSurface = container.querySelector('.recharts-surface');
        
        if (rechartSurface && rechartWrapper) {
          const surfaceRect = rechartSurface.getBoundingClientRect();
          const wrapperRect = rechartWrapper.getBoundingClientRect();
          
          // Find the actual chart plotting area (CartesianGrid or first Area element)
          const cartesianGrid = container.querySelector('.recharts-cartesian-grid') || container.querySelector('.recharts-area');
          const yAxisElement = container.querySelector('.recharts-yAxis');
          
          let actualChartLeft = wrapperRect.left - containerRect.left;
          let actualChartWidth = wrapperRect.width;
          
          if (cartesianGrid) {
            const gridRect = cartesianGrid.getBoundingClientRect();
            actualChartLeft = gridRect.left - containerRect.left;
            actualChartWidth = gridRect.width;
          } else if (yAxisElement) {
            // If no grid found, estimate based on Y-axis position
            const yAxisRect = yAxisElement.getBoundingClientRect();
            actualChartLeft = yAxisRect.right - containerRect.left;
            actualChartWidth = wrapperRect.right - yAxisRect.right;
          }
          
          const dimensions = {
            left: actualChartLeft,
            width: Math.max(200, actualChartWidth),
            right: actualChartLeft + actualChartWidth
          };
          
          console.log('📏 Chart dimensions measured (EXACT chart area):', dimensions);
          console.log('📏 Raw measurements:', { 
            surfaceRect: surfaceRect.width, 
            wrapperRect: wrapperRect.width,
            containerRect: containerRect.width,
            actualChartLeft,
            actualChartWidth,
            cartesianGridFound: !!cartesianGrid,
            yAxisFound: !!yAxisElement
          });
          setChartDimensions(dimensions);
        } else {
          // Fallback to container-based calculation
          const fallbackDimensions = {
            left: 20,
            width: Math.max(200, containerRect.width - 50),
            right: containerRect.width - 30
          };
          
          console.log('📏 Using fallback dimensions:', fallbackDimensions);
          setChartDimensions(fallbackDimensions);
        }
      }
    };

    // Measure after data loads and chart renders
    if (processedDataWithGranularity.length > 0) {
      // Wait for chart to render
      const timer = setTimeout(measureChart, 100);
      return () => clearTimeout(timer);
    }
  }, [processedDataWithGranularity]);

  // Create filtered data based on brush selection
  const displayData = React.useMemo(() => {
    if (processedDataWithGranularity.length === 0) return processedDataWithGranularity;
    
    // Get the current daily data to check if brush is showing full range
    const currentDailyData = (
      currentView === 'demand' ? demandData :
      currentView === 'capacity' ? capacityData :
      gapsData
    );
    
    // If brush is uninitialized or showing full range, return unfiltered data
    if (brushStart === brushEnd || 
        (brushStart === 0 && brushEnd === currentDailyData.length - 1)) {
      console.log('🔍 Returning unfiltered data (full range or uninitialized):', {
        brushStart, brushEnd, 
        dailyDataLength: currentDailyData.length,
        returning: 'processedDataWithGranularity',
        dataStart: processedDataWithGranularity[0]?.date,
        dataEnd: processedDataWithGranularity[processedDataWithGranularity.length - 1]?.date
      });
      return processedDataWithGranularity;
    }
    
    if (currentDailyData.length === 0) return processedDataWithGranularity;
    
    // Map daily brush indices to processed data date range
    const dailyStart = Math.max(0, Math.min(brushStart, brushEnd));
    const dailyEnd = Math.min(currentDailyData.length - 1, Math.max(brushStart, brushEnd));
    
    const startDate = currentDailyData[dailyStart]?.date;
    const endDate = currentDailyData[dailyEnd]?.date;
    
    if (!startDate || !endDate) return processedDataWithGranularity;
    
    // Filter processed data by date range with granularity-aware filtering
    const filtered = processedDataWithGranularity.filter(dataPoint => {
      const pointDate = dataPoint.date;
      const granularity = dataPoint.granularity || 'daily';
      
      // For non-daily granularity, be more inclusive in filtering
      if (granularity === 'weekly') {
        // Include if the week overlaps with our date range
        const weekStart = new Date(pointDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        
        // Include if week overlaps with range
        return weekStart <= rangeEnd && weekEnd >= rangeStart;
      } else if (granularity === 'monthly') {
        // Include if the month overlaps with our date range
        const [year, month] = pointDate.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);
        
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        
        // Include if month overlaps with range
        return monthStart <= rangeEnd && monthEnd >= rangeStart;
      } else {
        // Daily or quarterly - use exact date filtering
        return pointDate >= startDate && pointDate <= endDate;
      }
    });
    
    console.log('🔍 Brush filtering:', {
      brushStart, brushEnd,
      startDate, endDate,
      currentDailyDataLength: currentDailyData.length,
      dailyDataStart: currentDailyData[0]?.date,
      dailyDataEnd: currentDailyData[currentDailyData.length - 1]?.date,
      originalLength: processedDataWithGranularity.length,
      filteredLength: filtered.length,
      filteredStart: filtered[0]?.date,
      filteredEnd: filtered[filtered.length - 1]?.date,
      granularity: processedDataWithGranularity[0]?.granularity || 'unknown',
      sampleProcessedDates: processedDataWithGranularity.slice(0, 3).map(d => d.date),
      sampleFilteredDates: filtered.slice(-3).map(d => d.date),
      processedStart: processedDataWithGranularity[0]?.date,
      processedEnd: processedDataWithGranularity[processedDataWithGranularity.length - 1]?.date
    });
    
    return filtered;
  }, [processedDataWithGranularity, brushStart, brushEnd, currentView, demandData, capacityData, gapsData]);

  // Get current dataset for display
  const currentData = displayData;
  
  // Log what data is actually being sent to the chart
  React.useEffect(() => {
    if (currentData.length > 0) {
      console.log('📊 Chart currentData (what X-axis sees):', {
        length: currentData.length,
        start: currentData[0]?.date,
        end: currentData[currentData.length - 1]?.date,
        ALL_DATES: currentData.map(d => d.date),
        context: 'This is what the AreaChart component receives'
      });
    }
  }, [currentData]);



  // Simplified: No complex chart measurement needed with integrated approach
  
  // Bold colors for each role (cycled if more than 8) - matching phase diagram style
  const roleColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#84cc16'];

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
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
            padding: '2px',
            backgroundColor: 'hsl(var(--card))'
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
                  backgroundColor: currentView === view ? 'hsl(var(--primary))' : 'transparent',
                  color: currentView === view ? 'white' : 'hsl(var(--muted-foreground))',
                  transition: 'all 0.2s ease'
                }}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phase Timeline Diagram - Integrated above resource chart */}
      <div style={{ marginBottom: '20px' }}>
        <VisualPhaseManager 
          projectId={projectId}
          projectName={projectName}
          compact={true}
          externalViewport={sharedViewport || initialViewport}
          onViewportChange={handleViewportChange}
          alignmentDimensions={chartDimensions || undefined}
          chartTimeData={displayData}
          onPhasesChange={handlePhasesChange}
        />
      </div>

      <div className="chart-content" ref={chartContainerRef}>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart 
            data={currentData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              type="category"
              scale="point"
              interval="preserveStartEnd"
              domain={[
                () => currentData[0]?.date || 'dataMin',
                () => currentData[currentData.length - 1]?.date || 'dataMax'
              ]}
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
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))', 
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
          marginLeft: '20px',
          width: 'calc(100% - 40px)',
          position: 'relative'
        }}>
          <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}>
            Drag the timeline range selectors to focus on specific time periods
          </div>
          <SimpleBrushControl
            data={processedDataWithGranularity}
            dailyData={currentView === 'demand' ? demandData : currentView === 'capacity' ? capacityData : gapsData}
            brushStart={brushStart}
            brushEnd={brushEnd}
            onBrushChange={handleBrushChange}
            // Add some debug info via a comment for the brush component
            // Brush uses: dailyData (Sep 25 - Dec 30, 97 days), indices 0-96
            // Chart uses: processedDataWithGranularity (should also be Sep 25 - Dec 30 with weekly granularity)
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