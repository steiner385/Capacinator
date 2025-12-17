import React from 'react';

export function PhaseTimelineStyles() {
  return (
    <style>{`
      .phase-timeline {
        background: hsl(var(--background));
        border-radius: 8px;
        border: 1px solid hsl(var(--border));
      }

      .modal-content {
        background: hsl(var(--card));
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .modal-body {
        padding: 1.5rem;
        background: hsl(var(--card));
      }

      .form-group {
        margin-bottom: 1rem;
      }

      .form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: hsl(var(--foreground));
        margin-bottom: 0.5rem;
      }

      .form-input, .form-select {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid hsl(var(--input));
        border-radius: 6px;
        font-size: 0.875rem;
        background: hsl(var(--background));
        color: hsl(var(--foreground));
      }

      .form-input:focus, .form-select:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.1);
      }

      .phase-timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
      }

      .phase-timeline-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .btn-warning {
        background-color: var(--warning);
        color: white;
        border: 1px solid var(--warning-hover);
      }

      .btn-warning:hover {
        background-color: var(--warning-hover);
        border-color: var(--warning-hover);
      }

      .table-container {
        overflow-x: auto;
        background: hsl(var(--background));
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        background: hsl(var(--background));
      }

      .data-table th {
        background: hsl(var(--card));
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        font-size: 14px;
        color: hsl(var(--foreground));
        border-bottom: 1px solid hsl(var(--border));
      }

      .data-table td {
        padding: 12px 16px;
        border-bottom: 1px solid hsl(var(--border));
        vertical-align: top;
        background: hsl(var(--background));
      }

      .data-table tr:hover {
        background: hsl(var(--accent));
      }

      .inline-editable {
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        display: inline-flex;
        align-items: center;
        min-height: 20px;
      }

      .inline-editable:hover {
        background: hsl(var(--accent));
      }

      .inline-editable .edit-icon {
        opacity: 0;
        transition: opacity 0.2s;
      }

      .inline-editable:hover .edit-icon {
        opacity: 0.5;
      }

      .dependencies-cell {
        max-width: 300px;
      }

      .clickable-dependencies {
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
        min-height: 40px;
        display: flex;
        align-items: center;
      }

      .clickable-dependencies:hover {
        background-color: hsl(var(--accent));
      }

      .dependencies-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
      }

      .empty-dependencies {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--text-tertiary);
        font-style: italic;
        padding: 4px 0;
      }

      .add-dependency-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--text-secondary);
        font-size: 12px;
        margin-top: 4px;
        padding: 2px 4px;
        border-radius: 3px;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .clickable-dependencies:hover .add-dependency-hint {
        opacity: 1;
      }

      .dependency-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        padding: 2px 6px;
        background: hsl(var(--muted));
        border-radius: 4px;
      }

      .dependency-phase {
        color: hsl(var(--foreground));
        font-weight: 500;
      }

      .dependency-type {
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 600;
      }

      .dependency-lag {
        color: var(--text-tertiary);
        font-size: 11px;
      }

      .table-actions {
        display: flex;
        gap: 4px;
      }

      .btn-xs {
        padding: 2px 4px;
        font-size: 10px;
      }

      .text-gray {
        color: var(--text-tertiary);
        font-style: italic;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .font-medium {
        font-weight: 500;
      }

      .date-field-container {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .validation-error {
        color: var(--danger);
        display: flex;
        align-items: center;
      }

      .validation-popup {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 1000;
        background: hsl(var(--background));
        border: 1px solid var(--danger);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        min-width: 300px;
        margin-top: 4px;
      }

      .validation-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--danger);
        font-weight: 600;
        margin-bottom: 8px;
      }

      .correction-suggestion {
        background: hsl(var(--card));
        padding: 12px;
        border-radius: 4px;
        margin: 12px 0;
        border-left: 3px solid var(--primary);
      }

      .correction-suggestion p {
        margin: 4px 0;
        font-size: 13px;
      }

      .validation-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 12px;
      }

      .inline-edit-container {
        position: relative;
      }
    `}</style>
  );
}

export default PhaseTimelineStyles;
