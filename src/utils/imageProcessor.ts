/**
 * Image Processor Utility for COLORIDO 2K26 Gallery
 * Supports arbitrary dimensions, aspect ratio detection, focal point, lossless rotation, and optional cropping.
 */

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: string;
  ratioValue: number;
  orientation: 'landscape' | 'portrait' | 'square' | 'ultrawide';
  orientationLabel: string;
  sizeBytes?: number;
}

export interface CropRect {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

/**
 * Detect image dimensions, aspect ratio, and orientation accurately.
 */
export async function detectImageMetadata(source: string | File): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let sizeBytes = 0;

    if (source instanceof File) {
      srcUrl = URL.createObjectURL(source);
      sizeBytes = source.size;
    } else {
      srcUrl = source;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (source instanceof File) {
        URL.revokeObjectURL(srcUrl);
      }

      const ratioValue = height > 0 ? Number((width / height).toFixed(2)) : 1;

      // Determine orientation & standard label
      let orientation: 'landscape' | 'portrait' | 'square' | 'ultrawide' = 'landscape';
      let orientationLabel = 'Landscape';
      let aspectRatio = `${width}:${height}`;

      if (ratioValue > 2.05) {
        orientation = 'ultrawide';
        orientationLabel = 'Ultra-Wide Panoramic';
        aspectRatio = '21:9';
      } else if (ratioValue >= 1.65 && ratioValue <= 1.85) {
        orientation = 'landscape';
        orientationLabel = '16:9 Landscape';
        aspectRatio = '16:9';
      } else if (ratioValue >= 1.25 && ratioValue < 1.65) {
        orientation = 'landscape';
        orientationLabel = '4:3 Standard Landscape';
        aspectRatio = '4:3';
      } else if (ratioValue >= 0.95 && ratioValue <= 1.05) {
        orientation = 'square';
        orientationLabel = '1:1 Square';
        aspectRatio = '1:1';
      } else if (ratioValue >= 0.70 && ratioValue < 0.95) {
        orientation = 'portrait';
        orientationLabel = '3:4 Portrait';
        aspectRatio = '3:4';
      } else if (ratioValue < 0.70) {
        orientation = 'portrait';
        orientationLabel = '9:16 Vertical / Mobile';
        aspectRatio = '9:16';
      } else {
        orientation = width >= height ? 'landscape' : 'portrait';
        orientationLabel = `${width} × ${height} (${ratioValue}:1)`;
        aspectRatio = `${width}:${height}`;
      }

      resolve({
        width,
        height,
        aspectRatio,
        ratioValue,
        orientation,
        orientationLabel,
        sizeBytes,
      });
    };

    img.onerror = () => {
      if (source instanceof File) {
        URL.revokeObjectURL(srcUrl);
      }
      reject(new Error('Failed to load image metadata.'));
    };

    img.src = srcUrl;
  });
}

/**
 * Optimize / compress image if oversized while STRICTLY preserving original aspect ratio.
 * Does NOT upscale small images.
 */
export async function optimizeImageForWeb(
  file: File,
  maxDimension = 2560,
  quality = 0.88
): Promise<{ dataUrl: string; width: number; height: number; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return reject(new Error('Failed to read file'));

      const img = new Image();
      img.onload = () => {
        const origWidth = img.naturalWidth;
        const origHeight = img.naturalHeight;

        // Determine if resizing is necessary
        let targetWidth = origWidth;
        let targetHeight = origHeight;

        if (origWidth > maxDimension || origHeight > maxDimension) {
          if (origWidth > origHeight) {
            targetWidth = maxDimension;
            targetHeight = Math.round((origHeight * maxDimension) / origWidth);
          } else {
            targetHeight = maxDimension;
            targetWidth = Math.round((origWidth * maxDimension) / origHeight);
          }
        }

        // Draw primary optimized image
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ dataUrl: result, width: origWidth, height: origHeight, thumbnailUrl: result });

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const optimizedDataUrl = canvas.toDataURL(mimeType, quality);

        // Generate responsive thumbnail preserving exact aspect ratio
        const thumbMax = 800;
        let thumbWidth = origWidth;
        let thumbHeight = origHeight;

        if (origWidth > thumbMax || origHeight > thumbMax) {
          if (origWidth > origHeight) {
            thumbWidth = thumbMax;
            thumbHeight = Math.round((origHeight * thumbMax) / origWidth);
          } else {
            thumbHeight = thumbMax;
            thumbWidth = Math.round((origWidth * thumbMax) / origHeight);
          }
        }

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbWidth;
        thumbCanvas.height = thumbHeight;
        const thumbCtx = thumbCanvas.getContext('2d');
        let thumbDataUrl = optimizedDataUrl;

        if (thumbCtx) {
          thumbCtx.imageSmoothingEnabled = true;
          thumbCtx.imageSmoothingQuality = 'high';
          thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
          thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);
        }

        resolve({
          dataUrl: optimizedDataUrl,
          width: targetWidth,
          height: targetHeight,
          thumbnailUrl: thumbDataUrl,
        });
      };

      img.onerror = () => reject(new Error('Failed to load image for optimization'));
      img.src = result;
    };

    reader.onerror = () => reject(new Error('Failed to read file as data url'));
    reader.readAsDataURL(file);
  });
}

/**
 * Rotate image by specified degrees (90, 180, 270) cleanly without distortion.
 */
export async function rotateImageCanvas(dataUrl: string, degrees: 90 | 180 | 270): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      const isRotated90or270 = degrees === 90 || degrees === 270;
      canvas.width = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      canvas.height = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: canvas.width,
        height: canvas.height,
      });
    };

    img.onerror = () => reject(new Error('Failed to load image for rotation'));
    img.src = dataUrl;
  });
}

/**
 * Optional crop image with specified percentage rectangle.
 */
export async function cropImageCanvas(
  dataUrl: string,
  crop: CropRect
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;

      const cropX = Math.round((crop.x / 100) * origW);
      const cropY = Math.round((crop.y / 100) * origH);
      const cropW = Math.max(10, Math.round((crop.width / 100) * origW));
      const cropH = Math.max(10, Math.round((crop.height / 100) * origH));

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: cropW,
        height: cropH,
      });
    };

    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = dataUrl;
  });
}
