import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Edit3, Sparkles, Film, Image as ImageIcon,
  RefreshCw, Check, X, Search, Play, Calendar, ShieldAlert,
  Eye, ArrowUp, ArrowDown, CheckCircle2, EyeOff, Layers, Upload,
  Star, ChevronLeft, ChevronRight, Sliders
} from 'lucide-react';
import type { MediaItem, MediaCategory, EventItem, MediaPhoto } from '../types';
import { apiService } from '../services/apiService';
import { AdminImageTunerModal } from './AdminImageTunerModal';
import { detectImageMetadata, optimizeImageForWeb } from '../utils/imageProcessor';
import { detectVideoMetadata, extractFrameAtTimestamp, formatDuration } from '../utils/videoProcessor';

const CATEGORIES: MediaCategory[] = [
  'SPORTS',
  'CULTURAL',
  'PERFORMANCES',
  'CAMPUS',
  'CEREMONIES',
  'AWARDS',
  'STUDENTS',
  'OTHER',
];

const PRESET_IMAGES = [
  { label: 'Inaugural Lamp Lighting', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=85', aspect: '16:9', category: 'CEREMONIES' },
  { label: 'Pro Kabaddi Raid Action', url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1920&q=85', aspect: '16:9', category: 'SPORTS' },
  { label: 'Classical Solo Bharatanatyam', url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=1200&q=85', aspect: '9:16', category: 'CULTURAL' },
  { label: 'Rock Concert Night Sparks', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=2400&q=85', aspect: '21:9', category: 'PERFORMANCES' },
  { label: 'Nukkad Natak Street Circle', url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=85', aspect: '1:1', category: 'CULTURAL' },
  { label: 'Championship Rolling Trophy', url: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?auto=format&fit=crop&w=1920&q=85', aspect: '16:9', category: 'AWARDS' },
  { label: 'Campus Aerial Sunburst', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2000&q=85', aspect: '16:9', category: 'CAMPUS' },
];

interface AdminMediaThumbnailProps {
  item: MediaItem;
  idx: number;
  sortBy: string;
  isCollection: boolean;
  photoCount: number;
  isHidden: boolean;
  onOpenPreview: () => void;
}

const AdminMediaThumbnail: React.FC<AdminMediaThumbnailProps> = ({
  item,
  idx,
  sortBy,
  isCollection,
  photoCount,
  isHidden,
  onOpenPreview,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isVideo = item.type === 'video';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
    }
  }, []);

  const handleMouseEnter = () => {
    if (!isVideo || !videoRef.current) return;
    try {
      videoRef.current.currentTime = 0;
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(() => {});
      }
    } catch {
      // Ignored
    }
  };

  const handleMouseLeave = () => {
    if (!isVideo || !videoRef.current) return;
    try {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    } catch {
      // Ignored
    }
    setIsPlaying(false);
  };

  return (
    <div
      onClick={onOpenPreview}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative h-48 bg-stone-900 overflow-hidden cursor-pointer"
    >
      <img
        src={item.coverPhoto || item.thumbnailUrl || item.url}
        alt={item.title}
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
          isVideo && isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {isVideo && (
        <video
          ref={videoRef}
          src={item.url}
          poster={item.coverPhoto || item.thumbnailUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isPlaying ? 'opacity-100 z-[5]' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25 pointer-events-none z-10" />

      {/* Badges Overlay */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-20 pointer-events-none">
        <span className="px-2 py-0.5 rounded-md bg-[#800020] text-white text-[9px] font-mono font-bold uppercase">
          {item.category}
        </span>

        {idx === 0 && sortBy === 'latest' && (
          <span className="px-2 py-0.5 rounded-md bg-[#C5A059] text-white text-[9px] font-mono font-bold uppercase">
            ● LATEST
          </span>
        )}

        {isCollection && (
          <span className="px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-xs text-white text-[9px] font-mono font-bold flex items-center space-x-1 border border-white/20">
            <Layers className="w-2.5 h-2.5 text-[#C5A059]" />
            <span>{photoCount} PHOTOS</span>
          </span>
        )}
      </div>

      {/* Published / Hidden Indicator */}
      <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-20 pointer-events-none">
        {isHidden ? (
          <span className="px-2 py-0.5 rounded-md bg-stone-800/90 text-stone-200 text-[9px] font-mono font-bold flex items-center space-x-1 border border-stone-600">
            <EyeOff className="w-2.5 h-2.5 text-amber-400" />
            <span>HIDDEN</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 text-[9px] font-mono font-bold flex items-center space-x-1 border border-emerald-500/40">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            <span>LIVE</span>
          </span>
        )}

        {isVideo && (
          <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono flex items-center space-x-1 transition-all ${
            isPlaying ? 'bg-emerald-600 text-white animate-pulse' : 'bg-black/70 text-white'
          }`}>
            <Play className="w-2.5 h-2.5 fill-white" />
            <span>{isPlaying ? 'PLAYING' : item.duration || '02:45'}</span>
          </span>
        )}
      </div>

      {/* Bottom Quick Caption on Image */}
      <div className="absolute bottom-2 left-3 right-3 text-white text-xs font-cinzel font-bold truncate z-20 pointer-events-none">
        {item.title}
      </div>
    </div>
  );
};

export const AdminGalleryManager: React.FC = () => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PHOTOS' | 'VIDEOS' | 'HIGHLIGHTS'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'title_asc' | 'title_desc'>('latest');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<'photo' | 'video'>('photo');
  const [isCollectionMode, setIsCollectionMode] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<string>('SPORTS');
  const [formEventId, setFormEventId] = useState('');
  const [formEventTitle, setFormEventTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('2026-09-26');
  const [formLocation, setFormLocation] = useState('R.V.R. & J.C. Campus');
  const [formAspectRatio, setFormAspectRatio] = useState('16:9');
  const [formDuration, setFormDuration] = useState('02:45');
  const [formPublished, setFormPublished] = useState(true);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPhotos, setFormPhotos] = useState<MediaPhoto[]>([]);
  const [tuningTargetPhotoIdx, setTuningTargetPhotoIdx] = useState<number | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Image Dimension Detection & Tuning Studio States
  const [formWidth, setFormWidth] = useState<number>(1920);
  const [formHeight, setFormHeight] = useState<number>(1080);
  const [formFocalPoint, setFormFocalPoint] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [detectedRatioLabel, setDetectedRatioLabel] = useState<string>('Auto-Detected (Natural)');
  const [showTunerModal, setShowTunerModal] = useState<boolean>(false);
  // Video Cover Studio States
  const [coverSource, setCoverSource] = useState<'uploaded' | 'video-frame' | 'default'>('default');
  const [coverTab, setCoverTab] = useState<'frame' | 'upload'>('frame');
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>(60);
  const [frameScrubTime, setFrameScrubTime] = useState<number>(0);
  const [isExtractingFrame, setIsExtractingFrame] = useState<boolean>(false);
  const [defaultExtractedFrame, setDefaultExtractedFrame] = useState<string>('');
  const [frameFeedback, setFrameFeedback] = useState<string>('');
  const [showCoverPreviewModal, setShowCoverPreviewModal] = useState<boolean>(false);
  const [adminPreviewPlayingVideo, setAdminPreviewPlayingVideo] = useState<boolean>(false);
  const videoScrubRef = useRef<HTMLVideoElement>(null);

  // Temporary input for adding photo to collection
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState('');
  const [newPhotoCaptionInput, setNewPhotoCaptionInput] = useState('');

  // Preview Carousel Index for Collection
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      // Include hidden media so admin sees everything
      const items = await apiService.getMedia({ includeHidden: true, sort: sortBy });
      setMediaList(items);
    } catch (err) {
      console.error('Failed to load media in admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const evts = await apiService.getEvents();
      setEventsList(evts);
    } catch {
      // Handled
    }
  };

  useEffect(() => {
    fetchMedia();
    fetchEvents();
  }, [sortBy]);

  // Reset form
  const resetForm = (item?: MediaItem) => {
    if (item) {
      setEditingItem(item);
      setFormType(item.type);
      const hasMultiplePhotos = Boolean(item.photos && item.photos.length > 1);
      setIsCollectionMode(hasMultiplePhotos);
      setFormTitle(item.title);
      setFormCategory(item.category);
      setFormEventId(item.eventId || '');
      setFormEventTitle(item.eventTitle || '');
      setFormUrl(item.url);
      setFormThumbnailUrl(item.thumbnailUrl || item.coverPhoto || (item.type === 'video' ? '' : item.url));
      setCoverPhotoUrl(item.coverPhoto || item.thumbnailUrl || (item.type === 'video' ? '' : item.url));
      setFormDescription(item.description || '');
      setFormDate(item.createdAt ? item.createdAt.substring(0, 10) : '2026-09-26');
      setFormLocation(item.location || 'R.V.R. & J.C. Campus');
      setFormWidth(item.width || 1920);
      setFormHeight(item.height || 1080);
      setFormFocalPoint(item.focalPoint || { x: 50, y: 50 });
      setFormAspectRatio(item.aspectRatio || '16:9');
      setDetectedRatioLabel(item.width && item.height ? `${item.width} × ${item.height} (${item.aspectRatio || 'Natural'})` : 'Auto-Detected');
      setFormDuration(item.duration ? String(item.duration) : '02:45');
      setFormPublished(item.published !== false);
      setFormFeatured(Boolean(item.featured));
      setCoverSource((item.coverSource as any) || (item.type === 'video' ? 'video-frame' : 'default'));
      setCoverTab(item.coverSource === 'uploaded' ? 'upload' : 'frame');
      setFrameFeedback('');
      setFormPhotos(item.photos ? [...item.photos] : [{
        id: `p-${Date.now()}`,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl || item.url,
        caption: item.title,
        order: 0,
      }]);
    } else {
      setEditingItem(null);
      setFormType('photo');
      setIsCollectionMode(false);
      setFormTitle('');
      setFormCategory('SPORTS');
      setFormEventId('');
      setFormEventTitle('');
      setFormUrl('https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1920&q=85');
      setFormThumbnailUrl('');
      setCoverPhotoUrl('');
      setCoverSource('video-frame');
      setCoverTab('frame');
      setFrameScrubTime(0);
      setVideoDurationSeconds(60);
      setDefaultExtractedFrame('');
      setFrameFeedback('');
      setFormDescription('');
      setFormDate(new Date().toISOString().substring(0, 10));
      setFormLocation('R.V.R. & J.C. Campus');
      setFormWidth(1920);
      setFormHeight(1080);
      setFormFocalPoint({ x: 50, y: 50 });
      setFormAspectRatio('16:9');
      setDetectedRatioLabel('1920 × 1080 (16:9 Landscape)');
      setFormDuration('02:45');
      setFormPublished(true);
      setFormFeatured(false);
      setFormPhotos([]);
    }
    setNewPhotoUrlInput('');
    setNewPhotoCaptionInput('');
    setFormError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (item: MediaItem) => {
    resetForm(item);
    setShowModal(true);
  };

  // Add a photo to current collection
  const handleAddPhotoToCollection = () => {
    if (!newPhotoUrlInput.trim()) return;
    const newP: MediaPhoto = {
      id: `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      url: newPhotoUrlInput.trim(),
      thumbnailUrl: newPhotoUrlInput.trim(),
      caption: newPhotoCaptionInput.trim(),
      order: formPhotos.length,
    };
    const updated = [...formPhotos, newP];
    setFormPhotos(updated);
    if (!coverPhotoUrl) {
      setCoverPhotoUrl(newP.url);
    }
    setNewPhotoUrlInput('');
    setNewPhotoCaptionInput('');
  };

  // Auto-detect image or video metadata when URL changes
  const handleUrlChange = async (url: string) => {
    setFormUrl(url);
    if (!url.trim()) return;
    if (formType === 'photo') {
      try {
        const meta = await detectImageMetadata(url);
        setFormWidth(meta.width);
        setFormHeight(meta.height);
        setFormAspectRatio(meta.aspectRatio);
        setDetectedRatioLabel(`${meta.width} × ${meta.height} (${meta.orientationLabel})`);
      } catch {
        // Remote image might not allow crossOrigin, keep existing
      }
    } else if (formType === 'video') {
      try {
        const meta = await detectVideoMetadata(url);
        setFormWidth(meta.width);
        setFormHeight(meta.height);
        setFormDuration(meta.formattedDuration);
        setFormAspectRatio(meta.aspectRatio);
        setDetectedRatioLabel(`${meta.width} × ${meta.height} (${meta.orientationLabel})`);
        if (meta.posterDataUrl && !coverPhotoUrl) {
          setCoverPhotoUrl(meta.posterDataUrl);
          setFormThumbnailUrl(meta.posterDataUrl);
        }
      } catch {
        // Remote video might not allow CORS metadata, keep existing
      }
    }
  };

  // Handle local video file upload with automatic dimension, aspect ratio & poster detection
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const meta = await detectVideoMetadata(file);
      const videoBlobUrl = URL.createObjectURL(file);
      setFormUrl(videoBlobUrl);
      setFormWidth(meta.width);
      setFormHeight(meta.height);
      setFormDuration(meta.formattedDuration);
      setFormAspectRatio(meta.aspectRatio);
      setDetectedRatioLabel(`${meta.width} × ${meta.height} (${meta.orientationLabel})`);
      if (meta.posterDataUrl) {
        setCoverPhotoUrl(meta.posterDataUrl);
        setFormThumbnailUrl(meta.posterDataUrl);
      }
    } catch (err) {
      console.error('Failed to detect video metadata:', err);
    }
  };

  // Requirement 7: Remove custom cover and automatically generate/use a reasonable video-frame thumbnail
  const handleRemoveCustomCover = async () => {
    setIsExtractingFrame(true);
    setFrameFeedback('Extracting video frame thumbnail...');
    try {
      let frameData = defaultExtractedFrame;
      if (!frameData && formUrl) {
        if (videoScrubRef.current && videoScrubRef.current.readyState >= 2) {
          frameData = await extractFrameAtTimestamp(videoScrubRef.current, frameScrubTime || 0.5);
        } else {
          try {
            const meta = await detectVideoMetadata(formUrl);
            frameData = meta.posterDataUrl || '';
          } catch {
            frameData = await extractFrameAtTimestamp(formUrl, 0.5);
          }
        }
      }

      if (frameData) {
        setCoverPhotoUrl(frameData);
        setFormThumbnailUrl(frameData);
        setDefaultExtractedFrame(frameData);
        setCoverSource('video-frame');
        setCoverTab('frame');
        setFrameFeedback('✓ Custom cover removed. Restored automatic video frame.');
      } else {
        const defaultPoster = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=85';
        setCoverPhotoUrl(defaultPoster);
        setFormThumbnailUrl(defaultPoster);
        setCoverSource('video-frame');
        setCoverTab('frame');
        setFrameFeedback('✓ Restored default video frame thumbnail.');
      }
    } catch (err) {
      console.error('Failed to extract video frame on cover removal:', err);
      setCoverSource('video-frame');
      setCoverTab('frame');
      setFrameFeedback('✓ Reverted to video frame thumbnail.');
    } finally {
      setIsExtractingFrame(false);
      setTimeout(() => setFrameFeedback(''), 4000);
    }
  };

  // Handle local file uploads for photos with natural dimension detection and non-destructive web optimization
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      try {
        const optimized = await optimizeImageForWeb(file);
        const meta = await detectImageMetadata(optimized.dataUrl);

        if (!isCollectionMode && index === 0 && files.length === 1) {
          setFormUrl(optimized.dataUrl);
          setCoverPhotoUrl(optimized.dataUrl);
          setFormThumbnailUrl(optimized.thumbnailUrl);
          setFormWidth(meta.width);
          setFormHeight(meta.height);
          setFormAspectRatio(meta.aspectRatio);
          setDetectedRatioLabel(`${meta.width} × ${meta.height} (${meta.orientationLabel})`);
        } else {
          setIsCollectionMode(true);
          const newPhoto: MediaPhoto = {
            id: `p-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
            url: optimized.dataUrl,
            thumbnailUrl: optimized.thumbnailUrl,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            order: formPhotos.length + index,
            width: meta.width,
            height: meta.height,
            aspectRatio: meta.aspectRatio,
            focalPoint: { x: 50, y: 50 },
          };
          setFormPhotos(prev => {
            const next = [...prev, newPhoto];
            if (prev.length === 0) {
              setCoverPhotoUrl(optimized.dataUrl);
              setFormUrl(optimized.dataUrl);
              setFormThumbnailUrl(optimized.thumbnailUrl);
              setFormWidth(meta.width);
              setFormHeight(meta.height);
              setFormAspectRatio(meta.aspectRatio);
              setDetectedRatioLabel(`${meta.width} × ${meta.height} (${meta.orientationLabel})`);
            }
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to process image file:', err);
      }
    }
  };

  // Move photo inside collection
  const moveCollectionPhoto = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formPhotos.length) return;
    const reordered = [...formPhotos];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const withOrder = reordered.map((p, idx) => ({ ...p, order: idx }));
    setFormPhotos(withOrder);
  };

  // Remove photo from collection
  const removeCollectionPhoto = (index: number) => {
    const updated = formPhotos.filter((_, idx) => idx !== index).map((p, idx) => ({ ...p, order: idx }));
    setFormPhotos(updated);
    if (coverPhotoUrl === formPhotos[index]?.url && updated.length > 0) {
      setCoverPhotoUrl(updated[0].url);
    }
  };

  // Save Media (Create / Update)
  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Please enter a title for the media item.');
      return;
    }

    const primaryUrl = isCollectionMode && formPhotos.length > 0
      ? (coverPhotoUrl || formPhotos[0].url)
      : formUrl.trim();

    if (!primaryUrl) {
      setFormError('Please provide at least one photo or media URL.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const selectedEvent = eventsList.find(ev => ev.id === formEventId);
      const eventTitleToSave = selectedEvent ? selectedEvent.title : formEventTitle;

      const videoCoverDefault = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=85';
      const resolvedCover = formType === 'video'
        ? (coverPhotoUrl.trim() || formThumbnailUrl.trim() || videoCoverDefault)
        : (coverPhotoUrl.trim() || primaryUrl);

      const payload: Partial<MediaItem> = {
        type: formType,
        title: formTitle.trim(),
        category: formCategory.toUpperCase().trim(),
        eventId: formEventId,
        eventTitle: eventTitleToSave,
        url: primaryUrl,
        coverPhoto: resolvedCover,
        thumbnailUrl: formType === 'video' ? resolvedCover : (formThumbnailUrl.trim() || resolvedCover),
        photos: isCollectionMode && formPhotos.length > 0 ? formPhotos : undefined,
        description: formDescription.trim(),
        location: formLocation.trim(),
        width: formWidth,
        height: formHeight,
        videoWidth: formWidth,
        videoHeight: formHeight,
        coverSource: formType === 'video' && coverSource !== 'default' ? coverSource : undefined,
        aspectRatio: formAspectRatio,
        focalPoint: formFocalPoint,
        duration: formType === 'video' ? formDuration : null,
        published: formPublished,
        featured: formFeatured,
        createdAt: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
      };

      if (editingItem) {
        await apiService.updateMedia(editingItem.id, payload);
      } else {
        await apiService.createMedia(payload);
      }

      await fetchMedia();
      setShowModal(false);
    } catch {
      setFormError('Failed to save media item. Please check network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // One-click Publish / Hide Toggle
  const handleTogglePublish = async (item: MediaItem) => {
    const updated = await apiService.togglePublishMedia(item.id, !item.published);
    if (updated) {
      setMediaList(prev => prev.map(m => m.id === item.id ? { ...m, published: updated.published } : m));
      if (previewItem?.id === item.id) {
        setPreviewItem(prev => prev ? { ...prev, published: updated.published } : null);
      }
    }
  };

  // One-click Featured / Highlight Toggle
  const handleToggleFeatured = async (item: MediaItem) => {
    const updated = await apiService.toggleFeaturedMedia(item.id, !item.featured);
    if (updated) {
      setMediaList(prev => prev.map(m => m.id === item.id ? { ...m, featured: updated.featured } : m));
      if (previewItem?.id === item.id) {
        setPreviewItem(prev => prev ? { ...prev, featured: updated.featured } : null);
      }
    }
  };

  // Reorder Highlights
  const handleReorderHighlights = async (index: number, direction: 'up' | 'down') => {
    const highlighted = mediaList.filter(m => m.featured);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= highlighted.length) return;

    const copy = [...highlighted];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    const orders = copy.map((m, idx) => ({ id: m.id, order: idx }));
    await apiService.reorderHighlights(orders);
    await fetchMedia();
  };

  // Delete Media
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const ok = await apiService.deleteMedia(itemToDelete.id);
    if (ok) {
      setMediaList(prev => prev.filter(m => m.id !== itemToDelete.id));
      if (previewItem?.id === itemToDelete.id) {
        setPreviewItem(null);
      }
      setItemToDelete(null);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (item: MediaItem) => {
    setPreviewItem(item);
    setPreviewPhotoIndex(0);
  };

  // Filtered & Searched List
  const filteredList = mediaList.filter(item => {
    if (typeFilter === 'PHOTOS' && item.type !== 'photo') return false;
    if (typeFilter === 'VIDEOS' && item.type !== 'video') return false;
    if (typeFilter === 'HIGHLIGHTS' && !item.featured) return false;
    if (categoryFilter !== 'ALL' && item.category.toUpperCase() !== categoryFilter.toUpperCase()) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        (item.eventTitle && item.eventTitle.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.createdAt && item.createdAt.substring(0, 10).includes(q));
      if (!match) return false;
    }
    return true;
  });

  const featuredItems = mediaList.filter(m => m.featured);
  const publishedCount = mediaList.filter(m => m.published !== false).length;
  const hiddenCount = mediaList.filter(m => m.published === false).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Top Banner & Control Status */}
      <div className="bg-white border border-stone-200 rounded-md p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#800020] text-white text-[10px] font-semibold uppercase tracking-wider">
              Secretariat Gallery Manager
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
              <span>{publishedCount} Published</span>
            </span>
            {hiddenCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-300 text-[10px] font-semibold flex items-center space-x-1">
                <EyeOff className="w-2.5 h-2.5 text-stone-500" />
                <span>{hiddenCount} Hidden</span>
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold flex items-center space-x-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
              <span>{featuredItems.length} Highlights</span>
            </span>
          </div>
          <h2 className="font-bold text-lg text-stone-900">
            Festival Media Manager
          </h2>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Upload photos, multi-photo collections, and videos with custom cover frames. Control publish states, featured highlight priority, and media metadata.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={fetchMedia}
            className="h-8 px-2.5 rounded bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="h-8 px-3 rounded bg-[#800020] hover:bg-[#660019] text-white font-medium text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Media</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Sorting Bar */}
      <div className="bg-white border border-stone-200 p-3.5 rounded-md space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">

          {/* Main Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-bold uppercase pb-1 lg:pb-0">
            {(['ALL', 'PHOTOS', 'VIDEOS', 'HIGHLIGHTS'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-1.5 shrink-0 ${typeFilter === t
                    ? 'bg-[#121212] text-white shadow-sm'
                    : 'bg-[#FAF9F6] text-[#666461] hover:text-[#121212]'
                  }`}
              >
                {t === 'HIGHLIGHTS' && <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />}
                {t === 'PHOTOS' && <ImageIcon className="w-3.5 h-3.5" />}
                {t === 'VIDEOS' && <Film className="w-3.5 h-3.5" />}
                <span>{t}</span>
              </button>
            ))}
          </div>

          {/* Controls: Category & Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-bold text-[#121212] outline-none"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-bold text-[#121212] outline-none"
            >
              <option value="latest">Latest First (Default)</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title A-Z</option>
              <option value="title_desc">Title Z-A</option>
            </select>
          </div>

        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#666461] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search gallery by title, category, event name, date (YYYY-MM-DD), or arena..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-medium outline-none focus:border-[#800020]"
          />
        </div>
      </div>

      {/* HIGHLIGHT ORDERING MANAGEMENT (Displayed prominently when HIGHLIGHTS filter is active) */}
      {typeFilter === 'HIGHLIGHTS' && featuredItems.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase">
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>COLORIDO HIGHLIGHTS SEQUENCER ({featuredItems.length} ITEMS)</span>
            </div>
            <span className="text-[11px] font-mono text-amber-800">
              Use arrows to set order shown on the public highlights carousel
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredItems.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white border border-amber-200 rounded-2xl p-3 flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <img
                    src={item.coverPhoto || item.thumbnailUrl || item.url}
                    alt={item.title}
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#121212] truncate">{item.title}</p>
                    <span className="text-[10px] text-amber-700 font-mono">{item.category}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleReorderHighlights(idx, 'up')}
                    className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-[#121212]"
                    title="Move earlier in Highlights"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === featuredItems.length - 1}
                    onClick={() => handleReorderHighlights(idx, 'down')}
                    className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-[#121212]"
                    title="Move later in Highlights"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredList.map((item, idx) => {
          const isCollection = Boolean(item.photos && item.photos.length > 1);
          const photoCount = isCollection ? item.photos!.length : 1;
          const isHidden = item.published === false;

          return (
            <div
              key={item.id}
              className={`group bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between ${isHidden ? 'border-dashed border-stone-300 opacity-90' : 'border-[#E5E2DC]'
                }`}
            >
              {/* Thumbnail Header Frame */}
              <AdminMediaThumbnail
                item={item}
                idx={idx}
                sortBy={sortBy}
                isCollection={isCollection}
                photoCount={photoCount}
                isHidden={isHidden}
                onOpenPreview={() => handleOpenPreview(item)}
              />

              {/* Body Info */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#666461]">
                    <div className="flex items-center space-x-1 truncate max-w-[65%]">
                      <Calendar className="w-3 h-3 text-[#C5A059] shrink-0" />
                      <span>{new Date(item.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {item.eventTitle && (
                      <span className="text-[#800020] font-bold truncate max-w-[35%]" title={item.eventTitle}>
                        {item.eventTitle}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#666461] line-clamp-2 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>
                </div>

                {/* Card Actions Row: Preview, Publish/Hide, Highlight, Edit, Delete */}
                <div className="pt-3 border-t border-[#E5E2DC] flex items-center justify-between gap-1.5">
                  {/* Highlight Toggle Button */}
                  <button
                    onClick={() => handleToggleFeatured(item)}
                    className={`px-2 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 transition-all ${item.featured
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-[#FAF9F6] text-[#666461] hover:text-[#800020] border border-[#E5E2DC]'
                      }`}
                    title={item.featured ? 'Remove from Highlights' : 'Add to COLORIDO Highlights'}
                  >
                    <Star className={`w-3 h-3 ${item.featured ? 'text-amber-600 fill-amber-500' : 'text-[#666461]'}`} />
                    <span>{item.featured ? 'HIGHLIGHT' : 'FEATURE'}</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {/* Publish / Hide toggle */}
                    <button
                      onClick={() => handleTogglePublish(item)}
                      className={`p-2 rounded-xl transition-colors ${item.published !== false
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                        }`}
                      title={item.published !== false ? 'Hide from public gallery' : 'Publish to public gallery'}
                    >
                      {item.published !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Preview Button */}
                    <button
                      onClick={() => handleOpenPreview(item)}
                      className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#E5E2DC] text-[#666461] hover:text-[#121212] transition-colors"
                      title="Preview Media"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 rounded-xl bg-[#FAF9F6] hover:bg-[#E5E2DC] text-[#666461] hover:text-[#121212] transition-colors"
                      title="Edit Media Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                      title="Delete Media"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {filteredList.length === 0 && (
        <div className="text-center py-16 bg-white border border-[#E5E2DC] rounded-3xl p-8 space-y-3">
          <Layers className="w-10 h-10 text-[#C5A059] mx-auto opacity-70" />
          <h4 className="font-editorial font-bold text-lg text-[#121212]">No Media Records Found</h4>
          <p className="text-xs text-[#666461]">Try adjusting your search criteria or upload a new photo, collection, or video.</p>
        </div>
      )}

      {/* ============================================================== */}
      {/* CREATE / EDIT MODAL                                            */}
      {/* ============================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E5E2DC] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">

            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#800020] tracking-wider block">
                  MEDIA MANAGEMENT PIPELINE
                </span>
                <h3 className="font-editorial font-bold text-xl text-[#121212]">
                  {editingItem ? 'Edit Media / Collection' : 'Upload Photos, Video or Multi-Photo Collection'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-[#666461]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMedia} className="space-y-5 text-xs font-sans">

              {/* Type Switcher: Single Photo vs Collection vs Video */}
              <div>
                <label className="block font-bold text-[#121212] mb-1.5 uppercase">Media Format</label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => { setFormType('photo'); setIsCollectionMode(false); }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all ${formType === 'photo' && !isCollectionMode
                        ? 'bg-[#800020] text-white border-[#800020]'
                        : 'bg-[#FAF9F6] text-[#666461] border-[#E5E2DC]'
                      }`}
                  >
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    <span>Single Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormType('photo'); setIsCollectionMode(true); }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all ${formType === 'photo' && isCollectionMode
                        ? 'bg-[#800020] text-white border-[#800020]'
                        : 'bg-[#FAF9F6] text-[#666461] border-[#E5E2DC]'
                      }`}
                  >
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>Photo Collection</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormType('video'); setIsCollectionMode(false); }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all ${formType === 'video'
                        ? 'bg-[#800020] text-white border-[#800020]'
                        : 'bg-[#FAF9F6] text-[#666461] border-[#E5E2DC]'
                      }`}
                  >
                    <Film className="w-4 h-4 shrink-0" />
                    <span>Cinematic Video</span>
                  </button>
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#121212] mb-1.5 uppercase">Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Football Finals or Pro Kabaddi Raid"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-medium outline-none focus:border-[#800020]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#121212] mb-1.5 uppercase">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-bold text-[#121212] outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Associated Event Selector (Populated from live events) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#121212] mb-1.5 uppercase">Festival Event (Optional)</label>
                  <select
                    value={formEventId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setFormEventId(id);
                      const evt = eventsList.find(x => x.id === id);
                      if (evt) {
                        setFormEventTitle(evt.title);
                        if (!formLocation || formLocation === 'R.V.R. & J.C. Campus') {
                          setFormLocation(evt.venueName || 'R.V.R. & J.C. Campus');
                        }
                      } else {
                        setFormEventTitle('');
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-medium text-[#121212] outline-none"
                  >
                    <option value="">No specific event (General festival memory)</option>
                    {eventsList.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.type === 'sports' ? '⚽' : '🎭'} {ev.title} ({ev.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#121212] mb-1.5 uppercase">Event Title Override</label>
                  <input
                    type="text"
                    value={formEventTitle}
                    onChange={(e) => setFormEventTitle(e.target.value)}
                    placeholder="Auto-filled from event or enter custom"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-medium outline-none"
                  />
                </div>
              </div>

              {/* MULTI-PHOTO COLLECTION BUILDER */}
              {isCollectionMode && formType === 'photo' && (
                <div className="bg-[#FAF9F6] border border-[#E5E2DC] rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs uppercase text-[#121212] flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-[#800020]" />
                        <span>Collection Photos ({formPhotos.length})</span>
                      </h4>
                      <p className="text-[11px] text-[#666461]">
                        Uploaded photos appear inside ONE card with a carousel. Reorder photos or click a star to set cover.
                      </p>
                    </div>

                    <label className="px-3 py-2 rounded-xl bg-white border border-[#E5E2DC] hover:border-[#800020] text-[#121212] font-bold text-[11px] flex items-center space-x-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 text-[#800020]" />
                      <span>Upload Multiple Files</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Add URL Manually to collection */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="url"
                      value={newPhotoUrlInput}
                      onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                      placeholder="Or enter image URL (https://images.unsplash.com/...)"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#E5E2DC] text-xs font-mono outline-none"
                    />
                    <input
                      type="text"
                      value={newPhotoCaptionInput}
                      onChange={(e) => setNewPhotoCaptionInput(e.target.value)}
                      placeholder="Caption (optional)"
                      className="sm:w-48 px-3 py-2 rounded-xl bg-white border border-[#E5E2DC] text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPhotoToCollection}
                      className="px-4 py-2 rounded-xl bg-[#121212] hover:bg-black text-white font-bold text-xs shrink-0"
                    >
                      + Add Photo
                    </button>
                  </div>

                  {/* Photos List with Reordering & Cover Selector */}
                  {formPhotos.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {formPhotos.map((photo, idx) => {
                        const isCover = (coverPhotoUrl || formPhotos[0]?.url) === photo.url;
                        return (
                          <div
                            key={photo.id || idx}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isCover ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-[#E5E2DC]'
                              }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-stone-100 text-[#666461] font-mono text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <img
                                src={photo.url}
                                alt={photo.caption || `Photo ${idx + 1}`}
                                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-stone-200"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[#121212] truncate">
                                  {photo.caption || `Photo ${idx + 1}`}
                                </p>
                                <span className="text-[10px] font-mono text-[#666461] truncate block max-w-xs">
                                  {photo.url.substring(0, 45)}...
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                              {/* Tune / Focal Point / Crop Photo */}
                              <button
                                type="button"
                                onClick={() => {
                                  setTuningTargetPhotoIdx(idx);
                                  setShowTunerModal(true);
                                }}
                                className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 bg-stone-100 text-stone-700 hover:bg-[#800020] hover:text-white transition-colors"
                                title="Adjust focal point, rotate or crop this photo"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>TUNE</span>
                              </button>

                              {/* Set as Cover */}
                              <button
                                type="button"
                                onClick={() => setCoverPhotoUrl(photo.url)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 transition-colors ${isCover
                                    ? 'bg-amber-200 text-amber-900 border border-amber-400'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                  }`}
                                title="Set as card cover photograph"
                              >
                                <Star className={`w-3 h-3 ${isCover ? 'fill-amber-600 text-amber-600' : ''}`} />
                                <span>{isCover ? 'COVER' : 'MAKE COVER'}</span>
                              </button>

                              {/* Reorder Buttons */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveCollectionPhoto(idx, 'up')}
                                className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30"
                                title="Move up in carousel"
                              >
                                <ArrowUp className="w-3 h-3 text-[#121212]" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === formPhotos.length - 1}
                                onClick={() => moveCollectionPhoto(idx, 'down')}
                                className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30"
                                title="Move down in carousel"
                              >
                                <ArrowDown className="w-3 h-3 text-[#121212]" />
                              </button>

                              {/* Remove Photo */}
                              <button
                                type="button"
                                onClick={() => removeCollectionPhoto(idx)}
                                className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                                title="Remove photo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-xs text-[#666461] italic">
                      No photos added yet. Upload files above or add image URLs.
                    </p>
                  )}
                </div>
              )}

              {/* SINGLE PHOTO / VIDEO URL INPUT */}
              {(!isCollectionMode || formType === 'video') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-[#121212] uppercase">
                      {formType === 'video' ? 'Video File / Stream URL *' : 'Image URL or Upload *'}
                    </label>

                    {formType === 'photo' ? (
                      <label className="text-[11px] font-bold text-[#800020] flex items-center space-x-1 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>Choose Local Photo</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <label className="text-[11px] font-bold text-[#800020] flex items-center space-x-1 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>Upload Video File (Any Dimensions)</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v"
                          onChange={handleVideoFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <input
                    type="url"
                    required={!isCollectionMode}
                    value={formUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder={formType === 'video' ? 'https://...video.mp4 or upload a video file above' : 'https://images.unsplash.com/...'}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-mono outline-none focus:border-[#800020]"
                  />

                  {/* Dimension, Aspect Ratio & Duration Toolbar for Video */}
                  {formType === 'video' && formUrl && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-100 rounded-xl border border-stone-200 mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-rose-500 text-white font-mono font-bold text-[10px] uppercase">
                          VIDEO REEL
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white text-[#800020] border border-stone-200 font-mono font-bold text-[10px]">
                          {detectedRatioLabel}
                        </span>
                        <span className="text-[10px] font-mono text-[#666461]">
                          Duration: {formDuration}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                        ✓ Dimensions &amp; Aspect Ratio Auto-Detected
                      </span>
                    </div>
                  )}

                  {/* Dimension, Aspect Ratio & Tuning Studio Toolbar for Single Photo */}
                  {formType === 'photo' && formUrl && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-100 rounded-xl border border-stone-200 mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-white text-[#800020] border border-stone-200 font-mono font-bold text-[10px]">
                          {detectedRatioLabel}
                        </span>
                        <span className="text-[10px] font-mono text-[#666461]">
                          Focal Point: {formFocalPoint.x}%, {formFocalPoint.y}%
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTuningTargetPhotoIdx(null);
                          setShowTunerModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#800020] hover:bg-[#660019] text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Open Image Tuning Studio (Rotate, Crop, Focal Point)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* DEDICATED VIDEO COVER & THUMBNAIL STUDIO                      */}
              {/* ============================================================== */}
              {formType === 'video' && (
                <div className="bg-[#FAF9F6] border border-[#E5E2DC] rounded-2xl p-4 sm:p-5 space-y-4">
                  {/* Studio Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E2DC] pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-rose-500 text-white font-mono font-bold text-[10px] uppercase tracking-wider">
                          VIDEO COVER STUDIO
                        </span>
                        <h4 className="font-bold text-xs uppercase text-[#121212]">
                          Custom Cover Image &amp; Thumbnail *
                        </h4>
                      </div>
                      <p className="text-[11px] text-[#666461] mt-0.5">
                        Choose an exact frame from the video timeline OR upload a separate custom image. This cover is displayed before video playback.
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono text-[#666461]">Active Cover:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        coverSource === 'uploaded'
                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {coverSource === 'uploaded' ? '📁 Custom Upload' : `📸 Video Frame (${formatDuration(frameScrubTime)})`}
                      </span>
                    </div>
                  </div>

                  {/* Dedicated Action Toolbar (Requirement 7) */}
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-stone-100 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setCoverTab('upload')}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        coverTab === 'upload'
                          ? 'bg-[#800020] text-white shadow-xs'
                          : 'bg-white border border-[#E5E2DC] text-[#121212] hover:border-[#800020]'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Change Cover Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverTab('frame')}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        coverTab === 'frame'
                          ? 'bg-[#800020] text-white shadow-xs'
                          : 'bg-white border border-[#E5E2DC] text-[#121212] hover:border-[#800020]'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Select Different Video Frame</span>
                    </button>

                    {coverSource === 'uploaded' && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomCover}
                        disabled={isExtractingFrame}
                        className="px-3 py-2 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
                        title="Remove custom image and restore automatic video-frame thumbnail"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Remove Custom Cover</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowCoverPreviewModal(true)}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 transition-colors flex items-center space-x-1.5 cursor-pointer ml-auto"
                      title="Preview how visitors see the cover before playback"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#800020]" />
                      <span>Preview Cover</span>
                    </button>
                  </div>

                  {/* TAB A: Interactive Video Timeline Frame Picker */}
                  {coverTab === 'frame' && (
                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-[#E5E2DC]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#121212]">
                          Scrub Video Timeline to Desired Frame
                        </span>
                        <span className="text-[11px] font-mono text-[#800020] font-bold">
                          Frame: {formatDuration(frameScrubTime)} / {formatDuration(videoDurationSeconds)}
                        </span>
                      </div>

                      {/* Video Player for Live Scrubbing */}
                      <div className="relative aspect-video max-h-52 w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                        <video
                          ref={videoScrubRef}
                          src={formUrl}
                          className="w-full h-full object-contain"
                          playsInline
                          muted
                          onLoadedMetadata={(e) => {
                            const dur = e.currentTarget.duration || 60;
                            setVideoDurationSeconds(dur);
                          }}
                        />
                      </div>

                      {/* Interactive Scrub Range Slider */}
                      <div className="space-y-1 pt-1">
                        <input
                          type="range"
                          min="0"
                          max={videoDurationSeconds || 60}
                          step="0.05"
                          value={frameScrubTime}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFrameScrubTime(val);
                            if (videoScrubRef.current) {
                              videoScrubRef.current.currentTime = val;
                            }
                          }}
                          className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#800020] hover:accent-[#660019]"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-[#666461]">
                          <span>00:00</span>
                          <span>{formatDuration(videoDurationSeconds / 2)}</span>
                          <span>{formatDuration(videoDurationSeconds)}</span>
                        </div>
                      </div>

                      {/* Action: Use This Frame as Cover */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                        <button
                          type="button"
                          disabled={isExtractingFrame}
                          onClick={async () => {
                            if (!videoScrubRef.current) return;
                            setIsExtractingFrame(true);
                            try {
                              const frameData = await extractFrameAtTimestamp(videoScrubRef.current, frameScrubTime);
                              setCoverPhotoUrl(frameData);
                              setFormThumbnailUrl(frameData);
                              setCoverSource('video-frame');
                              setDefaultExtractedFrame(frameData);
                              setFrameFeedback(`✓ Frame at ${formatDuration(frameScrubTime)} captured as cover!`);
                              setTimeout(() => setFrameFeedback(''), 4000);
                            } catch (err) {
                              console.error('Failed to extract frame:', err);
                            } finally {
                              setIsExtractingFrame(false);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#660019] text-white font-bold text-xs flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isExtractingFrame ? 'Capturing Frame...' : 'Use This Frame as Video Cover'}</span>
                        </button>

                        {frameFeedback && (
                          <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                            {frameFeedback}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB B: Upload Custom Cover Image */}
                  {coverTab === 'upload' && (
                    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-[#E5E2DC]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#660019] text-white font-bold text-xs flex items-center space-x-2 cursor-pointer shadow-xs transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Choose Custom Cover File (Any Aspect Ratio)</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const result = event.target?.result as string;
                                  if (result) {
                                    setCoverPhotoUrl(result);
                                    setFormThumbnailUrl(result);
                                    setCoverSource('uploaded');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        {defaultExtractedFrame && (
                          <button
                            type="button"
                            onClick={() => {
                              setCoverPhotoUrl(defaultExtractedFrame);
                              setFormThumbnailUrl(defaultExtractedFrame);
                              setCoverSource('video-frame');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                            title="Revert to original video frame"
                          >
                            Revert to Video Frame
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-[#121212] uppercase">
                          Or Enter Custom Cover Image URL
                        </label>
                        <input
                          type="url"
                          value={coverSource === 'uploaded' ? coverPhotoUrl : ''}
                          onChange={(e) => {
                            setCoverPhotoUrl(e.target.value);
                            setFormThumbnailUrl(e.target.value);
                            setCoverSource('uploaded');
                          }}
                          placeholder="https://images.unsplash.com/... or paste image URL"
                          className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-mono outline-none focus:border-[#800020]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Live Video Gallery Card Preview (Before Playback) */}
                  <div className="space-y-1.5 pt-2 border-t border-[#E5E2DC]">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] font-mono text-[#666461] uppercase font-bold">
                        Video Gallery Card Preview (What visitors see before pressing play):
                      </span>
                      <span className="text-[10px] font-mono text-[#800020] font-bold">
                        {formAspectRatio === '9:16' || formHeight > formWidth * 1.1 ? '9:16 Vertical Card' : formAspectRatio === '1:1' ? '1:1 Square Card' : 'Landscape Card'}
                      </span>
                    </div>

                    <div className={`relative mx-auto rounded-2xl overflow-hidden shadow-xl border border-stone-300 bg-stone-950 group ${
                      formAspectRatio === '9:16' || formHeight > formWidth * 1.1
                        ? 'max-w-[240px] aspect-[9/16]'
                        : formAspectRatio === '1:1'
                        ? 'max-w-[280px] aspect-square'
                        : 'max-w-md aspect-video'
                    }`}>
                      <img
                        src={coverPhotoUrl || formThumbnailUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=85'}
                        alt="Cover preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                        <span className="px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[9px] font-bold uppercase backdrop-blur-xs flex items-center space-x-1">
                          <Film className="w-2.5 h-2.5 text-amber-400" />
                          <span>{formCategory}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-black/60 text-white font-mono text-[9px] backdrop-blur-xs">
                          {formDuration || '02:45'}
                        </span>
                      </div>

                      {/* Centered Professional Play Button */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <div className="w-14 h-14 rounded-full bg-white/95 text-[#800020] flex items-center justify-center shadow-2xl border border-white/60 group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-[#800020] translate-x-0.5" />
                        </div>
                        <span className="mt-1.5 text-[9px] font-mono text-white/90 uppercase tracking-widest drop-shadow font-bold">
                          Cover Preview
                        </span>
                      </div>

                      {/* Bottom Caption & Source Overlay */}
                      <div className="absolute bottom-2.5 inset-x-2.5 pointer-events-none z-10 space-y-0.5">
                        <div className="flex items-center justify-between text-[8px] font-mono text-amber-300 uppercase font-bold">
                          <span>{coverSource === 'uploaded' ? 'Custom Cover Asset' : `Video Frame @ ${formatDuration(frameScrubTime)}`}</span>
                          <span>Lazy Load</span>
                        </div>
                        <p className="text-white text-xs font-bold truncate drop-shadow">
                          {formTitle || 'COLORIDO 2K26 Video Reel'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Presets Row for Convenience */}
              {formType === 'photo' && !isCollectionMode && (
                <div>
                  <label className="block text-[10px] font-mono text-[#666461] mb-1 uppercase">
                    Or select high-res festival preset:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGES.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormUrl(p.url);
                          setCoverPhotoUrl(p.url);
                          setFormTitle(p.label);
                          setFormCategory(p.category);
                          setFormAspectRatio(p.aspect);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] border border-[#E5E2DC] text-[10px] text-[#121212] hover:bg-[#E5E2DC] transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aspect Ratio, Duration & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-[#121212] mb-1.5 uppercase">Aspect Ratio</label>
                  <select
                    value={formAspectRatio}
                    onChange={(e) => setFormAspectRatio(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-bold text-[#121212] outline-none"
                  >
                    <option value="auto">Auto / Natural ({formWidth} × {formHeight})</option>
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait / Story</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="4:3">4:3 Standard Photo</option>
                    <option value="3:4">3:4 Vertical Portrait</option>
                    <option value="21:9">21:9 Ultra-Wide Panoramic</option>
                  </select>
                </div>

                {formType === 'video' ? (
                  <div>
                    <label className="block font-bold text-[#121212] mb-1.5 uppercase">Duration (MM:SS)</label>
                    <input
                      type="text"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      placeholder="02:45"
                      className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-mono outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-[#121212] mb-1.5 uppercase">Date Captured</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-medium outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-[#121212] mb-1.5 uppercase">Arena / Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Tagore Grand Stage"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-medium outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#121212] mb-1.5 uppercase">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Editorial commentary describing this fest memory..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-medium outline-none focus:border-[#800020]"
                />
              </div>

              {/* Visibility and Highlight Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Published vs Hidden */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5 font-bold text-[#121212]">
                      <Eye className="w-4 h-4 text-[#800020]" />
                      <span>{formPublished ? 'PUBLISHED' : 'HIDDEN'}</span>
                    </div>
                    <p className="text-[10px] text-[#666461]">
                      {formPublished ? 'Visible to all public visitors.' : 'Visible only inside Admin Gallery.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormPublished(!formPublished)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[10px] font-mono uppercase transition-colors ${formPublished
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-300 text-stone-700'
                      }`}
                  >
                    {formPublished ? 'PUBLISHED' : 'HIDDEN'}
                  </button>
                </div>

                {/* Highlight Toggle */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5 font-bold text-amber-950">
                      <Sparkles className="w-4 h-4 text-[#C5A059]" />
                      <span>COLORIDO HIGHLIGHT</span>
                    </div>
                    <p className="text-[10px] text-amber-800/80">
                      Include in top curated Highlights section.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-5 h-5 accent-[#800020] rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#E5E2DC]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#FAF9F6] hover:bg-[#E5E2DC] text-[#666461] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#660019] text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center space-x-2"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingItem ? 'Save Changes' : 'Save Media'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REQUIREMENT 7: FULL COVER PREVIEW MODAL                        */}
      {/* ============================================================== */}
      {showCoverPreviewModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E5E2DC] w-full max-w-2xl overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 px-6 border-b border-[#E5E2DC] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#800020] uppercase tracking-wider">
                  COVER PREVIEW (BEFORE PLAYBACK)
                </span>
                <h4 className="font-editorial font-bold text-base text-[#121212]">
                  {formTitle || 'COLORIDO 2K26 Video Reel'}
                </h4>
              </div>
              <button
                onClick={() => setShowCoverPreviewModal(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-[#666461] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 flex items-center justify-center bg-stone-950">
              <div
                className={`relative rounded-xl overflow-hidden shadow-2xl flex items-center justify-center ${
                  formAspectRatio === '9:16' || formHeight > formWidth * 1.1
                    ? 'max-w-[280px] aspect-[9/16]'
                    : formAspectRatio === '1:1'
                    ? 'max-w-[340px] aspect-square'
                    : 'max-w-xl aspect-video'
                }`}
              >
                <img
                  src={coverPhotoUrl || formThumbnailUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=85'}
                  alt="Cover preview"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

                {/* Centered Institutional Play Button */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-white/95 text-[#800020] flex items-center justify-center shadow-2xl border border-white/60">
                    <Play className="w-7 h-7 fill-[#800020] translate-x-0.5" />
                  </div>
                  <span className="mt-2 text-[10px] font-mono text-white/90 uppercase tracking-widest font-bold">
                    Watch Video
                  </span>
                </div>

                {/* Badges */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white font-mono text-[9px] font-bold uppercase backdrop-blur-xs">
                    {formCategory}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white font-mono text-[9px] font-bold backdrop-blur-xs">
                    {formDuration || '02:45'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-[#E5E2DC] flex items-center justify-between text-xs font-mono">
              <span className="text-[#666461]">
                Source: <strong className="text-[#121212]">{coverSource === 'uploaded' ? '📁 Custom Uploaded Cover Image' : `📸 Extracted Video Frame (${formatDuration(frameScrubTime)})`}</strong>
              </span>
              <button
                onClick={() => setShowCoverPreviewModal(false)}
                className="px-5 py-2 rounded-xl bg-[#800020] text-white font-bold hover:bg-[#660019] transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PHOTO & VIDEO PREVIEW MODAL (Sections 15 & 16)                */}
      {/* ============================================================== */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E5E2DC] w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col justify-between">

            {/* Header */}
            <div className="p-5 border-b border-[#E5E2DC] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-[#800020] text-white text-[10px] font-mono font-bold uppercase">
                  {previewItem.category}
                </span>
                {previewItem.published !== false ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                    ● PUBLISHED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-mono font-bold">
                    ○ HIDDEN
                  </span>
                )}
                {previewItem.featured && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>HIGHLIGHTED</span>
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setPreviewItem(null);
                  setAdminPreviewPlayingVideo(false);
                }}
                className="p-2 rounded-full hover:bg-stone-100 text-[#666461] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Player / Image Display */}
            <div className="bg-black relative flex items-center justify-center min-h-[340px] max-h-[500px] overflow-hidden">
              {previewItem.type === 'video' ? (
                !adminPreviewPlayingVideo ? (
                  /* COVER IMAGE SHOWN BEFORE PLAYBACK */
                  <div
                    onClick={() => setAdminPreviewPlayingVideo(true)}
                    className="relative w-full h-[460px] cursor-pointer flex items-center justify-center group select-none"
                  >
                    <img
                      src={previewItem.coverPhoto || previewItem.thumbnailUrl || previewItem.url}
                      alt={previewItem.title}
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/35 pointer-events-none" />

                    {/* Centered Professional Play Button */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-white/95 text-[#800020] flex items-center justify-center shadow-2xl border border-white/60 group-hover:scale-110 transition-transform">
                        <Play className="w-7 h-7 fill-[#800020] translate-x-0.5" />
                      </div>
                      <span className="mt-2 text-xs font-mono text-white/90 uppercase tracking-widest font-bold drop-shadow">
                        Click to Play Video
                      </span>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white font-mono text-[9px] font-bold uppercase backdrop-blur-xs flex items-center space-x-1">
                        <Film className="w-2.5 h-2.5 text-amber-400" />
                        <span>VIDEO COVER</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white font-mono text-[9px] font-bold backdrop-blur-xs">
                        {previewItem.duration || 'Video'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-[500px] flex items-center justify-center">
                    <video
                      src={previewItem.url}
                      poster={previewItem.thumbnailUrl}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-[500px] w-full object-contain"
                    />
                    <button
                      onClick={() => setAdminPreviewPlayingVideo(false)}
                      className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[10px] font-mono font-bold border border-white/20 transition-colors z-20 cursor-pointer"
                    >
                      Return to Cover
                    </button>
                  </div>
                )
              ) : previewItem.photos && previewItem.photos.length > 1 ? (
                <div className="relative w-full h-[440px] flex items-center justify-center">
                  <img
                    src={previewItem.photos[previewPhotoIndex]?.url || previewItem.url}
                    alt={previewItem.title}
                    className="max-h-[440px] max-w-full object-contain"
                  />
                  {/* Prev / Next controls */}
                  <button
                    onClick={() => setPreviewPhotoIndex(prev => (prev - 1 + previewItem.photos!.length) % previewItem.photos!.length)}
                    className="absolute left-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPreviewPhotoIndex(prev => (prev + 1) % previewItem.photos!.length)}
                    className="absolute right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-mono">
                    {previewPhotoIndex + 1} / {previewItem.photos.length}
                  </div>
                </div>
              ) : (
                <img
                  src={previewItem.url}
                  alt={previewItem.title}
                  className="max-h-[480px] max-w-full object-contain"
                />
              )}
            </div>

            {/* Details & Actions Footer */}
            <div className="p-6 space-y-4 bg-white">
              <div className="space-y-1">
                <h3 className="font-editorial font-bold text-xl text-[#121212]">
                  {previewItem.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#666461]">
                  <span>Date: {new Date(previewItem.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {previewItem.location && <span>• Arena: {previewItem.location}</span>}
                  {previewItem.eventTitle && <span>• Event: {previewItem.eventTitle}</span>}
                  {previewItem.duration && <span>• Duration: {previewItem.duration}</span>}
                </div>
                {previewItem.description && (
                  <p className="text-xs text-[#666461] pt-1 leading-relaxed">
                    {previewItem.description}
                  </p>
                )}
              </div>

              {/* Action Buttons: Edit, Publish/Hide, Highlight, Delete */}
              <div className="pt-4 border-t border-[#E5E2DC] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTogglePublish(previewItem)}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#121212] font-bold text-xs flex items-center space-x-1.5"
                  >
                    {previewItem.published !== false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{previewItem.published !== false ? 'Hide from Public' : 'Publish to Public'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleFeatured(previewItem)}
                    className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{previewItem.featured ? 'Remove Highlight' : 'Add to Highlight'}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const item = previewItem;
                      setPreviewItem(null);
                      handleOpenEdit(item);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#800020] text-white hover:bg-[#660019] font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Information</span>
                  </button>

                  <button
                    onClick={() => {
                      setItemToDelete(previewItem);
                      setPreviewItem(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL (Section 14)                          */}
      {/* ============================================================== */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E5E2DC] w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <Trash2 className="w-6 h-6" />
              <h4 className="font-editorial font-bold text-lg text-[#121212]">Delete Media?</h4>
            </div>

            <p className="text-xs text-[#666461] leading-relaxed">
              Are you sure you want to delete this media?
            </p>

            {itemToDelete.featured && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>This media is currently included in COLORIDO Highlights.</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF9F6] text-[#666461] font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* IMAGE TUNING STUDIO (Rotate, Optional Crop, Focal Point)       */}
      {/* ============================================================== */}
      {showTunerModal && (
        <AdminImageTunerModal
          isOpen={showTunerModal}
          onClose={() => {
            setShowTunerModal(false);
            setTuningTargetPhotoIdx(null);
          }}
          imageUrl={
            tuningTargetPhotoIdx !== null
              ? (formPhotos[tuningTargetPhotoIdx]?.url || '')
              : formUrl
          }
          initialFocalPoint={
            tuningTargetPhotoIdx !== null
              ? (formPhotos[tuningTargetPhotoIdx]?.focalPoint || { x: 50, y: 50 })
              : formFocalPoint
          }
          onApply={(data) => {
            if (tuningTargetPhotoIdx !== null) {
              setFormPhotos(prev => prev.map((p, idx) => {
                if (idx === tuningTargetPhotoIdx) {
                  return {
                    ...p,
                    url: data.url,
                    thumbnailUrl: data.url,
                    width: data.width,
                    height: data.height,
                    aspectRatio: data.aspectRatio,
                    focalPoint: data.focalPoint,
                  };
                }
                return p;
              }));
            } else {
              setFormUrl(data.url);
              setFormThumbnailUrl(data.url);
              setCoverPhotoUrl(data.url);
              setFormWidth(data.width);
              setFormHeight(data.height);
              setFormAspectRatio(data.aspectRatio);
              setFormFocalPoint(data.focalPoint);
              setDetectedRatioLabel(`${data.width} × ${data.height} (${data.aspectRatio})`);
            }
            setShowTunerModal(false);
            setTuningTargetPhotoIdx(null);
          }}
        />
      )}

    </div>
  );
};
