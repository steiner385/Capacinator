import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle, Info, Calendar, Users,
  TrendingUp, Sparkles, Clock, BarChart3, Link2, RefreshCw, ExternalLink, Trash2
} from 'lucide-react';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../lib/queryKeys';
import { formatDate } from '../../utils/date';
import { calculatePhaseDurationWeeks } from '../../utils/phaseDurations';
import {
  calculateRoleBasedScore,
  calculatePriorityBasedScore,
  calculateSuggestedAllocation
} from '../../utils/recommendationScoring';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import './SmartAssignmentModal.css';

interface SmartAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personName?: string;
  projectId?: string;
  triggerContext?: 'workload_action' | 'manual_add' | 'quick_assign';
  actionType?: string;
}

interface ProjectRecommendation {
  project: any;
  suggestedRole: any;
  score: number;
  matchedSkills: string[];
  fitLevel: 'excellent' | 'good' | 'partial';
  suggestedAllocation: number;
  reason: string;
}

export function SmartAssignmentModal({ 
  isOpen, 
  onClose, 
  personId,
  personName,
  projectId: initialProjectId,
  triggerContext = 'manual_add',
  actionType
}: SmartAssignmentModalProps) {
  const queryClient = useQueryClient();
  const isDarkMode = document.documentElement.classList.contains('dark');
  const [activeTab, setActiveTab] = useState(triggerContext === 'manual_add' ? 'manual' : 'recommended');
  const [selectedRecommendation, setSelectedRecommendation] = useState<ProjectRecommendation | null>(null);
  const [showImpactPreview, setShowImpactPreview] = useState(false);
  
  // Form state for manual assignment
  const [formData, setFormData] = useState({
    person_id: personId,
    project_id: initialProjectId || '',
    role_id: '',
    phase_id: '',
    allocation_percentage: 40, // Default to 40% instead of 100%
    start_date: '',
    end_date: ''
  });
  
  // Invalidate project phases cache when modal opens to ensure fresh data
  useEffect(() => {
    if (isOpen && formData.project_id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectPhases.byProject(formData.project_id) });
    }
  }, [isOpen, formData.project_id, queryClient]);

  // Fetch person details with current assignments
  const { data: person } = useQuery({
    queryKey: queryKeys.people.withAssignments(personId),
    queryFn: async () => {
      const response = await api.people.get(personId);
      // The PeopleController returns the person data directly, not wrapped in { data: ... }
      const personData = response.data;
      return personData;
    },
    enabled: !!personId
  });

  // Fetch all required data
  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: async () => {
      const response = await api.projects.list();
      return response.data;
    }
  });

  // Fetch all project allocations to determine which projects have demand
  const { data: allProjectAllocations, isLoading: isLoadingAllocations } = useQuery({
    queryKey: queryKeys.projectAllocations.allProjects(),
    queryFn: async () => {
      if (!projects?.data) return [];

      // Fetch allocations for all projects in parallel
      const allocationPromises = projects.data.map(async (project: any) => {
        try {
          const response = await api.projectAllocations.get(project.id);
          return {
            projectId: project.id,
            allocations: response.data.data?.allocations || []
          };
        } catch (error) {
          // If project has no allocations, return empty array
          return {
            projectId: project.id,
            allocations: []
          };
        }
      });

      return Promise.all(allocationPromises);
    },
    enabled: !!projects?.data
  });

  const { data: roles } = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: async () => {
      const response = await api.roles.list();
      // console.log('Roles response:', response);
      return response.data || [];
    }
  });

  const { data: phases } = useQuery({
    queryKey: queryKeys.phases.list(),
    queryFn: async () => {
      const response = await api.phases.list();
      return response.data;
    }
  });

  // Fetch project phases with dates
  const { data: projectPhases, refetch: refetchPhases } = useQuery({
    queryKey: queryKeys.projectPhases.byProject(formData.project_id),
    queryFn: async () => {
      if (!formData.project_id) return [];
      const response = await api.projects.getPhases(formData.project_id);
      return response.data.data || [];
    },
    enabled: !!formData.project_id
  });

  // Fetch project allocations to determine which roles and phases have demand
  const { data: projectAllocations } = useQuery({
    queryKey: queryKeys.projects.allocations(formData.project_id),
    queryFn: async () => {
      if (!formData.project_id) return [];
      const response = await api.projectAllocations.get(formData.project_id);
      return response.data.data?.allocations || [];
    },
    enabled: !!formData.project_id
  });


  // Calculate current utilization and availability
  const utilizationData = useMemo(() => {
    if (!person) return { currentUtilization: 0, availability: 100, remainingCapacity: 100 };
    
    
    const activeAssignments = person.assignments?.filter((a: any) => {
      const today = new Date().toISOString().split('T')[0];
      const startDate = a.computed_start_date || a.start_date;
      const endDate = a.computed_end_date || a.end_date;
      
      // If no dates are set, don't count it as active
      if (!startDate || !endDate) return false;
      
      return startDate <= today && endDate >= today;
    }) || [];

    const totalAllocation = activeAssignments.reduce((sum: number, a: any) => 
      sum + (a.allocation_percentage || 0), 0
    );

    const availability = person.default_availability_percentage || 100;
    const remainingCapacity = availability - totalAllocation;

    return {
      currentUtilization: totalAllocation,
      availability,
      remainingCapacity,
      activeAssignments
    };
  }, [person]);

  // Filter projects that have demand - moved before projectRecommendations
  const projectsWithDemand = useMemo(() => {
    if (!projects?.data || !allProjectAllocations || isLoadingAllocations) {
      // If allocations are still loading, show all projects
      return projects?.data || [];
    }
    
    return projects.data.filter((project: any) => {
      const projectAllocation = allProjectAllocations.find(
        (pa: any) => pa.projectId === project.id
      );
      
      // Check if project has any allocation > 0
      const hasAllocations = projectAllocation?.allocations?.some(
        (allocation: any) => allocation.allocation_percentage > 0
      );
      
      if (hasAllocations) {
        // Extract required roles from allocations
        const requiredRoles = [...new Set(
          projectAllocation.allocations
            .filter((a: any) => a.allocation_percentage > 0)
            .map((a: any) => a.role_id)
        )];
        
        // Add required_roles to the project object
        project.required_roles = requiredRoles;
      }
      
      return hasAllocations;
    });
  }, [projects, allProjectAllocations, isLoadingAllocations]);

  // Generate project recommendations
  const projectRecommendations = useMemo(() => {
    if (!projectsWithDemand || !person) return [];
    
    // Get person's actual role IDs from their role assignments
    const personRoleIds = new Set(
      person.roles?.map((r: any) => r.role_id).filter(Boolean) || []
    );
    
    // console.log('Person roles:', person.roles?.map((r: any) => ({ role_id: r.role_id, is_primary: r.is_primary })));
    // console.log('Person role IDs:', Array.from(personRoleIds));
    // console.log('Available roles in DB:', roles?.slice(0, 3).map((r: any) => ({ id: r.id, name: r.name })));

    const recommendations: ProjectRecommendation[] = [];
    
    // Only consider projects that have demand
    projectsWithDemand.forEach((project: any) => {
      // Skip if project is already assigned to this person
      if (person.assignments?.some((a: any) => a.project_id === project.id)) {
        return;
      }

      // Find the best matching role for this person on this project
      const projectRoleNeeds = new Set(project.required_roles || []);
      const personRoles = person.roles?.map((r: any) => r.role_id).filter(Boolean) || [];
      
      // Find roles that match both the person's skills and project needs
      const matchingRoles = personRoles.filter(roleId => projectRoleNeeds.has(roleId));
      
      // If project has no role requirements, any person can be assigned
      // Otherwise, only show if there are matching roles or it's an assign_project action
      const hasNoRoleRequirements = !project.required_roles || project.required_roles.length === 0;
      
      if (hasNoRoleRequirements || matchingRoles.length > 0 || actionType === 'assign_project') {
        // Select the best role (prefer primary role if it matches)
        const rolesData = roles || [];
        
        // Find a valid role ID that exists in the database
        let suggestedRoleId = null;
        const primaryRole = person.roles?.find((r: any) => r.is_primary);
        
        if (hasNoRoleRequirements && primaryRole) {
          // If project has no requirements, use person's primary role
          suggestedRoleId = primaryRole.role_id;
        } else if (primaryRole && matchingRoles.includes(primaryRole.role_id) && 
            rolesData.some((r: any) => r.id === primaryRole.role_id)) {
          suggestedRoleId = primaryRole.role_id;
        } else if (matchingRoles.length > 0) {
          // Find first matching role that exists in database
          suggestedRoleId = matchingRoles.find(roleId => 
            rolesData.some((r: any) => r.id === roleId)
          );
        }
        
        // Fallback to person's primary role or first available role
        if (!suggestedRoleId) {
          suggestedRoleId = primaryRole?.role_id || (rolesData.length > 0 ? rolesData[0].id : null);
        }
          
        const suggestedRole = rolesData.find((r: any) => r.id === suggestedRoleId);
        
        // Calculate score using extracted utility functions
        const scoring = hasNoRoleRequirements
          ? calculatePriorityBasedScore(project.priority, suggestedRole?.name)
          : calculateRoleBasedScore(matchingRoles.length, projectRoleNeeds.size, suggestedRole?.name);

        const score = scoring.score;
        const fitLevel = scoring.fitLevel;
        const reason = scoring.reason;

        // Suggest allocation based on remaining capacity and project priority
        const suggestedAllocation = calculateSuggestedAllocation(
          utilizationData.remainingCapacity,
          project.priority
        );

        // Only add recommendation if we have a valid role
        if (suggestedRole) {
          recommendations.push({
            project,
            suggestedRole,
            score,
            matchedSkills: matchingRoles,
            fitLevel,
            suggestedAllocation,
            reason
          });
        }
      }
    });

    // Sort by score and priority
    return recommendations.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.project.priority - b.project.priority;
    }).slice(0, 5); // Top 5 recommendations
  }, [projectsWithDemand, person, actionType, utilizationData.remainingCapacity, roles]);

  // Set default role based on person's primary role
  useEffect(() => {
    if (person && !formData.role_id) {
      // Find the actual role_id from person's roles where is_primary is true
      const primaryRole = person.roles?.find((r: any) => r.is_primary);
      setFormData(prev => ({
        ...prev,
        role_id: primaryRole?.role_id || ''
      }));
    }
  }, [person, formData.role_id]);

  // Update allocation percentage to not exceed remaining capacity
  useEffect(() => {
    if (utilizationData.remainingCapacity < formData.allocation_percentage) {
      setFormData(prev => ({
        ...prev,
        allocation_percentage: Math.max(utilizationData.remainingCapacity, 0)
      }));
    }
  }, [utilizationData.remainingCapacity, formData.allocation_percentage]);

  // Get selected project details
  const selectedProject = useMemo(() => {
    const projectId = selectedRecommendation?.project.id || formData.project_id;
    return projects?.data?.find((p: any) => p.id === projectId);
  }, [projects, formData.project_id, selectedRecommendation]);

  // Get roles that have demand in the selected project
  const projectRoles = useMemo(() => {
    if (!projectAllocations || !Array.isArray(projectAllocations)) return [];
    
    // Get unique roles that have allocations > 0
    const roleMap = new Map();
    projectAllocations.forEach((allocation: any) => {
      if (allocation.allocation_percentage > 0 && !roleMap.has(allocation.role_id)) {
        roleMap.set(allocation.role_id, {
          id: allocation.role_id,
          name: allocation.role_name
        });
      }
    });
    
    return Array.from(roleMap.values());
  }, [projectAllocations]);

  // Filter phases based on selected project and role
  const filteredPhases = useMemo(() => {
    if (!projectPhases || !Array.isArray(projectPhases)) return [];
    if (!formData.role_id || !projectAllocations) {
      // If no role selected, return all project phases
      return projectPhases.map((projectPhase: any) => ({
        id: projectPhase.phase_id,
        name: projectPhase.phase_name,
        start_date: projectPhase.start_date,
        end_date: projectPhase.end_date
      }));
    }
    
    // Filter phases that have allocation for the selected role
    const phasesWithRole = projectAllocations
      .filter((allocation: any) => 
        allocation.role_id === formData.role_id && 
        allocation.allocation_percentage > 0
      )
      .map((allocation: any) => allocation.phase_id);
    
    return projectPhases
      .filter((projectPhase: any) => phasesWithRole.includes(projectPhase.phase_id))
      .map((projectPhase: any) => ({
        id: projectPhase.phase_id,
        name: projectPhase.phase_name,
        start_date: projectPhase.start_date,
        end_date: projectPhase.end_date
      }));
  }, [projectPhases, projectAllocations, formData.role_id]);

  // Calculate impact preview
  const impactPreview = useMemo(() => {
    const allocation = selectedRecommendation?.suggestedAllocation || formData.allocation_percentage;
    const newUtilization = utilizationData.currentUtilization + allocation;
    const utilizationPercentage = (newUtilization / utilizationData.availability) * 100;

    return {
      newUtilization,
      utilizationPercentage,
      isOverallocated: newUtilization > utilizationData.availability,
      message: newUtilization > utilizationData.availability
        ? `This will overallocate ${person?.name || 'the person'} by ${newUtilization - utilizationData.availability}%`
        : `${person?.name || 'The person'} will be at ${utilizationPercentage.toFixed(0)}% utilization`
    };
  }, [utilizationData, formData.allocation_percentage, selectedRecommendation, person]);

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating assignment with data:', data);
      return api.assignments.create(data);
    },
    onSuccess: (response) => {
      // Invalidate all queries that might be affected by the new assignment
      const projectId = selectedRecommendation?.project.id || formData.project_id;

      // Person-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.people.detail(personId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.withAssignments(personId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.timeline(personId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.assignments(personId) });

      // Project-related queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.assignments(projectId) });
      }

      // General queries
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });

      onClose();
    },
    onError: (error: any) => {
      console.error('Failed to create assignment');
      console.error('Error details:', error.response?.data?.details);
      console.error('Error message:', error.response?.data?.error || error.response?.data?.message);

      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.response?.data?.details ||
                          error.message ||
                          'Failed to create assignment';

      alert(`Error: ${errorMessage}\n\nDetails: ${error.response?.data?.details || 'Unknown error'}`);
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return api.assignments.delete(assignmentId);
    },
    onSuccess: () => {
      // Invalidate queries after deletion
      queryClient.invalidateQueries({ queryKey: queryKeys.people.detail(personId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.withAssignments(personId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.timeline(personId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
    onError: (error: any) => {
      console.error('Failed to delete assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    }
  });

  const handleRecommendationSelect = (recommendation: ProjectRecommendation) => {
    setSelectedRecommendation(recommendation);
    
    // Calculate default end date (6 months from now if no target date)
    const startDate = new Date();
    const defaultEndDate = new Date(startDate);
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 6);
    
    setFormData(prev => ({
      ...prev,
      project_id: recommendation.project.id,
      role_id: recommendation.suggestedRole.id,
      allocation_percentage: recommendation.suggestedAllocation,
      start_date: startDate.toISOString().split('T')[0],
      end_date: recommendation.project.target_end_date || defaultEndDate.toISOString().split('T')[0]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.project_id && !selectedRecommendation) {
      alert('Please select a project');
      return;
    }
    
    if (!formData.role_id) {
      alert('Please select a role');
      return;
    }
    
    // Validate role exists in database
    const rolesData = roles || [];
    const roleExists = rolesData.some((r: any) => r.id === formData.role_id);
    if (!roleExists) {
      console.error('Invalid role ID:', formData.role_id);
      console.error('Available roles:', rolesData);
      alert('Selected role is invalid. Please select a different role.');
      return;
    }
    
    // Only validate dates if not using phase mode
    if (!formData.phase_id) {
      if (!formData.start_date) {
        alert('Please select a start date');
        return;
      }
      
      if (!formData.end_date) {
        alert('Please select an end date');
        return;
      }
    }
    
    // Build assignment data
    const assignmentData: any = {
      person_id: personId,
      project_id: selectedRecommendation?.project.id || formData.project_id,
      role_id: formData.role_id,
      allocation_percentage: Number(selectedRecommendation?.suggestedAllocation || formData.allocation_percentage),
    };

    // For phase-aligned assignments, don't send explicit dates
    if (formData.phase_id) {
      assignmentData.phase_id = formData.phase_id;
      assignmentData.assignment_date_mode = 'phase';
      // Don't include start_date and end_date for phase mode
    } else {
      // For fixed-date assignments, include the dates
      assignmentData.assignment_date_mode = 'fixed';
      assignmentData.start_date = formData.start_date;
      assignmentData.end_date = formData.end_date;
    }
    
    // Log the data for debugging
    console.log('Submitting role_id:', assignmentData.role_id);
    console.log('Submitting project_id:', assignmentData.project_id);
    console.log('Full assignment data:', JSON.stringify(assignmentData, null, 2));

    createAssignmentMutation.mutate(assignmentData);
  };

  const handleFormChange = (field: string, value: any) => {
    if (field === 'phase_id' && value) {
      // When a phase is selected, set reasonable future dates instead of historical phase dates
      const today = new Date();
      const defaultStartDate = new Date(today);
      const defaultEndDate = new Date(today);
      
      // Set default duration based on phase using extracted utility
      const selectedPhase = projectPhases?.find((phase: any) => phase.phase_id === value);
      if (selectedPhase) {
        // Calculate duration using utility function
        const durationWeeks = calculatePhaseDurationWeeks(selectedPhase.phase_name);
        defaultEndDate.setDate(defaultEndDate.getDate() + (durationWeeks * 7));
        
        setFormData(prev => ({
          ...prev,
          [field]: value,
          start_date: defaultStartDate.toISOString().split('T')[0],
          end_date: defaultEndDate.toISOString().split('T')[0]
        }));
        return;
      }
    }
    
    // If project changes, reset role and phase selection
    if (field === 'project_id') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        role_id: '',
        phase_id: '' 
      }));
      return;
    }
    
    // If role changes, reset phase selection
    if (field === 'role_id') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        phase_id: '' 
      }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl smart-assignment-modal bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            <Sparkles size={20} />
            Smart Assignment for {personName || person?.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new assignment for {personName || person?.name}
          </DialogDescription>
        </DialogHeader>

        {/* Current Status Bar */}
        <div className="status-bar">
          <div className="status-item">
            <BarChart3 size={20} />
            <span>Current Utilization: <strong>{utilizationData.currentUtilization}%</strong></span>
          </div>
          <div className="status-item">
            <Users size={20} />
            <span>Available Capacity: <strong>{utilizationData.remainingCapacity}%</strong></span>
          </div>
          <div className="status-item">
            <Clock size={20} />
            <span><strong>{utilizationData.activeAssignments?.length || 0}</strong> Active Assignments</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="assignment-form">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recommended">
                <TrendingUp className="mr-2" size={16} />
                Recommended Assignments
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Calendar className="mr-2" size={16} />
                Manual Selection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommended" className="recommendations-tab">
              {projectRecommendations.length > 0 ? (
                <div className="recommendations-list">
                  {projectRecommendations.map((rec, index) => (
                    <div
                      key={rec.project.id}
                      className={cn(
                        "recommendation-card",
                        selectedRecommendation?.project.id === rec.project.id && "selected",
                        `fit-${rec.fitLevel}`
                      )}
                      onClick={() => handleRecommendationSelect(rec)}
                    >
                      <div className="recommendation-header">
                        <h4>{rec.project.name}</h4>
                        <span className={`fit-badge ${rec.fitLevel}`}>
                          {rec.fitLevel === 'excellent' ? 'Excellent Fit' : 
                           rec.fitLevel === 'good' ? 'Good Fit' : 'Partial Fit'}
                        </span>
                      </div>
                      <p className="recommendation-reason">{rec.reason}</p>
                      <div className="recommendation-details">
                        <span>Suggested allocation: {rec.suggestedAllocation}%</span>
                        <span>Priority: {rec.project.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-recommendations">
                  <Info size={48} />
                  <p>No specific project recommendations available.</p>
                  <p>Switch to manual selection to choose any project.</p>
                </div>
              )}
              
              {/* Show selected recommendation details */}
              {selectedRecommendation && (
                <div className="selected-recommendation-info">
                  <h4>Selected Assignment</h4>
                  <div className="assignment-summary">
                    <div className="summary-item">
                      <span className="summary-label">Project:</span>
                      <span className="summary-value">{selectedRecommendation.project.name}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Role:</span>
                      <span className="summary-value">{selectedRecommendation.suggestedRole.name}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Allocation:</span>
                      <span className="summary-value">{selectedRecommendation.suggestedAllocation}%</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="manual-tab">
              {actionType === 'reduce_workload' ? (
                // Show delete interface for reducing workload
                <div className="delete-assignments-container">
                  <div style={{ 
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid ${isDarkMode ? '#dc2626' : '#fca5a5'}`,
                    borderRadius: '0.375rem',
                    color: isDarkMode ? '#fca5a5' : '#dc2626'
                  }}>
                    <strong>Select assignments to remove:</strong>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      Removing assignments will free up capacity for {personName}.
                    </p>
                  </div>
                  
                  {utilizationData.activeAssignments && utilizationData.activeAssignments.length > 0 ? (
                    <div className="assignments-list">
                      {utilizationData.activeAssignments.map((assignment: any, index: number) => (
                        <div key={assignment.id || `assignment-${index}`} className="assignment-item" style={{
                          padding: '1rem',
                          marginBottom: '0.5rem',
                          backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
                          border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                          borderRadius: '0.375rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                              {assignment.project_name || 'Unknown Project'}
                              {!assignment.id && <span style={{ color: 'red', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(No ID)</span>}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                              {assignment.role_name || 'Unknown Role'} • {assignment.allocation_percentage || 0}% allocation
                              {assignment.phase_name && ` • ${assignment.phase_name}`}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isDarkMode ? '#9ca3af' : '#6b7280', marginTop: '0.25rem' }}>
                              {new Date(assignment.computed_start_date || assignment.start_date).toLocaleDateString()} - 
                              {new Date(assignment.computed_end_date || assignment.end_date).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!assignment.id) {
                                alert('Cannot delete assignment: Missing assignment ID');
                                return;
                              }
                              if (confirm(`Are you sure you want to remove the assignment to ${assignment.project_name}?`)) {
                                deleteAssignmentMutation.mutate(assignment.id);
                              }
                            }}
                            disabled={deleteAssignmentMutation.isPending || !assignment.id}
                            className="btn btn-danger btn-sm"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              opacity: !assignment.id ? 0.5 : 1,
                              cursor: !assignment.id ? 'not-allowed' : 'pointer'
                            }}
                            title={!assignment.id ? 'Cannot delete - missing ID' : undefined}
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: isDarkMode ? '#9ca3af' : '#6b7280'
                    }}>
                      <Info size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p>{personName} has no active assignments to remove.</p>
                    </div>
                  )}
                </div>
              ) : (
                // Show add interface for adding assignments
                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-select">
                    Project <span aria-hidden="true">*</span><span className="sr-only">(required)</span>
                    {!isLoadingAllocations && projectsWithDemand.length > 0 && projectsWithDemand.length < (projects?.data?.length || 0) && (
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        ({projectsWithDemand.length} with resource needs)
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => handleFormChange('project_id', value)}
                    disabled={!isLoadingAllocations && projectsWithDemand.length === 0}
                  >
                    <SelectTrigger id="project-select" aria-required="true">
                      <SelectValue placeholder={
                        isLoadingAllocations
                          ? 'Loading projects...'
                          : projectsWithDemand.length === 0
                            ? 'No projects have resource needs'
                            : 'Select a project (with resource needs)'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsWithDemand.map((project: any) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-select">
                    Role <span aria-hidden="true">*</span><span className="sr-only">(required)</span>
                    {formData.project_id && projectRoles.length > 0 && (
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        ({projectRoles.length} roles needed)
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.role_id}
                    onValueChange={(value) => handleFormChange('role_id', value)}
                    disabled={!formData.project_id || projectRoles.length === 0 || projectsWithDemand.length === 0}
                  >
                    <SelectTrigger id="role-select" aria-required="true">
                      <SelectValue placeholder={
                        formData.project_id && projectRoles.length === 0
                          ? 'No roles needed for this project'
                          : formData.project_id
                            ? 'Select a role (from project demands)'
                            : 'Select a project first'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(formData.project_id ? projectRoles : roles) && (formData.project_id ? projectRoles : roles).map((role: any) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="phase-select">
                      Phase
                      {formData.role_id && filteredPhases.length > 0 && (
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          ({filteredPhases.length} phases with this role)
                        </span>
                      )}
                    </Label>
                    {formData.project_id && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => refetchPhases()}
                          title="Refresh phase dates"
                          className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <a
                          href={`/projects/${formData.project_id}?tab=timeline`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Edit phase dates in project timeline"
                          className="p-1 text-muted-foreground hover:text-primary transition-colors flex items-center"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                  <Select
                    value={formData.phase_id}
                    onValueChange={(value) => handleFormChange('phase_id', value)}
                    disabled={!formData.project_id || !formData.role_id || projectsWithDemand.length === 0}
                  >
                    <SelectTrigger id="phase-select">
                      <SelectValue placeholder={
                        !formData.project_id
                          ? 'Select a project first'
                          : !formData.role_id
                            ? 'Select a role first'
                            : filteredPhases.length === 0
                              ? 'No phases need this role'
                              : 'No specific phase'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPhases?.map((phase: any) => (
                        <SelectItem key={phase.id} value={phase.id}>
                          {phase.name} ({new Date(phase.start_date).toLocaleDateString()} - {new Date(phase.end_date).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.phase_id && (
                  <div className="col-span-2 p-3 bg-primary/10 border border-primary/30 rounded-md text-sm text-primary flex items-center gap-2 mb-2">
                    <Link2 size={16} className="flex-shrink-0" />
                    <div>
                      <strong>Phase-linked assignment:</strong> The start and end dates are automatically synchronized with the selected phase.
                      If the phase dates change in the future, this assignment will automatically update to match.
                    </div>
                  </div>
                )}

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="allocation-slider">
                    Allocation: {formData.allocation_percentage}%
                  </Label>
                  <input
                    id="allocation-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.allocation_percentage}
                    onChange={(e) => handleFormChange('allocation_percentage', parseInt(e.target.value, 10))}
                    className="allocation-slider"
                  />
                  <div className="allocation-guide">
                    <span className="guide-text">0%</span>
                    <span className="guide-text">100%</span>
                  </div>
                  <div className="allocation-available">
                    <span className="guide-text available">
                      {utilizationData.remainingCapacity}% available
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date">
                    Start Date <span aria-hidden="true">*</span><span className="sr-only">(required)</span>
                    {formData.phase_id && (
                      <span className="text-xs text-primary font-normal ml-2">
                        (Linked to phase)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    required
                    aria-required="true"
                    disabled={!!formData.phase_id}
                    className={formData.phase_id ? 'opacity-70 cursor-not-allowed' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">
                    End Date <span aria-hidden="true">*</span><span className="sr-only">(required)</span>
                    {formData.phase_id && (
                      <span className="text-xs text-primary font-normal ml-2">
                        (Linked to phase)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    min={formData.start_date}
                    required
                    aria-required="true"
                    disabled={!!formData.phase_id}
                    className={formData.phase_id ? 'opacity-70 cursor-not-allowed' : ''}
                  />
                </div>
              </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Impact Preview */}
          {actionType !== 'reduce_workload' && (selectedRecommendation || formData.project_id) && (
            <div className={cn(
              "impact-preview",
              impactPreview.isOverallocated ? "warning" : "success"
            )} role="status" aria-live="polite">
              <div className="impact-header">
                {impactPreview.isOverallocated ? (
                  <AlertTriangle size={20} aria-hidden="true" />
                ) : (
                  <CheckCircle size={20} aria-hidden="true" />
                )}
                <h4>Assignment Impact</h4>
              </div>
              <p>{impactPreview.message}</p>
              <div className="impact-details">
                <span>New total allocation: {impactPreview.newUtilization}%</span>
                <span>Utilization: {impactPreview.utilizationPercentage.toFixed(0)}%</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {actionType === 'reduce_workload' ? 'Done' : 'Cancel'}
            </Button>
            {actionType !== 'reduce_workload' && (
              <Button
                type="submit"
                disabled={createAssignmentMutation.isPending || (!selectedRecommendation && !formData.project_id)}
              >
                {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}