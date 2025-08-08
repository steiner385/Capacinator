# InteractiveTimeline Component Guide

The `InteractiveTimeline` component is a reusable, powerful timeline visualization that supports multiple interaction modes. It can be used for chart brushing, project phase management, resource planning, and roadmap visualization.

## Overview

The component provides a unified interface for timeline-based interactions across different use cases in Capacinator:

- **Chart Brushing**: Select date ranges for detailed data analysis
- **Phase Management**: Visual drag-and-drop phase editing
- **Project Roadmaps**: Multi-project timeline visualization
- **Resource Planning**: Allocation and availability timelines

## Quick Start

### Basic Import

```typescript
import InteractiveTimeline, { TimelineItem, TimelineViewport } from '../components/InteractiveTimeline';
import useInteractiveTimeline from '../hooks/useInteractiveTimeline';
import '../components/InteractiveTimeline.css';
```

### Chart Brushing Mode

```typescript
// For data visualization with brush control
function ChartWithBrush() {
  const [brushStart, setBrushStart] = useState(0);
  const [brushEnd, setBrushEnd] = useState(100);

  const handleBrushChange = (start: number, end: number) => {
    setBrushStart(start);
    setBrushEnd(end);
    // Filter your chart data based on the selected range
  };

  return (
    <InteractiveTimeline
      items={[]} // Usually empty for pure brush mode
      viewport={{
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        pixelsPerDay: 2
      }}
      mode="brush"
      height={60}
      brushRange={{ start: brushStart, end: brushEnd }}
      onBrushChange={handleBrushChange}
      showGrid={true}
      showToday={true}
    />
  );
}
```

### Phase Management Mode

```typescript
// For visual project phase editing
function PhaseManager({ projectId }: { projectId: string }) {
  const timeline = useInteractiveTimeline({
    items: projectPhases, // Array of TimelineItem objects
    autoFitViewport: true,
    onItemsChange: (items) => {
      // Handle phase updates
      updateProjectPhases(items);
    }
  });

  return (
    <InteractiveTimeline
      items={timeline.items}
      viewport={timeline.viewport}
      mode="phase-manager"
      height={120}
      onItemAdd={(afterId, position) => {
        // Handle adding new phase
        showAddPhaseDialog(position?.date);
      }}
      onItemEdit={(itemId) => {
        // Handle phase editing
        showEditPhaseDialog(itemId);
      }}
      onItemDelete={(itemId) => {
        // Handle phase deletion
        deletePhase(itemId);
      }}
      onItemMove={(itemId, newStart, newEnd) => {
        // Handle phase movement
        updatePhase(itemId, { startDate: newStart, endDate: newEnd });
      }}
      onItemResize={(itemId, newStart, newEnd) => {
        // Handle phase resizing
        updatePhase(itemId, { startDate: newStart, endDate: newEnd });
      }}
      showGrid={true}
      showToday={true}
      allowOverlap={false}
      minItemDuration={1}
    />
  );
}
```

### Roadmap Mode

```typescript
// For project roadmap visualization
function ProjectRoadmap() {
  const timeline = useInteractiveTimeline({
    items: allProjectPhases,
    autoFitViewport: true,
    minPixelsPerDay: 0.5,
    maxPixelsPerDay: 10
  });

  return (
    <div>
      {/* Timeline controls */}
      <div className="timeline-controls">
        <button onClick={timeline.zoomIn}>Zoom In</button>
        <button onClick={timeline.zoomOut}>Zoom Out</button>
        <button onClick={timeline.zoomToFit}>Fit All</button>
        <button onClick={timeline.jumpToToday}>Today</button>
      </div>

      <InteractiveTimeline
        items={timeline.items}
        viewport={timeline.viewport}
        mode="roadmap"
        height={150}
        onItemMove={timeline.moveItem}
        onItemResize={(itemId, start, end) => {
          timeline.updateItem(itemId, { startDate: start, endDate: end });
        }}
        showGrid={true}
        showToday={true}
        allowOverlap={true} // Allow overlapping projects in roadmap
      />
    </div>
  );
}
```

## Component Props

### InteractiveTimeline Props

| Prop | Type | Description |
|------|------|-------------|
| `items` | `TimelineItem[]` | Array of timeline items to display |
| `viewport` | `TimelineViewport` | Defines the visible date range and zoom level |
| `height` | `number` | Height of the timeline in pixels (default: 60) |
| `mode` | `'brush' \| 'phase-manager' \| 'roadmap'` | Interaction mode |
| `brushRange` | `{ start: number; end: number }` | Current brush selection (brush mode only) |
| `onBrushChange` | `(start: number, end: number) => void` | Brush selection callback |
| `onItemAdd` | `(afterId?: string, position?: { x: number, date: Date }) => void` | Add item callback |
| `onItemEdit` | `(itemId: string) => void` | Edit item callback |
| `onItemDelete` | `(itemId: string) => void` | Delete item callback |
| `onItemMove` | `(itemId: string, newStart: Date, newEnd: Date) => void` | Move item callback |
| `onItemResize` | `(itemId: string, newStart: Date, newEnd: Date) => void` | Resize item callback |
| `showGrid` | `boolean` | Show grid lines (default: true) |
| `showToday` | `boolean` | Show today indicator (default: true) |
| `allowOverlap` | `boolean` | Allow item overlapping (default: false) |
| `minItemDuration` | `number` | Minimum item duration in days (default: 1) |

### TimelineItem Interface

```typescript
interface TimelineItem {
  id: string;           // Unique identifier
  name: string;         // Display name
  startDate: Date;      // Start date
  endDate: Date;        // End date
  color?: string;       // Custom color (defaults to theme color)
  data?: any;           // Additional data for the item
}
```

### TimelineViewport Interface

```typescript
interface TimelineViewport {
  startDate: Date;      // Viewport start date
  endDate: Date;        // Viewport end date
  pixelsPerDay: number; // Zoom level (pixels per day)
}
```

## useInteractiveTimeline Hook

The custom hook provides advanced state management and utilities:

### Basic Usage

```typescript
const timeline = useInteractiveTimeline({
  items: initialItems,
  autoFitViewport: true,
  onItemsChange: (items) => {
    // Handle changes
  }
});
```

### Available Methods

```typescript
// Viewport control
timeline.zoomIn();
timeline.zoomOut();
timeline.zoomToFit();
timeline.panLeft();
timeline.panRight();
timeline.jumpToToday();
timeline.jumpToDate(new Date('2024-06-15'));

// Item management
const newId = timeline.addItem({
  name: 'New Phase',
  startDate: new Date('2024-06-01'),
  endDate: new Date('2024-06-30'),
  color: '#3b82f6'
});

timeline.updateItem('item-id', { 
  name: 'Updated Name',
  color: '#ef4444'
});

timeline.removeItem('item-id');
timeline.moveItem('item-id', newStartDate, newEndDate);
const duplicateId = timeline.duplicateItem('item-id');

// Data filtering (for brush integration)
const filteredData = timeline.getFilteredData(
  chartData,
  (item) => item.date // Date accessor function
);
```

## Integration Examples

### Integrating with Existing Charts

Replace existing Recharts Brush components:

```typescript
// Old approach
<Brush
  dataKey="date"
  onChange={({ startIndex, endIndex }) => {
    // Handle brush change
  }}
/>

// New approach
<InteractiveTimeline
  mode="brush"
  brushRange={{ start: brushStart, end: brushEnd }}
  onBrushChange={(start, end) => {
    setBrushStart(start);
    setBrushEnd(end);
    // Filter chart data based on selection
  }}
/>
```

### Project Roadmap Integration

For the ProjectRoadmap component:

```typescript
// In ProjectRoadmap.tsx
import InteractiveTimeline from '../components/InteractiveTimeline';
import useInteractiveTimeline from '../hooks/useInteractiveTimeline';

// Replace existing drag-and-drop logic
const timeline = useInteractiveTimeline({
  items: projectPhases.map(phase => ({
    id: phase.id,
    name: phase.name,
    startDate: new Date(phase.start_date),
    endDate: new Date(phase.end_date),
    color: getPhaseColor(phase.type),
    data: phase
  })),
  autoFitViewport: true
});

// Replace existing timeline rendering
<InteractiveTimeline
  items={timeline.items}
  viewport={timeline.viewport}
  mode="roadmap"
  height={150}
  onItemMove={(itemId, start, end) => {
    updatePhase(itemId, {
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd')
    });
  }}
  onItemResize={(itemId, start, end) => {
    updatePhase(itemId, {
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd')
    });
  }}
/>
```

## Styling and Customization

### Custom Colors

Define phase-specific colors:

```typescript
const PHASE_COLORS = {
  'business-planning': '#3b82f6',
  'development': '#10b981',
  'testing': '#f59e0b',
  'deployment': '#ef4444'
};
```

### Custom CSS Classes

```css
.interactive-timeline {
  /* Custom timeline styling */
}

.timeline-item.phase-critical {
  --item-color: #ef4444;
  border-width: 2px;
}

.timeline-item.phase-delayed {
  opacity: 0.7;
  border-style: dashed;
}
```

### Responsive Design

The component includes built-in responsive behavior:

- Automatic grid adaptation based on zoom level
- Mobile-friendly touch interactions
- Responsive timeline controls
- Adaptive text sizing

## Best Practices

### Performance

- Use `React.memo` for timeline items when dealing with large datasets
- Implement virtualization for roadmaps with 100+ projects
- Debounce drag operations for smooth interactions

```typescript
const debouncedMove = useMemo(
  () => debounce((itemId, start, end) => {
    updatePhase(itemId, start, end);
  }, 300),
  []
);
```

### Accessibility

- Provide keyboard navigation for timeline items
- Add ARIA labels for screen readers
- Include focus indicators for interactive elements

```typescript
<InteractiveTimeline
  // ... other props
  aria-label="Project timeline with interactive phases"
  role="application"
/>
```

### Data Validation

Always validate dates and handle edge cases:

```typescript
const validateTimelineItem = (item: TimelineItem): boolean => {
  return (
    item.startDate instanceof Date &&
    item.endDate instanceof Date &&
    item.startDate <= item.endDate &&
    item.name.length > 0
  );
};
```

## Migration Guide

### From Recharts Brush

1. Replace `<Brush>` component with `<InteractiveTimeline mode="brush">`
2. Convert brush indices to date ranges
3. Update change handlers to use new callback signature

### From Table-based Phase Management

1. Convert phase data to `TimelineItem[]` format
2. Replace table interactions with timeline callbacks
3. Update CRUD operations to work with drag-and-drop

### From Custom Timeline Solutions

1. Map existing item structure to `TimelineItem` interface
2. Replace custom drag logic with timeline callbacks
3. Migrate viewport controls to hook-based approach

## Troubleshooting

### Common Issues

1. **Items not appearing**: Check date format and viewport range
2. **Drag not working**: Ensure correct mode and callback functions
3. **Performance issues**: Implement item virtualization for large datasets
4. **Grid alignment**: Verify viewport dates are valid Date objects

### Debug Mode

Enable debug logging:

```typescript
const timeline = useInteractiveTimeline({
  // ... config
  debug: true // Add debug logging
});
```

## API Reference

See the TypeScript interfaces and JSDoc comments in:
- `src/components/InteractiveTimeline.tsx`
- `src/hooks/useInteractiveTimeline.ts`

For complete API documentation and examples.