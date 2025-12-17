/**
 * DateRangeInput Component
 *
 * A paired date input for start/end date ranges with validation
 * and accessibility support.
 */

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { DateRangeInputProps } from './types';

/**
 * DateRangeInput provides start and end date inputs with validation.
 *
 * @example
 * ```tsx
 * <DateRangeInput
 *   startDate={formData.start_date}
 *   endDate={formData.end_date}
 *   onStartDateChange={(date) => handleChange('start_date', date)}
 *   onEndDateChange={(date) => handleChange('end_date', date)}
 *   startError={errors.start_date}
 *   endError={errors.end_date}
 *   required
 * />
 * ```
 */
export const DateRangeInput = React.forwardRef<HTMLDivElement, DateRangeInputProps>(
  (
    {
      startDate,
      endDate,
      onStartDateChange,
      onEndDateChange,
      startLabel = 'Start Date',
      endLabel = 'End Date',
      startError,
      endError,
      required = false,
      disabled = false,
      minDate,
      maxDate,
      className,
    },
    ref
  ) => {
    // Ensure date strings are in YYYY-MM-DD format for input[type="date"]
    const formatDateForInput = (date: string): string => {
      if (!date) return '';
      // Handle ISO datetime strings by extracting just the date part
      return date.split('T')[0];
    };

    return (
      <div
        ref={ref}
        className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}
      >
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="date-range-start">
            {startLabel}
            {required && (
              <>
                <span aria-hidden="true" className="text-destructive ml-1">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </>
            )}
          </Label>
          <Input
            id="date-range-start"
            type="date"
            value={formatDateForInput(startDate)}
            onChange={(e) => onStartDateChange(e.target.value)}
            disabled={disabled}
            min={minDate}
            max={maxDate || endDate || undefined}
            className={cn(
              startError && 'border-destructive',
              disabled && 'opacity-70 cursor-not-allowed'
            )}
            aria-required={required}
            aria-invalid={!!startError}
            aria-describedby={startError ? 'date-range-start-error' : undefined}
          />
          {startError && (
            <p
              id="date-range-start-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {startError}
            </p>
          )}
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="date-range-end">
            {endLabel}
            {required && (
              <>
                <span aria-hidden="true" className="text-destructive ml-1">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </>
            )}
          </Label>
          <Input
            id="date-range-end"
            type="date"
            value={formatDateForInput(endDate)}
            onChange={(e) => onEndDateChange(e.target.value)}
            disabled={disabled}
            min={startDate || minDate || undefined}
            max={maxDate}
            className={cn(
              endError && 'border-destructive',
              disabled && 'opacity-70 cursor-not-allowed'
            )}
            aria-required={required}
            aria-invalid={!!endError}
            aria-describedby={endError ? 'date-range-end-error' : undefined}
          />
          {endError && (
            <p
              id="date-range-end-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {endError}
            </p>
          )}
        </div>
      </div>
    );
  }
);

DateRangeInput.displayName = 'DateRangeInput';
