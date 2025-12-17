import React from 'react';
import type { DependencyPoints } from './utils';
import { getLineColor } from './utils';

interface DependencyLinesProps {
  dependencyLines: DependencyPoints[];
}

export function DependencyLines({ dependencyLines }: DependencyLinesProps) {
  return (
    <>
      {dependencyLines.map((line, index) => {
        const { startPoint, endPoint, dependency } = line;
        const pathData = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
        const lineColor = getLineColor(dependency.dependencyType);

        return (
          <svg
            key={`dependency-${dependency.id || index}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 2
            }}
          >
            {/* Main dependency line */}
            <path
              d={pathData}
              stroke={lineColor}
              strokeWidth="2"
              fill="none"
              strokeDasharray={dependency.lagDays && dependency.lagDays > 0 ? "5,3" : undefined}
              opacity="0.8"
            />

            {/* Arrow head at end point */}
            <polygon
              points={`${endPoint.x - 6},${endPoint.y - 3} ${endPoint.x},${endPoint.y} ${endPoint.x - 6},${endPoint.y + 3}`}
              fill={lineColor}
              opacity="0.8"
            />

            {/* Dependency type label at midpoint */}
            <text
              x={(startPoint.x + endPoint.x) / 2}
              y={(startPoint.y + endPoint.y) / 2 - 8}
              fontSize="10"
              fill={lineColor}
              textAnchor="middle"
              fontWeight="600"
              style={{ userSelect: 'none' }}
            >
              {dependency.dependencyType}{dependency.lagDays ? `+${dependency.lagDays}d` : ''}
            </text>
          </svg>
        );
      })}
    </>
  );
}

export default DependencyLines;
