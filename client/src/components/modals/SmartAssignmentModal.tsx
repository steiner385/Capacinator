import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle, CheckCircle, Info, Calendar, Users, 
  TrendingUp, Sparkles, Clock, BarChart3
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
  const [activeTab, setActiveTab] = useState(triggerContext === 'manual_add' ? 'manual' : 'recommended');
  const [selectedRecommendation, setSelectedRecommendation] = useState<ProjectRecommendation | null>(null);
  const [showImpactPreview, setShowImpactPreview] = useState(false);
  
  // Form state for manual assignment
  const [formData, setFormData] = useState({
    person_id: personId,
    project_id: initialProjectId || '',
    role_id: '',
    phase_id: '',
    allocation_percentage: 100,
    start_date: '',
    end_date: ''
  });

  // Fetch person details with current assignments
  const { data: person } = useQuery({
    queryKey: ['person-with-assignments', personId],
    queryFn: async () => {
      const response = await api.people.get(personId);
      return response.data;
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


  // Calculate current utilization and availability
  const utilizationData = useMemo(() => {
    if (!person) return { currentUtilization: 0, availability: 100, remainingCapacity: 100 };
    
    const activeAssignments = person.assignments?.filter((a: any) => {
      const today = new Date();
      const start = new Date(a.computed_start_date || a.start_date);
      const end = new Date(a.computed_end_date || a.end_date);
      return start <= today && end >= today;
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

  // Generate project recommendations
  const projectRecommendations = useMemo(() => {
    if (!projects?.data || !person) return [];
    
    // Get person's actual role IDs from their role assignments
    const personRoleIds = new Set(
      person.roles?.map((r: any) => r.role_id).filter(Boolean) || []
    );
    
    // console.log('Person roles:', person.roles?.map((r: any) => ({ role_id: r.role_id, is_primary: r.is_primary })));
    // console.log('Person role IDs:', Array.from(personRoleIds));
    // console.log('Available roles in DB:', roles?.slice(0, 3).map((r: any) => ({ id: r.id, name: r.name })));

    const recommendations: ProjectRecommendation[] = [];
    
    projects.data.forEach((project: any) => {
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
  }, [projects, person, actionType, utilizationData.remainingCapacity]);

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

  // Get selected project details
  const selectedProject = useMemo(() => {
    const projectId = selectedRecommendation?.project.id || formData.project_id;
    return projects?.data?.find((p: any) => p.id === projectId);
  }, [projects, formData.project_id, selectedRecommendation]);

  // Filter phases based on selected project
  const filteredPhases = useMemo(() => {
    if (!phases || !Array.isArray(phases)) return [];
    
    if (selectedProject?.phases) {
      return phases.filter((phase: any) => 
        selectedProject.phases.some((projectPhase: any) => projectPhase.phase_id === phase.id)
      );
    }
    
    return phases;
  }, [phases, selectedProject]);

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
    
    if (!formData.start_date) {
      alert('Please select a start date');
      return;
    }
    
    if (!formData.end_date) {
      alert('Please select an end date');
      return;
    }
    
    // Build assignment data
    const assignmentData = {
      person_id: personId,
      project_id: selectedRecommendation?.project.id || formData.project_id,
      role_id: formData.role_id,
      allocation_percentage: Number(selectedRecommendation?.suggestedAllocation || formData.allocation_percentage),
      start_date: formData.start_date,
      end_date: formData.end_date,
      ...(formData.phase_id && { phase_id: formData.phase_id })
    };
    
    // Log the data for debugging
    console.log('Submitting role_id:', assignmentData.role_id);
    console.log('Submitting project_id:', assignmentData.project_id);
    console.log('Full assignment data:', JSON.stringify(assignmentData, null, 2));

    createAssignmentMutation.mutate(assignmentData);
  };

  const handleFormChange = (field: string, value: any) => {
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
            <span><strong>Current Utilization:</strong> {utilizationData.currentUtilization}%</span>
          </div>
          <div className="status-item">
            <Users size={20} />
            <span><strong>Available Capacity:</strong> {utilizationData.remainingCapacity}%</span>
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
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="project-select">Project *</label>
                  <select
                    id="project-select"
                    value={formData.project_id}
                    onChange={(e) => handleFormChange('project_id', e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Select a project</option>
                    {projects?.data?.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="role-select">Role *</label>
                  <select
                    id="role-select"
                    value={formData.role_id}
                    onChange={(e) => handleFormChange('role_id', e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Select a role</option>
                    {roles?.map((role: any) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phase-select">Phase</label>
                  <select
                    id="phase-select"
                    value={formData.phase_id}
                    onChange={(e) => handleFormChange('phase_id', e.target.value)}
                    className="form-select"
                  >
                    <option value="">No specific phase</option>
                    {filteredPhases?.map((phase: any) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="allocation-slider">
                    Allocation: <strong>{formData.allocation_percentage}%</strong>
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
                  <label className="form-label" htmlFor="start-date">Start Date *</label>
                  <input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="end-date">End Date *</label>
                  <input
                    id="end-date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    min={formData.start_date}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Impact Preview */}
          {(selectedRecommendation || formData.project_id) && (
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
              Cancel
            </button>
            <button 
              type="submit"
              disabled={createAssignmentMutation.isPending || (!selectedRecommendation && !formData.project_id)}
            >
              {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}