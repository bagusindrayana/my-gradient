import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ColorNodes from './ColorNodes';

function ImageUpload({ 
  imgSrc, 
  setImgSrc, 
  imgRef, 
  onImageLoad, 
  imgWidth, 
  imgHeight, 
  colorItems, 
  colorSamplePoints, 
  showColorNodes, 
  setShowColorNodes, 
  resetImage,
  updateColorFromPosition 
}) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(acceptedFiles[0]);
    }
  }, [setImgSrc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  return (
    <section className="card p-4 relative group">
      <h2 className="section-header">Upload Image</h2>

      {imgSrc ? (
        <div className="text-center min-h-[250px] flex flex-col items-center justify-center gap-2 relative">
          {/* Reset button that appears on hover */}
          <button
            onClick={resetImage}
            className="absolute cursor-pointer top-0 right-0 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
            title="Reset image"
          >
            ×
          </button>
          <div className="relative">
            <img
              ref={imgRef}
              alt="Upload preview"
              src={imgSrc}
              onLoad={onImageLoad}
              className="max-h-[400px] mx-auto rounded-lg shadow-soft" // Limit display height
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
        </div>
      ) : (
        <div
          {...getRootProps({
            className: `dropzone ${isDragActive ? 'active' : ''}`
          })}
        >
          <input {...getInputProps()} />
          <p className="text-gray-600">Drag 'n' drop an image here, or click to select one</p>
        </div>
      )}

      <div className="flex flex-col gap-1 mt-4">
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="showNodes"
            checked={showColorNodes}
            onChange={(e) => setShowColorNodes(e.target.checked)}
            className="custom-checkbox"
          />
          <label htmlFor="showNodes" className="text-sm text-gray-700">Show Color Nodes</label>
        </div>
        <p className="text-xs text-gray-500 mt-1 italic">
          Drag nodes to change colors from different parts of the image.
        </p>
      </div>
    </section>
  );
}

export default ImageUpload; 