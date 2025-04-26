import React from 'react';

function ColorNodes({ 
  colorItems, 
  samplePoints, 
  imgWidth, 
  imgHeight, 
  showColorNodes,
  imgRef,
  updateColorFromPosition 
}) {
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

  const handleNodeDragStart = (e, index) => {
    e.stopPropagation(); // Prevent event bubbling
    e.target.setAttribute('data-dragging', 'true');
    e.target.setAttribute('data-index', index);
    // Add visual feedback
    e.target.setAttribute('r', '16');
    e.target.setAttribute('stroke-width', '4');
  };

  const handleNodeDrag = (e) => {
    const draggingNode = document.querySelector('circle[data-dragging="true"]');
    if (!draggingNode) return;

    // Get SVG coordinates
    const svg = draggingNode.closest('svg');
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();

    // Calculate position within SVG
    const x = Math.max(0, Math.min(e.clientX - svgRect.left, imgWidth));
    const y = Math.max(0, Math.min(e.clientY - svgRect.top, imgHeight));

    // Update circle position
    draggingNode.setAttribute('cx', x);
    draggingNode.setAttribute('cy', y);

    // Update polyline if needed
    const index = Number(draggingNode.getAttribute('data-index'));
    const polyline = svg.querySelector('polyline');
    if (polyline) {
      const points = polyline.getAttribute('points').split(' ');
      points[index] = `${x},${y}`;
      polyline.setAttribute('points', points.join(' '));
    }
  };

  const handleNodeDragEnd = (e) => {
    const draggingNode = document.querySelector('circle[data-dragging="true"]');
    if (!draggingNode) return;

    // Reset size
    draggingNode.setAttribute('r', '14');
    draggingNode.setAttribute('stroke-width', '3');

    const index = Number(draggingNode.getAttribute('data-index'));
    const nodeId = visibleColors[index]?.id;
    if (!nodeId) return;

    // Get new position
    const x = parseFloat(draggingNode.getAttribute('cx'));
    const y = parseFloat(draggingNode.getAttribute('cy'));

    // Get color at this position if we have a valid image
    if (imgRef.current) {
      updateColorFromPosition(nodeId, { x, y });
    }

    // Reset dragging state
    draggingNode.removeAttribute('data-dragging');
  };

  return (
    <svg
      className="absolute top-0 left-0"
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