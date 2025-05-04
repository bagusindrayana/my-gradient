import React from 'react';

interface SamplePoint {
  x: number;
  y: number;
}

interface Position {
  x: number;
  y: number;
}

interface ColorNodesProps {
  colorItems: Array<{
    id: string;
    color: string;
    isVisible: boolean;
  }>;
  samplePoints: SamplePoint[];
  imgWidth: number;
  imgHeight: number;
  showColorNodes: boolean;
  imgRef: React.RefObject<HTMLImageElement>;
  updateColorFromPosition: (id: string, position: Position) => void;
}

function ColorNodes({ 
  colorItems, 
  samplePoints, 
  imgWidth, 
  imgHeight, 
  showColorNodes,
  imgRef,
  updateColorFromPosition 
}: ColorNodesProps) {
  if (!showColorNodes || !samplePoints.length || !colorItems.length) return null;

  // Filter to only visible colors and their corresponding points
  const visibleColors = colorItems.filter(item => item.isVisible);

  // Create a mapping of points that match the visible colors
  // This ensures the points match the exact order of visible colors
  const visiblePoints = [];

  for (let i = 0; i < visibleColors.length; i++) {
    const colorItem = visibleColors[i];
    const originalIndex = colorItems.findIndex(item => item.id === colorItem.id);

    // Only add the point if we have a valid corresponding sample point
    if (originalIndex >= 0 && originalIndex < samplePoints.length) {
      visiblePoints.push(samplePoints[originalIndex]);
    }
  }

  if (visiblePoints.length === 0) return null;

  const handleNodeDragStart = (e: React.MouseEvent<SVGCircleElement>, index: number) => {
    e.stopPropagation(); // Prevent event bubbling
    const target = e.target as SVGCircleElement;
    target.setAttribute('data-dragging', 'true');
    target.setAttribute('data-index', index.toString());
    // Add visual feedback
    target.setAttribute('r', '16');
    target.setAttribute('stroke-width', '4');
  };

  const handleNodeDrag = (e: React.MouseEvent<SVGSVGElement>) => {
    const draggingNode = document.querySelector('circle[data-dragging="true"]') as SVGCircleElement | null;
    if (!draggingNode) return;

    // Get SVG coordinates
    const svg = draggingNode.closest('svg') as SVGSVGElement | null;
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();

    // Calculate position within SVG
    const x = Math.max(0, Math.min(e.clientX - svgRect.left, imgWidth));
    const y = Math.max(0, Math.min(e.clientY - svgRect.top, imgHeight));

    // Update circle position
    draggingNode.setAttribute('cx', x.toString());
    draggingNode.setAttribute('cy', y.toString());

    // Update polyline if needed
    const index = parseInt(draggingNode.getAttribute('data-index') || '0', 10);
    const polyline = svg.querySelector('polyline') as SVGPolylineElement | null;
    if (polyline) {
      const points = polyline.getAttribute('points')?.split(' ') || [];
      points[index] = `${x},${y}`;
      polyline.setAttribute('points', points.join(' '));
    }

    const nodeId = visibleColors[index]?.id;
    if (imgRef.current && nodeId) {
      updateColorFromPosition(nodeId, { x, y });
    }
  };

  const handleNodeDragEnd = (e: React.MouseEvent<SVGSVGElement>) => {
    const draggingNode = document.querySelector('circle[data-dragging="true"]') as SVGCircleElement | null;
    if (!draggingNode) return;

    // Reset size
    draggingNode.setAttribute('r', '14');
    draggingNode.setAttribute('stroke-width', '3');

    const index = parseInt(draggingNode.getAttribute('data-index') || '0', 10);
    const nodeId = visibleColors[index]?.id;
    if (!nodeId) return;

    // Get new position
    const x = parseFloat(draggingNode.getAttribute('cx') || '0');
    const y = parseFloat(draggingNode.getAttribute('cy') || '0');

    // Get color at this position if we have a valid image
    if (imgRef.current) {
      updateColorFromPosition(nodeId, { x, y });
    }

    // Reset dragging state
    draggingNode.removeAttribute('data-dragging');
  };

  return (
    <svg
      className="absolute top-0 left-0 transition-all duration-300"
      width={imgWidth}
      height={imgHeight}
      style={{ zIndex: 10, pointerEvents: 'auto' }}
      onMouseMove={handleNodeDrag}
      onMouseUp={handleNodeDragEnd}
      onMouseLeave={handleNodeDragEnd}
    >
      {/* Draw connecting lines between points */}
      {visiblePoints.length > 1 && (
        <polyline
          points={visiblePoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeOpacity="0.8"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Draw circles at each point */}
      {visiblePoints.map((point, index) => (
        <circle
          key={`node-${index}`}
          cx={point.x}
          cy={point.y}
          r="14"
          fill={visibleColors[index].color}
          fillOpacity="1"
          stroke="white"
          strokeWidth="3"
          style={{ cursor: 'move', filter: 'drop-shadow(0px 0px 3px rgba(0,0,0,0.5))', pointerEvents: 'auto' }}
          onMouseDown={(e) => handleNodeDragStart(e, index)}
          data-index={index}
        >
          <title>Drag to change color</title>
        </circle>
      ))}
    </svg>
  );
}

export default ColorNodes;
