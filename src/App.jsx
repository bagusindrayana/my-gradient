import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
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
import 'react-image-crop/dist/ReactCrop.css'
import './App.css';

// Helper function to center the crop
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90, // Initial crop width
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}


function App() {
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef(null);
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspect, setAspect] = useState(undefined);
  // Use a state that holds objects with id, color, and visibility
  const [colorItems, setColorItems] = useState([]);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  // Gradient Settings State
  const [gradientDirection, setGradientDirection] = useState('to right');
  const [colorCount, setColorCount] = useState(5); // Default: 5 colors
  // Color stops state (percentage position in the gradient)
  const [colorStops, setColorStops] = useState([]);
  // Show gradient stops slider toggle
  const [showGradientStops, setShowGradientStops] = useState(true);
  // Effects State
  const [blurValue, setBlurValue] = useState(0); // 0px blur initially
  const [saturationValue, setSaturationValue] = useState(100); // 100% saturation initially
  // Color sample points state
  const [colorSamplePoints, setColorSamplePoints] = useState([]);
  // Show color nodes toggle
  const [showColorNodes, setShowColorNodes] = useState(true);
  // CSS Code Result State
  const [cssCodeResult, setCssCodeResult] = useState('');
  // Copy Button State
  const [copyButtonText, setCopyButtonText] = useState('Copy CSS');

  const [palette, setPalette] = useState([]); // State to hold extracted colors

  const [enableCrop, setEnableCrop] = useState(false);

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
      setCrop(undefined); // Makes crop preview update between images.
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
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
    imgRef.current = e.currentTarget; // Store image ref
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

  // Function to extract colors along a vertical line from top to bottom
  async function extractColorsFromCrop(image, crop, maxColors = 5) {
    if (!crop || !image) {
      console.error('Invalid crop or image ref for color extraction.');
      return { colors: [], points: [] };
    }
    const cropWidth = typeof crop.width === 'number' ? crop.width : 0;
    const cropHeight = typeof crop.height === 'number' ? crop.height : 0;
    if (cropWidth <= 0 || cropHeight <= 0) {
      console.warn("Crop dimensions are zero or invalid.");
      return { colors: [], points: [] };
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = Math.floor(cropWidth * scaleX);
    canvas.height = Math.floor(cropHeight * scaleY);

    if (canvas.width === 0 || canvas.height === 0) {
      console.warn("Canvas dimensions for crop are zero.");
      return { colors: [], points: [] };
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.error('Failed to get 2D context from canvas.');
      return { colors: [], points: [] };
    }

    ctx.drawImage(
      image,
      Math.floor(crop.x * scaleX),
      Math.floor(crop.y * scaleY),
      Math.floor(cropWidth * scaleX),
      Math.floor(cropHeight * scaleY),
      0, 0, canvas.width, canvas.height
    );

    try {
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
          if (data[j+3] < 128) continue;
          
          r += data[j];
          g += data[j+1];
          b += data[j+2];
          count++;
        }
        
        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          
          // Add to palette
          palette.push(`rgb(${r}, ${g}, ${b})`);
          
          // Calculate display coordinates for the sample point
          const displayX = crop.width / 2;
          const displayY = (crop.height * yPercent);
          
          samplePoints.push({ x: displayX, y: displayY });
        }
      }

      console.log(`Linear vertical sampling extracted ${palette.length} colors:`, palette);

      // Fallback if no colors found
      if (palette.length === 0) {
        console.warn("Linear vertical sampling failed, falling back to average color.");
        const avgColor = getAverageColor(canvas, ctx);
        return {
          colors: avgColor ? [avgColor] : [],
          points: avgColor ? [{ x: crop.width / 2, y: crop.height / 2 }] : []
        };
      }

      return {
        colors: palette,
        points: samplePoints
      };

    } catch (error) {
      console.error("Error during color extraction:", error);
      // Fallback to average color on any error
      const avgColor = getAverageColor(canvas, ctx);
      return {
        colors: avgColor ? [avgColor] : [],
        points: avgColor ? [{ x: crop.width / 2, y: crop.height / 2 }] : []
      };
    }
  }

  // Effect to trigger color extraction when crop is complete
  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current
    ) {
      // Only extract colors if palette is empty (initial load) or crop dimensions changed
      if (palette.length === 0) {
        setIsLoadingColors(true);
        // Pass colorCount to the extraction function
        extractColorsFromCrop(imgRef.current, completedCrop, colorCount)
          .then(result => {
            setPalette(result.colors);
            setColorSamplePoints(result.points);
            setIsLoadingColors(false);
            console.log("Extracted Palette:", result.colors); // For debugging
            console.log("Sample Points:", result.points); // For debugging
          })
          .catch(error => {
            console.error("Error extracting colors:", error);
            setIsLoadingColors(false);
          });
      }
    } else {
      // Reset palette if crop is invalid or no image
      setPalette([]);
      setColorSamplePoints([]);
    }
  }, [completedCrop]);

  // Separate effect to handle colorCount changes
  useEffect(() => {
    // Only run this effect if we already have colors and image is loaded
    if (palette.length > 0 && colorItems.length > 0 && completedCrop && imgRef.current) {
      const currentCount = colorItems.length;
      
      // If we need to add more colors
      if (colorCount > currentCount) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Set canvas dimensions
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        canvas.width = Math.floor(completedCrop.width * scaleX);
        canvas.height = Math.floor(completedCrop.height * scaleY);
        
        // Draw the image to the canvas
        ctx.drawImage(
          imgRef.current,
          Math.floor(completedCrop.x * scaleX),
          Math.floor(completedCrop.y * scaleY),
          Math.floor(completedCrop.width * scaleX),
          Math.floor(completedCrop.height * scaleY),
          0, 0, canvas.width, canvas.height
        );
        
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
            
            // Calculate the new stop position
            const newStop = Math.round(secondLastStop + (lastStop - secondLastStop) * fraction);
            
            // Interpolate colors by sampling the image at the new position
            try {
              // Get color directly from the position of the new point
              // First convert coordinates to the full image space (accounting for crop)
              const imageX = Math.floor((newX + (completedCrop?.x || 0)) * scaleX);
              const imageY = Math.floor((newY + (completedCrop?.y || 0)) * scaleY);
              
              // Sample a small region around the point for a more accurate color
              const sampleSize = 3;
              const startX = Math.max(0, imageX - sampleSize);
              const startY = Math.max(0, imageY - sampleSize);
              const width = Math.min(sampleSize * 2 + 1, canvas.width - startX);
              const height = Math.min(sampleSize * 2 + 1, canvas.height - startY);
              
              // Check if the sampling area is valid
              if (width <= 0 || height <= 0 || startX >= canvas.width || startY >= canvas.height) {
                throw new Error("Invalid sampling area");
              }
              
              // Get image data at this exact position
              const imageData = ctx.getImageData(startX, startY, width, height);
              const data = imageData.data;
              
              // Calculate average color
              let r = 0, g = 0, b = 0, count = 0;
              for (let j = 0; j < data.length; j += 4) {
                if (data[j+3] < 128) continue; // Skip transparent pixels
                r += data[j];
                g += data[j+1];
                b += data[j+2];
                count++;
              }
              
              if (count > 0) {
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);
                
                const newColor = `rgb(${r}, ${g}, ${b})`;
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
            const lastPoint = colorSamplePoints[colorSamplePoints.length - 1] || { x: completedCrop.width / 2, y: completedCrop.height / 2 };
            const maxOffset = 30; // Maximum pixel offset in any direction
            
            // Calculate random offsets within bounds
            const randomOffsetX = Math.random() * maxOffset * (Math.random() > 0.5 ? 1 : -1);
            const randomOffsetY = Math.random() * maxOffset * (Math.random() > 0.5 ? 1 : -1);
            
            // Ensure the new point is within image bounds
            const newX = Math.min(Math.max(lastPoint.x + randomOffsetX, 0), completedCrop.width);
            const newY = Math.min(Math.max(lastPoint.y + randomOffsetY, 0), completedCrop.height);
            
            // Sample the color at this position
            const canvasX = Math.floor((newX / completedCrop.width) * canvas.width);
            const canvasY = Math.floor((newY / completedCrop.height) * canvas.height);
            
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
                if (data[j+3] < 128) continue; // Skip transparent pixels
                r += data[j];
                g += data[j+1];
                b += data[j+2];
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
        
        // Add the new colors, points, and stops in the right position (between second-to-last and last)
        if (newColors.length > 0 && colorItems.length >= 2) {
          // Create a copy of the current data
          let updatedPalette = [...palette];
          let updatedPoints = [...colorSamplePoints];
          let updatedStops = [...colorStops];
          
          // Insert new items BEFORE the last position (between second-to-last and last)
          const insertIndex = Math.max(0, updatedPalette.length - 1);
          
          // Save last item values to preserve them
          const lastColor = updatedPalette[updatedPalette.length - 1];
          const lastPoint = updatedPoints[updatedPoints.length - 1];
          const lastStop = updatedStops[updatedStops.length - 1];
          
          // Insert each new color/point/stop at the proper position
          for (let i = 0; i < newColors.length; i++) {
            updatedPalette.splice(insertIndex + i, 0, newColors[i]);
            updatedPoints.splice(insertIndex + i, 0, newPoints[i]);
            updatedStops.splice(insertIndex + i, 0, newStops[i]);
          }
          
          // Make sure the last element is still the original last element
          if (lastColor && lastPoint && updatedPalette.length > 1) {
            updatedPalette[updatedPalette.length - 1] = lastColor;
            updatedPoints[updatedPoints.length - 1] = lastPoint;
            if (lastStop !== undefined) {
              updatedStops[updatedStops.length - 1] = lastStop;
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

  useEffect(() => {
    if (
      imgRef.current
    ) {
      setImgHeight(imgRef.current.height);
      setImgWidth(imgRef.current.width);

      setCompletedCrop({
        width: imgRef.current.width,
        height: imgRef.current.height,
        x: 0,
        y: 0
      });


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
      setColorStops((stops) => {
        if (!stops || oldIndex >= stops.length) {
          return stops; // Return unchanged if there's a mismatch
        }
        
        // Clone the array to avoid mutating state
        const newStops = [...stops];
        
        // Get the stop value that's being moved
        const stopToMove = newStops[oldIndex];
        
        // Remove it from its old position
        newStops.splice(oldIndex, 1);
        
        // Insert it at the new position
        const safeNewIndex = Math.min(newIndex, newStops.length);
        newStops.splice(safeNewIndex, 0, stopToMove);
        
        return newStops;
      });
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

  // Effect to update colorItems when palette changes from extraction OR threshold changes
  useEffect(() => {
    setColorItems(palette.map((color, index) => ({
      id: `${color}-${index}-${Date.now()}`, // Create a unique ID
      color: color,
      isVisible: true, // Default to visible
    })));

    // Initialize color stops when palette changes (evenly distributed)
    if (palette.length > 0) {
      const newStops = palette.map((_, index) => 
        Math.round((index / (palette.length - 1)) * 100)
      );
      setColorStops(newStops);
    }
  }, [palette]); // Re-run when palette or threshold changes

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

  const filterCss = generateFilterCss();

  // --- Generate CSS Code for Display ---
  const generateCssCode = () => {
    let code = '';
    if (gradientCss !== 'none') {
      code += `background: ${gradientCss};\n`;
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
  }, [gradientCss, filterCss, colorStops]); // Add colorStops as dependency

  // --- Copy CSS to Clipboard ---
  const handleCopyCss = () => {
    if (!cssCodeResult) {
      setCopyButtonText('Nothing to Copy');
      setTimeout(() => setCopyButtonText('Copy CSS'), 1500);
      return;
    }
    navigator.clipboard.writeText(cssCodeResult)
      .then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy CSS'), 1500); // Reset after 1.5s
      })
      .catch(err => {
        console.error('Failed to copy CSS: ', err);
        setCopyButtonText('Error Copying');
        setTimeout(() => setCopyButtonText('Copy CSS'), 1500);
      });
  };

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
        {visiblePoints.map((point, index) => (
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
        ))}
      </svg>
    );
  };

  // Function to update a color item's color based on a position in the image
  const updateColorFromPosition = (colorId, position) => {
    if (!imgRef.current) return;
    
    try {
      // Create a small canvas to sample the color
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      // Set canvas dimensions
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      
      // Draw the image to the canvas
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
      
      // Calculate the position in the actual image
      const scaleX = canvas.width / imgRef.current.width;
      const scaleY = canvas.height / imgRef.current.height;
      
      // Get the crop offset if we have a crop
      const cropX = completedCrop?.x || 0;
      const cropY = completedCrop?.y || 0;
      
      // Sample a small region around the point (5x5 pixels)
      const sampleSize = 5;
      const x = Math.floor((position.x + cropX) * scaleX);
      const y = Math.floor((position.y + cropY) * scaleY);
      
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
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i+3] < 128) continue; // Skip transparent pixels
        r += imageData.data[i];
        g += imageData.data[i + 1];
        b += imageData.data[i + 2];
        count++;
      }
      
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        
        // Update the color in colorItems
        setColorItems(items => 
          items.map(item => 
            item.id === colorId 
              ? { ...item, color: `rgb(${r}, ${g}, ${b})` } 
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
      originalIndex: -1
    });
    
    // Handle node dragging
    const handleNodeDragStart = (e, index, originalIndex) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Set dragging state in ref for more reliable tracking
      dragRef.current = {
        isDragging: true,
        nodeIndex: index,
        originalIndex: originalIndex
      };
      
      // Add event listeners to window to ensure we capture all mouse movements
      window.addEventListener('mousemove', handleNodeDrag);
      window.addEventListener('mouseup', handleNodeDragEnd);
    };
    
    const handleNodeDrag = useCallback((e) => {
      console.log('dragging',e);
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
      } else if (isDiagonal) {
        // For diagonal gradients, use both x and y
        const relativeX = e.clientX - svgRect.left;
        const relativeY = e.clientY - svgRect.top;
        
        // Use a weighted average for diagonal positions
        const xPercent = (relativeX / svgRect.width) * 100;
        const yPercent = (relativeY / svgRect.height) * 100;
        
        // For diagonal, choose the appropriate blend based on direction
        if (gradientDirection.includes('bottom right') || gradientDirection.includes('45deg')) {
          // To bottom right: both increase together
          newStopPercentage = (xPercent + yPercent) / 2;
        } else if (gradientDirection.includes('bottom left') || gradientDirection.includes('135deg')) {
          // To bottom left: x decreases, y increases
          newStopPercentage = ((100 - xPercent) + yPercent) / 2;
        } else if (gradientDirection.includes('top right') || gradientDirection.includes('315deg')) {
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
      }
      
      newStopPercentage = Math.min(100, Math.max(0, newStopPercentage));
      
      // Update the stops array
      const newStops = [...colorStops];
      newStops[originalIndex] = Math.round(newStopPercentage);
      setColorStops(newStops);
    }, [isHorizontal, isDiagonal, gradientDirection, colorStops, setColorStops]);
    
    const handleNodeDragEnd = useCallback(() => {
      console.log('drag end');
      if (!dragRef.current.isDragging) return;
      
      // Reset dragging state
      dragRef.current = {
        isDragging: false,
        nodeIndex: -1,
        originalIndex: -1
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
              x1="0%" 
              y1="50%" 
              x2="100%" 
              y2="50%" 
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="2"
              strokeDasharray="4"
            />
          ) : isDiagonal ? (
            gradientDirection.includes('bottom right') || gradientDirection.includes('45deg') ? (
              <line 
                x1="0%" 
                y1="0%" 
                x2="100%" 
                y2="100%" 
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                strokeDasharray="4"
              />
            ) : gradientDirection.includes('bottom left') || gradientDirection.includes('135deg') ? (
              <line 
                x1="100%" 
                y1="0%" 
                x2="0%" 
                y2="100%" 
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                strokeDasharray="4"
              />
            ) : gradientDirection.includes('top right') || gradientDirection.includes('315deg') ? (
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
              y1="0%" 
              x2="50%" 
              y2="100%" 
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="2"
              strokeDasharray="4"
            />
          )}
          
          {/* Color handle/nodes */}
          {visibleColors.map((colorItem, index) => {
            // Determine position based on orientation
            const stopValue = visibleStops[index] || 0;
            let posX, posY;
            
            if (isHorizontal) {
              posX = `${stopValue}%`;
              posY = '50%';
            } else if (isDiagonal) {
              if (gradientDirection.includes('bottom right') || gradientDirection.includes('45deg')) {
                posX = `${stopValue}%`;
                posY = `${stopValue}%`;
              } else if (gradientDirection.includes('bottom left') || gradientDirection.includes('135deg')) {
                posX = `${100 - stopValue}%`;
                posY = `${stopValue}%`;
              } else if (gradientDirection.includes('top right') || gradientDirection.includes('315deg')) {
                posX = `${stopValue}%`;
                posY = `${100 - stopValue}%`;
              } else {
                posX = `${100 - stopValue}%`;
                posY = `${100 - stopValue}%`;
              }
            } else {
              posX = '50%';
              posY = `${stopValue}%`;
            }
            
            return (
              <circle
                key={`stop-${index}`}
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
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full mx-auto p-5">
      <header className="text-center mb-5 p-3 bg-gray-200 rounded-lg">
        <h1 className="text-xl font-bold">Image to Gradient Generator</h1>
      </header>
      <main className="grid grid-cols-3 md:grid-cols-5 gap-5">
        <div className="col-span-1 md:col-span-2 flex flex-col gap-5">
          <section className="bg-white rounded-lg p-4 shadow space-y-3">
            <h2 className=" text-lg text-gray-700 pb-2 border-b border-gray-100">Upload Image</h2>

            {imgSrc ? (
              <div {...getRootProps({
                className: `text-center min-h-[250px] flex flex-col items-center justify-center gap-2`
              })}>
                <div className="relative">
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)} // Store completed crop
                    aspect={aspect} // Enforce aspect ratio if needed
                    disabled={!enableCrop}
                  >
                    <img
                      ref={imgRef}
                      alt="Upload preview"
                      src={imgSrc}
                      onLoad={onImageLoad}
                      className="max-h-[400px] mx-auto" // Limit display height
                    />
                  </ReactCrop>
                  {!enableCrop && <ColorNodes
                    colorItems={colorItems}
                    samplePoints={colorSamplePoints}
                    imgWidth={imgWidth}
                    imgHeight={imgHeight}
                  />}
                </div>
                {/* {enableCrop ? (
                  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded  cursor-pointer" onClick={() => setEnableCrop(false)}>
                    Apply Crop
                  </button>
                ) : (<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded  cursor-pointer" onClick={() => setEnableCrop(true)}>
                  Crop Image
                </button>
                )} */}
              </div>
            ) : (
              <div
                {...getRootProps({
                  className: `border-2 border-dashed rounded-md p-5 text-center cursor-pointer min-h-[250px] flex flex-col items-center justify-center bg-gray-50 ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`
                })}
              >
                <input {...getInputProps()} />
                <p className="text-gray-600">Drag 'n' drop an image here, or click to select one</p>
              </div>
            )}

<div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showNodes"
                    checked={showColorNodes}
                    onChange={(e) => setShowColorNodes(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="showNodes" className="text-sm text-gray-700">Show Color Nodes</label>
                </div>
                {showColorNodes && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Drag nodes to change colors from different parts of the image.
                  </p>
                )}
              </div>

          </section>

          <section className="bg-white rounded-lg p-4 shadow">
            <h2 className="mb-3 text-lg text-gray-700 pb-2 border-b border-gray-100">CSS Code</h2>
            <pre className="min-h-[100px] bg-gray-800 text-gray-100 text-left whitespace-pre-wrap overflow-auto p-3 rounded text-sm">
              <code>
                {cssCodeResult || '/* CSS code will appear here */'}
              </code>
            </pre>
          </section>

        </div>
        <div className='col-span-1 md:col-span-2 flex flex-col gap-5'>
          <section className="bg-white rounded-lg p-4 shadow space-y-3">
            <h2 className=" text-lg text-gray-700 pb-2 border-b border-gray-100">
              Result Preview {isLoadingColors && '(Loading colors...)'}
            </h2>
            <div
              className={`rounded flex items-center justify-center text-gray-500 text-center p-3 relative overflow-hidden transition-all duration-300 min-h-[250px]`}
              style={{
                background: gradientCss,
                filter: filterCss, // Apply filters here
                height: imgHeight,
              }}
            >
              {colorItems.length === 0 && !isLoadingColors && 'Upload and crop an image to see the preview'}
              {colorItems.length > 0 && colorItems.every(c => !c.isVisible) && 'All colors hidden'}
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
            
            <div className="flex flex-col gap-3">
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
                  className="w-full cursor-pointer"
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
                  className="w-full cursor-pointer"
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showGradientStops"
                    checked={showGradientStops}
                    onChange={(e) => setShowGradientStops(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="showGradientStops" className="text-sm text-gray-700">Show Gradient Stops</label>
                </div>
                {showGradientStops && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Drag nodes to adjust color positions in the gradient.
                  </p>
                )}
              </div>
            </div>
          </section>




          
        </div>
        <div className="col-span-1 flex flex-col gap-5">

          <section className="bg-white rounded-lg p-4 shadow">
            <h2 className="mb-3 text-lg text-gray-700 pb-2 border-b border-gray-100">
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

          <section className="bg-white rounded-lg p-4 shadow">
            <h2 className="mb-3 text-lg text-gray-700 pb-2 border-b border-gray-100">Gradient Settings</h2>
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-1">
                <label htmlFor="direction" className="font-semibold text-sm text-gray-700">Direction:</label>
                <select
                  id="direction"
                  value={gradientDirection}
                  onChange={(e) => setGradientDirection(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-base"
                >
                  <option value="to right">To Right →</option>
                  <option value="to left">To Left ←</option>
                  <option value="to bottom">To Bottom ↓</option>
                  <option value="to top">To Top ↑</option>
                  <option value="to bottom right">To Bottom Right ↘</option>
                  <option value="to bottom left">To Bottom Left ↙</option>
                  <option value="to top right">To Top Right ↗</option>
                  <option value="to top left">To Top Left ↖</option>
                  <option value="0deg">0deg (to top)</option>
                  <option value="45deg">45deg ↗</option>
                  <option value="90deg">90deg (to right)</option>
                  <option value="135deg">135deg ↘</option>
                  <option value="180deg">180deg (to bottom)</option>
                  <option value="225deg">225deg ↙</option>
                  <option value="270deg">270deg (to left)</option>
                  <option value="315deg">315deg ↖</option>
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
                  className="w-full p-2 border border-gray-300 rounded text-base"
                />
              </div>
            
             
              
            </div>

          </section>

          {/* <section className="bg-white rounded-lg p-4 shadow">
            <h2 className="mb-3 text-lg text-gray-700 pb-2 border-b border-gray-100">6. Save/Download</h2>
            <div className="flex justify-end">
              <button
                onClick={handleCopyCss}
                disabled={!cssCodeResult}
                className="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {copyButtonText}
              </button>
            </div>
          </section> */}
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
      className={`flex items-center gap-3 p-2 border-b border-gray-100 bg-gray-50 cursor-grab ${isDragging ? 'opacity-50' : 'opacity-100'} ${!isVisible ? 'opacity-50 line-through' : ''}`}
      {...attributes} // Spread attributes for a11y etc.
    >
      <span
        className="text-gray-400 px-1 cursor-grab"
        {...listeners} // Spread listeners onto the handle
        title="Drag to reorder"
      >
        ☰
      </span>
      <span
        className="w-5 h-5 rounded border border-gray-300 inline-block flex-shrink-0"
        style={{ backgroundColor: color, opacity: !isVisible ? 0.3 : 1 }}
      ></span>
      <span className="flex-grow font-mono text-sm">{color}</span>
      <input
        type="checkbox"
        checked={isVisible}
        onChange={() => toggleVisibility(id)}
        title="Show/Hide Color"
        className="ml-auto cursor-pointer"
      />
    </li>
  );
}
// --- End Sortable Color Item Component ---

export default App;
