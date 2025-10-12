import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Card } from '../ui/CustomCard';

export type DateRangePreset = 'current' | 'this_week' | 'this_month' | 'next_month' | 'this_quarter' | 'next_quarter' | 'custom';

interface DateRange {
  startDate: string;
  endDate: string;
  preset: DateRangePreset;
}

interface DateRangeSelectorProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  className?: string;
}

const DATE_PRESETS = [
  { value: 'current' as const, label: 'Current Status', description: 'Projects active right now' },
  { value: 'this_week' as const, label: 'This Week', description: 'Next 7 days' },
  { value: 'this_month' as const, label: 'This Month', description: 'Current month' },
  { value: 'next_month' as const, label: 'Next Month', description: 'Following month' },
  { value: 'this_quarter' as const, label: 'This Quarter', description: 'Current 3 months' },
  { value: 'next_quarter' as const, label: 'Next Quarter', description: 'Following 3 months' },
  { value: 'custom' as const, label: 'Custom Range', description: 'Select specific dates' }
];

function getDateRangeForPreset(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  
  switch (preset) {
    case 'current':
      const currentDate = now.toISOString().split('T')[0];
      return { startDate: currentDate, endDate: currentDate };
    
    case 'this_week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return {
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0]
      };
    
    case 'this_month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: monthStart.toISOString().split('T')[0],
        endDate: monthEnd.toISOString().split('T')[0]
      };
    
    case 'next_month':
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return {
        startDate: nextMonthStart.toISOString().split('T')[0],
        endDate: nextMonthEnd.toISOString().split('T')[0]
      };
    
    case 'this_quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
      return {
        startDate: quarterStart.toISOString().split('T')[0],
        endDate: quarterEnd.toISOString().split('T')[0]
      };
    
    case 'next_quarter':
      const nextQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);
      const nextQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 6, 0);
      return {
        startDate: nextQuarterStart.toISOString().split('T')[0],
        endDate: nextQuarterEnd.toISOString().split('T')[0]
      };
    
    default:
      return { startDate: '', endDate: '' };
  }
}

export function DateRangeSelector({ selectedRange, onRangeChange, className = '' }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(selectedRange.startDate);
  const [customEndDate, setCustomEndDate] = useState(selectedRange.endDate);

  const selectedPreset = DATE_PRESETS.find(preset => preset.value === selectedRange.preset);

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      onRangeChange({
        startDate: customStartDate,
        endDate: customEndDate,
        preset
      });
    } else {
      const dateRange = getDateRangeForPreset(preset);
      onRangeChange({
        ...dateRange,
        preset
      });
    }
    setIsOpen(false);
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onRangeChange({
        startDate: customStartDate,
        endDate: customEndDate,
        preset: 'custom'
      });
    }
  };

  const formatDateRange = (range: DateRange) => {
    if (range.preset === 'current') {
      return 'Current Status';
    }
    
    if (!range.startDate || !range.endDate) {
      return 'Select date range';
    }

    const start = new Date(range.startDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const end = new Date(range.endDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: range.startDate.split('-')[0] !== range.endDate.split('-')[0] ? 'numeric' : undefined
    });
    
    return `${start} - ${end}`;
  };

  return (
    <Card className={`relative ${className}`}>
      <div className="p-3">
        <button
          className="w-full flex items-center justify-between gap-2 p-2 text-sm border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select date range for dashboard data"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{formatDateRange(selectedRange)}</span>
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
            role="listbox"
            aria-label="Date range options"
          >
            <div className="py-1">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none ${
                    selectedRange.preset === preset.value ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                  onClick={() => handlePresetSelect(preset.value)}
                  role="option"
                  aria-selected={selectedRange.preset === preset.value}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-muted-foreground">{preset.description}</div>
                </button>
              ))}
              
              {selectedRange.preset === 'custom' && (
                <div className="px-3 py-2 border-t border-gray-100">
                  <div className="space-y-2">
                    <div>
                      <label htmlFor="start-date" className="block text-xs font-medium text-muted-foreground">
                        Start Date
                      </label>
                      <input
                        id="start-date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full mt-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="end-date" className="block text-xs font-medium text-muted-foreground">
                        End Date
                      </label>
                      <input
                        id="end-date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full mt-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleCustomDateChange}
                      className="w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      disabled={!customStartDate || !customEndDate}
                    >
                      Apply Custom Range
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}