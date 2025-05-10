import { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';
import { createNoise2D } from 'simplex-noise';
import type { NoiseFunction2D } from 'simplex-noise';

// Import components
import ImageUpload from './components/ImageUpload';
import CssCode from './components/CssCode';
import GradientPreview from './components/GradientPreview';
import Effects from './components/Effects';
import ColorList from './components/ColorList';
import GradientSettings from './components/GradientSettings';
import Download from './components/Download';

import { Card, CardContent } from "@/components/ui/card";


import {
    arrayMove,
} from '@dnd-kit/sortable';
import SortColor from './components/SortColor';

interface ColorItem {
    id: string;
    color: string;
    isVisible: boolean;
}

interface Point {
    x: number;
    y: number;
}

interface DownloadSize {
    width: number;
    height: number;
}

function App() {
    const [imgSrc, setImgSrc] = useState<string>('');
    const imgRef = useRef<HTMLImageElement>(null);
    const [imgWidth, setImgWidth] = useState<number>(0);
    const [imgHeight, setImgHeight] = useState<number>(0);
    const imgUploadCanvas = useRef<HTMLCanvasElement>(null);
    const imgUploadCanvasContext = useRef<CanvasRenderingContext2D>(null);
    const [colorItems, setColorItems] = useState<ColorItem[]>([]);
    const [isLoadingColors, setIsLoadingColors] = useState<boolean>(false);
    const [gradientDirection, setGradientDirection] = useState<string>('to bottom');
    const [colorCount, setColorCount] = useState<number>(3);
    const [colorStops, setColorStops] = useState<number[]>([]);

    const [blurValue, setBlurValue] = useState<number>(0);
    const [saturationValue, setSaturationValue] = useState<number>(100);
    const [contrastValue, setContrastValue] = useState<number>(100);
    const [grainValue, setGrainValue] = useState<number>(0);
    const [colorSamplePoints, setColorSamplePoints] = useState<Point[]>([]);

    const [cssCodeResult, setCssCodeResult] = useState<string>('');
    const [palette, setPalette] = useState<string[]>([]);
    const [downloadSize, setDownloadSize] = useState<DownloadSize>({
        width: 1920,
        height: 1080
    });
    const resultPreviewRef = useRef<HTMLDivElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const noise2DRef = useRef<NoiseFunction2D | null>(null);

    const [sortBy, setSortBy] = useState<string>('default');
    const [colors, setColors] = useState<any[]>([])

    const [loadingDownload, setLoadingDownload] = useState<boolean>(false);


    // Initialize SimplexNoise on component mount
    useEffect(() => {
        // Use the new API to create a noise2D function
        noise2DRef.current = createNoise2D();
    }, []);



    function onImageLoad(e: any) {
        imgRef.current = e.currentTarget; // Store image ref
        setImgWidth(e.currentTarget.width);
        setImgHeight(e.currentTarget.height);

        // Extract colors after image loads
        if (imgRef.current) {

            imgUploadCanvas.current = document.createElement('canvas');
            imgUploadCanvas.current.width = imgRef.current.naturalWidth;
            imgUploadCanvas.current.height = imgRef.current.naturalHeight;
            imgUploadCanvasContext.current = imgUploadCanvas.current.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
            // Draw the image to the canvas
            imgUploadCanvasContext.current.drawImage(imgRef.current, 0, 0, imgUploadCanvas.current.width, imgUploadCanvas.current.height);



            extractColorsFromImage(imgRef.current, colorCount);
        }
    }

    // --- Color Extraction Logic ---

    // Placeholder function to get average color of a canvas area
    function getAverageColor(canvas: any, ctx: any) {
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

    const getMidpoint = (x1: number, y1: number, x2: number, y2: number) => {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        return { x: midX, y: midY };
    };


    // Function to extract colors from the entire image
    async function extractColorsFromImage(image: any, maxColors = 5) {
        if (!image) {
            console.error('Invalid image ref for color extraction.');
            return;
        }

        setIsLoadingColors(true);

        try {
            const canvas = imgUploadCanvas.current as HTMLCanvasElement;
            const ctx = imgUploadCanvasContext.current;
            if (ctx == null) {
                return;
            }


            // Determine how many colors to sample
            const actualMaxColors = Math.min(maxColors, canvas.height);

            // Calculate sampling points along a vertical line
            const palette = [];
            const samplePoints = [];

            // //get last point from colorSamplePoint
            // const lastPoint = colorSamplePoints[colorSamplePoints.length];
            // const lastSecondPoint = colorSamplePoints[colorSamplePoints.length-1];
            // const midPoint = getMidpoint(lastPoint.x,lastPoint.y,lastSecondPoint.x,lastSecondPoint.y);



            // Sample evenly spaced points from top to bottom
            for (let i = 0; i < actualMaxColors; i++) {
                // Calculate y position for even distribution
                const yPercent = i / (actualMaxColors - 1);

                const displayX = image.width / 2;
                const displayY = (image.height * yPercent);
                const color = pickColor({
                    x: displayX,
                    y: displayY
                });

                if (color != null) {
                    // Add to palette
                    palette.push(color);


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

    // --- Toggle Color Visibility ---
    const toggleColorVisibility = (id: string) => {
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

        if (contrastValue !== 100) {
            filters.push(`contrast(${(contrastValue)}%)`);
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
        const previewWidth = previewCanvasRef.current!.width || 600;
        const baseFrequency = Math.max(0.05, Math.min(1.0, 0.65 * (600 / previewWidth)));

        return `
      url("data:image/svg+xml,%3Csvg viewBox='0 0 ${previewCanvasRef.current!.width} ${previewCanvasRef.current!.height}' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${opacity - (opacity / 1.8)}'/%3E%3C/svg%3E")
    `;
    };

    const grainCss = generateGrainCss();
    const filterCss = generateFilterCss();

    // --- Generate CSS Code for Display ---
    const generateCssCode = () => {
        let code = `width:${previewCanvasRef.current!.width}px;\n`;
        code += `height:${previewCanvasRef.current!.width};\n`;
        code += `background-repeat: no-repeat;\n`;
        code += `background-size: cover;\n`;
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
        if (filterCss) {
            code += `-webkit-filter: ${filterCss};\n`;
        }

        setCssCodeResult(code.trim()); // Update state
    };

    // Effect to update CSS code when gradient or filters change
    useEffect(() => {
        generateCssCode();
    }, [gradientCss, filterCss, colorStops, grainValue]); // Add grainValue as dependency

    const pickColor = (position: any) => {
        if (!imgRef.current || !imgUploadCanvas.current) return;

        try {
            // Create a small canvas to sample the color
            const canvas = imgUploadCanvas.current;
            const ctx = imgUploadCanvasContext.current;
            if (ctx == null) {
                return;
            }

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
    const updateColorFromPosition = (colorId: string, position: any) => {
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

    // Apply grain effect using SimplexNoise
    const applyGrainEffect = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, intensity: number) => {
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

    function applyContrast(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, contrast: number) {
        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Contrast adjustment factor
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            // Red
            data[i] = factor * (data[i] - 128) + 128;
            // Green
            data[i + 1] = factor * (data[i + 1] - 128) + 128;
            // Blue
            data[i + 2] = factor * (data[i + 2] - 128) + 128;

            // Clamp values between 0-255
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }

        ctx!.putImageData(imageData, 0, 0);
    }

    const applySaturation = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, intensity: number) => {
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

                if (h != undefined) {
                    h /= 6;
                }
            }

            // Adjust saturation
            s = s * (intensity / 100);
            s = Math.max(0, Math.min(1, s)); // Clamp between 0 and 1

            // Convert back to RGB
            function hue2rgb(p: number, q: number, t: number) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            let r1, g1, b1;

            if (h != undefined) {
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
        }

        ctx.putImageData(imageData, 0, 0);
    };

    // Function to render gradient and effects to a canvas
    const renderGradientToCanvas = useCallback((targetCanvas: HTMLCanvasElement, width: number, height: number) => {
        if (!targetCanvas) return;
        previewCanvasRef.current = targetCanvas;
        const ctx = targetCanvas.getContext('2d') as CanvasRenderingContext2D;

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
            // ctx.fillStyle = '#f0f0f0';
            // ctx.fillRect(0, 0, width, height);
            // ctx.fillStyle = '#cccccc';
            // ctx.textAlign = 'center';
            // ctx.textBaseline = 'middle';
            // ctx.font = '16px sans-serif';
            // ctx.fillText('Upload an image to see the preview', width / 2, height / 2);
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
        if (blurValue > 0 || saturationValue !== 100 || contrastValue !== 100 || grainValue > 0) {

            // Apply saturation
            if (saturationValue !== 100) {
                applySaturation(ctx, targetCanvas, saturationValue)
            }

            if (contrastValue !== 100) {
                applyContrast(ctx, targetCanvas, contrastValue - 100);
            }

            // Apply grain
            if (grainValue > 0 && noise2DRef.current) {
                applyGrainEffect(ctx, targetCanvas, grainValue / targetCanvas.width);
            }

            // Apply blur
            if (blurValue > 0) {
                // Create temp canvas for blur
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = height;
                const tempCtx = tempCanvas.getContext('2d') as CanvasRenderingContext2D;

               
                // Copy content
                tempCtx.drawImage(targetCanvas, 0, 0);

                
                ctx.clearRect(0, 0, width, height);
                // Apply blur
                ctx.filter = `blur(${blurValue}px)`;
                ctx.drawImage(tempCanvas, 0, 0);
                ctx.filter = 'none';
            }

        }

        // const frameCanvas = document.createElement('canvas');
        // frameCanvas.width = targetCanvas.width + 40; // Add padding for frame
        // frameCanvas.height = targetCanvas.height + 80; // Extra space for polaroid bottom
        // const frameCtx = frameCanvas.getContext('2d')!;

        // // Draw white frame background
        // frameCtx.fillStyle = 'white';
        // frameCtx.fillRect(0, 0, frameCanvas.width, frameCanvas.height);

        // // Draw gradient image centered
        // frameCtx.drawImage(
        //     targetCanvas,
        //     20, // x offset
        //     20, // y offset
        //     targetCanvas.width,
        //     targetCanvas.height
        // );

        //  ctx.drawImage(frameCanvas, 0, 0);
    }, [colorItems, colorStops, gradientDirection, blurValue, saturationValue, grainValue, noise2DRef, contrastValue]);


    const downloadGradientAsImage = (withFrame: boolean = false) => {
        if (!gradientCss || gradientCss === 'none') {
            alert('Please generate a gradient first');
            return;
        }

        setLoadingDownload(true);

        // Create a canvas with the desired download size
        const canvas = document.createElement('canvas');
        canvas.width = downloadSize.width;
        canvas.height = downloadSize.height;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

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


            // Apply saturation
            if (saturationValue !== 100) {
                applySaturation(ctx, canvas, saturationValue)
            }

            if (contrastValue !== 100) {
                applyContrast(ctx, canvas, contrastValue - 100);
            }
            // Apply grain effect if needed
            if (grainValue > 0 && noise2DRef.current) {
                // Get the original content
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d') as CanvasRenderingContext2D;
                tempCtx.drawImage(canvas, 0, 0);

                // Clear canvas for new composite
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw original content
                ctx.drawImage(tempCanvas, 0, 0);

                // Apply the grain effect using SimplexNoise
                applyGrainEffect(ctx, canvas, grainValue / (canvas.width / Math.round(canvas.width / previewCanvasRef.current!.width)));
            }

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
                const tempCtx = tempCanvas.getContext('2d') as CanvasRenderingContext2D;

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
        };

        // Execute drawing and filtering
        drawGradient();

        // Only apply filters if needed
        if (blurValue > 0 || saturationValue !== 100 || grainValue > 0) {
            applyFilters();
        }

        // Apply frame if requested
        if (withFrame) {
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = canvas.width + 40; // Add padding for frame
            frameCanvas.height = canvas.height + 80; // Extra space for polaroid bottom
            const frameCtx = frameCanvas.getContext('2d')!;

            // Draw white frame background
            frameCtx.fillStyle = 'white';
            frameCtx.fillRect(0, 0, frameCanvas.width, frameCanvas.height);

            // Draw gradient image centered
            frameCtx.drawImage(
                canvas,
                20, // x offset
                20, // y offset
                canvas.width,
                canvas.height
            );

            // Create download link with framed image
            const link = document.createElement('a');
            link.download = `gradient-${new Date().getTime()}.png`;
            link.href = frameCanvas.toDataURL('image/png');
            link.click();
        } else {
            // Create download link without frame
            const link = document.createElement('a');
            link.download = `gradient-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

        setLoadingDownload(false);
    };

    // Convert RGB to HSL
    function rgbToHsl(r: number, g: number, b: number) {
        r /= 255;
        g /= 255;
        b /= 255;

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

            if (h != undefined) {
                h /= 6;
            }
        }

        return { h: (h ?? 0) * 360, s: s * 100, l: l * 100 };
    }

    // RGB to Hex conversion
    function rgbToHex(r: number, g: number, b: number) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Convert RGB to HSL
    function hslToRgb(h: number, s: number, l: number) {
        let c = (1 - Math.abs(2 * l - 1)) * s;
        let x = c * (1 - Math.abs((h / 60) % 2 - 1));
        let m = l - c / 2;
        let [r, g, b] = [0, 0, 0];

        if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
        else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
        else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
        else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
        else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
        else if (300 <= h && h < 360) [r, g, b] = [c, 0, x];

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    // Quantize colors (simplified k-means approach)
    async function quantizeColors(pixels: any, numColors: number, maxDimension = 600) {
        // Initialize clusters with random pixels
        const clusters: any[] = [];

        const naturalWidth = imgUploadCanvas.current!.width;
        const naturalHeight = imgUploadCanvas.current!.height;
        const displayWidth = imgRef.current!.width;
        const displayHeight = imgRef.current!.height;

        const scaleX = displayWidth / naturalWidth;
        const scaleY = displayHeight / naturalHeight;

        // Calculate downsampling factor if image is larger than maxDimension
        const downscaleFactor = Math.max(
            naturalWidth / maxDimension,
            naturalHeight / maxDimension,
            1
        );

        // Create downsampled pixel data if needed
        let processedPixels = pixels;
        let processedWidth = naturalWidth;
        let processedHeight = naturalHeight;

        if (downscaleFactor > 1) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = Math.floor(naturalWidth / downscaleFactor);
            tempCanvas.height = Math.floor(naturalHeight / downscaleFactor);
            const tempCtx = tempCanvas.getContext('2d')!;

            // Draw original image scaled down
            const imageData = new ImageData(
                new Uint8ClampedArray(pixels.buffer),
                naturalWidth,
                naturalHeight
            );
            try {
                const bitmap = await createImageBitmap(imageData);
                tempCtx.drawImage(bitmap, 0, 0, tempCanvas.width, tempCanvas.height);
            } catch (error) {
                console.error("Error creating image bitmap:", error);
                return [];
            }

            // Get downsampled pixel data
            const downsampledData = tempCtx.getImageData(
                0, 0, tempCanvas.width, tempCanvas.height
            ).data;
            processedPixels = downsampledData;
            processedWidth = tempCanvas.width;
            processedHeight = tempCanvas.height;
        }

        const pixelCount = processedPixels.length / 4;

        for (let i = 0; i < numColors; i++) {
            const randomIndex = Math.floor(Math.random() * pixelCount) * 4;
            clusters.push({
                r: pixels[randomIndex],
                g: pixels[randomIndex + 1],
                b: pixels[randomIndex + 2],
                count: 0,
                rSum: 0,
                gSum: 0,
                bSum: 0,
                h: 0,
                s: 0,
                l: 0,
                hex: '',
                points: []
            });
        }

        // Reset counts and sums
        for (let i = 0; i < clusters.length; i++) {
            clusters[i].count = 0;
            clusters[i].rSum = 0;
            clusters[i].gSum = 0;
            clusters[i].bSum = 0;
        }

        // Assign pixels to clusters
        for (let i = 0; i < processedPixels.length; i += 4) {
            const r = processedPixels[i];
            const g = processedPixels[i + 1];
            const b = processedPixels[i + 2];
            const a = processedPixels[i + 3];

            // Skip transparent pixels
            if (a < 128) continue;

            // Get position color (scaled back to original dimensions)
            const pixelPosition = Math.floor(i / 4);
            const pixelX = (pixelPosition % processedWidth) * scaleX * downscaleFactor;
            const pixelY = Math.floor(pixelPosition / processedWidth) * scaleY * downscaleFactor;

            let minDistance = Number.MAX_VALUE;
            let closestCluster = 0;

            // Find closest cluster
            for (let j = 0; j < clusters.length; j++) {
                const cluster = clusters[j];
                const dr = cluster.r - r;
                const dg = cluster.g - g;
                const db = cluster.b - b;
                const distance = dr * dr + dg * dg + db * db;

                if (distance < minDistance) {
                    minDistance = distance;
                    closestCluster = j;
                }
            }

            // Add to closest cluster
            clusters[closestCluster].count++;
            clusters[closestCluster].rSum = (clusters[closestCluster].rSum || 0) + r;
            clusters[closestCluster].gSum = (clusters[closestCluster].gSum || 0) + g;
            clusters[closestCluster].bSum = (clusters[closestCluster].bSum || 0) + b;

            // Store pixel position
            clusters[closestCluster].points.push({ x: pixelX, y: pixelY });
        }

        // Update cluster centers
        // for (let i = 0; i < clusters.length; i++) {
        //     if (clusters[i].count > 0) {
        //         clusters[i].r = Math.round(clusters[i].rSum / clusters[i].count);
        //         clusters[i].g = Math.round(clusters[i].gSum / clusters[i].count);
        //         clusters[i].b = Math.round(clusters[i].bSum / clusters[i].count);
        //     }
        // }

        // Filter out unused clusters and add HSL values
        const usedClusters = clusters.filter(cluster => cluster.count > 0);

        usedClusters.forEach(cluster => {
            const hsl = rgbToHsl(cluster.r, cluster.g, cluster.b);


            if (cluster.points.length > 0) {
                // Sort points by distance from cluster center
                const centerX = cluster.points.reduce((sum: number, p: any) => sum + p.x, 0) / cluster.points.length;
                const centerY = cluster.points.reduce((sum: number, p: any) => sum + p.y, 0) / cluster.points.length;

                cluster.points.sort((a: any, b: any) => {
                    const distA = Math.pow(a.x - centerX, 2) + Math.pow(a.y - centerY, 2);
                    const distB = Math.pow(b.x - centerX, 2) + Math.pow(b.y - centerY, 2);
                    return distA - distB;
                });

                // Use a point close to the center
                const medianPoint = cluster.points[Math.floor(cluster.points.length / 3)];
                const c = pickColor({ x: medianPoint.x, y: medianPoint.y });
                if (c) {
                    const rgb = c?.split(",")
                    cluster.r = rgb![0].replaceAll("rgb(", "");
                    cluster.g = rgb![1];
                    cluster.b = rgb![2].replaceAll(")", "");
                }
                cluster.samplePoint = medianPoint;

                cluster.h = hsl.h;
                cluster.s = hsl.s;
                cluster.l = hsl.l;
                cluster.hex = rgbToHex(cluster.r, cluster.g, cluster.b);
            }
        });

        return usedClusters;
    }

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
        setSortBy("default");
        setColors([]);

    };

    const handleColorListChange = (oldIndex: number, newIndex: number) => {

        //setColorItems((items) => arrayMove(items, oldIndex, newIndex));
        console.log("oldIndex", oldIndex);
        console.log("newIndex", newIndex);

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

        setColorStops(colorStops);
    };



    const colorDistance = (c1: any, c2: any) =>
        Math.sqrt(
            Math.pow(c1.r - c2.r, 2) +
            Math.pow(c1.g - c2.g, 2) +
            Math.pow(c1.b - c2.b, 2)
        );

    const groupSimilarColors = (colors: any, threshold = 40) => {
        const groups: any[] = [];
        colors.forEach((color: any) => {
            const match = groups.find(g => colorDistance(g.rep, color) < threshold);
            if (match) {
                match.colors.push(color);
            } else {
                groups.push({ rep: color, colors: [color] });
            }
        });
        return groups;
    };

    function sortColors(colors: any, sortMethod: string) {
        switch (sortMethod) {
            case 'lightness':
                var sorted = [...colors].sort((a, b) => b.l - a.l); // lightest to darkest
                var result = [];
                var step = (sorted.length - 1) / (colorCount - 1);

                for (let i = 0; i < colorCount; i++) {
                    const index = Math.round(i * step);
                    result.push(sorted[index]);
                }

                return result;
            case 'darkness':
                var sorted = [...colors].sort((a, b) => a.l - b.l); // lightest to darkest
                var result = [];
                var step = (sorted.length - 1) / (colorCount - 1);

                for (let i = 0; i < colorCount; i++) {
                    const index = Math.round(i * step);
                    result.push(sorted[index]);
                }

                return result;
            case 'hue':
                return colors.sort((a: any, b: any) => a.h - b.h);
            case 'saturation':
                return colors.sort((a: any, b: any) => b.s - a.s);
            case 'dominant':
                const groups = groupSimilarColors(colors);
                groups.sort((a, b) => b.colors.length - a.colors.length);
                return groups.map((d) => {
                    return d.colors[0]
                });
            case 'soft':
                // Return colors with saturation < 50%
                return colors.filter((c: any) => c.s < 50);
            case 'pastel':
                console.log("pastel");
                return colors.filter((c: any) => c.l >= 0.7 && c.s <= 0.6)
                    .sort((a: any, b: any) => b.l - a.l);
            default:
                return colors;
        }
    }

    const processColors = async () => {
        if (!imgRef.current || !imgUploadCanvas.current || !imgUploadCanvasContext.current) {
            return;
        }

        if (sortBy == "default") {
            extractColorsFromImage(imgRef.current, colorCount);
        } else {
            const imageData = imgUploadCanvasContext.current.getImageData(
                0, 0,
                imgUploadCanvas.current.width,
                imgUploadCanvas.current.height
            );
            const pixels = imageData.data;
            if (colors.length <= 0) {
                const resultColors = await quantizeColors(pixels, imgUploadCanvas.current.width / 10);
                setColors(resultColors);
                const sortedColors = sortColors(resultColors, sortBy);


                if (sortedColors.length > 0) {
                    setPalette(sortedColors.map((c: any) => {
                        return `rgb(${c.r},${c.g},${c.b})`;
                    }).slice(0, colorCount));
                    setColorSamplePoints(sortedColors.map((c: any) => {
                        return { x: c.samplePoint.x, y: c.samplePoint.y };
                    }).slice(0, colorCount));
                }
            } else {
                const resultColors = colors;
                const sortedColors = sortColors(resultColors, sortBy);


                if (sortedColors.length > 0) {
                    setPalette(sortedColors.map((c: any) => {
                        return `rgb(${c.r},${c.g},${c.b})`;
                    }).slice(0, colorCount));
                    setColorSamplePoints(sortedColors.map((c: any) => {
                        return { x: c.samplePoint.x, y: c.samplePoint.y };
                    }).slice(0, colorCount));
                }
            }


        }
    };


    // Separate effect to handle colorCount changes
    useEffect(() => {
        processColors();
    }, [colorCount, imgRef.current, sortBy]);

    async function generateAgain() {
        if (!imgRef.current || !imgUploadCanvas.current || !imgUploadCanvasContext.current) {
            return;
        }
        if (sortBy == "default") {
            extractColorsFromImage(imgRef.current, colorCount);
        } else {
            const imageData = imgUploadCanvasContext.current.getImageData(
                0, 0,
                imgUploadCanvas.current.width,
                imgUploadCanvas.current.height
            );
            const pixels = imageData.data;
            const resultColors = await quantizeColors(pixels, imgUploadCanvas.current.width / 10);
            setColors(resultColors);
            const sortedColors = sortColors(resultColors, sortBy);


            if (sortedColors.length > 0) {
                setPalette(sortedColors.map((c: any) => {
                    return `rgb(${c.r},${c.g},${c.b})`;
                }).slice(0, colorCount));
                setColorSamplePoints(sortedColors.map((c: any) => {
                    return { x: c.samplePoint.x, y: c.samplePoint.y };
                }).slice(0, colorCount));
            }


        }
    }


    return (
        <div className='h-auto md:h-screen w-full flex justify-center items-center'>
            <div className="p-2 bg-[#F6F6F7] max-w-7xl mx-auto">
                <Card className="mb-2 te-card">
                    <CardContent className="p-4 text-center">
                        <h1 className="text-xl font-mono font-bold uppercase tracking-wider">IM—{'>'}GRAD</h1>
                    </CardContent>
                </Card>
                <main className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                        {/* Image Upload Section */}
                        <ImageUpload
                            imgSrc={imgSrc}
                            setImgSrc={setImgSrc}
                            imgRef={imgRef as React.RefObject<HTMLImageElement>}
                            onImageLoad={onImageLoad}
                            imgWidth={imgWidth}
                            imgHeight={imgHeight}
                            colorItems={colorItems}
                            colorSamplePoints={colorSamplePoints}
                            resetImage={resetImage}
                            updateColorFromPosition={updateColorFromPosition}
                        />





                        <SortColor sortBy={sortBy} setSortBy={setSortBy} colorCount={colorCount}
                            setColorCount={setColorCount} generateAgain={generateAgain}></SortColor>

                        {/* CSS Code Section */}
                        {/* <CssCode cssCodeResult={cssCodeResult} /> */}
                    </div>
                    <div className='col-span-1 md:col-span-2 flex flex-col gap-2'>
                        {/* Gradient Preview Section */}
                        <GradientPreview
                            colorItems={colorItems}
                            colorStops={colorStops}
                            setColorStops={setColorStops}
                            gradientDirection={gradientDirection}
                            imgHeight={imgHeight}
                            isLoadingColors={isLoadingColors}
                            renderGradientToCanvas={renderGradientToCanvas}
                        />

                        {/* Effects Section */}
                        <Effects
                            blurValue={blurValue}
                            setBlurValue={setBlurValue}
                            saturationValue={saturationValue}
                            setSaturationValue={setSaturationValue}
                            contrastValue={contrastValue}
                            setContrastValue={setContrastValue}
                            grainValue={grainValue}
                            setGrainValue={setGrainValue}
                        />
                    </div>
                    <div className="col-span-1 flex flex-col gap-2">
                        {/* Color List Section */}
                        <ColorList
                            colorItems={colorItems}

                            isLoadingColors={isLoadingColors}
                            toggleColorVisibility={toggleColorVisibility}
                            onChange={handleColorListChange}
                        />

                        {/* Gradient Settings Section */}
                        <GradientSettings
                            gradientDirection={gradientDirection}
                            setGradientDirection={setGradientDirection}

                        />

                        {/* Download Section */}
                        <Download
                            downloadSize={downloadSize}
                            setDownloadSize={setDownloadSize}
                            downloadGradientAsImage={downloadGradientAsImage}
                            loadingDownload={loadingDownload}
                            colorItems={colorItems}
                            cssCodeResult={cssCodeResult}
                            renderGradientToCanvas={renderGradientToCanvas}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
