import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InlineEditProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  className?: string;
  renderValue?: (value: string | number) => React.ReactNode;
}

export function InlineEdit({
  value,
  onSave,
  type = 'text',
  options,
  min,
  max,
  className,
  renderValue
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    // Validation
    if (type === 'number') {
      const numValue = Number(editValue);
      if (isNaN(numValue)) {
        setError('Invalid number');
        return;
      }
      if (min !== undefined && numValue < min) {
        setError(`Minimum value is ${min}`);
        return;
      }
      if (max !== undefined && numValue > max) {
        setError(`Maximum value is ${max}`);
        return;
      }
    }

    onSave(editValue);
    setIsEditing(false);
    setError('');
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-edit-trigger",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        {renderValue ? renderValue(value) : value}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      {type === 'select' && options ? (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          className={cn(
            "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            type === 'number' && "w-20",
            type === 'date' && "w-36",
            error && "border-red-500"
          )}
        />
      )}
      <button
        onClick={handleSave}
        className="p-1 text-green-600 hover:text-green-700"
        title="Save"
      >
        <Check size={16} />
      </button>
      <button
        onClick={handleCancel}
        className="p-1 text-red-600 hover:text-red-700"
        title="Cancel"
      >
        <X size={16} />
      </button>
      {error && (
        <span className="text-xs text-red-500 ml-2">{error}</span>
      )}
    </div>
  );
}