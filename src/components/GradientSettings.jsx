import React from 'react';

function GradientSettings({ 
  gradientDirection, 
  setGradientDirection, 
  colorCount, 
  setColorCount 
}) {
  return (
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
  );
}

export default GradientSettings; 