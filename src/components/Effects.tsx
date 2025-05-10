import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface EffectsProps {
  blurValue: number;
  setBlurValue: (value: number) => void;
  saturationValue: number;
  setSaturationValue: (value: number) => void;
  contrastValue: number;
  setContrastValue: (value: number) => void;
  grainValue: number;
  setGrainValue: (value: number) => void;
}

function Effects({
  blurValue,
  setBlurValue,
  saturationValue,
  setSaturationValue,
  contrastValue,
  setContrastValue,
  grainValue,
  setGrainValue
}: EffectsProps) {
  return (
    <Card className="te-card p-1">
      <CardContent className="p-1 gap-1">
        <h2 className="te-heading">Effects</h2>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="showGradientStops" className="te-label">Blur : {blurValue}px</Label>
            <Slider
              value={[blurValue]}
              min={0}
              max={50}
              step={1}
              onValueChange={(val) => setBlurValue(val[0])}
              className="te-slider-track"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="showGradientStops" className="te-label">Saturation : {saturationValue}%</Label>
            <Slider
              value={[saturationValue]}
              min={0}
              max={200}
              step={1}
              onValueChange={(val) => setSaturationValue(val[0])}
              className="te-slider-track"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="showGradientStops" className="te-label">Contrast : {contrastValue}%</Label>
            <Slider
              value={[contrastValue]}
              min={0}
              max={200}
              step={1}
              onValueChange={(val) => setContrastValue(val[0])}
              className="te-slider-track"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="showGradientStops" className="te-label">Grain : {grainValue}%</Label>
            <Slider
              value={[grainValue]}
              min={0}
              max={100}
              step={1}
              onValueChange={(val) => setGrainValue(val[0])}
              className="te-slider-track"
            />
          </div>


        </div>
      </CardContent>

    </Card>
  );
}

export default Effects;
