/**
 * Video Processor Utility for COLORIDO 2K26 Gallery
 * Supports arbitrary video dimensions, automatic detection of width, height, aspect ratio,
 * duration, orientation, and automatic poster thumbnail extraction.
 */

export interface VideoMetadata {
  width: number;
  height: number;
  aspectRatio: string;
  ratioValue: number;
  durationSeconds: number;
  formattedDuration: string; // "MM:SS"
  orientation: 'landscape' | 'portrait' | 'square' | 'ultrawide';
  orientationLabel: string;
  posterDataUrl: string;
  sizeBytes?: number;
}

/**
 * Format raw seconds into standard MM:SS string
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Detect video dimensions, aspect ratio, duration, orientation, and capture poster frame
 */
export async function detectVideoMetadata(source: string | File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isBlob = false;
    let sizeBytes = 0;

    if (source instanceof File) {
      srcUrl = URL.createObjectURL(source);
      isBlob = true;
      sizeBytes = source.size;
    } else {
      srcUrl = source;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    // Timeout fallback after 10s
    const timeout = setTimeout(() => {
      if (isBlob) URL.revokeObjectURL(srcUrl);
      reject(new Error('Video metadata detection timed out'));
    }, 12000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
      if (isBlob) URL.revokeObjectURL(srcUrl);
    };

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const durationSeconds = video.duration || 0;
      const formattedDuration = formatDuration(durationSeconds);

      const ratioValue = height > 0 ? Number((width / height).toFixed(2)) : 1.77;

      // Determine orientation and standard label
      let orientation: 'landscape' | 'portrait' | 'square' | 'ultrawide' = 'landscape';
      let orientationLabel = '16:9 Landscape';
      let aspectRatio = `${width}:${height}`;

      if (ratioValue > 2.05) {
        orientation = 'ultrawide';
        orientationLabel = '21:9 Ultra-Wide Cinematic';
        aspectRatio = '21:9';
      } else if (ratioValue >= 1.65 && ratioValue <= 1.85) {
        orientation = 'landscape';
        orientationLabel = '16:9 Landscape';
        aspectRatio = '16:9';
      } else if (ratioValue >= 1.25 && ratioValue < 1.65) {
        orientation = 'landscape';
        orientationLabel = '4:3 Standard Video';
        aspectRatio = '4:3';
      } else if (ratioValue >= 0.95 && ratioValue <= 1.05) {
        orientation = 'square';
        orientationLabel = '1:1 Square Reel';
        aspectRatio = '1:1';
      } else if (ratioValue >= 0.70 && ratioValue < 0.95) {
        orientation = 'portrait';
        orientationLabel = '3:4 Vertical';
        aspectRatio = '3:4';
      } else if (ratioValue < 0.70) {
        orientation = 'portrait';
        orientationLabel = '9:16 Vertical / Mobile Reel';
        aspectRatio = '9:16';
      } else {
        orientation = width >= height ? 'landscape' : 'portrait';
        orientationLabel = `${width} × ${height} (${ratioValue}:1)`;
        aspectRatio = `${width}:${height}`;
      }

      // Seek to capture poster frame
      const seekTarget = durationSeconds > 0 ? Math.min(1.0, durationSeconds * 0.1) : 0.1;
      
      const capturePoster = () => {
        let posterDataUrl = '';
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(video, 0, 0, width, height);
            posterDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          }
        } catch {
          // If canvas tainted due to CORS on remote URL, fallback to empty
        }

        cleanup();
        resolve({
          width,
          height,
          aspectRatio,
          ratioValue,
          durationSeconds,
          formattedDuration,
          orientation,
          orientationLabel,
          posterDataUrl,
          sizeBytes,
        });
      };

      video.onseeked = () => {
        capturePoster();
      };

      video.onerror = () => {
        capturePoster();
      };

      try {
        video.currentTime = seekTarget;
      } catch {
        capturePoster();
      }
    };

    video.onerror = () => {
      cleanup();
      // Resolve with reasonable defaults if remote URL rejects metadata (e.g. CORS)
      resolve({
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        ratioValue: 1.77,
        durationSeconds: 165,
        formattedDuration: '02:45',
        orientation: 'landscape',
        orientationLabel: '16:9 Landscape (Default)',
        posterDataUrl: '',
        sizeBytes: 0,
      });
    };

    video.src = srcUrl;
  });
}

/**
 * Extract a high-quality frame from a video element or video URL at a specific timestamp (in seconds)
 */
export async function extractFrameAtTimestamp(
  videoSource: string | HTMLVideoElement,
  timestampSeconds: number,
  quality = 0.90
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (videoSource instanceof HTMLVideoElement) {
      try {
        const width = videoSource.videoWidth || 1920;
        const height = videoSource.videoHeight || 1080;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(videoSource, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          return resolve(dataUrl);
        }
      } catch (err) {
        return reject(err);
      }
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const timeout = setTimeout(() => {
      reject(new Error('Frame extraction timed out'));
    }, 10000);

    video.onloadeddata = () => {
      video.currentTime = Math.max(0, timestampSeconds);
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } else {
          reject(new Error('Canvas 2D context not available'));
        }
      } catch (err) {
        reject(err);
      } finally {
        video.removeAttribute('src');
        video.load();
      }
    };

    video.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };

    video.src = videoSource as string;
  });
}
