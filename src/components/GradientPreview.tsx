import React, { useEffect, useRef, useState } from 'react';
import GradientSlider from './GradientSlider';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ColorItem {
  id: string;
  color: string;
  isVisible: boolean;
}

interface GradientPreviewProps {
  colorItems: ColorItem[];
  colorStops: number[];
  setColorStops: (stops: number[]) => void;
  gradientDirection: string;
  imgHeight: number;
  isLoadingColors: boolean;
  renderGradientToCanvas: (
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ) => void;
}

function GradientPreview({
  colorItems,
  colorStops,
  setColorStops,
  gradientDirection,
  imgHeight,
  isLoadingColors,
  renderGradientToCanvas
}: GradientPreviewProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const resultPreviewRef = useRef<HTMLDivElement>(null);
  const [showGradientStops, setShowGradientStops] = useState<boolean>(true);

  // Effect to update the preview canvas when parameters change
  useEffect(() => {
    if (previewCanvasRef.current && resultPreviewRef.current) {
      const canvas = previewCanvasRef.current;
      const containerWidth = resultPreviewRef.current.clientWidth || 600;
      const containerHeight = imgHeight || 250;

      renderGradientToCanvas(canvas, containerWidth, containerHeight);
    }
  }, [renderGradientToCanvas, imgHeight, colorStops]);

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
  }, [renderGradientToCanvas, imgHeight, colorStops]);

  return (
    <Card className="te-card p-1">
      <CardContent className="p-1">
        <h2 className="te-heading mb-2">Preview</h2>

        <div className='magnetic-target relative bg-gray-100 border border-gray-200 min-h-[250px] overflow-hidden'  cursor-type="area" ref={resultPreviewRef}>
          <canvas
            ref={previewCanvasRef}
            className="gradient-preview w-full min-h-[250px] transition-all duration-300 "
            style={{
              height: imgHeight || 250,
            }}
          />
          {(colorItems.length > 1 && showGradientStops) &&
            <GradientSlider
              colorItems={colorItems}
              colorStops={colorStops}
              setColorStops={setColorStops}
              gradientDirection={gradientDirection}
              
            />
          }
          {!colorItems.length && !isLoadingColors && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
              No colors extracted yet.
              </div>)}
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <div className="magnetic-target cursor-none flex items-center space-x-2 mt-2 shrink-0 w-auto "  cursor-type="checkbox" style={{
              maxWidth:"max-content"
            }}>
            <Checkbox
              id="showGradientStops"
              checked={showGradientStops}
              onCheckedChange={(checked: boolean) => setShowGradientStops(checked)}
              className="rounded-none border-black"
            />
            <Label htmlFor="showGradientStops" className="te-label">STOP NODES</Label>
          </div>
          <p className="text-xs text-gray-500 italic">
            Drag nodes to adjust color positions in the gradient.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default GradientPreview;
