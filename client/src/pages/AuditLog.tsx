import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/CustomCard';
import { DataTable } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { apiClient } from '../lib/api-client';
import './AuditLog.css';

interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | null | undefined;
  changed_by: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_fields: string[] | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  comment: string | null;
  changed_at: string;
}

interface AuditStats {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByTable: Record<string, number>;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    tableName: '',
    recordId: '',
    changedBy: '',
    action: '',
    fromDate: '',
    toDate: '',
    limit: 50,
    offset: 0
  });
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [undoingEntry, setUndoingEntry] = useState<string | null>(null);

  useEffect(() => {
    loadAuditData();
    loadStats();
  }, [filters]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== 0) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/audit/search?${queryParams}`);
      setEntries(response.data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load audit data');
      console.error('Error loading audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/audit/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Error loading audit stats:', err);
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handleUndoChange = async (tableName: string, recordId: string, comment?: string) => {
    if (!confirm('Are you sure you want to undo the last change to this record?')) {
      return;
    }

    try {
      setUndoingEntry(`${tableName}:${recordId}`);
      await apiClient.post(`/audit/undo/${tableName}/${recordId}`, { comment });
      await loadAuditData();
      alert('Change undone successfully');
    } catch (err) {
      alert(`Failed to undo change: ${(err as any).response?.data?.error || 'Unknown error'}`);
    } finally {
      setUndoingEntry(null);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatDate = (dateValue: string | number): string => {
    // Handle both string dates and timestamp numbers
    const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString();
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'CREATE': return 'green';
      case 'UPDATE': return 'blue';
      case 'DELETE': return 'red';
      default: return 'gray';
    }
  };

  const columns = [
    {
      key: 'changed_at',
      header: 'Date/Time',
      render: (value: any, entry: AuditEntry) => {
        if (!entry || value === undefined || value === null) return 'N/A';
        return formatDate(value);
      }
    },
    {
      key: 'table_name',
      header: 'Table',
      render: (value: any, entry: AuditEntry) => {
        if (!value) return 'N/A';
        return value;
      }
    },
    {
      key: 'action',
      header: 'Action',
      render: (value: any, entry: AuditEntry) => {
        if (!value) return 'UNKNOWN';
        return (
          <span className={`audit-action audit-action--${value.toLowerCase()}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'changed_by',
      header: 'Changed By',
      render: (value: any, entry: AuditEntry) => {
        return value || 'System';
      }
    },
    {
      key: 'changed_fields',
      header: 'Fields Changed',
      render: (value: any, entry: AuditEntry) => {
        if (!value || value.length === 0) return 'N/A';
        return value.join(', ');
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, entry: AuditEntry) => {
        if (!entry || !entry.id) return null;
        return (
          <div className="audit-actions">
            <button
              onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
              className="btn btn--small btn--secondary"
            >
              {expandedEntry === entry.id ? 'Hide' : 'Details'}
            </button>
            {entry.action && entry.action !== 'DELETE' && entry.table_name && entry.record_id && (
              <button
                onClick={() => handleUndoChange(entry.table_name, entry.record_id)}
                disabled={undoingEntry === `${entry.table_name}:${entry.record_id}`}
                className="btn btn--small btn--danger"
              >
                {undoingEntry === `${entry.table_name}:${entry.record_id}` ? 'Undoing...' : 'Undo'}
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const filterOptions = [
    {
      name: 'tableName',
      label: 'Table',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Tables' },
        { value: 'people', label: 'People' },
        { value: 'projects', label: 'Projects' },
        { value: 'roles', label: 'Roles' },
        { value: 'assignments', label: 'Assignments' },
        { value: 'availability', label: 'Availability' }
      ]
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select' as const,
      options: [
        { value: '', label: 'All Actions' },
        { value: 'CREATE', label: 'Create' },
        { value: 'UPDATE', label: 'Update' },
        { value: 'DELETE', label: 'Delete' }
      ]
    },
    {
      name: 'changedBy',
      label: 'Changed By',
      type: 'search' as const,
      placeholder: 'User ID'
    },
    {
      name: 'recordId',
      label: 'Record ID',
      type: 'search' as const,
      placeholder: 'Record ID'
    }
  ];

  if (loading && entries.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="audit-log">
      <div className="audit-log__header">
        <h1>Audit Log</h1>
        <p>Track and review all system changes with undo capability</p>
      </div>

      {stats && (
        <div className="audit-stats">
          <Card>
            <h3>Audit Statistics</h3>
            <div className="audit-stats__grid">
              <div className="audit-stat">
                <span className="audit-stat__label">Total Entries</span>
                <span className="audit-stat__value">{stats.totalEntries.toLocaleString()}</span>
              </div>
              <div className="audit-stat">
                <span className="audit-stat__label">Date Range</span>
                <span className="audit-stat__value">
                  {stats.oldestEntry && stats.newestEntry ? 
                    `${formatDate(stats.oldestEntry)} - ${formatDate(stats.newestEntry)}` : 
                    'N/A'
                  }
                </span>
              </div>
            </div>
            <div className="audit-stats__breakdown">
              <div className="audit-breakdown">
                <h4>By Action</h4>
                {Object.entries(stats.entriesByAction).map(([action, count]) => (
                  <div key={action} className="audit-breakdown__item">
                    <span className={`audit-action audit-action--${action.toLowerCase()}`}>
                      {action}
                    </span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
              <div className="audit-breakdown">
                <h4>By Table</h4>
                {Object.entries(stats.entriesByTable).map(([table, count]) => (
                  <div key={table} className="audit-breakdown__item">
                    <span>{table}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <FilterBar
          filters={filterOptions}
          values={filters}
          onChange={(name: string, value: string) => handleFilterChange({ [name]: value })}
        />
        
        {error && <ErrorMessage message={error} />}
        
        <DataTable
          data={entries}
          columns={columns}
          loading={loading}
          emptyMessage="No audit entries found"
        />

        {entries.map(entry => (
          expandedEntry === entry.id && (
            <div key={`expanded-${entry.id}`} className="audit-details">
              <Card>
                <h4>Audit Entry Details</h4>
                <div className="audit-details__grid">
                  <div className="audit-detail">
                    <strong>ID:</strong> {entry.id}
                  </div>
                  <div className="audit-detail">
                    <strong>Request ID:</strong> {entry.request_id || 'N/A'}
                  </div>
                  <div className="audit-detail">
                    <strong>IP Address:</strong> {entry.ip_address || 'N/A'}
                  </div>
                  <div className="audit-detail">
                    <strong>User Agent:</strong> {entry.user_agent || 'N/A'}
                  </div>
                  {entry.comment && (
                    <div className="audit-detail audit-detail--full">
                      <strong>Comment:</strong> {entry.comment}
                    </div>
                  )}
                </div>
                
                {entry.old_values && (
                  <div className="audit-values">
                    <h5>Old Values</h5>
                    <pre className="audit-values__json">
                      {formatValue(entry.old_values)}
                    </pre>
                  </div>
                )}
                
                {entry.new_values && (
                  <div className="audit-values">
                    <h5>New Values</h5>
                    <pre className="audit-values__json">
                      {formatValue(entry.new_values)}
                    </pre>
                  </div>
                )}
              </Card>
            </div>
          )
        ))}
        
        <div className="audit-pagination">
          <button
            onClick={() => handleFilterChange({ offset: Math.max(0, filters.offset - filters.limit) })}
            disabled={filters.offset === 0 || loading}
            className="btn btn--secondary"
          >
            Previous
          </button>
          <span className="audit-pagination__info">
            Showing {filters.offset + 1} - {Math.min(filters.offset + filters.limit, filters.offset + entries.length)}
          </span>
          <button
            onClick={() => handleFilterChange({ offset: filters.offset + filters.limit })}
            disabled={entries.length < filters.limit || loading}
            className="btn btn--secondary"
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  );
}