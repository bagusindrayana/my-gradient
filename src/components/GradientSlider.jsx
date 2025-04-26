import React, { useCallback, useEffect, useRef, useState } from 'react';

function GradientSlider({ colorItems, colorStops, setColorStops, gradientDirection, showGradientStops }) {
    const [visibleColors, setVisibleColors] = useState([]);
    const [visibleStops, setVisibleStops] = useState([]);
    const [visibleIndices, setVisibleIndices] = useState([]);
    useEffect(() => {

        var newVisibleColors = colorItems.filter(item => item.isVisible);
        var newVisibleStops = [];
        var newVisibleIndices = [];
        for (let i = 0; i < newVisibleColors.length; i++) {
            const colorItem = newVisibleColors[i];
            const originalIndex = colorItems.findIndex(item => item.id === colorItem.id);
    
            if (originalIndex >= 0) {
                newVisibleStops.push(colorStops[originalIndex] ?? i * (100 / (newVisibleColors.length - 1)));
                newVisibleIndices.push(originalIndex);
            }
        }
        setVisibleStops(newVisibleStops);
        setVisibleIndices(newVisibleIndices);
        setVisibleColors(newVisibleColors);
    }, [colorStops, colorItems]);

    if (!colorItems.length || !showGradientStops) return null;

    // // Filter to only visible colors
    // const visibleColors = colorItems.filter(item => item.isVisible);
    // if (visibleColors.length <= 1) return null;

    // // Get the corresponding stops for visible colors
    // const visibleStops = [];
    // const visibleIndices = [];

    // for (let i = 0; i < visibleColors.length; i++) {
    //     const colorItem = visibleColors[i];
    //     const originalIndex = colorItems.findIndex(item => item.id === colorItem.id);

    //     if (originalIndex >= 0) {
    //         visibleStops.push(colorStops[originalIndex] ?? i * (100 / (visibleColors.length - 1)));
    //         visibleIndices.push(originalIndex);
    //     }
    // }

    // Determine slider orientation and dimensions
    const isHorizontal = gradientDirection.includes('right') ||
        gradientDirection.includes('left') ||
        gradientDirection.includes('90deg') ||
        gradientDirection.includes('270deg');

    const isDiagonal = gradientDirection.includes('bottom right') ||
        gradientDirection.includes('bottom left') ||
        gradientDirection.includes('top right') ||
        gradientDirection.includes('top left') ||
        gradientDirection.includes('45deg') ||
        gradientDirection.includes('135deg') ||
        gradientDirection.includes('225deg') ||
        gradientDirection.includes('315deg');

    // Use refs for dragging state
    const dragRef = useRef({
        isDragging: false,
        nodeIndex: -1,
        originalIndex: -1,
        stopValue: 0
    });

    // Handle node dragging
    const handleNodeDragStart = (e, index, originalIndex) => {
        e.preventDefault();
        e.stopPropagation();

        // Set dragging state in ref for more reliable tracking
        dragRef.current = {
            isDragging: true,
            nodeIndex: index,
            originalIndex: originalIndex,
            stopValue: colorStops[originalIndex] || 0
        };

        // Add event listeners to window to ensure we capture all mouse movements
        window.addEventListener('mousemove', handleNodeDrag);
        window.addEventListener('mouseup', handleNodeDragEnd);
    };

    const handleNodeDrag = useCallback((e) => {
        if (!dragRef.current.isDragging) return;

        const svg = document.querySelector('.gradient-slider');
        if (!svg) return;

        const svgRect = svg.getBoundingClientRect();
        const index = dragRef.current.nodeIndex;
        const originalIndex = dragRef.current.originalIndex;

        // Calculate new stop position based on orientation
        let newStopPercentage;

        if (isHorizontal) {
            // For horizontal gradients, use x position
            const relativeX = e.clientX - svgRect.left;
            newStopPercentage = Math.min(100, Math.max(0, (relativeX / svgRect.width) * 100));

            // Invert percentage for "to left" direction
            if (gradientDirection === "to left") {
                newStopPercentage = 100 - newStopPercentage;
            }
        } else if (isDiagonal) {
            // For diagonal gradients, use both x and y
            const relativeX = e.clientX - svgRect.left;
            const relativeY = e.clientY - svgRect.top;

            // Use a weighted average for diagonal positions
            const xPercent = (relativeX / svgRect.width) * 100;
            const yPercent = (relativeY / svgRect.height) * 100;

            // For diagonal, choose the appropriate blend based on direction
            if (gradientDirection.includes('bottom right') || gradientDirection === '135deg') {
                // To bottom right: both increase together
                newStopPercentage = (xPercent + yPercent) / 2;
            } else if (gradientDirection.includes('bottom left') || gradientDirection === '225deg') {
                // To bottom left: x decreases, y increases
                newStopPercentage = ((100 - xPercent) + yPercent) / 2;
            } else if (gradientDirection.includes('top right') || gradientDirection === '45deg') {
                // To top right: x increases, y decreases
                newStopPercentage = (xPercent + (100 - yPercent)) / 2;
            } else {
                // To top left: both decrease
                newStopPercentage = ((100 - xPercent) + (100 - yPercent)) / 2;
            }
        } else {
            // For vertical gradients, use y position
            const relativeY = e.clientY - svgRect.top;
            newStopPercentage = Math.min(100, Math.max(0, (relativeY / svgRect.height) * 100));

            // Invert percentage for "to top" direction
            if (gradientDirection === "to top") {
                newStopPercentage = 100 - newStopPercentage;
            }
        }

        newStopPercentage = Math.min(100, Math.max(0, newStopPercentage));

        // Update the dragRef with the current stopValue
        dragRef.current.stopValue = Math.round(newStopPercentage);

        // Update the stops array
        const newStops = [...colorStops];
        newStops[originalIndex] = Math.round(newStopPercentage);
        setColorStops(newStops);
    }, [isHorizontal, isDiagonal, gradientDirection, colorStops, setColorStops]);

    const handleNodeDragEnd = useCallback(() => {
        if (!dragRef.current.isDragging) return;

        // Reset dragging state
        dragRef.current = {
            isDragging: false,
            nodeIndex: -1,
            originalIndex: -1,
            stopValue: 0
        };
        // Remove global event listeners
        window.removeEventListener('mousemove', handleNodeDrag);
        window.removeEventListener('mouseup', handleNodeDragEnd);
    }, [handleNodeDrag]);

    // Determine track and handle positions based on orientation
    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="gradient-slider w-full h-full"
                width="100%"
                height="100%"
            >
                {/* Track line for visual reference */}
                {isHorizontal ? (
                    <line
                        x1={gradientDirection === "to left" ? "100%" : "0%"}
                        y1="50%"
                        x2={gradientDirection === "to left" ? "0%" : "100%"}
                        y2="50%"
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="2"
                        strokeDasharray="4"
                    />
                ) : isDiagonal ? (
                    gradientDirection.includes('bottom right') || gradientDirection === '135deg' ? (
                        <line
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="2"
                            strokeDasharray="4"
                        />
                    ) : gradientDirection.includes('bottom left') || gradientDirection === '225deg' ? (
                        <line
                            x1="100%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="2"
                            strokeDasharray="4"
                        />
                    ) : gradientDirection.includes('top right') || gradientDirection === '45deg' ? (
                        <line
                            x1="0%"
                            y1="100%"
                            x2="100%"
                            y2="0%"
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="2"
                            strokeDasharray="4"
                        />
                    ) : (
                        <line
                            x1="100%"
                            y1="100%"
                            x2="0%"
                            y2="0%"
                            stroke="rgba(255,255,255,0.5)"
                            strokeWidth="2"
                            strokeDasharray="4"
                        />
                    )
                ) : (
                    <line
                        x1="50%"
                        y1={gradientDirection === "to top" ? "100%" : "0%"}
                        x2="50%"
                        y2={gradientDirection === "to top" ? "0%" : "100%"}
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="2"
                        strokeDasharray="4"
                    />
                )}

                {/* Color handle/nodes */}
                {visibleColors.map((colorItem, index) => {
                    const stopValue = visibleStops[index] || 0;
                    let posX, posY;

                    if (isHorizontal) {
                        // For "to right", larger stop values move right; for "to left", larger stop values move left
                        posX = gradientDirection === "to left" ? `${100 - stopValue}%` : `${stopValue}%`;
                        posY = '50%';
                    } else if (isDiagonal) {
                        if (gradientDirection.includes('bottom right') || gradientDirection === '135deg') {
                            posX = `${stopValue}%`;
                            posY = `${stopValue}%`;
                        } else if (gradientDirection.includes('bottom left') || gradientDirection === '225deg') {
                            posX = `${100 - stopValue}%`;
                            posY = `${stopValue}%`;
                        } else if (gradientDirection.includes('top right') || gradientDirection === '45deg') {
                            posX = `${stopValue}%`;
                            posY = `${100 - stopValue}%`;
                        } else {
                            posX = `${100 - stopValue}%`;
                            posY = `${100 - stopValue}%`;
                        }
                    } else {
                        // For "to bottom", larger stop values move down; for "to top", larger stop values move up
                        posX = '50%';
                        posY = gradientDirection === "to top" ? `${100 - stopValue}%` : `${stopValue}%`;
                    }

                    return (
                        <g key={`stop-${colorItem.id}`}>
                            <circle

                                cx={posX}
                                cy={posY}
                                r="10"
                                fill={colorItem.color}
                                stroke="white"
                                strokeWidth="2"
                                style={{ cursor: 'grab', touchAction: 'none', pointerEvents: 'auto' }}
                                onMouseDown={(e) => handleNodeDragStart(e, index, visibleIndices[index])}
                            >
                                <title>Drag to adjust position</title>
                            </circle>

                            {/* Percentage indicator that follows the node */}
                            {dragRef.current.isDragging && dragRef.current.nodeIndex === index && <g>
                                {/* <rect
                  x={`${parseFloat(posX) + 3}%`}
                  y={`${parseFloat(posY) + 2}%`}
                  width="40"
                  height="24"
                  rx="4"
                  fill="rgba(0, 0, 0, 0.7)"
                  style={{ pointerEvents: 'none' }}
                /> */}
                                <text
                                    x={`${parseFloat(posX) + 5}%`}
                                    y={`${parseFloat(posY) + 1}%`}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="12"
                                    fontWeight="bold"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {stopValue}%
                                </text>
                            </g>}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

export default GradientSlider; 