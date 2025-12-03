import React, { useState, useRef, useEffect } from 'react';
import { SliceResult } from './types';
import { loadImage, resizeImageTo640, processSlices, createZip } from './services/imageProcessor';

// Icons
const UploadIcon = () => (
  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ScissorsIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
  </svg>
);

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [slices, setSlices] = useState<SliceResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Hardcoded Logic: m_3 is 640x160.
  // Split points: Y=640 (End of Part 1), Y=800 (End of Part 2/m_3)
  const m3Height = 160; 
  const SPLIT_Y1 = 640;
  const splitY2 = SPLIT_Y1 + m3Height; // 800

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setSlices([]);
      
      try {
        const img = await loadImage(selectedFile);
        const resizedCanvas = await resizeImageTo640(img);
        setCanvas(resizedCanvas);
      } catch (err) {
        console.error("Error loading image", err);
        alert("Could not load image. Please try another file.");
      }
    }
  };

  const handleProcess = async () => {
    if (!canvas) return;
    setIsProcessing(true);
    try {
      // Small delay to allow UI to update if needed
      await new Promise(r => setTimeout(r, 100));
      const result = await processSlices(canvas, splitY2);
      setSlices(result);
    } catch (error) {
      console.error(error);
      alert("Error processing slices");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadZip = async () => {
    if (slices.length === 0) return;
    try {
      const zipBlob = await createZip(slices);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slices-${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error creating ZIP file");
    }
  };

  const handleDownloadSingle = (slice: SliceResult) => {
    const a = document.createElement('a');
    a.href = slice.url;
    a.download = slice.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ScissorsIcon />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">SliceMaster <span className="text-indigo-600">640</span></h1>
          </div>
          <div className="text-sm text-gray-500">Auto-split tool for E-commerce</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Configuration */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Upload Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Upload Image</h2>
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-indigo-500 transition-colors bg-gray-50 hover:bg-indigo-50/30 group cursor-pointer text-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="group-hover:text-indigo-500 transition-colors">
                    <UploadIcon />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {file ? file.name : "Drop file here or click to browse"}
                  </span>
                  {!file && <span className="text-xs text-gray-500">Supports JPG, PNG, WebP</span>}
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Process</h2>
              
              <div className="space-y-4">
                <button
                  onClick={handleProcess}
                  disabled={!file || isProcessing}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                    ${!file || isProcessing 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                    } transition-all`}
                >
                  {isProcessing ? 'Processing...' : 'Split Image'}
                </button>
                <p className="text-xs text-gray-500 text-center">
                   Results will be generated below automatically.
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Splitting Rules</h3>
              <ul className="text-xs text-blue-800 space-y-2 list-disc pl-4">
                <li>Image resized to width <strong>640px</strong>.</li>
                <li><strong>Part 1 (0-640px):</strong> m_1 (center-L), m_2 (center-R), m_5 (left), m_6 (right).</li>
                <li><strong>Part 2 (640-800px):</strong> m_3 (640x160).</li>
                <li><strong>Part 3 (800px+):</strong> m_4 (Fixed 640x480 - cropped or padded).</li>
              </ul>
            </div>

          </div>

          {/* Center/Right Column: Results */}
          <div className="lg:col-span-8 space-y-6">
            
            {slices.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">3. Results ({slices.length} slices)</h2>
                  <button
                    onClick={handleDownloadZip}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <DownloadIcon />
                    <span className="ml-2">Download All (ZIP)</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {slices.map((slice) => (
                    <div key={slice.id} className="group relative bg-gray-50 border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200 h-40 relative">
                        <img
                          src={slice.url}
                          alt={slice.name}
                          className="h-full w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                           <button 
                             onClick={() => handleDownloadSingle(slice)}
                             className="bg-white text-gray-900 p-2 rounded-full shadow-lg hover:bg-gray-100"
                             title="Download"
                           >
                             <DownloadIcon />
                           </button>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">{slice.name}</p>
                          <p className="text-xs text-gray-500">{slice.width} x {slice.height}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}