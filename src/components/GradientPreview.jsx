import React, { useEffect, useRef } from 'react';
import GradientSlider from './GradientSlider';

function GradientPreview({
  colorItems,
  colorStops,
  setColorStops,
  gradientDirection,
  imgHeight,
  isLoadingColors,
  showGradientStops,
  setShowGradientStops,
  renderGradientToCanvas
}) {
  const previewCanvasRef = useRef(null);
  const resultPreviewRef = useRef(null);
  
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
    <section className="card p-4 shadow-soft">
      <h2 className="section-header">
        Result Preview {isLoadingColors && '(Loading colors...)'}
      </h2>
      <div className='relative bg-gray-300 rounded-lg overflow-hidden' ref={resultPreviewRef}>
        <canvas
          ref={previewCanvasRef}
          className="gradient-preview w-full min-h-[250px] transition-all duration-300 "
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
            showGradientStops={showGradientStops}
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
  );
}

export default GradientPreview; 