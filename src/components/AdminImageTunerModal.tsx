import React, { useState, useEffect, useRef } from 'react';
import {
  X, RotateCw, Crop, Target, Check, RefreshCw, Maximize2
} from 'lucide-react';
import {
  detectImageMetadata,
  rotateImageCanvas,
  cropImageCanvas,
  type ImageMetadata,
  type CropRect
} from '../utils/imageProcessor';

interface AdminImageTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  initialFocalPoint?: { x: number; y: number };
  onApply: (data: {
    url: string;
    width: number;
    height: number;
    aspectRatio: string;
    focalPoint: { x: number; y: number };
  }) => void;
}

export const AdminImageTunerModal: React.FC<AdminImageTunerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  initialFocalPoint = { x: 50, y: 50 },
  onApply,
}) => {
  const [currentUrl, setCurrentUrl] = useState(imageUrl);
  const [originalUrl, setOriginalUrl] = useState(imageUrl);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number }>(initialFocalPoint);

  // Rotation state
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Optional Crop State
  const [isCropEnabled, setIsCropEnabled] = useState<boolean>(false);
  const [cropPreset, setCropPreset] = useState<'ORIGINAL' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16' | 'FREE'>('ORIGINAL');
  const [cropRect, setCropRect] = useState<CropRect>({ x: 10, y: 10, width: 80, height: 80 });

  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Load and detect metadata whenever modal opens or currentUrl changes
  useEffect(() => {
    if (imageUrl) {
      setCurrentUrl(imageUrl);
      setOriginalUrl(imageUrl);
      setRotationDegrees(0);
      setIsCropEnabled(false);
      setCropPreset('ORIGINAL');
      setFocalPoint(initialFocalPoint || { x: 50, y: 50 });

      detectImageMetadata(imageUrl)
        .then((meta) => setMetadata(meta))
        .catch(() => {});
    }
  }, [imageUrl, isOpen]);

  if (!isOpen) return null;

  // Handle Focal Point click on image
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCropEnabled) return; // Don't move focal point while adjusting crop
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.min(100, Math.max(0, Math.round((clickX / rect.width) * 100)));
    const yPercent = Math.min(100, Math.max(0, Math.round((clickY / rect.height) * 100)));

    setFocalPoint({ x: xPercent, y: yPercent });
  };

  // Rotate image by 90 degrees clockwise
  const handleRotate = async () => {
    setIsProcessing(true);
    try {
      const nextDegrees = ((rotationDegrees + 90) % 360) as 90 | 180 | 270 | 0;
      if (nextDegrees === 0) {
        // Reset to original
        setCurrentUrl(originalUrl);
        setRotationDegrees(0);
        const meta = await detectImageMetadata(originalUrl);
        setMetadata(meta);
      } else {
        const rotated = await rotateImageCanvas(originalUrl, nextDegrees as 90 | 180 | 270);
        setCurrentUrl(rotated.dataUrl);
        setRotationDegrees(nextDegrees);
        const meta = await detectImageMetadata(rotated.dataUrl);
        setMetadata(meta);
      }
    } catch (err) {
      console.error('Rotation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to original full image
  const handleResetToOriginal = async () => {
    setIsProcessing(true);
    try {
      setCurrentUrl(originalUrl);
      setRotationDegrees(0);
      setIsCropEnabled(false);
      setCropPreset('ORIGINAL');
      setFocalPoint({ x: 50, y: 50 });
      const meta = await detectImageMetadata(originalUrl);
      setMetadata(meta);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply crop preset
  const handleSelectCropPreset = (preset: typeof cropPreset) => {
    setCropPreset(preset);
    if (preset === 'ORIGINAL') {
      setIsCropEnabled(false);
      return;
    }
    setIsCropEnabled(true);

    if (preset === '1:1') {
      setCropRect({ x: 15, y: 15, width: 70, height: 70 });
    } else if (preset === '16:9') {
      setCropRect({ x: 5, y: 22, width: 90, height: 50.6 });
    } else if (preset === '4:3') {
      setCropRect({ x: 10, y: 16, width: 80, height: 60 });
    } else if (preset === '3:4') {
      setCropRect({ x: 20, y: 10, width: 60, height: 80 });
    } else if (preset === '9:16') {
      setCropRect({ x: 28, y: 5, width: 44, height: 90 });
    } else {
      setCropRect({ x: 10, y: 10, width: 80, height: 80 });
    }
  };

  // Execute Crop onto canvas
  const handleExecuteCrop = async () => {
    if (!isCropEnabled) return;
    setIsProcessing(true);
    try {
      const cropped = await cropImageCanvas(currentUrl, cropRect);
      setCurrentUrl(cropped.dataUrl);
      setIsCropEnabled(false);
      setCropPreset('ORIGINAL');
      const meta = await detectImageMetadata(cropped.dataUrl);
      setMetadata(meta);
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save changes and return to manager
  const handleSaveAndApply = () => {
    if (!metadata) return;
    onApply({
      url: currentUrl,
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.aspectRatio,
      focalPoint,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-5xl bg-[#1C1917] rounded-3xl overflow-hidden border border-[#E5DFC9]/30 shadow-2xl flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#262220]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#800020] text-white">
              <Maximize2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-cinzel font-bold text-sm sm:text-base text-white">
                  IMAGE ASPECT RATIO &amp; TUNING STUDIO
                </h3>
                {metadata && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                    {metadata.orientationLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                Any aspect ratio accepted. Preserves natural dimensions with NO squashing or distortion.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Banner */}
        {metadata && (
          <div className="px-6 py-2.5 bg-black/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-stone-300">
            <div className="flex items-center space-x-4">
              <span>Dimensions: <strong className="text-white">{metadata.width} × {metadata.height} px</strong></span>
              <span>Ratio: <strong className="text-amber-400">{metadata.aspectRatio}</strong> ({metadata.ratioValue}:1)</span>
              <span>Focal Point: <strong className="text-emerald-400">X: {focalPoint.x}%, Y: {focalPoint.y}%</strong></span>
            </div>
            {rotationDegrees > 0 && (
              <span className="text-amber-400 font-bold">Rotated: {rotationDegrees}°</span>
            )}
          </div>
        )}

        {/* Studio Body: Canvas & Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left / Center: Interactive Image Canvas Frame */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-black/50 rounded-2xl p-3 border border-white/10 min-h-[380px] overflow-hidden relative">
            <div
              ref={imageContainerRef}
              onClick={handleImageClick}
              className="relative max-h-[55vh] max-w-full inline-block cursor-crosshair group rounded-xl overflow-hidden shadow-2xl"
              title="Click anywhere to set the responsive focal point marker"
            >
              {/* Natural aspect ratio image - strictly never distorted */}
              <img
                src={currentUrl}
                alt="Tuning preview"
                className="max-h-[55vh] max-w-full object-contain block transition-transform duration-200"
              />

              {/* Interactive Focal Point Reticle */}
              {!isCropEnabled && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
                  style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
                >
                  <div className="w-7 h-7 rounded-full border-2 border-emerald-400 bg-emerald-400/30 flex items-center justify-center shadow-lg animate-pulse">
                    <Target className="w-4 h-4 text-emerald-300" />
                  </div>
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-emerald-300 font-bold">
                    {focalPoint.x}%, {focalPoint.y}%
                  </span>
                </div>
              )}

              {/* Crop Box Overlay if Crop is Enabled */}
              {isCropEnabled && (
                <div
                  className="absolute border-2 border-dashed border-amber-400 bg-amber-400/15 pointer-events-none z-20 transition-all duration-200"
                  style={{
                    left: `${cropRect.x}%`,
                    top: `${cropRect.y}%`,
                    width: `${cropRect.width}%`,
                    height: `${cropRect.height}%`,
                  }}
                >
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-amber-300">
                    Crop Area: {cropPreset}
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] font-mono text-stone-400 mt-2 text-center">
              {isCropEnabled
                ? 'Select a crop preset from the panel on the right, then click "Apply Crop".'
                : '🎯 Click anywhere on the photograph to position the responsive focal point.'}
            </p>
          </div>

          {/* Right: Controls & Presets */}
          <div className="space-y-5 text-xs text-stone-200">

            {/* 1. Lossless Rotation Controls */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-white flex items-center space-x-1.5">
                <RotateCw className="w-4 h-4 text-amber-400" />
                <span>Lossless Image Rotation</span>
              </h4>
              <p className="text-[11px] text-stone-400">
                Fix orientation without losing quality or resolution.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRotate}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90°</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset All</span>
                </button>
              </div>
            </div>

            {/* 2. Optional Crop Controls */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-white flex items-center space-x-1.5">
                  <Crop className="w-4 h-4 text-amber-400" />
                  <span>Optional Crop Tool</span>
                </h4>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                  OPTIONAL
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                By default, photos retain their full original aspect ratio. Cropping is completely optional.
              </p>

              {/* Crop Preset Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { id: 'ORIGINAL', label: 'Full / None' },
                  { id: '1:1', label: '1:1 Square' },
                  { id: '4:3', label: '4:3 Standard' },
                  { id: '16:9', label: '16:9 Wide' },
                  { id: '3:4', label: '3:4 Portrait' },
                  { id: '9:16', label: '9:16 Vertical' },
                ].map((cp) => (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => handleSelectCropPreset(cp.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      cropPreset === cp.id
                        ? 'bg-[#800020] text-white border border-[#C5A059]'
                        : 'bg-white/10 text-stone-300 hover:bg-white/20'
                    }`}
                  >
                    {cp.label}
                  </button>
                ))}
              </div>

              {isCropEnabled && (
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <button
                    type="button"
                    onClick={handleExecuteCrop}
                    disabled={isProcessing}
                    className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply Selected Crop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCropEnabled(false);
                      setCropPreset('ORIGINAL');
                    }}
                    className="w-full py-1 text-[11px] text-stone-400 hover:text-white transition-colors"
                  >
                    Cancel Crop &amp; Keep Original
                  </button>
                </div>
              )}
            </div>

            {/* 3. Focal Point Explainer */}
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-[11px] text-emerald-200 space-y-1">
              <strong className="block font-bold text-white flex items-center space-x-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Responsive Focal Point Active</span>
              </strong>
              <span>
                Clicking on the image centers important subjects (e.g., players, faces, or instruments) when viewed on mobile screens.
              </span>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#262220] border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveAndApply}
            className="px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#660019] text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Gallery Item</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminImageTunerModal;
