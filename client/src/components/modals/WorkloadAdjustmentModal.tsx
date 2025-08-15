import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle, CheckCircle, Info, Calendar, Users, Clock, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Brush } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { api } from '../../lib/api-client';
import { formatDate } from '../../utils/date';
import type { ProjectAssignment } from '../../types';

interface WorkloadAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
  actionType: string;
  currentAllocation: number;
  availability: number;
}

interface Recommendation {
  id: string;
  type: 'reduce_allocation' | 'extend_timeline' | 'reassign' | 'add_resource';
  title: string;
  description: string;
  impact: string;
  assignment?: ProjectAssignment;
  suggestedAllocation?: number;
  suggestedStartDate?: string;
  suggestedEndDate?: string;
  suggestedPerson?: { id: string; name: string; availability: number };
}

export function WorkloadAdjustmentModal({
  isOpen,
  onClose,
  personId,
  personName,
  actionType,
  currentAllocation,
  availability
}: WorkloadAdjustmentModalProps) {
  const queryClient = useQueryClient();
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [hoveredRecommendation, setHoveredRecommendation] = useState<string | null>(null);

  // Fetch person's assignments and potential recommendations
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['workload-recommendations', personId, actionType],
    queryFn: async () => {
      // Fetch person's current assignments
      const personResponse = await api.people.get(personId);
      const person = personResponse.data;
      
      // Generate recommendations based on action type
      const recs: Recommendation[] = [];
      
      if (actionType === 'reduce_workload') {
        // Sort assignments by allocation percentage descending
        const sortedAssignments = [...person.assignments].sort((a, b) => 
          b.allocation_percentage - a.allocation_percentage
        );
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        sortedAssignments.forEach(assignment => {
          // Only suggest changes for assignments that haven't ended yet
          const assignmentEnd = new Date(assignment.end_date);
          if (assignmentEnd >= today && assignment.allocation_percentage > 20) {
            recs.push({
              id: `reduce-${assignment.id}`,
              type: 'reduce_allocation',
              title: `Reduce ${assignment.project_name} allocation`,
              description: `Reduce allocation from ${assignment.allocation_percentage}% to ${Math.max(10, assignment.allocation_percentage - 20)}%`,
              impact: `Frees up ${Math.min(20, assignment.allocation_percentage - 10)}% capacity`,
              assignment,
              suggestedAllocation: Math.max(10, assignment.allocation_percentage - 20),
              suggestedStartDate: today.toISOString()
            });
          }
          
          if (assignment.end_date) {
            const endDate = new Date(assignment.end_date);
            const suggestedEnd = new Date(endDate);
            suggestedEnd.setDate(suggestedEnd.getDate() - 14); // Suggest ending 2 weeks earlier
            
            if (suggestedEnd > new Date()) {
              recs.push({
                id: `shorten-${assignment.id}`,
                type: 'extend_timeline',
                title: `End ${assignment.project_name} earlier`,
                description: `Move end date from ${formatDate(assignment.end_date)} to ${formatDate(suggestedEnd.toISOString())}`,
                impact: `Frees up capacity 2 weeks earlier`,
                assignment,
                suggestedEndDate: suggestedEnd.toISOString()
              });
            }
          }
        });
        
        // Add reassignment recommendations for high-allocation projects
        sortedAssignments.filter(a => {
          const assignmentEnd = new Date(a.end_date);
          return assignmentEnd >= today && a.allocation_percentage >= 50;
        }).forEach(assignment => {
          recs.push({
            id: `reassign-${assignment.id}`,
            type: 'reassign',
            title: `Find coverage for ${assignment.project_name}`,
            description: `Transfer this assignment to another team member`,
            impact: `Frees up ${assignment.allocation_percentage}% capacity`,
            assignment,
            suggestedStartDate: today.toISOString()
          });
        });
      } else if (actionType === 'find_coverage') {
        // For finding coverage, suggest people with similar skills
        const skillsQuery = person.roles.map(r => r.role_id).join(',');
        const availablePeopleResponse = await fetch(`/api/people?skills=${skillsQuery}&min_availability=20`);
        const availablePeople = await availablePeopleResponse.json();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        person.assignments.filter(assignment => {
          const assignmentEnd = new Date(assignment.end_date);
          return assignmentEnd >= today;
        }).forEach(assignment => {
          availablePeople.slice(0, 3).forEach(candidate => {
            recs.push({
              id: `cover-${assignment.id}-${candidate.id}`,
              type: 'reassign',
              title: `Reassign ${assignment.project_name} to ${candidate.name}`,
              description: `${candidate.name} has ${candidate.available_capacity}% available capacity`,
              impact: `Reduces workload by ${assignment.allocation_percentage}%`,
              assignment,
              suggestedPerson: {
                id: candidate.id,
                name: candidate.name,
                availability: candidate.available_capacity
              },
              suggestedStartDate: today.toISOString()
            });
          });
        });
      } else if (actionType === 'assign_more' || actionType === 'assign_project') {
        // Find available projects that need resources
        const projectsResponse = await fetch(`/api/projects?needs_role=${person.primary_person_role_id}&status=active`);
        const projects = await projectsResponse.json();
        
        projects.slice(0, 5).forEach(project => {
          const suggestedAllocation = Math.min(availability - currentAllocation, 40);
          if (suggestedAllocation > 0) {
            recs.push({
              id: `assign-${project.id}`,
              type: 'add_resource',
              title: `Assign to ${project.name}`,
              description: `${project.description || 'Active project needing resources'}`,
              impact: `Utilizes ${suggestedAllocation}% of available capacity`,
              suggestedAllocation
            });
          }
        });
      }
      
      return recs;
    },
    enabled: isOpen
  });

  // Fetch current timeline data with project breakdown
  const { data: timelineData } = useQuery({
    queryKey: ['person-timeline', personId],
    queryFn: async () => {
      const response = await api.assignments.getTimeline(personId);
      return response.data;
    },
    enabled: isOpen
  });

  // Fetch utilization timeline
  const { data: utilizationData } = useQuery({
    queryKey: ['person-utilization-timeline', personId],
    queryFn: async () => {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6); // Show 6 months ahead
      
      const response = await fetch(`/api/people/${personId}/utilization-timeline?endDate=${endDate.toISOString()}`);
      return response.json();
    },
    enabled: isOpen
  });

  // Create timeline visualization data for recommendations
  const recommendationTimeline = useMemo(() => {
    if (!recommendations || !timelineData?.timeline) return [];
    
    const { assignments } = timelineData.timeline;
    
    // Create a timeline entry for each recommendation
    return recommendations.map(rec => {
      let startDate = new Date();
      let endDate = new Date();
      let impactDescription = '';
      let currentAllocation = 0;
      let projectedAllocation = 0;
      let affectedProject = '';
      
      if (rec.assignment) {
        const assignment = assignments.find((a: any) => a.id === rec.assignment.id) || rec.assignment;
        
        startDate = new Date(assignment.computed_start_date || assignment.start_date);
        endDate = new Date(assignment.computed_end_date || assignment.end_date);
        currentAllocation = assignment.allocation_percentage;
        affectedProject = assignment.project_name;
        
        if (rec.type === 'reduce_allocation' && rec.suggestedAllocation) {
          projectedAllocation = rec.suggestedAllocation;
          impactDescription = `Reduce from ${currentAllocation}% to ${projectedAllocation}%`;
        } else if (rec.type === 'extend_timeline' && rec.suggestedEndDate) {
          const originalEndDate = new Date(assignment.computed_end_date || assignment.end_date);
          endDate = new Date(rec.suggestedEndDate);
          projectedAllocation = 0;
          const daysDiff = Math.ceil((originalEndDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
          impactDescription = `End ${daysDiff} days earlier`;
        } else if (rec.type === 'reassign') {
          projectedAllocation = 0;
          impactDescription = `Remove ${currentAllocation}% allocation`;
        }
      } else if (rec.type === 'add_resource' && rec.suggestedAllocation) {
        // For new assignments, start from today
        startDate = new Date();
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6); // Default 6 months
        projectedAllocation = rec.suggestedAllocation;
        impactDescription = `Add ${rec.suggestedAllocation}% allocation`;
        affectedProject = rec.title.replace('Assign to ', '');
      }
      
      return {
        id: rec.id,
        type: rec.type,
        title: rec.title,
        description: rec.description,
        impact: rec.impact,
        impactDescription,
        startDate,
        endDate,
        affectedProject,
        currentAllocation,
        projectedAllocation,
        selected: selectedRecommendations.has(rec.id),
        hovered: hoveredRecommendation === rec.id
      };
    });
  }, [recommendations, timelineData, selectedRecommendations, hoveredRecommendation]);

  // Process timeline data for chart
  const { processedData, allProjects } = useMemo(() => {
    if (!timelineData?.timeline || !utilizationData?.timeline) return { processedData: [], allProjects: [] };

    const { assignments, availability_overrides } = timelineData.timeline;
    
    // Create date points for next 6 months
    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6);
    
    const datePoints = [];
    const current = new Date(today);
    current.setDate(1); // Start from beginning of month
    
    while (current <= endDate) {
      datePoints.push(current.toISOString().split('T')[0].substring(0, 7)); // YYYY-MM format
      current.setMonth(current.getMonth() + 1);
    }
    
    // Track assignments to be modified
    const assignmentModifications = new Map();
    const selectedRecs = recommendations?.filter(r => 
      selectedRecommendations.has(r.id) || r.id === hoveredRecommendation
    ) || [];
    
    selectedRecs.forEach(rec => {
      if (rec.assignment) {
        assignmentModifications.set(rec.assignment.id, rec);
      }
    });
    
    const processedData = datePoints.map(datePoint => {
      const [year, monthNum] = datePoint.split('-').map(Number);
      const periodStart = new Date(year, monthNum - 1, 1);
      const periodEnd = new Date(year, monthNum, 0); // Last day of month
      
      let totalAllocation = 0;
      let projectedTotalAllocation = 0;
      const projectBreakdown: { [projectName: string]: number } = {};
      const projectedBreakdown: { [projectName: string]: number } = {};
      
      // Calculate allocations for this period
      assignments.forEach((assignment: any) => {
        const assignmentStart = new Date(assignment.computed_start_date || assignment.start_date);
        const assignmentEnd = new Date(assignment.computed_end_date || assignment.end_date);
        
        // Check if assignment overlaps with this period
        if (assignmentStart <= periodEnd && assignmentEnd >= periodStart) {
          totalAllocation += assignment.allocation_percentage;
          projectBreakdown[assignment.project_name] = 
            (projectBreakdown[assignment.project_name] || 0) + assignment.allocation_percentage;
          
          // Calculate projected allocation
          const modification = assignmentModifications.get(assignment.id);
          
          // Check if this period is in the future (from today onwards)
          const isCurrentOrFuture = periodEnd >= today;
          
          if (modification && isCurrentOrFuture) {
            // Apply modifications only for current and future periods
            if (modification.type === 'reduce_allocation' && modification.suggestedAllocation) {
              projectedTotalAllocation += modification.suggestedAllocation;
              projectedBreakdown[assignment.project_name] = 
                (projectedBreakdown[assignment.project_name] || 0) + modification.suggestedAllocation;
            } else if (modification.type === 'extend_timeline' && modification.suggestedEndDate) {
              const newEndDate = new Date(modification.suggestedEndDate);
              if (newEndDate >= periodStart) {
                projectedTotalAllocation += assignment.allocation_percentage;
                projectedBreakdown[assignment.project_name] = 
                  (projectedBreakdown[assignment.project_name] || 0) + assignment.allocation_percentage;
              }
            } else if (modification.type === 'reassign') {
              // Don't include reassigned projects in future periods
            }
          } else {
            // No modification or past period, use original allocation
            projectedTotalAllocation += assignment.allocation_percentage;
            projectedBreakdown[assignment.project_name] = 
              (projectedBreakdown[assignment.project_name] || 0) + assignment.allocation_percentage;
          }
        }
      });
      
      // Add new assignments
      selectedRecs.forEach(rec => {
        if (rec.type === 'add_resource' && rec.suggestedAllocation && periodStart >= today) {
          projectedTotalAllocation += rec.suggestedAllocation;
          projectedBreakdown[rec.title.replace('Assign to ', '')] = rec.suggestedAllocation;
        }
      });
      
      // Calculate availability for this period
      let availability = 100; // Default availability
      availability_overrides.forEach((override: any) => {
        const overrideStart = new Date(override.start_date);
        const overrideEnd = new Date(override.end_date);
        
        if (overrideStart <= periodEnd && overrideEnd >= periodStart) {
          availability = override.availability_percentage;
        }
      });
      
      // Create data point with both current and projected values
      const projectData: { [key: string]: number } = {};
      const projectedProjectData: { [key: string]: number } = {};
      
      Object.entries(projectBreakdown).forEach(([project, allocation]) => {
        projectData[`current_${project}`] = allocation as number;
      });
      
      Object.entries(projectedBreakdown).forEach(([project, allocation]) => {
        projectedProjectData[`projected_${project}`] = allocation as number;
      });
      
      return {
        date: datePoint,
        totalAllocation,
        projectedTotalAllocation,
        availability,
        projectBreakdown,
        projectedBreakdown,
        ...projectData,
        ...projectedProjectData
      };
    });
    
    // Get unique projects
    const allProjects = [...new Set(processedData.flatMap(d => [
      ...Object.keys(d.projectBreakdown || {}),
      ...Object.keys(d.projectedBreakdown || {})
    ]))];
    
    return { processedData, allProjects };
  }, [timelineData, utilizationData, recommendations, selectedRecommendations, hoveredRecommendation]);

  const applyRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const selected = Array.from(selectedRecommendations);
      const recommendationsToApply = recommendations?.filter(r => selected.includes(r.id)) || [];
      
      for (const rec of recommendationsToApply) {
        if (rec.type === 'reduce_allocation' && rec.assignment && rec.suggestedAllocation) {
          await api.assignments.update(rec.assignment.id, {
            allocation_percentage: rec.suggestedAllocation
          });
        } else if (rec.type === 'extend_timeline' && rec.assignment && rec.suggestedEndDate) {
          await api.assignments.update(rec.assignment.id, {
            end_date: rec.suggestedEndDate
          });
        } else if (rec.type === 'reassign' && rec.assignment && rec.suggestedPerson) {
          // Delete current assignment and create new one
          await api.assignments.delete(rec.assignment.id);
          await api.assignments.create({
            project_id: rec.assignment.project_id,
            person_id: rec.suggestedPerson.id,
            role_id: rec.assignment.role_id,
            allocation_percentage: rec.assignment.allocation_percentage,
            start_date: rec.assignment.start_date,
            end_date: rec.assignment.end_date
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-timeline', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-utilization-timeline', personId] });
      onClose();
    }
  });

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyRecommendationsMutation.mutateAsync();
    } finally {
      setApplying(false);
    }
  };

  const toggleRecommendation = (id: string) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRecommendations(newSelected);
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'reduce_workload':
        return 'Reduce Workload Recommendations';
      case 'find_coverage':
        return 'Find Coverage Options';
      case 'assign_more':
      case 'assign_project':
        return 'Available Assignments';
      case 'extend_timeline':
        return 'Timeline Adjustment Options';
      default:
        return 'Workload Adjustments';
    }
  };

  const getActionDescription = () => {
    switch (actionType) {
      case 'reduce_workload':
        return `${personName} is currently at ${currentAllocation}% allocation. Here are recommendations to reduce their workload:`;
      case 'find_coverage':
        return `Finding team members who can take over some of ${personName}'s responsibilities:`;
      case 'assign_more':
      case 'assign_project':
        return `${personName} has ${availability - currentAllocation}% available capacity. Here are projects they could join:`;
      case 'extend_timeline':
        return `Options for extending project timelines to reduce ${personName}'s immediate workload:`;
      default:
        return 'Select recommendations to apply:';
    }
  };

  const handleClose = () => {
    // Give time for animation before calling onClose
    setTimeout(() => onClose(), 200);
  };

  if (!isOpen) return null;

  const projectColors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald 
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6b7280'  // Gray
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{getActionTitle()}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed Chart Section */}
          <div className="px-6 border-b">
            <div className="mb-2 pt-3">
              <p className="text-sm text-muted-foreground">{getActionDescription()}</p>
            </div>

            {/* Allocation Chart - Fixed at top */}
            {processedData.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-semibold mb-2">
                  Allocation Over Time - Before & After Changes
                </h3>
                <div className="h-[180px] mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => {
                          const date = new Date(value + '-01');
                          return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                        }}
                      />
                      <YAxis 
                        domain={[0, Math.max(120, availability * 1.2)]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (!active || !payload) return null;
                          
                          const data = payload[0]?.payload;
                          if (!data) return null;
                          
                          const date = new Date(label + '-01');
                          const formattedMonth = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                          
                          return (
                            <div className="custom-tooltip" style={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              padding: '10px', 
                              border: '1px solid #ccc',
                              borderRadius: '4px'
                            }}>
                              <p className="tooltip-title" style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                {formattedMonth}
                              </p>
                              <p className="tooltip-capacity" style={{ marginBottom: '5px' }}>
                                Available: {data.availability.toFixed(1)}%
                              </p>
                              <p className="tooltip-total" style={{ marginBottom: '5px' }}>
                                Current Total: {data.totalAllocation.toFixed(1)}%
                              </p>
                              {(selectedRecommendations.size > 0 || hoveredRecommendation) && (
                                <p className="tooltip-total" style={{ marginBottom: '5px', color: 'var(--success)' }}>
                                  Projected Total: {data.projectedTotalAllocation.toFixed(1)}%
                                </p>
                              )}
                              {Object.keys(data.projectBreakdown).length > 0 && (
                                <>
                                  <div style={{ borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '5px' }}>
                                    <p style={{ fontWeight: 'bold', marginBottom: '3px' }}>Current Projects:</p>
                                    {Object.entries(data.projectBreakdown).map(([project, allocation]: [string, any]) => (
                                      <p key={project} style={{ fontSize: '12px', marginLeft: '10px' }}>
                                        {project}: {allocation.toFixed(1)}%
                                      </p>
                                    ))}
                                  </div>
                                </>
                              )}
                              {(selectedRecommendations.size > 0 || hoveredRecommendation) && Object.keys(data.projectedBreakdown).length > 0 && (
                                <>
                                  <div style={{ borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '5px' }}>
                                    <p style={{ fontWeight: 'bold', marginBottom: '3px', color: 'var(--success)' }}>Projected Projects:</p>
                                    {Object.entries(data.projectedBreakdown).map(([project, allocation]: [string, any]) => (
                                      <p key={project} style={{ fontSize: '12px', marginLeft: '10px', color: 'var(--success)' }}>
                                        {project}: {allocation.toFixed(1)}%
                                      </p>
                                    ))}
                                  </div>
                                </>
                              )}
                              {data.totalAllocation > data.availability && (
                                <p className="tooltip-warning" style={{ color: 'var(--danger)', marginTop: '5px' }}>
                                  ⚠️ Over-allocated by {(data.totalAllocation - data.availability).toFixed(1)}%
                                </p>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Legend 
                        layout="vertical"
                        align="left"
                        verticalAlign="middle"
                        wrapperStyle={{ 
                          paddingRight: '20px',
                          fontSize: '12px',
                          width: '180px', // Fixed width to prevent resizing
                          minWidth: '180px',
                          maxWidth: '180px'
                        }}
                        iconSize={12}
                        content={({ payload }) => {
                          // Always show the same legend items to prevent resizing
                          const items = [];
                          
                          // Add Available Capacity
                          items.push({
                            value: 'Available Capacity',
                            type: 'line',
                            color: 'var(--success)'
                          });
                          
                          // Add all projects
                          allProjects.forEach((project, index) => {
                            items.push({
                              value: project,
                              type: 'rect',
                              color: projectColors[index % projectColors.length]
                            });
                          });
                          
                          // Only show visual indicator when projections are active
                          const showProjections = selectedRecommendations.size > 0 || hoveredRecommendation;
                          
                          return (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              gap: '4px',
                              fontSize: '12px',
                              width: '180px'
                            }}>
                              {items.map((item, index) => (
                                <div key={index} style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  opacity: showProjections && item.value !== 'Available Capacity' ? 0.5 : 1
                                }}>
                                  {item.type === 'line' ? (
                                    <div style={{
                                      width: '16px',
                                      height: '3px',
                                      backgroundColor: item.color,
                                      border: `2px dashed ${item.color}`,
                                      borderRadius: '1px'
                                    }} />
                                  ) : (
                                    <div style={{
                                      width: '12px',
                                      height: '12px',
                                      backgroundColor: item.color,
                                      borderRadius: '2px'
                                    }} />
                                  )}
                                  <span style={{ 
                                    color: 'var(--text-primary)', 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1
                                  }}>
                                    {item.value}
                                  </span>
                                </div>
                              ))}
                              {showProjections && (
                                <div style={{ 
                                  fontSize: '10px', 
                                  color: 'var(--success)',
                                  marginTop: '4px',
                                  fontStyle: 'italic'
                                }}>
                                  Showing projections
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      
                      {/* Available capacity line */}
                      <Area 
                        type="monotone" 
                        dataKey="availability" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="transparent"
                        name="Available Capacity"
                      />
                      
                      {/* Current project allocations (stacked) */}
                      {allProjects.map((project, index) => (
                        <Area
                          key={`current_${project}`}
                          type="monotone"
                          dataKey={`current_${project}`}
                          stackId="current"
                          stroke={projectColors[index % projectColors.length]}
                          fill={projectColors[index % projectColors.length]}
                          fillOpacity={selectedRecommendations.size > 0 || hoveredRecommendation ? 0.3 : 0.6}
                          name={project}
                          hide={false}
                        />
                      ))}
                      
                      {/* Projected project allocations (stacked) - only show when recommendations selected */}
                      {(selectedRecommendations.size > 0 || hoveredRecommendation) && allProjects.map((project, index) => (
                        <Area
                          key={`projected_${project}`}
                          type="monotone"
                          dataKey={`projected_${project}`}
                          stackId="projected"
                          stroke={projectColors[index % projectColors.length]}
                          fill={projectColors[index % projectColors.length]}
                          fillOpacity={0.8}
                          strokeWidth={2}
                          name={`${project} (Projected)`}
                          isAnimationActive={false}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Recommendations Section */}
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-base font-semibold mb-4">
              Select Recommendations to Apply
            </h3>
            
            {isLoading ? (
              <div className="loading">Analyzing workload...</div>
            ) : recommendations && recommendations.length > 0 ? (
              <div className="recommendations-list">
                {recommendations.map(rec => (
                  <div
                    key={rec.id}
                    className={`recommendation-item ${selectedRecommendations.has(rec.id) ? 'selected' : ''}`}
                    onClick={() => toggleRecommendation(rec.id)}
                    onMouseEnter={() => setHoveredRecommendation(rec.id)}
                    onMouseLeave={() => setHoveredRecommendation(null)}
                  >
                    <Checkbox
                      checked={selectedRecommendations.has(rec.id)}
                      onCheckedChange={() => toggleRecommendation(rec.id)}
                    />
                    <div className="recommendation-content">
                      <div className="recommendation-header">
                        <h4>{rec.title}</h4>
                        <span className="impact-badge">
                          {rec.type === 'reduce_allocation' && <TrendingDown size={14} />}
                          {rec.type === 'extend_timeline' && <Calendar size={14} />}
                          {rec.type === 'reassign' && <Users size={14} />}
                          {rec.type === 'add_resource' && <Clock size={14} />}
                          {rec.impact}
                        </span>
                      </div>
                      <p className="recommendation-description">{rec.description}</p>
                      <div className="recommendation-dates" style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-tertiary)', 
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Calendar size={12} />
                        <span>
                          {(() => {
                            // Determine effective date based on recommendation type
                            if (rec.suggestedStartDate) {
                              const startDate = new Date(rec.suggestedStartDate);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              
                              // Check if it's today
                              if (startDate.toDateString() === today.toDateString()) {
                                if (rec.type === 'extend_timeline' && rec.suggestedEndDate) {
                                  return `New end date: ${formatDate(rec.suggestedEndDate)}`;
                                }
                                return 'Effective today';
                              } else {
                                return `Effective from: ${formatDate(rec.suggestedStartDate)}`;
                              }
                            } else if (rec.type === 'extend_timeline' && rec.suggestedEndDate) {
                              return `New end date: ${formatDate(rec.suggestedEndDate)}`;
                            } else if (rec.type === 'add_resource') {
                              return 'Starting today';
                            } else if (rec.assignment) {
                              return `Current dates: ${formatDate(rec.assignment.start_date)} - ${formatDate(rec.assignment.end_date)}`;
                            }
                            return 'Effective today';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Info size={48} />
                <p>No recommendations available at this time.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedRecommendations.size === 0 || applying}
          >
            {applying ? 'Applying...' : `Apply ${selectedRecommendations.size} Recommendation${selectedRecommendations.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}