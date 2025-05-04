import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowDown, Square, Circle, Grid, DownloadIcon, Image as ImageIcon, ArrowLeft, ArrowRight, ArrowDownRight, ArrowUpRight, ArrowDownLeft, ArrowUpLeft } from "lucide-react";

interface GradientSettingsProps {
  gradientDirection: string;
  setGradientDirection: (direction: string) => void;
  
}

function GradientSettings({
  gradientDirection,
  setGradientDirection,

}: GradientSettingsProps) {
  return (
    <Card className="te-card p-1">
      <CardContent className="p-1 gap-1">
        <h2 className="te-heading">Settings</h2>
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col gap-2">
            <Label className="te-label block mb-1">DIRECTION:</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className={`aspect-square p-0 ${gradientDirection === 'to top' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setGradientDirection('to top')}
              >
                <ArrowDown className="rotate-180 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className={`aspect-square p-0 ${gradientDirection === 'to bottom' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setGradientDirection('to bottom')}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className={`aspect-square p-0 ${gradientDirection === 'to right' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setGradientDirection('to right')}
              >
                <ArrowLeft className=" h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className={`aspect-square p-0 ${gradientDirection === 'to left' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setGradientDirection('to left')}
              >
                <ArrowRight className=" h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className={`aspect-square p-0 ${gradientDirection === '45deg' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setGradientDirection('45deg')}
              >
                <ArrowUpRight className=" h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className={`aspect-square p-0 ${gradientDirection === '135deg' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setGradientDirection('135deg')}
              >
                <ArrowDownRight className=" h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className={`aspect-square p-0 ${gradientDirection === '225deg' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setGradientDirection('225deg')}
              >
                <ArrowDownLeft className=" h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className={`aspect-square p-0 ${gradientDirection === '315deg' ? 'bg-black text-white' : 'bg-gray-100'}`}
                onClick={() => setGradientDirection('315deg')}
              >
                <ArrowUpLeft className=" h-4 w-4" />
              </Button>
            </div>
          </div>
          

        </div>
      </CardContent>
    </Card>
  );
}

export default GradientSettings;
