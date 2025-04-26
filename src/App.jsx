import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities'; // For transform/transition styles
import './App.css';
import { createNoise2D } from 'simplex-noise';

function App() {
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef(null);
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const imgUploadCanvas = useRef(null);
  // Use a state that holds objects with id, color, and visibility
  const [colorItems, setColorItems] = useState([]);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  // Gradient Settings State
  const [gradientDirection, setGradientDirection] = useState('to bottom');
  const [colorCount, setColorCount] = useState(3); // Default: 5 colors
  // Color stops state (percentage position in the gradient)
  const [colorStops, setColorStops] = useState([]);
  // Show gradient stops slider toggle
  const [showGradientStops, setShowGradientStops] = useState(true);
  // Effects State
  const [blurValue, setBlurValue] = useState(0); // 0px blur initially
  const [saturationValue, setSaturationValue] = useState(100); // 100% saturation initially
  const [grainValue, setGrainValue] = useState(0); // 0% grain initially
  // Color sample points state
  const [colorSamplePoints, setColorSamplePoints] = useState([]);
  // Show color nodes toggle
  const [showColorNodes, setShowColorNodes] = useState(true);
  // CSS Code Result State
  const [cssCodeResult, setCssCodeResult] = useState('');

  const [palette, setPalette] = useState([]); // State to hold extracted colors

  // Add state for download options
  const [downloadSize, setDownloadSize] = useState({ width: 1920, height: 1080 });
  const resultPreviewRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Reference for the noise function
  const noise2DRef = useRef(null);

  // Initialize SimplexNoise on component mount
  useEffect(() => {
    // Use the new API to create a noise2D function
    noise2DRef.current = createNoise2D();
  }, []);

  // --- Helper Function: Calculate Color Distance ---
  function calculateColorDistance(rgbString1, rgbString2) {
    const parseRgb = (rgbStr) => {
      const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) return null;
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    };

    const rgb1 = parseRgb(rgbString1);
    const rgb2 = parseRgb(rgbString2);

    if (!rgb1 || !rgb2) return Infinity; // Cannot compare if parsing fails

    // Simple Euclidean distance in RGB space
    const dist = Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
    // Max distance is sqrt(3 * 255^2) ≈ 441.67
    return dist;
  }
  // --- End Helper Function ---

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  function onImageLoad(e) {
    imgRef.current = e.currentTarget; // Store image ref
    setImgWidth(e.currentTarget.width);
    setImgHeight(e.currentTarget.height);

    // Extract colors after image loads
    if (imgRef.current) {

      imgUploadCanvas.current = document.createElement('canvas');
      imgUploadCanvas.current.width = imgRef.current.naturalWidth;
      imgUploadCanvas.current.height = imgRef.current.naturalHeight;

      extractColorsFromImage(imgRef.current, colorCount);
    }
  }

  // --- Color Extraction Logic ---

  // Placeholder function to get average color of a canvas area
  function getAverageColor(canvas, ctx) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    let count = 0;

    // Simple sampling - check every 10th pixel to speed up
    for (let i = 0; i < data.length; i += 4 * 10) {
      // Optional: Add threshold to ignore transparent/very light pixels
      // if (data[i+3] < 128 || (data[i] > 250 && data[i+1] > 250 && data[i+2] > 250)) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }

    if (count === 0) return 'rgb(128,128,128)'; // Return grey if no pixels sampled

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    return `rgb(${r},${g},${b})`;
  }

  // Function to extract colors from the entire image
  async function extractColorsFromImage(image, maxColors = 5) {
    if (!image) {
      console.error('Invalid image ref for color extraction.');
      return;
    }

    setIsLoadingColors(true);

    try {
      const canvas = imgUploadCanvas.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Set canvas dimensions to match image
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      // Draw the image to the canvas
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Determine how many colors to sample
      const actualMaxColors = Math.min(maxColors, canvas.height);

      // Calculate sampling points along a vertical line
      const palette = [];
      const samplePoints = [];

      // Use the center of the image for the x-coordinate
      const centerX = Math.floor(canvas.width / 2);

      // Sample evenly spaced points from top to bottom
      for (let i = 0; i < actualMaxColors; i++) {
        // Calculate y position for even distribution
        const yPercent = i / (actualMaxColors - 1);
        const y = Math.floor(yPercent * canvas.height);

        // Sample a small region around the point
        const sampleSize = 5;
        const startX = Math.max(0, centerX - sampleSize);
        const startY = Math.max(0, y - sampleSize);
        const width = Math.min(sampleSize * 2, canvas.width - startX);
        const height = Math.min(sampleSize * 2, canvas.height - startY);

        // Get image data from the sample area
        const imageData = ctx.getImageData(startX, startY, width, height);
        const data = imageData.data;

        // Calculate average color
        let r = 0, g = 0, b = 0, count = 0;
        for (let j = 0; j < data.length; j += 4) {
          // Skip transparent pixels
          if (data[j + 3] < 128) continue;

          r += data[j];
          g += data[j + 1];
          b += data[j + 2];
          count++;
        }

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          // Add to palette
          palette.push(`rgb(${r}, ${g}, ${b})`);

          // Calculate display coordinates for the sample point
          const displayX = image.width / 2;
          const displayY = (image.height * yPercent);

          samplePoints.push({ x: displayX, y: displayY });
        }
      }

      console.log(`Extracted ${palette.length} colors:`, palette);

      // Fallback if no colors found
      if (palette.length === 0) {
        console.warn("Color sampling failed, falling back to average color.");
        const avgColor = getAverageColor(canvas, ctx);
        if (avgColor) {
          setPalette([avgColor]);
          setColorSamplePoints([{ x: image.width / 2, y: image.height / 2 }]);
        }
      } else {
        setPalette(palette);
        setColorSamplePoints(samplePoints);
      }
    } catch (error) {
      console.error("Error during color extraction:", error);
    } finally {
      setIsLoadingColors(false);
    }
  }

  // Effect to trigger color extraction when crop is complete
  useEffect(() => {
    if (
      imgRef.current
    ) {
      setImgHeight(imgRef.current.height);
      setImgWidth(imgRef.current.width);
    } else {
      // Reset palette if crop is invalid or no image
      setPalette([]);
    }
  }, [imgSrc]);// Add dependencies if they affect extraction

  // --- Drag and Drop Setup ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      // Get the old and new indices
      const oldIndex = colorItems.findIndex(item => item.id === active.id);
      const newIndex = colorItems.findIndex(item => item.id === over.id);

      // Update colorItems using arrayMove
      setColorItems((items) => arrayMove(items, oldIndex, newIndex));

      setColorStops((stops) => arrayMove(stops, oldIndex, newIndex));

      // Update colorSamplePoints to match the reordered colorItems
      setColorSamplePoints((points) => {
        // Safety check: ensure points array exists and has the expected length
        if (!points || oldIndex >= points.length) {
          console.warn('Points array mismatch detected during reordering');
          return points; // Return unchanged if there's a mismatch
        }

        // Clone the array to avoid mutating state
        const newPoints = [...points];

        // Get the point that's being moved
        const pointToMove = newPoints[oldIndex];

        // Remove it from its old position
        newPoints.splice(oldIndex, 1);

        // Insert it at the new position (adjust if newIndex is out of bounds)
        const safeNewIndex = Math.min(newIndex, newPoints.length);
        newPoints.splice(safeNewIndex, 0, pointToMove);

        return newPoints;
      });

      // Also update colorStops to match the reordered colorItems
      // setColorStops((stops) => {
      //   if (!stops || oldIndex >= stops.length) {
      //     return stops; // Return unchanged if there's a mismatch
      //   }

      //   // Clone the array to avoid mutating state
      //   const newStops = [...stops];

      //   // Get the stop value that's being moved
      //   const stopToMove = newStops[oldIndex];

      //   // Remove it from its old position
      //   newStops.splice(oldIndex, 1);

      //   // Insert it at the new position
      //   const safeNewIndex = Math.min(newIndex, newStops.length);
      //   newStops.splice(safeNewIndex, 0, stopToMove);

      //   return newStops;
      // });

      console.log(colorStops);


    }

   
   
  }

  // --- Toggle Color Visibility ---
  const toggleColorVisibility = (id) => {
    setColorItems(items =>
      items.map(item =>
        item.id === id ? { ...item, isVisible: !item.isVisible } : item
      )
    );
  };

  // --- Generate Gradient CSS ---
  const generateGradientCss = () => {
    const visibleColors = colorItems
      .filter(item => item.isVisible);

    if (visibleColors.length === 0) return 'none'; // Or a default background
    if (visibleColors.length === 1) return visibleColors[0].color; // Solid color

    // Build gradient with color stops
    const colorString = visibleColors.map((item, index) => {
      const stop = colorStops[index];
      return stop !== undefined ? `${item.color} ${stop}%` : item.color;
    }).join(', ');

    return `linear-gradient(${gradientDirection}, ${colorString})`;
  };

  const gradientCss = generateGradientCss();

  // Effect to update colorItems when palette changes
  useEffect(() => {
    setColorItems(palette.map((color, index) => ({
      id: `${color}-${index}`, // Create a unique ID
      color: color,
      isVisible: true, // Default to visible
    })));


    console.log(palette);


    // Initialize color stops when palette changes (evenly distributed)
    if (palette.length > 0) {
      const newStops = palette.map((_, index) =>
        Math.round((index / (palette.length - 1)) * 100)
      );
      setColorStops(newStops);
    }
  }, [palette]); // Re-run when palette changes

  // --- Generate Filter CSS ---
  const generateFilterCss = () => {
    let filters = [];
    if (blurValue > 0) {
      filters.push(`blur(${blurValue}px)`);
    }
    if (saturationValue !== 100) { // Only apply if not default
      filters.push(`saturate(${saturationValue}%)`);
    }
    // Add grain filter if implemented later
    return filters.join(' ');
  };

  // Function to generate noise background CSS for grain effect
  const generateGrainCss = () => {
    if (grainValue <= 0) return '';

    // For CSS preview, we'll still use SVG noise for performance
    // but we'll adjust it to better match the SimplexNoise effect
    const opacity = grainValue / 100;

    // Calculate appropriate noise frequency based on preview size
    const previewWidth = imgWidth || 600;
    const baseFrequency = Math.max(0.05, Math.min(1.0, 0.65 * (600 / previewWidth)));

    return `
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${opacity}'/%3E%3C/svg%3E")
    `;
  };

  const grainCss = generateGrainCss();
  const filterCss = generateFilterCss();

  // --- Generate CSS Code for Display ---
  const generateCssCode = () => {
    let code = '';
    if (gradientCss !== 'none') {
      code += `background: ${gradientCss};\n`;

      // Add grain overlay if enabled
      if (grainValue > 0) {
        code += `background-image: ${grainCss}, ${gradientCss};\n`;
      }
    } else {
      code += `/* No gradient generated (upload image or show colors) */\n`;
    }

    if (filterCss) {
      code += `filter: ${filterCss};\n`;
    }
    // Add vendor prefixes if needed for broader compatibility (optional)
    // if (filterCss) {
    //   code += `-webkit-filter: ${filterCss};\n`;
    // }

    setCssCodeResult(code.trim()); // Update state
  };

  // Effect to update CSS code when gradient or filters change
  useEffect(() => {
    generateCssCode();
  }, [gradientCss, filterCss, colorStops, grainValue]); // Add grainValue as dependency

  // Color Nodes Component
  const ColorNodes = ({ colorItems, samplePoints, imgWidth, imgHeight }) => {
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

        {/* Draw smaller inner circles to indicate draggable */}
        {/* {visiblePoints.map((point, index) => (
          <circle
            key={`node-inner-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="white"
            fillOpacity="0.8"
            stroke="none"
            style={{ pointerEvents: 'none' }}
          />
        ))} */}
      </svg>
    );
  };

  const pickColor = (position) => {
    if (!imgRef.current || !imgUploadCanvas.current) return;

    try {
      // Create a small canvas to sample the color
      const canvas = imgUploadCanvas.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Draw the image to the canvas
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

      // Calculate the position in the actual image
      const scaleX = canvas.width / imgRef.current.width;
      const scaleY = canvas.height / imgRef.current.height;

      // Sample a small region around the point (5x5 pixels)
      const sampleSize = 5;
      const x = Math.floor(position.x * scaleX);
      const y = Math.floor(position.y * scaleY);

      // Ensure we're within bounds
      const validX = Math.min(Math.max(x, sampleSize), canvas.width - sampleSize);
      const validY = Math.min(Math.max(y, sampleSize), canvas.height - sampleSize);

      // Get image data for a small region
      const imageData = ctx.getImageData(
        validX - sampleSize,
        validY - sampleSize,
        sampleSize * 2,
        sampleSize * 2
      );

      // Calculate average color
      let r = 0, g = 0, b = 0, count = 0;
      for (let j = 0; j < imageData.data.length; j += 4) {
        if (imageData.data[j + 3] < 128) continue; // Skip transparent pixels
        r += imageData.data[j];
        g += imageData.data[j + 1];
        b += imageData.data[j + 2];
        count++;
      }

      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        return `rgb(${r}, ${g}, ${b})`;
      }
      return null;
    } catch (error) {
      return null;
    }

  }

  // Function to update a color item's color based on a position in the image
  const updateColorFromPosition = (colorId, position) => {
    if (!imgRef.current) return;

    try {
      const color = pickColor(position);

      if (color) {

        // Update the color in colorItems
        setColorItems(items =>
          items.map(item =>
            item.id === colorId
              ? { ...item, color: color }
              : item
          )
        );

        // Update the sample point position
        setColorSamplePoints(points => {
          const newPoints = [...points];
          const itemIndex = colorItems.findIndex(item => item.id === colorId);
          if (itemIndex >= 0 && itemIndex < newPoints.length) {
            newPoints[itemIndex] = { x: position.x, y: position.y };
          }
          return newPoints;
        });
      }
    } catch (error) {
      console.error("Error updating color from position:", error);
    }
  };

  // Gradient Slider Component for Result Preview
  const GradientSlider = ({ colorItems, colorStops, setColorStops, gradientDirection }) => {
  
    if (!colorItems.length || !showGradientStops) return null;



    // Filter to only visible colors
    const visibleColors = colorItems.filter(item => item.isVisible);
    if (visibleColors.length <= 1) return null;


    // Get the corresponding stops for visible colors
    const visibleStops = [];
    const visibleIndices = [];



    for (let i = 0; i < visibleColors.length; i++) {
      const colorItem = visibleColors[i];
      const originalIndex = colorItems.findIndex(item => item.id === colorItem.id);

      if (originalIndex >= 0) {
        visibleStops.push(colorStops[originalIndex] ?? i * (100 / (visibleColors.length - 1)));
        visibleIndices.push(originalIndex);
      }

    }

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
      console.log('dragging', index);
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
      console.log('drag end',dragRef.current);
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

            //const isDraggingThisNode = dragRef.current.isDragging && dragRef.current.nodeIndex === index;

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
                <g>
                    <rect
                      x={`${parseFloat(posX) + 5}%`}
                      y={`${parseFloat(posY) - 5}%`}
                      width="40"
                      height="24"
                      rx="4"
                      fill="rgba(0, 0, 0, 0.7)"
                      style={{ pointerEvents: 'none' }}
                    />
                    <text
                      x={`${parseFloat(posX) + 5}%`}
                      y={`${parseFloat(posY) + 2}%`}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {stopValue}%
                    </text>
                  </g>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Separate effect to handle colorCount changes
  useEffect(() => {
    // Only run this effect if we already have colors and image is loaded
    if (palette.length > 0 && colorItems.length > 0 && imgRef.current) {
      const currentCount = colorItems.length;

      // If we need to add more colors
      if (colorCount > currentCount) {
        const canvas = imgUploadCanvas.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        // Create new colors and points between the last and second-to-last points
        const newColors = [];
        const newPoints = [];
        const newStops = [];

        // Number of colors to add
        const numToAdd = colorCount - currentCount;

        for (let i = 0; i < numToAdd; i++) {
          // If we have at least two colors, use them as reference points
          if (colorSamplePoints.length >= 2 && colorItems.length >= 2) {
            // Get the last and second-to-last points
            const lastIdx = colorSamplePoints.length - 1;
            const secondLastIdx = colorSamplePoints.length - 2;

            const lastPoint = colorSamplePoints[lastIdx];
            const secondLastPoint = colorSamplePoints[secondLastIdx];

            // Get the last and second-to-last colors
            const lastColor = colorItems[lastIdx].color;
            const secondLastColor = colorItems[secondLastIdx].color;

            // Get the last and second-to-last stops if available
            let lastStop = colorStops[lastIdx] !== undefined ? colorStops[lastIdx] : 100;
            let secondLastStop = colorStops[secondLastIdx] !== undefined ? colorStops[secondLastIdx] : (lastStop > 0 ? lastStop - 20 : 0);

            // Calculate the position for the new node - divide the space evenly
            const divisions = numToAdd + 1;
            const fraction = (i + 1) / divisions;

            // Interpolate between the points
            const newX = secondLastPoint.x + (lastPoint.x - secondLastPoint.x) * fraction;
            const newY = secondLastPoint.y + (lastPoint.y - secondLastPoint.y) * fraction;

            const color = pickColor({
              x: newX,
              y: newY,

            })

            // Calculate the new stop position
            const newStop = Math.round(secondLastStop + (lastStop - secondLastStop) * fraction);

            // Interpolate colors by sampling the image at the new position
            try {

              if (color) {


                const newColor = color;
                newColors.push(newColor);
                newPoints.push({ x: newX, y: newY });
                newStops.push(newStop);
              } else {
                // Fallback: Blend between the two existing colors
                const parseRgb = (rgbStr) => {
                  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                  if (!match) return { r: 0, g: 0, b: 0 };
                  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
                };

                const color1 = parseRgb(secondLastColor);
                const color2 = parseRgb(lastColor);

                const blendedR = Math.round(color1.r + (color2.r - color1.r) * fraction);
                const blendedG = Math.round(color1.g + (color2.g - color1.g) * fraction);
                const blendedB = Math.round(color1.b + (color2.b - color1.b) * fraction);

                const newColor = `rgb(${blendedR}, ${blendedG}, ${blendedB})`;
                newColors.push(newColor);
                newPoints.push({ x: newX, y: newY });
                newStops.push(newStop);
              }
            } catch (error) {
              console.error("Error sampling color for new point:", error);
              // Fallback: Blend between the two existing colors
              const parseRgb = (rgbStr) => {
                const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (!match) return { r: 0, g: 0, b: 0 };
                return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
              };

              const color1 = parseRgb(secondLastColor);
              const color2 = parseRgb(lastColor);

              const blendedR = Math.round(color1.r + (color2.r - color1.r) * fraction);
              const blendedG = Math.round(color1.g + (color2.g - color1.g) * fraction);
              const blendedB = Math.round(color1.b + (color2.b - color1.b) * fraction);

              const newColor = `rgb(${blendedR}, ${blendedG}, ${blendedB})`;
              newColors.push(newColor);
              newPoints.push({ x: newX, y: newY });
              newStops.push(newStop);
            }
          } else {
            // Fallback if we don't have enough reference points
            const lastPoint = colorSamplePoints[colorSamplePoints.length - 1] || { x: imgRef.current.width / 2, y: imgRef.current.height / 2 };
            const maxOffset = 30; // Maximum pixel offset in any direction

            // Calculate random offsets within bounds
            const randomOffsetX = Math.random() * maxOffset * (Math.random() > 0.5 ? 1 : -1);
            const randomOffsetY = Math.random() * maxOffset * (Math.random() > 0.5 ? 1 : -1);

            // Ensure the new point is within image bounds
            const newX = Math.min(Math.max(lastPoint.x + randomOffsetX, 0), imgRef.current.width);
            const newY = Math.min(Math.max(lastPoint.y + randomOffsetY, 0), imgRef.current.height);

            // Sample the color at this position
            const canvasX = Math.floor((newX / imgRef.current.width) * canvas.width);
            const canvasY = Math.floor((newY / imgRef.current.height) * canvas.height);

            // Sample a small region around the point
            const sampleSize = 5;
            const startX = Math.max(0, canvasX - sampleSize);
            const startY = Math.max(0, canvasY - sampleSize);
            const width = Math.min(sampleSize * 2, canvas.width - startX);
            const height = Math.min(sampleSize * 2, canvas.height - startY);

            // Get image data
            try {
              const imageData = ctx.getImageData(startX, startY, width, height);
              const data = imageData.data;

              // Calculate average color
              let r = 0, g = 0, b = 0, count = 0;
              for (let j = 0; j < data.length; j += 4) {
                if (data[j + 3] < 128) continue; // Skip transparent pixels
                r += data[j];
                g += data[j + 1];
                b += data[j + 2];
                count++;
              }

              if (count > 0) {
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);

                const newColor = `rgb(${r}, ${g}, ${b})`;
                newColors.push(newColor);
                newPoints.push({ x: newX, y: newY });

                // Calculate a stop value
                const existingStop = colorStops[colorStops.length - 1] || 100;
                const newStop = Math.max(0, existingStop - 10);
                newStops.push(newStop);
              }
            } catch (error) {
              console.error("Error sampling color for new point:", error);
              // Fallback to a random color if sampling fails
              const randomColor = `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;
              newColors.push(randomColor);
              newPoints.push({ x: newX, y: newY });

              // Calculate a stop value
              const existingStop = colorStops[colorStops.length - 1] || 100;
              const newStop = Math.max(0, existingStop - 10);
              newStops.push(newStop);
            }
          }
        }
        console.log(newColors);
        // Add the new colors, points, and stops in the right position (between second-to-last and last)
        if (newColors.length > 0 && colorItems.length >= 2) {
          // Create a copy of the current data
          let updatedPalette = [...colorItems].map(item => item.color);
          let updatedPoints = [...colorSamplePoints];
          let updatedStops = [...colorStops];
          // let updatedColorItems = [...colorItems];

          // Insert new items BEFORE the last position (between second-to-last and last)
          const insertIndex = Math.max(0, updatedPalette.length - 1);

          // Save last item values to preserve them
          const lastColor = updatedPalette[updatedPalette.length - 1];
          const lastPoint = updatedPoints[updatedPoints.length - 1];
          const lastStop = updatedStops[updatedStops.length - 1];
          // const lastColorItem = updatedColorItems[updatedColorItems.length - 1];


          // Insert each new color/point/stop at the proper position
          for (let i = 0; i < newColors.length; i++) {
            updatedPalette.splice(insertIndex + i, 0, newColors[i]);
            updatedPoints.splice(insertIndex + i, 0, newPoints[i]);
            updatedStops.splice(insertIndex + i, 0, newStops[i]);
            // updatedPalette.push(newColors[i]);
            // updatedPoints.push(newPoints[i]);
            // updatedStops.push(newStops[i]);
          }

          // Make sure the last element is still the original last element
          if (lastColor && lastPoint && updatedPalette.length > 1) {
            updatedPalette[updatedPalette.length - 1] = lastColor;
            updatedPoints[updatedPoints.length - 1] = lastPoint;
            if (lastStop !== undefined) {
              updatedStops[updatedPalette.length - 1] = lastStop;
            }
          }

          // Update the state
          setPalette(updatedPalette);
          setColorSamplePoints(updatedPoints);
          setColorStops(updatedStops);

        } else if (newColors.length > 0) {
          // If there aren't enough existing colors, just append
          setPalette(prev => [...prev, ...newColors]);
          setColorSamplePoints(prev => [...prev, ...newPoints]);
          setColorStops(prev => [...prev, ...newStops]);
        }
      } else {
        //remove colors
        setPalette(prev => prev.slice(0, colorCount));
        setColorSamplePoints(prev => prev.slice(0, colorCount));
      }
    }
  }, [colorCount, imgRef.current]);

  // Function to download gradient as image
  const downloadGradientAsImage = () => {
    if (!gradientCss || gradientCss === 'none') {
      alert('Please generate a gradient first');
      return;
    }

    // Create a canvas with the desired download size
    const canvas = document.createElement('canvas');
    canvas.width = downloadSize.width;
    canvas.height = downloadSize.height;
    const ctx = canvas.getContext('2d');

    // Draw gradient directly on canvas
    const drawGradient = () => {
      // Parse the linear gradient string
      const isVisibleColors = colorItems.filter(item => item.isVisible);

      // If there's only one color, fill with solid color
      if (isVisibleColors.length === 1) {
        ctx.fillStyle = isVisibleColors[0].color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Create a gradient based on the direction
      let gradient;

      if (gradientDirection === 'to right') {
        gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      } else if (gradientDirection === 'to left') {
        gradient = ctx.createLinearGradient(canvas.width, 0, 0, 0);
      } else if (gradientDirection === 'to bottom') {
        gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      } else if (gradientDirection === 'to top') {
        gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      } else if (gradientDirection === 'to bottom right' || gradientDirection === '135deg') {
        gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      } else if (gradientDirection === 'to bottom left' || gradientDirection === '225deg') {
        gradient = ctx.createLinearGradient(canvas.width, 0, 0, canvas.height);
      } else if (gradientDirection === 'to top right' || gradientDirection === '45deg') {
        gradient = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
      } else if (gradientDirection === '315deg') {
        gradient = ctx.createLinearGradient(canvas.width, canvas.height, 0, 0);
      } else {
        // Default for any other angle - horizontal gradient
        gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      }

      // Add color stops
      const visibleColors = colorItems.filter(item => item.isVisible);

      visibleColors.forEach((item, index) => {
        const originalIndex = colorItems.findIndex(c => c.id === item.id);
        const stopValue = colorStops[originalIndex] !== undefined
          ? colorStops[originalIndex] / 100
          : index / (visibleColors.length - 1);

        gradient.addColorStop(stopValue, item.color);
      });

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Apply filters manually
    const applyFilters = () => {
      // Apply blur if specified
      if (blurValue > 0) {
        // Save original image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // We'll use a simple box blur implementation
        const radius = Math.min(20, Math.max(1, blurValue)); // Limit radius

        // Create a temporary canvas for the blur operation
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the original image
        tempCtx.putImageData(imageData, 0, 0);

        // Apply multiple passes of box blur for a better approximation of Gaussian blur
        for (let i = 0; i < 3; i++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.filter = `blur(${radius}px)`;
          ctx.drawImage(tempCanvas, 0, 0);

          // Update the temp canvas for the next iteration
          tempCtx.clearRect(0, 0, canvas.width, canvas.height);
          tempCtx.drawImage(canvas, 0, 0);
        }

        // Reset filter
        ctx.filter = 'none';
      }

      // Apply saturation
      if (saturationValue !== 100) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Convert RGB to HSL
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;

          if (max === min) {
            h = s = 0; // achromatic
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
          }

          // Adjust saturation
          s = s * (saturationValue / 100);
          s = Math.max(0, Math.min(1, s)); // Clamp between 0 and 1

          // Convert back to RGB
          function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          }

          let r1, g1, b1;

          if (s === 0) {
            r1 = g1 = b1 = l; // achromatic
          } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r1 = hue2rgb(p, q, h + 1 / 3);
            g1 = hue2rgb(p, q, h);
            b1 = hue2rgb(p, q, h - 1 / 3);
          }

          // Set the values back
          data[i] = Math.round(r1 * 255);
          data[i + 1] = Math.round(g1 * 255);
          data[i + 2] = Math.round(b1 * 255);
        }

        ctx.putImageData(imageData, 0, 0);
      }

      // Apply grain effect if needed
      if (grainValue > 0 && noise2DRef.current) {
        // Get the original content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);

        // Clear canvas for new composite
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw original content
        ctx.drawImage(tempCanvas, 0, 0);

        // Apply the grain effect using SimplexNoise
        applyGrainEffect(ctx, canvas, grainValue / 1000);
      }
    };

    // Execute drawing and filtering
    drawGradient();

    // Only apply filters if needed
    if (blurValue > 0 || saturationValue !== 100 || grainValue > 0) {
      applyFilters();
    }

    // Create download link
    const link = document.createElement('a');
    link.download = `gradient-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Function to reset the image and all related values
  const resetImage = () => {
    setImgSrc('');
    imgRef.current = null;
    setImgWidth(0);
    setImgHeight(0);
    setPalette([]);
    setColorItems([]);
    setColorStops([]);
    setColorSamplePoints([]);
    setCssCodeResult('');
    setColorCount(3);
    setGrainValue(0);
  };

  // Apply grain effect using SimplexNoise
  const applyGrainEffect = (ctx, canvas, intensity) => {
    if (!noise2DRef.current) return;

    // Get the image data to process
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Parameters for the noise
    const scale = canvas.width; // Scale relative to image size
    const noiseIntensity = intensity; // Adjust the intensity factor

    // Calculate dimensions
    const w = canvas.width;
    const h = canvas.height;
    const d = Math.min(w, h);

    // Get the noise function
    const noise2D = noise2DRef.current;

    // Process each pixel
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;

        // Calculate luminance to reduce noise in shadows and highlights
        const l = (data[i] + data[i + 1] + data[i + 2]) / 768 - 0.5;

        // Generate multi-octave noise for natural grain appearance
        const noise = (
          noise2D(x / d * scale, y / d * scale) +
          noise2D(x / d * scale / 2, y / d * scale / 2) * 0.25 +
          noise2D(x / d * scale / 4, y / d * scale / 4) * 0.125
        ) * 0.5;

        // Reduce noise in shadows and highlights
        const luminanceAdjustedNoise = noise * (1 - l * l * 2);

        // Apply noise to each channel
        const noiseValue = luminanceAdjustedNoise * noiseIntensity * 255;

        // Add noise to each channel
        data[i] = Math.min(255, Math.max(0, data[i] + noiseValue));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noiseValue));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noiseValue));
      }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
  };

  // Function to render gradient and effects to a canvas
  const renderGradientToCanvas = useCallback((targetCanvas, width, height) => {
    if (!targetCanvas) return;

    const ctx = targetCanvas.getContext('2d');

    // Set canvas dimensions if needed
    if (targetCanvas.width !== width || targetCanvas.height !== height) {
      targetCanvas.width = width;
      targetCanvas.height = height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get visible colors
    const visibleColors = colorItems.filter(item => item.isVisible);

    if (visibleColors.length === 0) {
      // Draw placeholder if no colors
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#cccccc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px sans-serif';
      ctx.fillText('Upload an image to see the preview', width / 2, height / 2);
      return;
    }

    if (visibleColors.length === 1) {
      // Single color
      ctx.fillStyle = visibleColors[0].color;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Create gradient
      let gradient;

      if (gradientDirection === 'to right') {
        gradient = ctx.createLinearGradient(0, 0, width, 0);
      } else if (gradientDirection === 'to left') {
        gradient = ctx.createLinearGradient(width, 0, 0, 0);
      } else if (gradientDirection === 'to bottom') {
        gradient = ctx.createLinearGradient(0, 0, 0, height);
      } else if (gradientDirection === 'to top') {
        gradient = ctx.createLinearGradient(0, height, 0, 0);
      } else if (gradientDirection === 'to bottom right' || gradientDirection === '135deg') {
        gradient = ctx.createLinearGradient(0, 0, width, height);
      } else if (gradientDirection === 'to bottom left' || gradientDirection === '225deg') {
        gradient = ctx.createLinearGradient(width, 0, 0, height);
      } else if (gradientDirection === 'to top right' || gradientDirection === '45deg') {
        gradient = ctx.createLinearGradient(0, height, width, 0);
      } else if (gradientDirection === '315deg') {
        gradient = ctx.createLinearGradient(width, height, 0, 0);
      } else {
        // Default to horizontal gradient
        gradient = ctx.createLinearGradient(0, 0, width, 0);
      }

      // Add color stops
      visibleColors.forEach((item, index) => {
        const originalIndex = colorItems.findIndex(c => c.id === item.id);
        const stopValue = colorStops[originalIndex] !== undefined
          ? colorStops[originalIndex] / 100
          : index / (visibleColors.length - 1);

        gradient.addColorStop(stopValue, item.color);
      });

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Apply filters
    if (blurValue > 0 || saturationValue !== 100 || grainValue > 0) {
      // Apply blur
      if (blurValue > 0) {
        // Create temp canvas for blur
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        // Copy content
        tempCtx.drawImage(targetCanvas, 0, 0);

        // Apply blur
        ctx.filter = `blur(${blurValue}px)`;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
      }

      // Apply saturation
      if (saturationValue !== 100) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Convert RGB to HSL
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;

          if (max === min) {
            h = s = 0; // achromatic
          } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }

            h /= 6;
          }

          // Adjust saturation
          s = s * (saturationValue / 100);
          s = Math.max(0, Math.min(1, s)); // Clamp between 0 and 1

          // Convert back to RGB
          function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          }

          let r1, g1, b1;

          if (s === 0) {
            r1 = g1 = b1 = l; // achromatic
          } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r1 = hue2rgb(p, q, h + 1 / 3);
            g1 = hue2rgb(p, q, h);
            b1 = hue2rgb(p, q, h - 1 / 3);
          }

          // Set values back
          data[i] = Math.round(r1 * 255);
          data[i + 1] = Math.round(g1 * 255);
          data[i + 2] = Math.round(b1 * 255);
        }

        ctx.putImageData(imageData, 0, 0);
      }

      // Apply grain
      if (grainValue > 0 && noise2DRef.current) {
        applyGrainEffect(ctx, targetCanvas, grainValue / 1000);
      }
    }
  }, [colorItems, colorStops, gradientDirection, blurValue, saturationValue, grainValue, noise2DRef]);

  // Effect to update the preview canvas when parameters change
  useEffect(() => {
    if (previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      const containerWidth = resultPreviewRef.current?.clientWidth || 600;
      const containerHeight = imgHeight || 250;

      renderGradientToCanvas(canvas, containerWidth, containerHeight);
      console.log("renderGradientToCanvas",colorItems);
    }
  }, [renderGradientToCanvas, imgHeight, resultPreviewRef]);

  // Effect to handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (previewCanvasRef.current && resultPreviewRef.current) {
        const canvas = previewCanvasRef.current;
        const container = resultPreviewRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = imgHeight || 250;

        renderGradientToCanvas(canvas, containerWidth, containerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderGradientToCanvas, imgHeight]);

  return (
    <div className="w-full mx-auto p-5 page-transition">
      <header className="text-center mb-5 p-4 card">
        <h1 className="text-xl font-bold text-gradient">Image to Gradient Generator</h1>
      </header>
      <main className="grid grid-cols-2 md:grid-cols-5 gap-5">
        <div className="col-span-1 md:col-span-2 flex flex-col gap-5">
          <section className="card p-4 relative group">
            <h2 className="section-header">Upload Image</h2>

            {imgSrc ? (
              <div className="text-center min-h-[250px] flex flex-col items-center justify-center gap-2 relative">
                {/* Reset button that appears on hover */}
                <button
                  onClick={resetImage}
                  className="absolute cursor-pointer top-0 right-0 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Reset image"
                >
                  ×
                </button>
                <div className="relative">
                  <img
                    ref={imgRef}
                    alt="Upload preview"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="max-h-[400px] mx-auto rounded-lg shadow-soft" // Limit display height
                  />
                  {showColorNodes && <ColorNodes
                    colorItems={colorItems}
                    samplePoints={colorSamplePoints}
                    imgWidth={imgWidth}
                    imgHeight={imgHeight}
                  />}
                </div>
              </div>
            ) : (
              <div
                {...getRootProps({
                  className: `dropzone ${isDragActive ? 'active' : ''}`
                })}
              >
                <input {...getInputProps()} />
                <p className="text-gray-600">Drag 'n' drop an image here, or click to select one</p>
              </div>
            )}

            <div className="flex flex-col gap-1 mt-4">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="showNodes"
                  checked={showColorNodes}
                  onChange={(e) => setShowColorNodes(e.target.checked)}
                  className="custom-checkbox"
                />
                <label htmlFor="showNodes" className="text-sm text-gray-700">Show Color Nodes</label>
              </div>
              <p className="text-xs text-gray-500 mt-1 italic">
                Drag nodes to change colors from different parts of the image.
              </p>
            </div>

          </section>

          <section className="card p-4 shadow-soft">
            <h2 className="section-header">CSS Code</h2>
            <pre className="code-output">
              <code>
                {cssCodeResult || '/* CSS code will appear here */'}
              </code>
            </pre>
          </section>

        </div>
        <div className='col-span-1 md:col-span-2 flex flex-col gap-5'>
          <section className="card p-4 shadow-soft">
            <h2 className="section-header">
              Result Preview {isLoadingColors && '(Loading colors...)'}
            </h2>
            <div className='relative overflow-hidden' ref={resultPreviewRef}>
              <canvas
                ref={previewCanvasRef}
                className="gradient-preview w-full min-h-[250px] transition-all duration-300"
                style={{
                  height: imgHeight || 250,
                }}
              />
              {/* Gradient Slider overlay */}
              {colorItems.length > 1 &&
                <GradientSlider
                  colorItems={colorItems}
                  colorStops={colorStops}
                  setColorStops={setColorStops}
                  gradientDirection={gradientDirection}
                />
              }

            </div>
            
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex flex-col gap-1">
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="showGradientStops"
                    checked={showGradientStops}
                    onChange={(e) => setShowGradientStops(e.target.checked)}
                    className="custom-checkbox"
                  />
                  <label htmlFor="showGradientStops" className="text-sm text-gray-700">Show Gradient Stops</label>
                </div>
                <p className="text-xs text-gray-500 mt-1 italic">
                  Drag nodes to adjust color positions in the gradient.
                </p>
              </div>

            </div>
          </section>

          <section className="card p-4 shadow-soft">
            <h2 className="section-header">Effects</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="blur" className="font-semibold text-sm text-gray-700">Blur: {blurValue}px</label>
                <input
                  type="range"
                  id="blur"
                  min="0"
                  max="20" // Max blur amount
                  step="0.5"
                  value={blurValue}
                  onChange={(e) => setBlurValue(parseFloat(e.target.value))}
                  className="custom-range"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="saturation" className="font-semibold text-sm text-gray-700">Saturation: {saturationValue}%</label>
                <input
                  type="range"
                  id="saturation"
                  min="0" // 0% = grayscale
                  max="200" // 200% = double saturation
                  value={saturationValue}
                  onChange={(e) => setSaturationValue(parseInt(e.target.value, 10))}
                  className="custom-range"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="grain" className="font-semibold text-sm text-gray-700">Grain: {grainValue}%</label>
                <input
                  type="range"
                  id="grain"
                  min="0" // 0% = no grain
                  max="100" // 100% = maximum grain
                  value={grainValue}
                  onChange={(e) => setGrainValue(parseInt(e.target.value, 10))}
                  className="custom-range"
                />
              </div>
            </div>
          </section>

        </div>
        <div className="col-span-1 flex flex-col gap-5">

          <section className="card p-4 shadow-soft">
            <h2 className="section-header">
              Color List {isLoadingColors && '(Loading...)'}
            </h2>
            <div className="w-full">
              {colorItems.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={colorItems} // Pass items with unique IDs
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="list-none p-0 m-0 w-full">
                      {colorItems.map(item => (
                        <SortableColorItem
                          key={item.id}
                          id={item.id}
                          color={item.color}
                          isVisible={item.isVisible}
                          toggleVisibility={toggleColorVisibility}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="min-h-[250px] flex items-center justify-center text-gray-500 text-center">
                  {isLoadingColors ? 'Loading...' : 'No colors extracted yet.'}
                </div>
              )}
            </div>
          </section>

          <section className="card p-4 shadow-soft">
            <h2 className="section-header">Gradient Settings</h2>
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-1">
                <label htmlFor="direction" className="font-semibold text-sm text-gray-700">Direction:</label>
                <select
                  id="direction"
                  value={gradientDirection}
                  onChange={(e) => setGradientDirection(e.target.value)}
                  className="select"
                >
                  <option value="to bottom">To Bottom</option>
                  <option value="to top">To Top</option>
                  <option value="to right">To Right</option>
                  <option value="to left">To Left</option>
                  <option value="45deg">45° ↗</option>
                  <option value="135deg">135° ↘</option>
                  <option value="225deg">225° ↙</option>
                  <option value="315deg">315° ↖</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="colorCount" className="font-semibold text-sm text-gray-700">Max Colors:</label>
                <input
                  type="number"
                  id="colorCount"
                  min="2"
                  max="20" // Sensible max
                  value={colorCount}
                  onChange={(e) => setColorCount(parseInt(e.target.value, 10))}
                  className="input"
                />
              </div>
            </div>
          </section>

          <section className="card p-4 shadow-soft">
            <h2 className="section-header">Download</h2>
            <div className="flex flex-col gap-4 w-full">
              <div className="grid grid-cols-1 gap-3">
                <select
                  className="select"
                  value={`${downloadSize.width}x${downloadSize.height}`}
                  onChange={(e) => {
                    const [width, height] = e.target.value.split('x').map(Number);
                    setDownloadSize({ width, height });
                  }}
                >
                  <option value="1920x1080">1920×1080 (FHD)</option>
                  <option value="3840x2160">3840×2160 (4K)</option>
                  <option value="1280x720">1280×720 (HD)</option>
                  <option value="800x600">800×600</option>
                  <option value="1080x1920">1080×1920 (Mobile FHD)</option>
                  <option value="750x1334">750×1334 (iPhone)</option>
                </select>
                <button
                  onClick={downloadGradientAsImage}
                  className="btn btn-download"
                  disabled={!colorItems.length || colorItems.every(c => !c.isVisible)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                  </svg>
                  Download Gradient
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
} // End of App component function

// --- Sortable Color Item Component ---
function SortableColorItem({ id, color, isVisible, toggleVisibility }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // Added to style the item while dragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`color-item ${isDragging ? 'dragging' : ''} ${!isVisible ? 'opacity-50' : ''}`}
      {...attributes} // Spread attributes for a11y etc.
    >
      <span
        className="drag-handle px-1"
        {...listeners} // Spread listeners onto the handle
        title="Drag to reorder"
      >
        ☰
      </span>
      <span
        className="color-swatch ml-2"
        style={{ backgroundColor: color, opacity: !isVisible ? 0.3 : 1 }}
      ></span>
      <span className="flex-grow ml-2 font-mono text-sm">{color}</span>
      <input
        type="checkbox"
        checked={isVisible}
        onChange={() => toggleVisibility(id)}
        title="Show/Hide Color"
        className="custom-checkbox ml-auto"
      />
    </li>
  );
}
// --- End Sortable Color Item Component ---

export default App;
