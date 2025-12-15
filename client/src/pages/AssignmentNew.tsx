import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Info, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api-client';
import './PersonDetails.css'; // Reuse existing styles

interface AssignmentFormData {
  project_id: string;
  person_id: string;
  role_id: string;
  phase_id: string;
  start_date: string;
  end_date: string;
  allocation_percentage: number;
  billable: boolean;
  notes: string;
}

export function AssignmentNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState<AssignmentFormData>({
    project_id: '',
    person_id: '',
    role_id: '',
    phase_id: '',
    start_date: '',
    end_date: '',
    allocation_percentage: 100,
    billable: true,
    notes: ''
  });
  
  // Extract context from URL parameters
  const actionContext = useMemo(() => {
    const person = searchParams.get('person');
    const role = searchParams.get('role');
    const project = searchParams.get('project');
    const action = searchParams.get('action');
    const from = searchParams.get('from');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const allocation = searchParams.get('allocation');
    
    return {
      person,
      role,
      project,
      action,
      from,
      status,
      startDate,
      endDate,
      allocation: allocation ? parseInt(allocation, 10) : null,
      hasContext: !!(person || role || project || action)
    };
  }, [searchParams]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [availabilityWarning, setAvailabilityWarning] = useState<string>('');
  const [contextMessage, setContextMessage] = useState<string>('');
  
  // Fetch data for dropdowns - must be before useEffects that depend on this data
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.projects.list();
      return response.data;
    }
  });

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const response = await api.people.list();
      return response.data;
    }
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data;
    }
  });

  const { data: phases } = useQuery({
    queryKey: ['phases'],
    queryFn: async () => {
      const response = await api.phases.list();
      return response.data;
    }
  });
  
  // Pre-fill form based on URL parameters
  useEffect(() => {
    if (!actionContext.hasContext) return;
    
    const updateFormData = (updates: Partial<AssignmentFormData>) => {
      setFormData(prev => ({ ...prev, ...updates }));
    };
    
    // Set context message for user awareness
    let message = '';
    if (actionContext.action === 'assign' && actionContext.person) {
      message = `Assigning work to ${actionContext.person}`;
      if (actionContext.status === 'AVAILABLE') {
        message += ' (currently available)';
      }
    } else if (actionContext.action === 'reduce' && actionContext.person) {
      message = `Reducing workload for ${actionContext.person} (currently over-allocated)`;
      updateFormData({ allocation_percentage: 50 }); // Suggest lower allocation
    } else if (actionContext.role && actionContext.action === 'assign') {
      message = `Assigning ${actionContext.role} role to project`;
    }
    
    setContextMessage(message);
    
    // Pre-fill dates if provided
    if (actionContext.startDate) {
      updateFormData({ start_date: actionContext.startDate });
    }
    if (actionContext.endDate) {
      updateFormData({ end_date: actionContext.endDate });
    }
    
    // Set default allocation based on action context
    if (actionContext.allocation) {
      updateFormData({ allocation_percentage: actionContext.allocation });
    } else if (actionContext.action === 'reduce') {
      updateFormData({ allocation_percentage: 25 }); // Conservative allocation for over-allocated people
    }
    
  }, [actionContext]);
  
  // Auto-select person if provided in context
  useEffect(() => {
    if (actionContext.person && people) {
      const person = people.find((p: any) => 
        p.name.toLowerCase() === actionContext.person!.toLowerCase() ||
        p.id === actionContext.person
      );
      if (person && !formData.person_id) {
        setFormData(prev => ({ 
          ...prev, 
          person_id: person.id,
          role_id: person.primary_person_role_id || '' // Auto-select primary role
        }));
      }
    }
  }, [actionContext.person, people, formData.person_id]);
  
  // Auto-select role if provided in context
  useEffect(() => {
    if (actionContext.role && roles) {
      const role = roles.find((r: any) => 
        r.name.toLowerCase() === actionContext.role!.toLowerCase() ||
        r.id === actionContext.role
      );
      if (role) {
        setFormData(prev => ({ ...prev, role_id: role.id }));
      }
    }
  }, [actionContext.role, roles]);

  // Fetch selected person details for role filtering
  const { data: selectedPerson } = useQuery({
    queryKey: ['person', formData.person_id],
    queryFn: async () => {
      const response = await api.people.get(formData.person_id);
      return response.data;
    },
    enabled: !!formData.person_id
  });

  // Fetch selected project details for phase filtering
  const { data: selectedProject } = useQuery({
    queryKey: ['project', formData.project_id],
    queryFn: async () => {
      const response = await api.projects.get(formData.project_id);
      return response.data;
    },
    enabled: !!formData.project_id
  });

  // Check for conflicts when person and dates are selected
  const { data: personConflicts } = useQuery({
    queryKey: ['conflicts', formData.person_id, formData.start_date, formData.end_date],
    queryFn: async () => {
      const response = await api.assignments.getConflicts(formData.person_id, {
        start_date: formData.start_date,
        end_date: formData.end_date
      });
      return response.data;
    },
    enabled: !!(formData.person_id && formData.start_date && formData.end_date)
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await api.assignments.create({
        ...data,
        phase_id: data.phase_id || null,
        notes: data.notes || null,
        billable: data.billable ? 1 : 0
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      navigate('/assignments');
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.project_id) newErrors.project_id = 'Project is required';
    if (!formData.person_id) newErrors.person_id = 'Person is required';
    if (!formData.role_id) newErrors.role_id = 'Role is required';
    if (!formData.start_date) newErrors.start_date = 'Start date is required';
    if (!formData.end_date) newErrors.end_date = 'End date is required';
    if (formData.allocation_percentage <= 0 || formData.allocation_percentage > 100) {
      newErrors.allocation_percentage = 'Allocation must be between 1 and 100';
    }

    // Date validation
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    createAssignmentMutation.mutate(formData);
  };

  const handleCancel = () => {
    navigate('/assignments');
  };

  const handleChange = (field: keyof AssignmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Get project name for display
  const getProjectName = (id: string) => {
    const project = projects?.find((p: any) => p.id === id);
    return project?.name || '';
  };

  // Get person name for display
  const getPersonName = (id: string) => {
    const person = people?.find((p: any) => p.id === id);
    return person?.name || '';
  };

  // Filtered data based on selections
  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    
    // If person is selected, filter roles to only those the person has
    if (formData.person_id && selectedPerson?.roles) {
      return roles.filter((role: any) => 
        selectedPerson.roles.some((personRole: any) => personRole.role_id === role.id)
      );
    }
    
    // If role is selected but no person, return all roles
    return roles;
  }, [roles, formData.person_id, selectedPerson]);

  const filteredPeople = useMemo(() => {
    if (!people) return [];
    
    // If role is selected, filter people to only those who have that role
    if (formData.role_id) {
      return people.filter((person: any) => 
        person.roles?.some((personRole: any) => personRole.role_id === formData.role_id)
      );
    }
    
    return people;
  }, [people, formData.role_id]);

  const filteredPhases = useMemo(() => {
    // Ensure phases is an array
    if (!phases || !Array.isArray(phases)) return [];
    
    // If project is selected, filter phases to only those in the project
    if (formData.project_id && selectedProject?.phases) {
      return phases.filter((phase: any) => 
        selectedProject.phases.some((projectPhase: any) => projectPhase.phase_id === phase.id)
      );
    }
    
    return phases;
  }, [phases, formData.project_id, selectedProject]);

  // Calculate availability and conflicts
  const calculateAvailability = useMemo(() => {
    if (!formData.person_id || !formData.start_date || !formData.end_date) return null;
    
    const conflicts = personConflicts || [];
    const totalConflictPercentage = conflicts.reduce((sum: number, conflict: any) => 
      sum + (conflict.allocation_percentage || 0), 0
    );
    
    const availableCapacity = Math.max(0, 100 - totalConflictPercentage);
    const hasConflicts = conflicts.length > 0;
    
    return {
      availableCapacity,
      hasConflicts,
      conflicts,
      canAccommodate: availableCapacity >= formData.allocation_percentage
    };
  }, [formData.person_id, formData.start_date, formData.end_date, formData.allocation_percentage, personConflicts]);

  return (
    <div className="page-container person-details">
      <div className="page-header">
        <div className="header-left">
          <button className="btn btn-icon" onClick={handleCancel}>
            <ArrowLeft size={20} />
          </button>
          <h1>New Assignment</h1>
          {actionContext.from && (
            <span className="badge badge-info">From {actionContext.from}</span>
          )}
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleCancel}>
            <X size={20} />
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={createAssignmentMutation.isPending}
          >
            <Save size={20} />
            {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      </div>

      <div className="person-details-content">
        {/* Context Message */}
        {contextMessage && (
          <div className="detail-section context-banner">
            <div className="context-alert">
              <Info size={20} />
              <div className="context-content">
                <strong>Assignment Context:</strong> {contextMessage}
                {actionContext.from && (
                  <div className="context-source">Initiated from {actionContext.from}</div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Assignment Information Section */}
          <div className="detail-section">
            <div className="section-header">
              <h2>Assignment Details</h2>
            </div>
            
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Project *</label>
                  <select
                    name="project_id"
                    value={formData.project_id}
                    onChange={(e) => handleChange('project_id', e.target.value)}
                    className={`form-select ${errors.project_id ? 'error' : ''}`}
                  >
                    <option value="">Select project</option>
                    {projects?.data?.map((project: any) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  {errors.project_id && <span className="error-text">{errors.project_id}</span>}
                </div>

                <div className="info-item">
                  <label>Person *</label>
                  <select
                    name="person_id"
                    value={formData.person_id}
                    onChange={(e) => handleChange('person_id', e.target.value)}
                    className={`form-select ${errors.person_id ? 'error' : ''}`}
                  >
                    <option value="">Select person</option>
                    {filteredPeople?.map((person: any) => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </select>
                  {errors.person_id && <span className="error-text">{errors.person_id}</span>}
                  {formData.role_id && filteredPeople.length === 0 && (
                    <span className="warning-text">No people found with the selected role</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Role *</label>
                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={(e) => handleChange('role_id', e.target.value)}
                    className={`form-select ${errors.role_id ? 'error' : ''}`}
                  >
                    <option value="">Select role</option>
                    {filteredRoles?.map((role: any) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  {errors.role_id && <span className="error-text">{errors.role_id}</span>}
                  {formData.person_id && filteredRoles.length === 0 && (
                    <span className="warning-text">Selected person has no roles assigned</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Phase</label>
                  <select
                    name="phase_id"
                    value={formData.phase_id}
                    onChange={(e) => handleChange('phase_id', e.target.value)}
                    className="form-select"
                  >
                    <option value="">No specific phase</option>
                    {filteredPhases?.map((phase: any) => (
                      <option key={phase.id} value={phase.id}>{phase.name}</option>
                    ))}
                  </select>
                  {formData.project_id && filteredPhases && filteredPhases.length === 0 && (
                    <span className="info-text">Selected project has no phases defined</span>
                  )}
                </div>

                <div className="info-item">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className={`form-input ${errors.start_date ? 'error' : ''}`}
                  />
                  {errors.start_date && <span className="error-text">{errors.start_date}</span>}
                </div>

                <div className="info-item">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className={`form-input ${errors.end_date ? 'error' : ''}`}
                  />
                  {errors.end_date && <span className="error-text">{errors.end_date}</span>}
                </div>

                <div className="info-item">
                  <label>Allocation Percentage *</label>
                  <input
                    type="number"
                    value={formData.allocation_percentage}
                    onChange={(e) => handleChange('allocation_percentage', parseInt(e.target.value, 10))}
                    className={`form-input ${errors.allocation_percentage ? 'error' : ''}`}
                    min="1"
                    max="100"
                    placeholder="100"
                  />
                  {errors.allocation_percentage && <span className="error-text">{errors.allocation_percentage}</span>}
                </div>

                <div className="info-item">
                  <label>Billable</label>
                  <input
                    type="checkbox"
                    checked={formData.billable}
                    onChange={(e) => handleChange('billable', e.target.checked)}
                    className="form-checkbox"
                  />
                </div>

                <div className="info-item info-item-full">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    className="form-textarea"
                    rows={3}
                    placeholder="Additional notes about this assignment"
                  />
                </div>
              </div>

              {/* Availability Warning */}
              {calculateAvailability && (
                <div className={`availability-warning ${calculateAvailability.canAccommodate ? 'success' : 'warning'}`}>
                  <h4>Availability Check</h4>
                  <p>
                    <strong>{getPersonName(formData.person_id)}</strong> has{' '}
                    <strong>{calculateAvailability.availableCapacity}%</strong> available capacity
                    {calculateAvailability.hasConflicts && (
                      <span> ({calculateAvailability.conflicts.length} existing assignment{calculateAvailability.conflicts.length > 1 ? 's' : ''})</span>
                    )}
                  </p>
                  {!calculateAvailability.canAccommodate && (
                    <p className="error-text">
                      ⚠️ Requested {formData.allocation_percentage}% allocation exceeds available capacity
                    </p>
                  )}
                  {calculateAvailability.hasConflicts && (
                    <div className="conflicts-list">
                      <h5>Existing Assignments:</h5>
                      {calculateAvailability.conflicts.map((conflict: any) => (
                        <div key={conflict.id} className="conflict-item">
                          {conflict.project_name} - {conflict.role_name} ({conflict.allocation_percentage}%)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Assignment Preview */}
              {formData.project_id && formData.person_id && (
                <div className="assignment-preview">
                  <h4>Assignment Preview</h4>
                  <p>
                    <strong>{getPersonName(formData.person_id)}</strong> will be assigned to{' '}
                    <strong>{getProjectName(formData.project_id)}</strong> at{' '}
                    <strong>{formData.allocation_percentage}%</strong> allocation
                    {formData.start_date && formData.end_date && (
                      <span> from {formData.start_date} to {formData.end_date}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error display */}
          {createAssignmentMutation.isError && (
            <div className="error-message">
              Failed to create assignment. Please check your inputs and try again.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}