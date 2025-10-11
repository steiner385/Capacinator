import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { Project } from '../types';
import './ProjectsTable.css';

interface ProjectsTableProps {
  projects: Project[];
  maxRows?: number;
}

export default function ProjectsTable({ projects, maxRows = 10 }: ProjectsTableProps) {
  const navigate = useNavigate();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'planned': return 'badge badge-primary';
      case 'active': return 'badge badge-success';
      case 'on_hold': return 'badge badge-warning';
      case 'completed': return 'badge badge-secondary';
      case 'cancelled': return 'badge badge-danger';
      default: return 'badge';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const displayProjects = projects.slice(0, maxRows);
  const hasMore = projects.length > maxRows;

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <p>No projects of this type yet</p>
        <p className="text-muted">Projects using this template will appear here</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/projects/new')}
        >
          Create First Project
        </button>
      </div>
    );
  }

  return (
    <div className="projects-mini-table">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Location</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Start Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayProjects.map((project: Project) => (
              <tr key={project.id}>
                <td>
                  <div className="project-name">
                    <strong>{project.name}</strong>
                    {project.description && (
                      <div className="project-description">
                        {project.description.substring(0, 80)}
                        {project.description.length > 80 && '...'}
                      </div>
                    )}
                  </div>
                </td>
                <td>{project.location_name || '-'}</td>
                <td>
                  <span className={getStatusBadgeClass(project.status || 'planned')}>
                    {project.status || 'Planned'}
                  </span>
                </td>
                <td>{project.owner_name || '-'}</td>
                <td>{formatDate(project.start_date)}</td>
                <td>
                  <button
                    className="btn btn-icon btn-sm"
                    onClick={() => navigate(`/projects/${project.id}`)}
                    title="View Project"
                  >
                    <Eye size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {hasMore && (
        <div className="table-footer">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/projects?project_type_id=${projects[0]?.project_type_id}`)}
          >
            View All {projects.length} Projects →
          </button>
        </div>
      )}
    </div>
  );
}