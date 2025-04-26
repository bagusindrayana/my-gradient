import React from 'react';

function Effects({ 
  blurValue, 
  setBlurValue, 
  saturationValue, 
  setSaturationValue, 
  grainValue, 
  setGrainValue 
}) {
  return (
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
  );
}

export default Effects; 