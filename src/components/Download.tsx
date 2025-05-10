import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyIcon, DownloadIcon } from 'lucide-react';
import DownloadModal from './DownloadModal';

interface DownloadSize {
  width: number;
  height: number;
}

interface DownloadProps {
  downloadSize: DownloadSize;
  setDownloadSize: (size: DownloadSize) => void;
  downloadGradientAsImage: (withFrame: boolean) => void;
  loadingDownload: boolean;
  colorItems: Array<{
    id: string;
    color: string;
    isVisible: boolean;
  }>;
  cssCodeResult: string;
  renderGradientToCanvas: (
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ) => void;
}

function Download({
  downloadSize,
  setDownloadSize,
  downloadGradientAsImage,
  loadingDownload,
  colorItems,
  cssCodeResult,
  renderGradientToCanvas
}: DownloadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    <>
      <Card className="te-card p-1">
        <CardContent className="p-1 gap-1">
          <h2 className="te-heading">Download</h2>
          <div className="flex flex-col gap-4 w-full">
            <div className="space-y-2">
              <Button 
                className="w-full te-button flex items-center justify-center gap-2 relative"  
                onClick={() => setIsModalOpen(true)} 
                disabled={!colorItems.length || colorItems.every(c => !c.isVisible) || loadingDownload}
              >
                <DownloadIcon className="h-4 w-4" />
                EXPORT
              </Button>
              <Button 
                className="w-full te-button flex items-center justify-center gap-2 relative"  
                onClick={(e) => {
                  copyCss(e);
                }} 
                disabled={!colorItems.length || colorItems.every(c => !c.isVisible) || loadingDownload}
              >
                <CopyIcon className="h-4 w-4" />
                <span className='label'>COPY CSS</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isModalOpen && <DownloadModal
        onClose={() => setIsModalOpen(false)}
        downloadSize={downloadSize}
        setDownloadSize={setDownloadSize}
        downloadGradientAsImage={downloadGradientAsImage}
        renderGradientToCanvas={renderGradientToCanvas}
      />}
    </>
  );
}

export default Download;
