import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './table';
import { formatDate } from '../../utils/date';
import { cn } from '../../lib/utils';

interface Assignment {
  id: string;
  project_id: string;
  person_id: string;
  person_name: string;
  role_id: string;
  role_name: string;
  phase_id?: string | null;
  start_date: number;
  end_date: number;
  allocation_percentage: number;
  created_at: number;
  updated_at: number;
  project_name?: string;
  phase_name?: string;
}

interface AssignmentTableProps {
  assignments: Assignment[];
  variant?: 'simple' | 'detailed';
  onRowClick?: (assignment: Assignment) => void;
  onEdit?: (assignment: Assignment) => void;
  onDelete?: (assignment: Assignment) => void;
  onAdd?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  emptyActionText?: string;
  emptyActionUrl?: string;
  className?: string;
  showProjectColumn?: boolean;
  showPersonColumn?: boolean;
}

export function AssignmentTable({
  assignments,
  onRowClick,
  onEdit,
  onDelete,
  onAdd,
  canEdit = false,
  canDelete = false,
  loading = false,
  emptyMessage = 'No assignments found',
  emptyActionText = 'Add Assignment',
  emptyActionUrl = '/assignments',
  className,
  showProjectColumn = false,
  showPersonColumn = true
}: AssignmentTableProps) {
  
  const formatAllocationBadge = (percentage: number) => (
    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
      {percentage}%
    </span>
  );

  const handleDeleteClick = (e: React.MouseEvent, assignment: Assignment) => {
    e.stopPropagation();
    if (onDelete && confirm('Are you sure you want to delete this assignment?')) {
      onDelete(assignment);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading assignments...</div>
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="empty-state">
        <Users size={48} />
        <p>{emptyMessage}</p>
        {onAdd ? (
          <button onClick={onAdd} className="btn btn-primary">
            <Plus size={16} />
            {emptyActionText}
          </button>
        ) : emptyActionUrl ? (
          <Link to={emptyActionUrl} className="btn btn-primary">
            <Plus size={16} />
            {emptyActionText}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("assignment-table", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {showPersonColumn && <TableHead>Name</TableHead>}
            {showProjectColumn && <TableHead>Project</TableHead>}
            <TableHead>Role</TableHead>
            <TableHead>Allocation</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            {(canEdit || canDelete) && (
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow
              key={assignment.id}
              onClick={() => onRowClick?.(assignment)}
              className={cn(
                onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors"
              )}
            >
              {showPersonColumn && (
                <TableCell>
                  <Link 
                    to={`/people/${assignment.person_id}`} 
                    className="text-primary hover:text-primary/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {assignment.person_name}
                  </Link>
                </TableCell>
              )}
              
              {showProjectColumn && (
                <TableCell>
                  <Link 
                    to={`/projects/${assignment.project_id}`} 
                    className="text-primary hover:text-primary/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {assignment.project_name || `Project ${assignment.project_id}`}
                  </Link>
                </TableCell>
              )}
              
              <TableCell>{assignment.role_name}</TableCell>
              
              <TableCell>
                {formatAllocationBadge(assignment.allocation_percentage)}
              </TableCell>
              
              <TableCell>
                {formatDate(new Date(assignment.start_date).toISOString())}
              </TableCell>
              
              <TableCell>
                {formatDate(new Date(assignment.end_date).toISOString())}
              </TableCell>
              
              {(canEdit || canDelete) && (
                <TableCell className="text-right text-muted-foreground">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && onEdit && (
                      <button
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium hover:bg-muted transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(assignment);
                        }}
                        title="Edit assignment"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                    {canDelete && onDelete && (
                      <button
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={(e) => handleDeleteClick(e, assignment)}
                        title="Delete assignment"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type { Assignment, AssignmentTableProps };