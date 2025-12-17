import React from 'react';

export interface PhaseHandle {
  id: string;
  phaseId: string;
  handleType: 'extend-left' | 'extend-right' | 'adjust-both';
  position: number;
  x: number;
  adjacentPhaseId?: string;
}

interface HoveredHandle {
  phaseId: string;
  handleType: string;
  position?: number;
}

interface PhaseHandlesProps {
  handles: PhaseHandle[];
  hoveredHandle: HoveredHandle | null;
  isDragging: boolean;
  onHandleClick: (handle: PhaseHandle) => void;
  onHandleMouseDown: (e: React.MouseEvent, handle: PhaseHandle) => void;
}

export function PhaseHandles({
  handles,
  hoveredHandle,
  isDragging,
  onHandleClick,
  onHandleMouseDown
}: PhaseHandlesProps) {
  return (
    <>
      {handles.map((handle) => {
        const isHovered = hoveredHandle &&
          hoveredHandle.phaseId === handle.phaseId &&
          hoveredHandle.handleType === handle.handleType;

        const getHandleStyle = (): React.CSSProperties => {
          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: handle.x - 12,
            width: 24,
            top: 5,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 8,
            transition: 'all 0.2s ease, opacity 0.15s ease-out',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            opacity: 1
          };

          if (handle.handleType === 'extend-left') {
            return {
              ...baseStyle,
              backgroundColor: isHovered ? 'hsl(142 71% 45%)' : 'hsl(142 71% 55%)',
              color: 'white',
              border: 'none',
              boxShadow: isHovered ? '0 2px 8px rgba(16, 185, 129, 0.4)' : '0 1px 4px rgba(16, 185, 129, 0.3)',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)'
            };
          } else if (handle.handleType === 'extend-right') {
            return {
              ...baseStyle,
              backgroundColor: isHovered ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.9)',
              color: 'white',
              border: 'none',
              boxShadow: isHovered ? '0 2px 8px rgba(59, 130, 246, 0.4)' : '0 1px 4px rgba(59, 130, 246, 0.3)',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)'
            };
          } else {
            return {
              ...baseStyle,
              backgroundColor: isHovered ? 'hsl(262 83% 58%)' : 'hsl(262 83% 68%)',
              color: 'white',
              border: 'none',
              boxShadow: isHovered ? '0 2px 8px rgba(168, 85, 247, 0.4)' : '0 1px 4px rgba(168, 85, 247, 0.3)',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)'
            };
          }
        };

        const getHandleContent = () => {
          if (handle.handleType === 'extend-left') {
            return { icon: '\u2190', text: 'Extend Left' };
          } else if (handle.handleType === 'extend-right') {
            return { icon: '\u2192', text: 'Extend Right' };
          } else {
            return { icon: '\u2194', text: 'Adjust Both' };
          }
        };

        const content = getHandleContent();

        return (
          <div
            key={handle.id}
            style={getHandleStyle()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isDragging) {
                onHandleClick(handle);
              }
            }}
            onMouseDown={(e) => {
              if (handle.handleType === 'adjust-both') {
                onHandleMouseDown(e, handle);
              }
            }}
            title={`${content.text} - Click to apply or drag to adjust`}
          >
            <span style={{
              fontSize: isHovered ? '14px' : '12px',
              lineHeight: 1,
              transition: 'all 0.2s ease'
            }}>
              {content.icon}
            </span>
          </div>
        );
      })}

      {/* Handle tooltip */}
      {hoveredHandle && (
        <div
          style={{
            position: 'absolute',
            left: (hoveredHandle.position || 0) - 50,
            top: 5,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          Press Enter or Space to apply
        </div>
      )}
    </>
  );
}

export default PhaseHandles;
