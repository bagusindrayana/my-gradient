import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DownloadIcon } from 'lucide-react';

interface DownloadSize {
  width: number;
  height: number;
}

interface DownloadProps {
  downloadSize: DownloadSize;
  setDownloadSize: (size: DownloadSize) => void;
  downloadGradientAsImage: () => void;
  colorItems: Array<{
    id: string;
    color: string;
    isVisible: boolean;
  }>;
}

function Download({
  downloadSize,
  setDownloadSize,
  downloadGradientAsImage,
  colorItems
}: DownloadProps) {
  return (
     <Card className="te-card p-1">
          <CardContent className="p-1 gap-1">
      <h2 className="te-heading">Download</h2>
      <div className="flex flex-col gap-4 w-full">

        <div className="space-y-2">
          <Select value={`${downloadSize.width}x${downloadSize.height}`} onValueChange={(e) => {
            const [width, height] = e.split('x').map(Number);
            setDownloadSize({ width, height });
          }}>
            <SelectTrigger className="w-full te-input font-mono text-xs uppercase">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent className="font-mono text-xs">
              <SelectItem value="1920x1080">1920×1080 (FHD)</SelectItem>
              <SelectItem value="3840x2160">3840×2160 (4K)</SelectItem>
              <SelectItem value="1280×720">1280×720 (HD)</SelectItem>
              <SelectItem value="800x600">800×600</SelectItem>
              <SelectItem value="1080x1920">1080×1920 (Mobile FHD)</SelectItem>
              <SelectItem value="750x1334">750×1334 (iPhone)</SelectItem>
            </SelectContent>
          </Select>

          <Button className="w-full te-button flex items-center justify-center gap-2"  onClick={downloadGradientAsImage} disabled={!colorItems.length || colorItems.every(c => !c.isVisible)}>
            <DownloadIcon className="h-4 w-4" />
            EXPORT
          </Button>
        </div>
        {/* <div className="grid grid-cols-1 gap-3">
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
        </div> */}
      </div>
      </CardContent>
    </Card>
  );
}

export default Download;
