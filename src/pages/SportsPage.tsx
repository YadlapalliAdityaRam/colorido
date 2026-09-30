import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EventItem } from '../types';
import { getEventBanner, isGlobalProfile } from '../utils/imageHelpers';
import { FestivalPassCategory } from '../components/festivalPass/FestivalPass';

interface SportsPageProps {
  events: EventItem[];
  onSelectEvent: (slug: string) => void;
  onRegister: (event: EventItem) => void;
}

export const SportsPage: React.FC<SportsPageProps> = ({
  events,
  onSelectEvent,
  onRegister,
}) => {
  const sportsEvents = events.filter(e => e.type === 'sports');

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const heroSlides = [
    {
      src: '/image6.jpg',
      alt: 'Pro Kabaddi Tournament at R.V.R. & J.C. Grounds',
      tag: 'KABADDI ARENA',
      title: 'RAID. DEFEND. CONQUER.',
      subtitle: 'High-octane national collegiate kabaddi action live on the red soil grounds of R.V.R. & J.C.',
    },
    {
      src: '/image7.jpg',
      alt: 'Inter-College T10 & T20 Cricket Championship',
      tag: 'CRICKET CHAMPIONSHIP',
      title: 'STRIKE. POWER. GLORY.',
      subtitle: 'Electric boundary drives and thrilling finishes at the college championship cricket grounds.',
    },
    {
      src: '/image8.jpg',
      alt: 'National Collegiate Tennis Tournament',
      tag: 'TENNIS MASTERS',
      title: 'PRECISION. SPEED. ACES.',
      subtitle: 'Fast-paced baseline rallies and dynamic serves on the tournament hardcourts.',
    },
    {
      src: '/image9.jpg',
      alt: 'Volleyball & Throwball College Tournaments',
      tag: 'VOLLEYBALL LEAGUE',
      title: 'SERVE. SET. SMASH.',
      subtitle: 'Inter-department and university volleyball competitions with enthusiastic student crowds.',
    },
    {
      src: '/image10.jpg',
      alt: 'Women\'s Volleyball & Throwball Championship',
      tag: 'WOMEN\'S SPORTS LEAGUE',
      title: 'AGILITY. TEAMWORK. PASSION.',
      subtitle: 'Fierce competition and spirited rallies during the annual collegiate sports meet.',
    },
    {
      src: '/image11.jpg',
      alt: 'Men\'s Volleyball Championship Net Action',
      tag: 'VOLLEYBALL OPEN',
      title: 'POWER. LEAP. SPIKE.',
      subtitle: 'Spectacular aerial spikes and tactical blocks in the high-stakes university league.',
    },
    {
      src: '/image12.jpg',
      alt: 'Basketball Outdoor Championship',
      tag: 'BASKETBALL ARENA',
      title: 'DRIBBLE. DRIVE. DUNK.',
      subtitle: 'Non-stop fast breaks, perimeter three-pointers, and rim-rocking college basketball thrills.',
    },
  ];

  // Auto advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const categories = ['All', 'Kabaddi', 'Cricket', 'Athletics', 'Badminton', 'Football'];

  const filteredEvents = sportsEvents.filter(evt => {
    const matchesCategory = activeCategory === 'All' || evt.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = searchQuery.trim() === '' ||
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.venueName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className="min-h-screen relative text-[#1C1917] flex flex-col pb-20 bg-cover bg-center bg-fixed transition-all duration-700"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(245, 242, 235, 0.70), rgba(245, 242, 235, 0.82)), url('/background_image_for_sports_page.jpg')`,
      }}
    >

      {/* Sports Hero — Full Image Slideshow (images 6 through 12, uncropped display) */}
      <section className="relative w-full h-[520px] sm:h-[620px] md:h-[680px] overflow-hidden border-b border-[#E0DACD] bg-[#0c0a09]">
        {/* Slides */}
        {heroSlides.map((slide, idx) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlideIndex ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
              }`}
          >
            {/* Ambient Backdrop to fill widescreen letterbox smoothly - slightly unblurred */}
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-xs scale-105 opacity-45"
              style={{ backgroundImage: `url(${slide.src})` }}
            />
            <div className="absolute inset-0 bg-black/40" />

            {/* FULL DISPLAY IMAGE (Entire image is visible without cropping) */}
            <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-8">
              <img
                src={slide.src}
                alt={slide.alt}
                className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
              />
            </div>
          </div>
        ))}

        {/* Ambient Top & Bottom Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/30 z-20" />

        {/* Floating Slide Caption (compact glassmorphism card at bottom-left so image remains fully visible) */}
        <div className="absolute bottom-6 left-6 sm:left-12 z-30 max-w-lg bg-black/65 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 shadow-2xl">
          <span className="text-[10px] sm:text-xs font-mono text-[#F3C85E] uppercase tracking-widest block font-bold">
            {heroSlides[currentSlideIndex].tag}
          </span>
          <h2 className="festival-title-reveal font-cinzel font-bold text-lg sm:text-2xl text-white tracking-wide leading-tight mt-1">
            {heroSlides[currentSlideIndex].title}
          </h2>
          <p className="text-xs text-gray-200 font-sans mt-1 line-clamp-2">
            {heroSlides[currentSlideIndex].subtitle}
          </p>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Slide Indicator Dots / Navigation Counter bottom right */}
        <div className="absolute bottom-6 right-6 sm:right-12 z-30 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/20 shadow-lg">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${idx === currentSlideIndex
                  ? 'w-6 bg-[#C5A059]'
                  : 'w-2 bg-white/40 hover:bg-white'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
          <span className="text-[10px] font-mono text-white/90 pl-1 font-bold">
            0{currentSlideIndex + 1} / 0{heroSlides.length}
          </span>
        </div>
      </section>

      {/* Filter & Category Rail */}
      <section className="max-w-7xl mx-auto px-6 w-full pt-10 pb-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-[#E5E2DC] pb-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all ${activeCategory === cat
                    ? 'bg-[#121212] text-white font-bold'
                    : 'bg-white text-[#666461] hover:text-[#121212] border border-[#E5E2DC]'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#666461] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sports events..."
              className="w-full bg-white text-[#121212] text-xs pl-9 pr-4 py-2 rounded-xl border border-[#E5E2DC] focus:outline-none focus:border-[#121212]"
            />
          </div>
          <FestivalPassCategory events={events} onSelectEvent={onSelectEvent} triggerLabel="Festival Pass" />
        </div>

        {/* Minimal Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 festival-stagger">
          {filteredEvents.map((evt) => {
            const banner = getEventBanner(evt);
            const isGlobal = isGlobalProfile(banner);
            return (
              <div
                key={evt.id}
                className="group bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-xs hover:border-[#800020] transition-colors flex flex-col justify-between"
              >
                {/* Event Photo / Global Profile Frame */}
                <div className={`relative h-48 sm:h-52 w-full overflow-hidden border-b border-[#E2E8F0] flex items-center justify-center ${
                  isGlobal ? 'bg-white p-3' : 'bg-[#0F172A]'
                }`}>
                  <img
                    src={banner}
                    alt={evt.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/global_sports_profile.jpeg';
                    }}
                    className={isGlobal ? 'w-full h-full object-contain' : 'w-full h-full object-cover group-hover:scale-103 transition-transform duration-300'}
                  />
                  {!isGlobal && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />}
                  <span className="absolute top-3 left-3 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/95 text-[#0F172A] font-bold border border-[#E2E8F0] shadow-xs">
                    {evt.category}
                  </span>
                </div>

                {/* Card Information */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-cinzel font-bold text-lg text-[#0F172A] group-hover:text-[#800020] transition-colors leading-tight">
                      {evt.title}
                    </h3>
                    <div className="text-xs text-[#64748B] space-y-0.5 mt-2 font-mono">
                      <p className="uppercase">{evt.format} EVENT</p>
                      <p>{evt.dateTime} &middot; {evt.venueName}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] flex justify-between items-center gap-2">
                    <button
                      onClick={() => onSelectEvent(evt.slug)}
                      className="text-xs font-bold text-[#0F172A] hover:text-[#800020] flex items-center space-x-1 uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => onRegister(evt)}
                      className="px-4 py-1.5 rounded-md bg-[#800020] hover:bg-[#660019] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                    >
                      Register
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
