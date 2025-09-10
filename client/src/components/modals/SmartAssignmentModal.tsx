import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle, CheckCircle, Info, Calendar, Users, 
  TrendingUp, Sparkles, Clock, BarChart3, Link2, RefreshCw, ExternalLink, Trash2
} from 'lucide-react';
import { api } from '../../lib/api-client';
import { formatDate } from '../../utils/date';
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
      queryClient.invalidateQueries({ queryKey: ['project-phases', formData.project_id] });
    }
  }, [isOpen, formData.project_id, queryClient]);

  // Fetch person details with current assignments
  const { data: person } = useQuery({
    queryKey: ['person-with-assignments', personId],
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
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.projects.list();
      return response.data;
    }
  });

  // Fetch all project allocations to determine which projects have demand
  const { data: allProjectAllocations, isLoading: isLoadingAllocations } = useQuery({
    queryKey: ['all-project-allocations'],
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
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      // console.log('Roles response:', response);
      return response.data || [];
    }
  });

  const { data: phases } = useQuery({
    queryKey: ['phases'],
    queryFn: async () => {
      const response = await api.phases.list();
      return response.data;
    }
  });

  // Fetch project phases with dates
  const { data: projectPhases, refetch: refetchPhases } = useQuery({
    queryKey: ['project-phases', formData.project_id],
    queryFn: async () => {
      if (!formData.project_id) return [];
      const response = await api.projects.getPhases(formData.project_id);
      return response.data.data || [];
    },
    enabled: !!formData.project_id
  });

  // Fetch project allocations to determine which roles and phases have demand
  const { data: projectAllocations } = useQuery({
    queryKey: ['project-allocations', formData.project_id],
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
        
        // Calculate score - if no role requirements, base it on project priority
        let score: number;
        let fitLevel: 'excellent' | 'good' | 'partial';
        let reason = '';

        if (hasNoRoleRequirements) {
          // For projects without role requirements, use priority to determine fit
          score = project.priority === 1 ? 0.9 : project.priority === 2 ? 0.7 : 0.5;
          fitLevel = project.priority === 1 ? 'excellent' : project.priority === 2 ? 'good' : 'partial';
          reason = `Available for ${project.priority === 1 ? 'high priority' : project.priority === 2 ? 'medium priority' : 'standard'} project as ${suggestedRole?.name || 'team member'}`;
        } else {
          score = matchingRoles.length / Math.max(projectRoleNeeds.size, 1);
          if (score >= 0.8) {
            fitLevel = 'excellent';
            reason = `Perfect match as ${suggestedRole?.name || 'team member'}`;
          } else if (score >= 0.5) {
            fitLevel = 'good';
            reason = `Good fit as ${suggestedRole?.name || 'team member'}`;
          } else if (matchingRoles.length > 0) {
            fitLevel = 'partial';
            reason = `Can contribute as ${suggestedRole?.name || 'team member'}`;
          } else {
            fitLevel = 'partial';
            reason = `Available as ${suggestedRole?.name || 'team member'}`;
          }
        }

        // Suggest allocation based on remaining capacity and project priority
        const suggestedAllocation = Math.min(
          utilizationData.remainingCapacity,
          project.priority === 1 ? 60 : project.priority === 2 ? 40 : 20
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
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-with-assignments', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-timeline', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-utilization-timeline', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-assignments', personId] });
      
      // Project-related queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-assignments', projectId] });
      }
      
      // General queries
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
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
      queryClient.invalidateQueries({ queryKey: ['person', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-with-assignments', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-timeline', personId] });
      queryClient.invalidateQueries({ queryKey: ['person-utilization-timeline', personId] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
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
      
      // Set default duration based on phase (you can adjust these as needed)
      const selectedPhase = projectPhases?.find((phase: any) => phase.phase_id === value);
      if (selectedPhase) {
        // Calculate a reasonable duration (e.g., 2-8 weeks depending on phase)
        const phaseName = selectedPhase.phase_name?.toLowerCase() || '';
        let durationWeeks = 4; // default
        
        if (phaseName.includes('planning') || phaseName.includes('pending')) {
          durationWeeks = 2;
        } else if (phaseName.includes('development')) {
          durationWeeks = 8;
        } else if (phaseName.includes('testing')) {
          durationWeeks = 3;
        } else if (phaseName.includes('cutover') || phaseName.includes('hypercare')) {
          durationWeeks = 2;
        }
        
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
                <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="project-select">
                    <span>PROJECT</span>
                    <span style={{ color: 'hsl(var(--danger))' }}> *</span>
                    {!isLoadingAllocations && projectsWithDemand.length > 0 && projectsWithDemand.length < (projects?.data?.length || 0) && (
                      <span style={{ 
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        fontSize: '0.75rem',
                        fontWeight: 'normal',
                        marginLeft: '8px'
                      }}>
                        ({projectsWithDemand.length} with resource needs)
                      </span>
                    )}
                  </label>
                  <select
                    id="project-select"
                    value={formData.project_id}
                    onChange={(e) => handleFormChange('project_id', e.target.value)}
                    className="modal-select"
                    required
                    disabled={!isLoadingAllocations && projectsWithDemand.length === 0}
                    style={{ 
                      color: isDarkMode ? '#f9fafb' : '#1f2937',
                      WebkitTextFillColor: isDarkMode ? '#f9fafb' : '#1f2937',
                      opacity: !isLoadingAllocations && projectsWithDemand.length === 0 ? 0.5 : 1,
                      fontWeight: 500,
                      backgroundColor: isDarkMode ? '#374151' : 'white',
                      borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                      padding: '0.375rem 0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '0.375rem',
                      width: '100%',
                      height: '38px',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                      cursor: !isLoadingAllocations && projectsWithDemand.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                      {isLoadingAllocations
                        ? 'Loading projects...'
                        : projectsWithDemand.length === 0 
                          ? 'No projects have resource needs' 
                          : 'Select a project (with resource needs)'}
                    </option>
                    {projectsWithDemand.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="role-select">
                    <span>ROLE</span>
                    <span style={{ color: 'hsl(var(--danger))' }}> *</span>
                    {formData.project_id && projectRoles.length > 0 && (
                      <span style={{ 
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        fontSize: '0.75rem',
                        fontWeight: 'normal',
                        marginLeft: '8px'
                      }}>
                        ({projectRoles.length} roles needed)
                      </span>
                    )}
                  </label>
                  <select
                    id="role-select"
                    value={formData.role_id}
                    onChange={(e) => handleFormChange('role_id', e.target.value)}
                    className="modal-select"
                    required
                    disabled={!formData.project_id || projectRoles.length === 0 || projectsWithDemand.length === 0}
                    style={{ 
                      color: isDarkMode ? '#f9fafb' : '#1f2937',
                      WebkitTextFillColor: isDarkMode ? '#f9fafb' : '#1f2937',
                      opacity: !formData.project_id || projectRoles.length === 0 ? 0.5 : 1,
                      fontWeight: 500,
                      backgroundColor: isDarkMode ? '#374151' : 'white',
                      borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                      padding: '0.375rem 0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '0.375rem',
                      width: '100%',
                      height: '38px',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                      cursor: !formData.project_id || projectRoles.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                      {formData.project_id && projectRoles.length === 0 
                        ? 'No roles needed for this project' 
                        : formData.project_id 
                          ? 'Select a role (from project demands)' 
                          : 'Select a project first'}
                    </option>
                    {(formData.project_id ? projectRoles : roles || [])?.map((role: any) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phase-select" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span>PHASE</span>
                      {formData.role_id && filteredPhases.length > 0 && (
                        <span style={{ 
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                          fontSize: '0.75rem',
                          fontWeight: 'normal',
                          marginLeft: '8px'
                        }}>
                          ({filteredPhases.length} phases with this role)
                        </span>
                      )}
                    </div>
                    {formData.project_id && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => refetchPhases()}
                          title="Refresh phase dates"
                          style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: isDarkMode ? '#9ca3af' : '#6b7280',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                          onMouseLeave={(e) => e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'}
                        >
                          <RefreshCw size={14} />
                        </button>
                        <a
                          href={`/projects/${formData.project_id}?tab=timeline`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Edit phase dates in project timeline"
                          style={{
                            padding: '4px',
                            color: isDarkMode ? '#9ca3af' : '#6b7280',
                            transition: 'color 0.2s',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                          onMouseLeave={(e) => e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280'}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </label>
                  <select
                    id="phase-select"
                    value={formData.phase_id}
                    onChange={(e) => handleFormChange('phase_id', e.target.value)}
                    className="modal-select"
                    disabled={!formData.project_id || !formData.role_id || projectsWithDemand.length === 0}
                    style={{ 
                      color: isDarkMode ? '#f9fafb' : '#1f2937',
                      WebkitTextFillColor: isDarkMode ? '#f9fafb' : '#1f2937',
                      opacity: !formData.project_id || !formData.role_id ? 0.5 : 1,
                      fontWeight: 500,
                      backgroundColor: isDarkMode ? '#374151' : 'white',
                      borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                      padding: '0.375rem 0.5rem',
                      fontSize: '0.875rem',
                      borderRadius: '0.375rem',
                      width: '100%',
                      height: '38px',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                      cursor: !formData.project_id || !formData.role_id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                      {!formData.project_id 
                        ? 'Select a project first' 
                        : !formData.role_id 
                          ? 'Select a role first'
                          : filteredPhases.length === 0
                            ? 'No phases need this role'
                            : 'No specific phase'}
                    </option>
                    {filteredPhases?.map((phase: any) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name} ({new Date(phase.start_date).toLocaleDateString()} - {new Date(phase.end_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                {formData.phase_id && (
                  <div style={{
                    gridColumn: '1 / -1',
                    padding: '0.75rem',
                    backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                    border: `1px solid ${isDarkMode ? '#3b82f6' : '#93c5fd'}`,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: isDarkMode ? '#93c5fd' : '#2563eb',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Link2 size={16} />
                    <div>
                      <strong>Phase-linked assignment:</strong> The start and end dates are automatically synchronized with the selected phase. 
                      If the phase dates change in the future, this assignment will automatically update to match.
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="allocation-slider">
                    <span>ALLOCATION: {formData.allocation_percentage}%</span>
                  </label>
                  <input
                    id="allocation-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.allocation_percentage}
                    onChange={(e) => handleFormChange('allocation_percentage', parseInt(e.target.value))}
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

                <div className="form-group">
                  <label className="form-label" htmlFor="start-date">
                    <span>START DATE</span>
                    <span style={{ color: 'hsl(var(--danger))' }}> *</span>
                    {formData.phase_id && (
                      <span style={{ 
                        color: isDarkMode ? '#60a5fa' : '#3b82f6',
                        fontSize: '0.75rem',
                        fontWeight: 'normal',
                        marginLeft: '8px'
                      }}>
                        (Linked to phase)
                      </span>
                    )}
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    className="form-input"
                    required
                    disabled={!!formData.phase_id}
                    style={{ 
                      opacity: formData.phase_id ? 0.7 : 1,
                      cursor: formData.phase_id ? 'not-allowed' : 'text'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="end-date">
                    <span>END DATE</span>
                    <span style={{ color: 'hsl(var(--danger))' }}> *</span>
                    {formData.phase_id && (
                      <span style={{ 
                        color: isDarkMode ? '#60a5fa' : '#3b82f6',
                        fontSize: '0.75rem',
                        fontWeight: 'normal',
                        marginLeft: '8px'
                      }}>
                        (Linked to phase)
                      </span>
                    )}
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    min={formData.start_date}
                    className="form-input"
                    required
                    disabled={!!formData.phase_id}
                    style={{ 
                      opacity: formData.phase_id ? 0.7 : 1,
                      cursor: formData.phase_id ? 'not-allowed' : 'text'
                    }}
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
            )}>
              <div className="impact-header">
                {impactPreview.isOverallocated ? (
                  <AlertTriangle size={20} />
                ) : (
                  <CheckCircle size={20} />
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

          <DialogFooter className="dialog-footer">
            <button type="button" onClick={onClose}>
              {actionType === 'reduce_workload' ? 'Done' : 'Cancel'}
            </button>
            {actionType !== 'reduce_workload' && (
              <button 
                type="submit"
                disabled={createAssignmentMutation.isPending || (!selectedRecommendation && !formData.project_id)}
              >
                {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
              </button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}