import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import ColorNodes from './ColorNodes';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { XIcon } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface ImageUploadProps {
  imgSrc: string;
  setImgSrc: (src: string) => void;
  imgRef: React.RefObject<HTMLImageElement>;
  onImageLoad: (e: any) => void;
  imgWidth: number;
  imgHeight: number;
  colorItems: Array<{
    id: string;
    color: string;
    isVisible: boolean;
  }>;
  colorSamplePoints: Array<{ x: number, y: number }>;

  resetImage: () => void;
  updateColorFromPosition: (id: string, position: Position) => void;
}

function ImageUpload({
  imgSrc,
  setImgSrc,
  imgRef,
  onImageLoad,
  imgWidth,
  imgHeight,
  colorItems,
  colorSamplePoints,

  resetImage,
  updateColorFromPosition
}: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(acceptedFiles[0]);
    }
  }, [setImgSrc]);

  const [showColorNodes, setShowColorNodes] = useState<boolean>(true);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  return (

    <Card className="te-card p-1">
      <CardContent className="p-1">
        <h2 className="te-heading mb-2">Input Image</h2>

        {imgSrc ? (
          <div className="magnetic-target text-center min-h-[250px] flex flex-col items-center justify-center gap-2 relative  transition-all duration-300">

            <div className="relative">
              <img
                ref={imgRef}
                alt="Upload preview"
                src={imgSrc}
                onLoad={onImageLoad}
                className="max-h-[400px] mx-auto rounded-lg shadow-soft  transition-all duration-300" // Limit display height
              />
              <ColorNodes
                colorItems={colorItems}
                samplePoints={colorSamplePoints}
                imgWidth={imgWidth}
                imgHeight={imgHeight}
                showColorNodes={showColorNodes}
                imgRef={imgRef}
                updateColorFromPosition={updateColorFromPosition}
              />
            </div>

            {/* Reset button that appears on hover */}
            <Button onClick={resetImage} variant={"outline"} className='magnetic-target absolute  top-0 right-0 rounded-none border-black z-20' size={"sm"} title="Reset image">
              <XIcon />
            </Button>
            {/* <button
              onClick={resetImage}
              className="absolute  top-0 right-0 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center group-hover:opacity-100 transition-opacity z-20"
              title="Reset image"
            >
              ×
            </button> */}
          </div>
        ) : (
          <div
            {...getRootProps({
              className: `magnetic-target cursor-none bg-gray-100 border border-black border-dashed rounded-none min-h-[250px] flex items-center justify-center  ${isDragActive ? 'active' : ''}`
            })}
          >
            <input {...getInputProps()} />
            <p className="text-gray-600 text-sm  pointer-events-none">Drag 'n' drop an image here, or click to select one</p>
          </div>
        )}

        <div className="flex flex-col gap-1 mt-2">

          <div className="magnetic-target cursor-none flex items-center space-x-2 mt-2 shrink-0 w-auto " style={{
              maxWidth:"max-content"
            }}>
              <Checkbox
                id="showGradientNodes"
                checked={showColorNodes}
                onCheckedChange={(checked: boolean) => setShowColorNodes(checked)}
                className="rounded-none border-black  cursor-none"
              />
              <Label htmlFor="showGradientNodes" className=" cursor-none te-label shrink-0 w-auto">COLOR NODES</Label>
            </div>

          <p className="text-xs text-gray-500 italic">
            Drag nodes to change colors from different parts of the image.
          </p>
        </div>
      </CardContent>
    </Card>

  );
}

export default ImageUpload;
