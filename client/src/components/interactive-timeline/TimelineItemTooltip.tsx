import React from 'react';
import { format } from 'date-fns';

interface PhaseData {
  phase_name: string;
  start_date: string;
  end_date: string;
  phase_description?: string;
  description?: string;
  notes?: string;
  phase_order?: number;
  order_index?: number;
  projectId?: string;
  dependencies?: unknown[];
}

interface TimelineItemTooltipProps {
  phase: PhaseData;
  mode: 'brush' | 'phase-manager' | 'roadmap';
}

export function TimelineItemTooltip({ phase, mode }: TimelineItemTooltipProps) {
  const startDate = new Date(phase.start_date);
  const endDate = new Date(phase.end_date);
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const workingDays = Math.ceil(duration * 5 / 7);

  return (
    <div style={{
      backgroundColor: 'rgba(0, 0, 0, 0.92)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '13px',
      minWidth: '280px',
      maxWidth: '350px',
      minHeight: '200px',
      maxHeight: '400px',
      overflow: 'visible',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      lineHeight: '1.4'
    }}>
      {/* Phase Header */}
      <div style={{
        fontWeight: 700,
        marginBottom: '8px',
        fontSize: '14px',
        color: '#ffffff',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '6px'
      }}>
        {phase.phase_name}
      </div>

      {/* Project Context */}
      {phase.projectId && (
        <div style={{
          fontSize: '11px',
          opacity: 0.8,
          marginBottom: '8px',
          fontStyle: 'italic'
        }}>
          Project ID: {phase.projectId}
        </div>
      )}

      {/* Timeline Information */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ marginBottom: '2px' }}>
          <span style={{ opacity: 0.8 }}>Start:</span> {format(startDate, 'MMM dd, yyyy (EEE)')}
        </div>
        <div style={{ marginBottom: '2px' }}>
          <span style={{ opacity: 0.8 }}>End:</span> {format(endDate, 'MMM dd, yyyy (EEE)')}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          marginTop: '4px'
        }}>
          <span><span style={{ opacity: 0.8 }}>Duration:</span> {duration} days</span>
          <span style={{ opacity: 0.7 }}>~{workingDays} work days</span>
        </div>
      </div>

      {/* Phase Description */}
      {(phase.phase_description || phase.description) && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            fontSize: '11px',
            opacity: 0.8,
            fontWeight: 600,
            marginBottom: '3px'
          }}>
            Description:
          </div>
          <div style={{
            fontSize: '12px',
            opacity: 0.9,
            fontStyle: 'italic'
          }}>
            {phase.phase_description || phase.description}
          </div>
        </div>
      )}

      {/* Phase Notes */}
      {phase.notes && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            fontSize: '11px',
            opacity: 0.8,
            fontWeight: 600,
            marginBottom: '3px'
          }}>
            Notes:
          </div>
          <div style={{
            fontSize: '12px',
            opacity: 0.9,
            fontStyle: 'italic'
          }}>
            {phase.notes}
          </div>
        </div>
      )}

      {/* Phase Order/Sequence */}
      {(phase.phase_order || phase.order_index) && (
        <div style={{
          fontSize: '11px',
          opacity: 0.7,
          marginBottom: '8px'
        }}>
          Phase #{phase.phase_order || phase.order_index} in project sequence
        </div>
      )}

      {/* Dependencies Info */}
      {(phase.dependencies && phase.dependencies.length > 0) && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            fontSize: '11px',
            opacity: 0.8,
            fontWeight: 600,
            marginBottom: '3px'
          }}>
            Dependencies:
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>
            {phase.dependencies.length} dependency/dependencies
          </div>
        </div>
      )}

      {/* Action Hints */}
      <div style={{
        fontSize: '10px',
        opacity: 0.6,
        marginTop: '10px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '6px',
        textAlign: 'center'
      }}>
        {mode === 'phase-manager' ?
          'Double-click to edit \u2022 Right-click for options' :
          'Click to view project details'
        }
      </div>
    </div>
  );
}

export default TimelineItemTooltip;
