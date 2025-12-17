import { useMemo } from 'react';
import { addDays } from 'date-fns';
import type { TimelineViewport, TimelineItem } from '../components/InteractiveTimeline';

interface UseTimelineViewportProps {
  timelineItems: TimelineItem[];
  externalViewport?: TimelineViewport;
  onViewportChange?: (viewport: TimelineViewport) => void;
  compact?: boolean;
  alignmentDimensions?: {
    left: number;
    width: number;
  };
}

export function useTimelineViewport({
  timelineItems,
  externalViewport,
  onViewportChange,
  compact = false,
  alignmentDimensions
}: UseTimelineViewportProps): TimelineViewport {
  return useMemo((): TimelineViewport => {
    // Validate external viewport has proper Date objects
    const isValidViewport = (viewport: TimelineViewport | undefined): boolean => {
      if (!viewport) return false;
      if (!viewport.startDate || !viewport.endDate) return false;
      if (!(viewport.startDate instanceof Date) || isNaN(viewport.startDate.getTime())) return false;
      if (!(viewport.endDate instanceof Date) || isNaN(viewport.endDate.getTime())) return false;
      return true;
    };

    // If we have external viewport AND alignment constraints, adjust pixelsPerDay to fit
    if (externalViewport && alignmentDimensions && compact && isValidViewport(externalViewport)) {
      const totalDays = (externalViewport.endDate.getTime() - externalViewport.startDate.getTime()) / (1000 * 60 * 60 * 24);
      const availableWidth = alignmentDimensions.width;
      const fittedPixelsPerDay = Math.max(0.5, availableWidth / totalDays);

      return {
        ...externalViewport,
        pixelsPerDay: fittedPixelsPerDay
      };
    }

    // Use external viewport if provided and valid
    if (externalViewport && isValidViewport(externalViewport)) {
      return externalViewport;
    }

    // In compact mode, return default viewport while waiting for external control
    if (compact) {
      const today = new Date();
      return {
        startDate: new Date(today.getFullYear(), 0, 1),
        endDate: new Date(today.getFullYear() + 1, 11, 31),
        pixelsPerDay: 2
      };
    }

    // Calculate own viewport for standalone mode
    if (timelineItems.length === 0) {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), 0, 1);
      const endDate = new Date(today.getFullYear() + 1, 11, 31);
      const viewport = { startDate, endDate, pixelsPerDay: 2 };
      if (!compact) onViewportChange?.(viewport);
      return viewport;
    }

    // Calculate date range from actual phase data
    const allDates = timelineItems.flatMap(item => [item.startDate, item.endDate]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add padding
    const paddingDays = Math.max(30, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) * 0.05));
    const startDate = addDays(minDate, -paddingDays);
    const endDate = addDays(maxDate, paddingDays);

    // Calculate appropriate zoom level
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const pixelsPerDay = Math.max(2, Math.min(12, 1400 / totalDays));

    const viewport = { startDate, endDate, pixelsPerDay };
    if (!compact) onViewportChange?.(viewport);

    return viewport;
  }, [timelineItems, externalViewport, onViewportChange, compact, alignmentDimensions]);
}
