import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyIcon, DownloadIcon } from 'lucide-react';

interface DownloadSize {
  width: number;
  height: number;
}

interface DownloadProps {
  downloadSize: DownloadSize;
  setDownloadSize: (size: DownloadSize) => void;
  downloadGradientAsImage: () => void;
  loadingDownload: boolean;
  colorItems: Array<{
    id: string;
    color: string;
    isVisible: boolean;
  }>;
  cssCodeResult:string
}


function Download({
  downloadSize,
  setDownloadSize,
  downloadGradientAsImage,
  loadingDownload,
  colorItems,
  cssCodeResult
}: DownloadProps) {
  function copyCss(e:any) {
    console.log(cssCodeResult);
    navigator.clipboard.writeText(cssCodeResult)
      .then(() => {
        const copied = e.target.querySelector(".label");
  
        copied.innerHTML = "COPIED!";
        setTimeout(() => {
          copied.innerHTML = "COPY CSS";
        }, 1000);
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  }
  
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

          <Button className="w-full te-button flex items-center justify-center gap-2 relative"  onClick={downloadGradientAsImage} disabled={!colorItems.length || colorItems.every(c => !c.isVisible) || loadingDownload}>
            <DownloadIcon className="h-4 w-4" />
            EXPORT
          </Button>
          <Button className="w-full te-button flex items-center justify-center gap-2 relative"  onClick={(e)=>{
            copyCss(e);
          }} disabled={!colorItems.length || colorItems.every(c => !c.isVisible) || loadingDownload}>
            <CopyIcon className="h-4 w-4" />
           <span className='label'>COPY CSS</span>
          </Button>
        </div>
      
      </div>
      </CardContent>
    </Card>
  );
}

export default Download;
