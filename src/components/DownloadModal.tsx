import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DownloadIcon, XIcon } from 'lucide-react';

interface DownloadModalProps {
  onClose: () => void;
  downloadSize: { width: number; height: number };
  setDownloadSize: (size: { width: number; height: number }) => void;
  downloadGradientAsImage: (withFrame: boolean) => void;
  renderGradientToCanvas:  (
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ) => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({
  onClose,
  downloadSize,
  setDownloadSize,
  downloadGradientAsImage,
  renderGradientToCanvas
}) => {
  const [withFrame, setWithFrame] = useState(false);
  
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  

  // if (!isOpen) return null;

  const resolutions = [
    { value: "1920x1080", label: "1920×1080 (FHD)" },
    { value: "3840x2160", label: "3840×2160 (4K)" },
    { value: "1280x720", label: "1280×720 (HD)" },
    { value: "800x600", label: "800×600" },
    { value: "1080x1920", label: "1080×1920 (Mobile FHD)" },
    { value: "750x1334", label: "750×1334 (iPhone)" }
  ];

   // Effect to update the preview canvas when parameters change
    useEffect(() => {
      if (previewCanvasRef.current) {
        const canvas = previewCanvasRef.current;
      renderGradientToCanvas(canvas, downloadSize.width, downloadSize.height);
      }
    }, [renderGradientToCanvas, downloadSize]);
  
    // Effect to handle window resize
    useEffect(() => {
      const handleResize = () => {
        if (previewCanvasRef.current) {
          const canvas = previewCanvasRef.current;
         
          renderGradientToCanvas(canvas, downloadSize.width, downloadSize.height);
        }
      };
  
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [renderGradientToCanvas, downloadSize]);


  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{
      background:"hsla(0, 0%, 0%, 0.8)"
    }}>
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Download Preview</h2>
           <Button onClick={onClose} variant={"outline"} className='magnetic-target top-0 right-0 rounded-none border-black z-20' size={"sm"} title="Reset image">
              <XIcon/>
            </Button>
      
        </div>

        <div className="mb-4">
          <Select 
            value={`${downloadSize.width}x${downloadSize.height}`} 
            onValueChange={(e) => {
              const [width, height] = e.split('x').map(Number);
              setDownloadSize({ width, height });
            }}
          >
            <SelectTrigger className="w-full magnetic-target">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              {resolutions.map((res) => (
                <SelectItem key={res.value} value={res.value}>
                  {res.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 mb-4 magnetic-target cursor-none shrink-0 w-auto"  style={{
              maxWidth:"max-content"
            }}>
          <Checkbox 
            id="frame-toggle" 
            checked={withFrame} 
            onCheckedChange={(checked) => setWithFrame(!!checked)}
          />
          <Label htmlFor="frame-toggle" className=' cursor-none shrink-0 w-auto'>Add Polaroid Frame</Label>
        </div>

        <div className='w-full relative flex justify-center'>
              <div className="mb-4 border rounded-md overflow-hidden relative max-h-[60vh] max-auto" 
          style={{
            aspectRatio: `${downloadSize.width}/${downloadSize.height}`,
          }}
        >
          
          <canvas
            ref={previewCanvasRef}
            className="gradient-preview w-full min-h-[250px] transition-all duration-300 object-contain block  mx-auto"
            height={downloadSize.height}
            width={downloadSize.width}
           
          />
          {withFrame && (
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute inset-0 border-white p-4 shadow-lg"
                style={{
                  borderWidth: `${Math.max(2, Math.min(4, downloadSize.width * 0.01))}px`
                }}
              >
                <div 
                  className="absolute inset-0 border-white"
                  style={{
                    borderWidth: `${Math.max(2, Math.min(4, downloadSize.width * 0.01))}px`
                  }}
                ></div>
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-white"
                  style={{
                    height: `${Math.max(6, Math.min(12, downloadSize.height * 0.1))}px`
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className='magnetic-target font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2 relative'>
            Cancel
          </Button>
          <Button 
            onClick={() => downloadGradientAsImage(withFrame)}
            className="magnetic-target te-button flex items-center justify-center gap-2 relative"
          >
            <DownloadIcon className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
