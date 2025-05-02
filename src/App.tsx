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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowDown, Square, Circle, Grid, DownloadIcon, Image as ImageIcon } from "lucide-react";

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
            if(ctx == null){
                return;
            }

           

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
      url("data:image/svg+xml,%3Csvg viewBox='0 0 ${imgWidth} ${imgHeight}' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${opacity - (opacity / 1.8)}'/%3E%3C/svg%3E")
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

    const pickColor = (position: any) => {
        if (!imgRef.current || !imgUploadCanvas.current) return;

        try {
            // Create a small canvas to sample the color
            const canvas = imgUploadCanvas.current;
            const ctx = imgUploadCanvasContext.current;
            if(ctx == null){
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

    // Function to render gradient and effects to a canvas
    const renderGradientToCanvas = useCallback((targetCanvas: HTMLCanvasElement, width: number, height: number) => {
        if (!targetCanvas) return;

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
        if (blurValue > 0 || saturationValue !== 100 || grainValue > 0) {

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

                        if (h != undefined) {
                            h /= 6;
                        }
                    }

                    // Adjust saturation
                    s = s * (saturationValue / 100);
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
            }

            // Apply grain
            if (grainValue > 0 && noise2DRef.current) {
                applyGrainEffect(ctx, targetCanvas, grainValue / 1000);
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

                // Apply blur
                ctx.filter = `blur(${blurValue}px)`;
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(tempCanvas, 0, 0);
                ctx.filter = 'none';
            }

        }
    }, [colorItems, colorStops, gradientDirection, blurValue, saturationValue, grainValue, noise2DRef]);

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

                    if (h != undefined) {
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
                        function hue2rgb(p: number, q: number, t: number) {
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
                }

                ctx.putImageData(imageData, 0, 0);
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
                applyGrainEffect(ctx, canvas, grainValue / 1000);
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

        // Create download link
        const link = document.createElement('a');
        link.download = `gradient-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // Convert RGB to HSL
    function rgbToHsl(r:number, g:number, b:number) {
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
            
            if(h != undefined){
                h /= 6;
            }
        }
        
        return { h: (h??0) * 360, s: s * 100, l: l * 100 };
    }
    
    // RGB to Hex conversion
    function rgbToHex(r:number, g:number, b:number) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    // Quantize colors (simplified k-means approach)
    function quantizeColors(pixels:any, numColors:number) {
        // Initialize clusters with random pixels
        const clusters = [];
        const pixelCount = pixels.length / 4;
        
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
                hex: ''
            });
        }
        
        // Iterate a few times for better convergence
        for (let iteration = 0; iteration < 5; iteration++) {
            // Reset counts and sums
            for (let i = 0; i < clusters.length; i++) {
                clusters[i].count = 0;
                clusters[i].rSum = 0;
                clusters[i].gSum = 0;
                clusters[i].bSum = 0;
            }
            
            // Assign pixels to clusters
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                
                // Skip transparent pixels
                if (a < 128) continue;
                
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
            }
            
            // Update cluster centers
            for (let i = 0; i < clusters.length; i++) {
                if (clusters[i].count > 0) {
                    clusters[i].r = Math.round(clusters[i].rSum / clusters[i].count);
                    clusters[i].g = Math.round(clusters[i].gSum / clusters[i].count);
                    clusters[i].b = Math.round(clusters[i].bSum / clusters[i].count);
                }
            }
        }
        
        // Filter out unused clusters and add HSL values
        const usedClusters = clusters.filter(cluster => cluster.count > 0);
        
        usedClusters.forEach(cluster => {
            const hsl = rgbToHsl(cluster.r, cluster.g, cluster.b);
            cluster.h = hsl.h;
            cluster.s = hsl.s;
            cluster.l = hsl.l;
            cluster.hex = rgbToHex(cluster.r, cluster.g, cluster.b);
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

    // Separate effect to handle colorCount changes
    useEffect(() => {
        // Only run this effect if we already have colors and image is loaded
        if (palette.length > 0 && colorItems.length > 0 && imgRef.current) {
            const currentCount = colorItems.length;

            if (imgUploadCanvas.current) {
                extractColorsFromImage(imgRef.current, colorCount);
            }

            // If we need to add more colors
            // if (colorCount > currentCount) {
            //     if (imgUploadCanvas.current) {
            //         extractColorsFromImage(imgRef.current, colorCount);
            //     }
            // } else {
            //     //remove colors
            //     setPalette(prev => prev.slice(0, colorCount));
            //     setColorSamplePoints(prev => prev.slice(0, colorCount));
            // }
        }
    }, [colorCount, imgRef.current]);

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

                    {/* Gradient Settings Section */}
                    <GradientSettings
                        gradientDirection={gradientDirection}
                        setGradientDirection={setGradientDirection}
                        colorCount={colorCount}
                        setColorCount={setColorCount}
                    />

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

                    <SortColor sortBy={sortBy} setSortBy={setSortBy}></SortColor>

                    {/* Download Section */}
                    <Download
                        downloadSize={downloadSize}
                        setDownloadSize={setDownloadSize}
                        downloadGradientAsImage={downloadGradientAsImage}
                        colorItems={colorItems}
                    />
                </div>
            </main>
        </div>
        </div>
    );
}

export default App;
