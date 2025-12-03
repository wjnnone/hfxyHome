import JSZip from 'jszip';
import { SliceResult } from '../types';

/**
 * Loads an image from a File object
 */
export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Resizes an image to a fixed width of 640px while maintaining aspect ratio
 */
export const resizeImageTo640 = (img: HTMLImageElement): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const targetWidth = 640;
    const scaleFactor = targetWidth / img.width;
    const targetHeight = img.height * scaleFactor;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    resolve(canvas);
  });
};

/**
 * Performs the specific slicing logic requested:
 * 1. Top (0-640px):
 *    - m_5: x=0, w=80
 *    - m_6: x=560, w=80
 *    - m_1: x=80, w=240 (Left half of center)
 *    - m_2: x=320, w=240 (Right half of center)
 * 2. Middle (640px - splitY2):
 *    - m_3: Full width
 * 3. Bottom (splitY2 - end):
 *    - m_4: Full width
 */
export const processSlices = async (
  sourceCanvas: HTMLCanvasElement, 
  splitY2: number
): Promise<SliceResult[]> => {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) throw new Error('No context');

  const slices: SliceResult[] = [];
  const totalHeight = sourceCanvas.height;
  const splitY1 = 640;
  
  // Helper to extract a region
  const extract = async (x: number, y: number, w: number, h: number, name: string): Promise<void> => {
    if (h <= 0 || w <= 0) return; // Skip invalid slices

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d');
    if (!cx) return;

    cx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);

    return new Promise((resolve) => {
      c.toBlob((blob) => {
        if (blob) {
          slices.push({
            id: name,
            name: `${name}.png`,
            blob,
            url: URL.createObjectURL(blob),
            width: w,
            height: h,
            x,
            y
          });
        }
        resolve();
      }, 'image/png');
    });
  };

  // --- Part 1: Top 640x640 ---
  const topHeight = Math.min(splitY1, totalHeight);
  
  // m_5: Left Strip
  await extract(0, 0, 80, topHeight, 'm_5');
  
  // m_6: Right Strip
  await extract(560, 0, 80, topHeight, 'm_6');

  // Center logic
  // Center width = 640 - 80 - 80 = 480. Half is 240.
  // m_1: Left Center
  await extract(80, 0, 240, topHeight, 'm_1');
  
  // m_2: Right Center
  await extract(320, 0, 240, topHeight, 'm_2');


  // --- Part 2: Middle (m_3) ---
  // Starts at 640, ends at splitY2
  const midStart = splitY1;
  const midEnd = Math.min(splitY2, totalHeight);
  const midHeight = midEnd - midStart;

  if (midHeight > 0) {
    await extract(0, midStart, 640, midHeight, 'm_3');
  }

  // --- Part 3: Bottom (m_4) ---
  // Modified: m_4 must be 640x480.
  const botStart = midEnd; 
  const m4Width = 640;
  const m4Height = 480;

  const c4 = document.createElement('canvas');
  c4.width = m4Width;
  c4.height = m4Height;
  const cx4 = c4.getContext('2d');

  if (cx4) {
    // Determine how much image data is available
    const availableHeight = totalHeight - botStart;
    
    // Draw available content if any (up to 480px)
    if (availableHeight > 0) {
      const h = Math.min(availableHeight, m4Height);
      cx4.drawImage(sourceCanvas, 0, botStart, m4Width, h, 0, 0, m4Width, h);
    }
    // If availableHeight < 480, the rest of the canvas remains transparent (padded)

    await new Promise<void>((resolve) => {
      c4.toBlob((blob) => {
        if (blob) {
          slices.push({
            id: 'm_4',
            name: 'm_4.png',
            blob,
            url: URL.createObjectURL(blob),
            width: m4Width,
            height: m4Height,
            x: 0,
            y: botStart
          });
        }
        resolve();
      }, 'image/png');
    });
  }

  // Sort slices by name for consistent order
  return slices.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Creates a ZIP file containing all slices
 */
export const createZip = async (slices: SliceResult[]): Promise<Blob> => {
  const zip = new JSZip();
  
  slices.forEach(slice => {
    zip.file(slice.name, slice.blob);
  });

  return await zip.generateAsync({ type: 'blob' });
};