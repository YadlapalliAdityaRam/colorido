import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, ImagePlus, RotateCcw, Save } from 'lucide-react';
import type { AboutPageContent, AboutStorySection, EventItem, MediaItem } from '../../types';
import { apiService } from '../../services/apiService';
import { optimizeImageForWeb } from '../../utils/imageProcessor';
import { normalizeAboutPageContent } from './aboutPageDefaults';

interface AboutPageManagerProps {
  events: EventItem[];
}

const fieldClass = 'w-full rounded-lg border border-white/15 bg-[#0c1730] px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-amber-300 focus:outline-none';

export const AboutPageManager: React.FC<AboutPageManagerProps> = ({ events }) => {
  const [content, setContent] = useState<AboutPageContent>(() => normalizeAboutPageContent());
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('hero');
  const [status, setStatus] = useState('Loading About content…');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([apiService.getAboutPageContent(), apiService.getMedia()]).then(([about, gallery]) => {
      if (!active) return;
      setContent(normalizeAboutPageContent(about));
      setMedia(gallery.filter(item => item.published !== false));
      setStatus('Changes save to the existing PageCMS page record.');
    }).catch(() => setStatus('Could not load saved About content.'));
    return () => { active = false; };
  }, []);

  const orderedSections = useMemo(() => [...content.sections].sort((a, b) => a.order - b.order), [content.sections]);
  const selectedSection = content.sections.find(section => section.id === selectedSectionId) || orderedSections[0];
  const eventTypeForSection = selectedSection?.id === 'cultural' ? 'cultural' : 'sports';
  const eventIdsForSection = eventTypeForSection === 'sports' ? content.selectedSportsEventIds : content.selectedCulturalEventIds;
  const sectionEvents = events.filter(event => event.type === eventTypeForSection).sort((a, b) => {
    if (!eventIdsForSection.length) return 0;
    const ai = eventIdsForSection.indexOf(a.id);
    const bi = eventIdsForSection.indexOf(b.id);
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });
  const featuredMedia = media.filter(item => item.featured).sort((a, b) => {
    if (!content.selectedMemoryIds.length) return 0;
    const ai = content.selectedMemoryIds.indexOf(a.id);
    const bi = content.selectedMemoryIds.indexOf(b.id);
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });

  const updateContent = (next: Partial<AboutPageContent>) => setContent(current => ({ ...current, ...next }));

  const updateSection = (patch: Partial<AboutStorySection>) => {
    if (!selectedSection) return;
    updateContent({ sections: content.sections.map(section => section.id === selectedSection.id ? { ...section, ...patch } : section) });
  };

  const moveSection = (direction: -1 | 1) => {
    if (!selectedSection) return;
    const index = orderedSections.findIndex(section => section.id === selectedSection.id);
    const target = index + direction;
    if (target < 0 || target >= orderedSections.length) return;
    const next = [...orderedSections];
    [next[index], next[target]] = [next[target], next[index]];
    updateContent({ sections: next.map((section, order) => ({ ...section, order })) });
  };

  const moveSelectedEvent = (eventId: string, direction: -1 | 1) => {
    const ids = eventIdsForSection.length ? [...eventIdsForSection] : sectionEvents.map(event => event.id);
    const currentIndex = ids.indexOf(eventId);
    const target = currentIndex + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[currentIndex], ids[target]] = [ids[target], ids[currentIndex]];
    if (eventTypeForSection === 'sports') updateContent({ selectedSportsEventIds: ids });
    else updateContent({ selectedCulturalEventIds: ids });
  };

  const moveMemory = (id: string, direction: -1 | 1) => {
    const ids = content.selectedMemoryIds.length ? [...content.selectedMemoryIds] : featuredMedia.map(item => item.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    updateContent({ selectedMemoryIds: ids });
  };

  const save = async () => {
    setSaving(true);
    setStatus('Saving…');
    const savedRemotely = await apiService.saveAboutPageContent(content);
    setStatus(savedRemotely ? 'Saved to COLORIDO PageCMS.' : 'Saved on this device; server unavailable.');
    setSaving(false);
  };

  const restoreDefaults = () => {
    setContent(normalizeAboutPageContent());
    setSelectedSectionId('hero');
    setStatus('Default About story restored as an unsaved draft. Save only if you want to publish it.');
  };

  const handleImageUpload = async (file?: File) => {
    if (!file || !selectedSection) return;
    if (!file.type.startsWith('image/')) {
      setStatus('Choose an image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatus('Image is too large. Choose a file under 12 MB.');
      return;
    }
    try {
      const optimized = await optimizeImageForWeb(file, 2000, 0.82);
      if (optimized.dataUrl.length > 2_500_000) {
        setStatus('Processed image is still too large. Use a smaller image or choose one from Gallery.');
        return;
      }
      updateSection({ image: optimized.dataUrl });
      setStatus('Image ready. Save changes to publish it.');
    } catch {
      setStatus('Could not process that image.');
    }
  };

  if (!selectedSection) return <p className="text-slate-300">No About sections are configured.</p>;

  const toggleId = (items: string[], id: string) => items.includes(id) ? items.filter(item => item !== id) : [...items, id];

  return (
    <div className="space-y-5 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-cinzel text-xl font-bold">About Page · The COLORIDO Story</h2>
          <p className="mt-1 text-xs text-slate-300">Edit story sections, media picks, visibility, and ordering. Existing Events and Gallery records remain the source of truth.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={restoreDefaults} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-60">
            <RotateCcw className="h-4 w-4" />Restore default draft
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-sm font-bold text-white hover:bg-[#9b1738] disabled:opacity-60">
            {saving ? <span className="animate-spin">◌</span> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save About Page'}
          </button>
        </div>
      </div>

      <p aria-live="polite" className="text-xs text-amber-200">{status}</p>

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="About page sections" className="max-h-[70vh] space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0b1429] p-2">
          {orderedSections.map(section => (
            <button key={section.id} onClick={() => setSelectedSectionId(section.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${section.id === selectedSection.id ? 'bg-[#263657] text-amber-200' : 'text-slate-200 hover:bg-white/5'}`}>
              <span className="truncate">{section.title}</span>{section.published ? <Eye className="h-3.5 w-3.5 shrink-0" /> : <EyeOff className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
            </button>
          ))}
        </nav>

        <div className="space-y-5 rounded-xl border border-white/10 bg-[#111d38] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <p className="text-xs font-mono uppercase tracking-widest text-amber-200">Section · {selectedSection.id}</p>
            <div className="flex items-center gap-2">
              <button aria-label="Move section up" onClick={() => moveSection(-1)} className="rounded-md border border-white/15 p-2 hover:bg-white/10"><ArrowUp className="h-4 w-4" /></button>
              <button aria-label="Move section down" onClick={() => moveSection(1)} className="rounded-md border border-white/15 p-2 hover:bg-white/10"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={() => updateSection({ published: !selectedSection.published })} className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs hover:bg-white/10">{selectedSection.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{selectedSection.published ? 'Hide section' : 'Publish section'}</button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-300">Small label<input className={fieldClass} value={selectedSection.eyebrow} onChange={e => updateSection({ eyebrow: e.target.value })} /></label>
            <label className="space-y-1 text-xs text-slate-300">Main heading<input className={fieldClass} value={selectedSection.title} onChange={e => updateSection({ title: e.target.value })} /></label>
            <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Supporting line<input className={fieldClass} value={selectedSection.subtitle} onChange={e => updateSection({ subtitle: e.target.value })} /></label>
            <label className="space-y-1 text-xs text-slate-300 sm:col-span-2">Short description<textarea rows={3} className={fieldClass} value={selectedSection.description} onChange={e => updateSection({ description: e.target.value })} /></label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-3">
              <label className="block space-y-1 text-xs text-slate-300">Image URL or existing media URL<input className={fieldClass} value={selectedSection.image} onChange={e => updateSection({ image: e.target.value })} placeholder="/image.jpg or https://…" /></label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200 hover:bg-white/5"><ImagePlus className="h-4 w-4 text-amber-200" />Upload replacement image<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void handleImageUpload(e.target.files?.[0]); e.currentTarget.value = ''; }} /></label>
              {media.length > 0 && <label className="block space-y-1 text-xs text-slate-300">Choose a published Gallery image<select className={fieldClass} value="" onChange={e => { if (e.target.value) updateSection({ image: e.target.value }); }}><option value="">Select gallery media…</option>{media.map(item => <option key={item.id} value={item.coverPhoto || item.thumbnailUrl || item.url}>{item.title}</option>)}</select></label>}
              {selectedSection.id === 'college' && <label className="block space-y-1 text-xs text-slate-300">Official college website (optional)<input className={fieldClass} value={content.collegeWebsite} onChange={e => updateContent({ collegeWebsite: e.target.value })} placeholder="https://…" /></label>}
            </div>
            <div className="h-36 overflow-hidden rounded-lg border border-white/10 bg-black/30">
              {selectedSection.image && <img src={selectedSection.image} alt="Selected About section preview" className="h-full w-full object-cover" />}
            </div>
          </div>

          {(selectedSection.id === 'sports' || selectedSection.id === 'cultural') && (
            <fieldset className="space-y-2 border-t border-white/10 pt-4">
              <legend className="text-xs font-bold uppercase tracking-wider text-amber-100">Choose events to feature · leave empty to show all live events</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sectionEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 p-2 text-xs"><label className="flex min-w-0 items-start gap-2"><input type="checkbox" checked={eventIdsForSection.includes(event.id)} onChange={() => eventTypeForSection === 'sports' ? updateContent({ selectedSportsEventIds: toggleId(content.selectedSportsEventIds, event.id) }) : updateContent({ selectedCulturalEventIds: toggleId(content.selectedCulturalEventIds, event.id) })} /><span>{event.title}</span></label>{eventIdsForSection.includes(event.id) && <span className="flex shrink-0 gap-1"><button aria-label={`Move ${event.title} up`} onClick={() => moveSelectedEvent(event.id, -1)} className="rounded border border-white/15 p-1"><ArrowUp className="h-3 w-3" /></button><button aria-label={`Move ${event.title} down`} onClick={() => moveSelectedEvent(event.id, 1)} className="rounded border border-white/15 p-1"><ArrowDown className="h-3 w-3" /></button></span>}</div>
                ))}
              </div>
            </fieldset>
          )}

          {selectedSection.id === 'memories' && (
            <fieldset className="space-y-2 border-t border-white/10 pt-4">
              <legend className="text-xs font-bold uppercase tracking-wider text-amber-100">Select published Gallery memories · empty selection uses all highlighted media</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {featuredMedia.map(item => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 p-2 text-xs"><label className="flex min-w-0 items-start gap-2"><input type="checkbox" checked={content.selectedMemoryIds.includes(item.id)} onChange={() => updateContent({ selectedMemoryIds: toggleId(content.selectedMemoryIds, item.id) })} /><span>{item.title}</span></label>{content.selectedMemoryIds.includes(item.id) && <span className="flex shrink-0 gap-1"><button aria-label={`Move ${item.title} memory up`} onClick={() => moveMemory(item.id, -1)} className="rounded border border-white/15 p-1"><ArrowUp className="h-3 w-3" /></button><button aria-label={`Move ${item.title} memory down`} onClick={() => moveMemory(item.id, 1)} className="rounded border border-white/15 p-1"><ArrowDown className="h-3 w-3" /></button></span>}</div>)}
              </div>
            </fieldset>
          )}

          {selectedSection.id === 'dna' && <label className="block space-y-1 text-xs text-slate-300">COLORIDO DNA words (comma separated)<input className={fieldClass} value={content.dna.join(', ')} onChange={e => updateContent({ dna: e.target.value.split(',').map(word => word.trim()).filter(Boolean) })} /></label>}

          {selectedSection.id === 'worlds' && <fieldset className="space-y-3 border-t border-white/10 pt-4">
            <legend className="text-xs font-bold uppercase tracking-wider text-amber-100">Compete · Create · Celebrate panels</legend>
            {content.worlds.map((world, index) => <div key={world.id} className="grid gap-2 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
              <input aria-label="World title" className={fieldClass} value={world.title} onChange={e => updateContent({ worlds: content.worlds.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} placeholder="Title" />
              <input aria-label="World label" className={fieldClass} value={world.label} onChange={e => updateContent({ worlds: content.worlds.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} placeholder="World / category" />
              <textarea aria-label="World description" className={`${fieldClass} sm:col-span-2`} value={world.description} onChange={e => updateContent({ worlds: content.worlds.map((item, i) => i === index ? { ...item, description: e.target.value } : item) })} placeholder="Short description" />
              <input aria-label="World image URL" className={fieldClass} value={world.image} onChange={e => updateContent({ worlds: content.worlds.map((item, i) => i === index ? { ...item, image: e.target.value } : item) })} placeholder="Image URL" />
              <select aria-label="World image from Gallery" className={fieldClass} value="" onChange={e => { if (e.target.value) updateContent({ worlds: content.worlds.map((item, i) => i === index ? { ...item, image: e.target.value } : item) }); }}><option value="">Choose published Gallery image…</option>{media.map(item => <option key={item.id} value={item.coverPhoto || item.thumbnailUrl || item.url}>{item.title}</option>)}</select>
              <select aria-label="World navigation destination" className={fieldClass} value={world.href} onChange={e => updateContent({ worlds: content.worlds.map((item, i) => i === index ? { ...item, href: e.target.value } : item) })}><option value="sports">Sports</option><option value="cultural">Cultural</option><option value="night">Festival story</option></select>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={world.published} onChange={e => updateContent({ worlds: content.worlds.map((item, i) => i === index ? { ...item, published: e.target.checked } : item) })} />Published</label>
              <div className="flex justify-end gap-2"><button aria-label="Move world up" onClick={() => { if (index === 0) return; const worlds = [...content.worlds]; [worlds[index - 1], worlds[index]] = [worlds[index], worlds[index - 1]]; updateContent({ worlds: worlds.map((item, order) => ({ ...item, order })) }); }} className="rounded border border-white/15 p-1.5"><ArrowUp className="h-3.5 w-3.5" /></button><button aria-label="Move world down" onClick={() => { if (index === content.worlds.length - 1) return; const worlds = [...content.worlds]; [worlds[index + 1], worlds[index]] = [worlds[index], worlds[index + 1]]; updateContent({ worlds: worlds.map((item, order) => ({ ...item, order })) }); }} className="rounded border border-white/15 p-1.5"><ArrowDown className="h-3.5 w-3.5" /></button><button onClick={() => updateContent({ worlds: content.worlds.filter((_, i) => i !== index).map((item, order) => ({ ...item, order })) })} className="rounded border border-rose-300/20 px-2 text-xs text-rose-200">Remove</button></div>
            </div>)}
            <button onClick={() => updateContent({ worlds: [...content.worlds, { id: `world-${Date.now()}`, title: '', label: '', description: '', image: '', href: 'sports', published: true, order: content.worlds.length }] })} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5">+ Add a world</button>
          </fieldset>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-white/10 bg-[#111d38] p-4">
          <div><h3 className="font-cinzel font-bold">People</h3><p className="text-xs text-slate-300">Only entries added here are shown publicly.</p></div>
          {content.people.map((person, index) => <div key={person.id} className="grid gap-2 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
            <input aria-label="Person name" className={fieldClass} placeholder="Name" value={person.name} onChange={e => updateContent({ people: content.people.map((item, i) => i === index ? { ...item, name: e.target.value } : item) })} />
            <input aria-label="Person role" className={fieldClass} placeholder="Role" value={person.role} onChange={e => updateContent({ people: content.people.map((item, i) => i === index ? { ...item, role: e.target.value } : item) })} />
            <input aria-label="Person photo URL" className={fieldClass} placeholder="Photo URL" value={person.image} onChange={e => updateContent({ people: content.people.map((item, i) => i === index ? { ...item, image: e.target.value } : item) })} />
            <select aria-label="Person photo from Gallery" className={fieldClass} value="" onChange={e => { if (e.target.value) updateContent({ people: content.people.map((item, i) => i === index ? { ...item, image: e.target.value } : item) }); }}><option value="">Choose Gallery photo…</option>{media.map(item => <option key={item.id} value={item.coverPhoto || item.thumbnailUrl || item.url}>{item.title}</option>)}</select>
            <textarea aria-label="Person description" className={`${fieldClass} sm:col-span-2`} placeholder="Short description" value={person.description} onChange={e => updateContent({ people: content.people.map((item, i) => i === index ? { ...item, description: e.target.value } : item) })} />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={person.published} onChange={e => updateContent({ people: content.people.map((item, i) => i === index ? { ...item, published: e.target.checked } : item) })} />Published</label>
            <div className="flex justify-end gap-2"><button aria-label="Move person up" onClick={() => { if (index === 0) return; const people = [...content.people]; [people[index - 1], people[index]] = [people[index], people[index - 1]]; updateContent({ people: people.map((item, order) => ({ ...item, order })) }); }} className="rounded border border-white/15 p-1.5"><ArrowUp className="h-3.5 w-3.5" /></button><button aria-label="Move person down" onClick={() => { if (index === content.people.length - 1) return; const people = [...content.people]; [people[index + 1], people[index]] = [people[index], people[index + 1]]; updateContent({ people: people.map((item, order) => ({ ...item, order })) }); }} className="rounded border border-white/15 p-1.5"><ArrowDown className="h-3.5 w-3.5" /></button><button onClick={() => updateContent({ people: content.people.filter((_, i) => i !== index).map((item, order) => ({ ...item, order })) })} className="rounded border border-rose-300/20 px-2 text-xs text-rose-200">Remove</button></div>
          </div>)}
          <button onClick={() => updateContent({ people: [...content.people, { id: `person-${Date.now()}`, name: '', role: '', description: '', image: '', published: true, order: content.people.length }] })} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5">+ Add a person</button>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-[#111d38] p-4">
          <div><h3 className="font-cinzel font-bold">Festival Journey</h3><p className="text-xs text-slate-300">Times are optional; phases without a supplied time remain descriptive.</p></div>
          {content.journey.map((moment, index) => <div key={moment.id} className="grid gap-2 rounded-lg border border-white/10 p-3 sm:grid-cols-2">
            <input aria-label="Journey phase" className={fieldClass} placeholder="Phase" value={moment.phase} onChange={e => updateContent({ journey: content.journey.map((item, i) => i === index ? { ...item, phase: e.target.value } : item) })} />
            <input aria-label="Journey time" className={fieldClass} placeholder="Optional time" value={moment.time || ''} onChange={e => updateContent({ journey: content.journey.map((item, i) => i === index ? { ...item, time: e.target.value } : item) })} />
            <input aria-label="Journey title" className={`${fieldClass} sm:col-span-2`} placeholder="Title" value={moment.title} onChange={e => updateContent({ journey: content.journey.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} />
            <textarea aria-label="Journey description" className={`${fieldClass} sm:col-span-2`} placeholder="Description" value={moment.description} onChange={e => updateContent({ journey: content.journey.map((item, i) => i === index ? { ...item, description: e.target.value } : item) })} />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={moment.published} onChange={e => updateContent({ journey: content.journey.map((item, i) => i === index ? { ...item, published: e.target.checked } : item) })} />Published</label>
            <div className="flex justify-end gap-2"><button aria-label="Move timeline moment up" onClick={() => { if (index === 0) return; const journey = [...content.journey]; [journey[index - 1], journey[index]] = [journey[index], journey[index - 1]]; updateContent({ journey: journey.map((item, order) => ({ ...item, order })) }); }} className="rounded border border-white/15 p-1.5"><ArrowUp className="h-3.5 w-3.5" /></button><button aria-label="Move timeline moment down" onClick={() => { if (index === content.journey.length - 1) return; const journey = [...content.journey]; [journey[index + 1], journey[index]] = [journey[index], journey[index + 1]]; updateContent({ journey: journey.map((item, order) => ({ ...item, order })) }); }} className="rounded border border-white/15 p-1.5"><ArrowDown className="h-3.5 w-3.5" /></button><button onClick={() => updateContent({ journey: content.journey.filter((_, i) => i !== index).map((item, order) => ({ ...item, order })) })} className="rounded border border-rose-300/20 px-2 text-xs text-rose-200">Remove</button></div>
          </div>)}
          <button onClick={() => updateContent({ journey: [...content.journey, { id: `journey-${Date.now()}`, phase: '', title: '', description: '', published: true, order: content.journey.length }] })} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5">+ Add a moment</button>
        </div>
      </div>
      <p className="flex items-center gap-2 text-[11px] text-slate-400"><Check className="h-3.5 w-3.5" />Gallery selections automatically disappear if media is unpublished or deleted.</p>
    </div>
  );
};
