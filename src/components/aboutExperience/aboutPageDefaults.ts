import type { AboutPageContent } from '../../types';

export const ABOUT_PAGE_DEFAULTS: AboutPageContent = {
  sections: [
    { id: 'hero', eyebrow: 'R.V.R. & J.C. COLLEGE OF ENGINEERING', title: 'THIS IS COLORIDO.', subtitle: '2K26', description: 'A national college festival where sport, culture, creativity and community meet.', image: '/colorido_original.png', published: true, order: 0 },
    { id: 'statement', eyebrow: 'MORE THAN AN EVENT', title: 'IT’S AN EXPERIENCE.', subtitle: 'ENTER · DISCOVER · FEEL', description: 'A shared campus celebration shaped by the people who take part.', image: '/image5.jpg', published: true, order: 1 },
    { id: 'introduction', eyebrow: 'COLORIDO 2K26', title: 'WHAT IS COLORIDO?', subtitle: 'Competition. Creativity. Culture.', description: 'COLORIDO 2K26 brings together competition, creativity, culture and student spirit in one celebration.', image: '/rvr_college_hero.jpg', published: true, order: 2 },
    { id: 'worlds', eyebrow: 'THREE WORLDS · ONE FESTIVAL', title: 'COMPETE. CREATE. CELEBRATE.', subtitle: 'Sports · Cultural activities · Festival experience', description: 'Explore the live sports and cultural programme, then meet the moments around it.', image: '/image1.jpg', published: true, order: 3 },
    { id: 'sports', eyebrow: 'THE SPORTS EXPERIENCE', title: 'COMPETE.', subtitle: 'WHERE EVERY SECOND COUNTS.', description: 'Discover the sports events currently listed for COLORIDO 2K26.', image: '/image6.jpg', published: true, order: 4 },
    { id: 'cultural', eyebrow: 'THE CULTURAL EXPERIENCE', title: 'CREATE.', subtitle: 'WHERE EVERY PERFORMANCE SPEAKS.', description: 'Discover the cultural events currently listed for COLORIDO 2K26.', image: '/image4.jpg', published: true, order: 5 },
    { id: 'night', eyebrow: 'MUSIC · LIGHTS · PERFORMANCES · FRIENDSHIP', title: 'WHEN THE SUN GOES DOWN…', subtitle: 'COLORIDO COMES ALIVE.', description: 'The festival atmosphere carries from the campus into the night.', image: '/image4.jpg', published: true, order: 6 },
    { id: 'people', eyebrow: 'STUDENT-LED', title: 'MADE BY STUDENTS.', subtitle: 'POWERED BY PASSION.', description: 'Meet the people the Secretariat has chosen to introduce.', image: '/image3.jpg', published: true, order: 7 },
    { id: 'college', eyebrow: 'R.V.R. & J.C. COLLEGE OF ENGINEERING', title: 'BUILT AT R.V.R. & J.C.', subtitle: 'GUNTUR, ANDHRA PRADESH', description: 'COLORIDO 2K26 is hosted at R.V.R. & J.C. College of Engineering.', image: '/rvr_college_hero.jpg', published: true, order: 8 },
    { id: 'dna', eyebrow: 'THE COLORIDO DNA', title: 'WHAT BRINGS US TOGETHER.', subtitle: 'COMPETITION · CULTURE · CREATIVITY · COMMUNITY · CELEBRATION', description: 'Five ideas at the heart of the festival.', image: '/colorido_original.png', published: true, order: 9 },
    { id: 'journey', eyebrow: 'A DAY AT COLORIDO', title: 'THE FESTIVAL JOURNEY.', subtitle: 'MORNING TO NIGHT', description: 'Follow the festival through its published moments. No event timings are assumed.', image: '/image5.jpg', published: true, order: 10 },
    { id: 'memories', eyebrow: 'PUBLISHED · HIGHLIGHTED GALLERY MEDIA', title: 'SOME MOMENTS DESERVE TO STAY.', subtitle: 'MEMORIES FROM COLORIDO', description: 'Selected memories come directly from the published festival gallery.', image: '/colorido_original.png', published: true, order: 11 },
    { id: 'future', eyebrow: 'THE STORY CONTINUES', title: 'THIS IS ONLY THE BEGINNING.', subtitle: 'COLORIDO 2K26', description: 'Continue exploring the festival.', image: '/image5.jpg', published: true, order: 12 },
    { id: 'cta', eyebrow: 'JOIN THE STORY', title: 'READY TO BE PART OF THE STORY?', subtitle: 'EXPLORE EVENTS · VIEW GALLERY', description: 'Find your way into the COLORIDO 2K26 experience.', image: '/colorido_original.png', published: true, order: 13 },
  ],
  worlds: [
    { id: 'compete', title: 'COMPETE', label: 'Sports', description: 'Meet the challenge in the COLORIDO sports programme.', image: '/image6.jpg', href: 'sports', published: true, order: 0 },
    { id: 'create', title: 'CREATE', label: 'Cultural activities', description: 'Celebrate expression, performance and imagination.', image: '/image4.jpg', href: 'cultural', published: true, order: 1 },
    { id: 'celebrate', title: 'CELEBRATE', label: 'Festival experience', description: 'The people, atmosphere and moments that bring the fest together.', image: '/image3.jpg', href: 'night', published: true, order: 2 },
  ],
  people: [],
  journey: [
    { id: 'morning', phase: 'MORNING', title: 'THE CAMPUS AWAKENS', description: 'A new day of COLORIDO begins.', published: true, order: 0 },
    { id: 'afternoon', phase: 'AFTERNOON', title: 'THE COMPETITIONS BEGIN', description: 'Teams and performers take their place.', published: true, order: 1 },
    { id: 'evening', phase: 'EVENING', title: 'THE STAGE COMES ALIVE', description: 'The campus shifts toward the performances.', published: true, order: 2 },
    { id: 'night', phase: 'NIGHT', title: 'THE CELEBRATION CONTINUES', description: 'The festival closes the day together.', published: true, order: 3 },
  ],
  dna: ['COMPETITION', 'CULTURE', 'CREATIVITY', 'COMMUNITY', 'CELEBRATION'],
  selectedSportsEventIds: [],
  selectedCulturalEventIds: [],
  selectedMemoryIds: [],
  collegeWebsite: '',
};

export function normalizeAboutPageContent(value?: Partial<AboutPageContent> | null): AboutPageContent {
  const savedSections = Array.isArray(value?.sections) ? value.sections : [];
  const mergedSections = ABOUT_PAGE_DEFAULTS.sections.map(defaultSection => ({
    ...defaultSection,
    ...savedSections.find(section => section.id === defaultSection.id),
  }));
  const knownIds = new Set(mergedSections.map(section => section.id));
  const extraSections = savedSections.filter(section => !knownIds.has(section.id));

  return {
    ...structuredClone(ABOUT_PAGE_DEFAULTS),
    ...value,
    sections: [...mergedSections, ...extraSections],
    worlds: Array.isArray(value?.worlds) ? value.worlds : structuredClone(ABOUT_PAGE_DEFAULTS.worlds),
    people: Array.isArray(value?.people) ? value.people : [],
    journey: Array.isArray(value?.journey) ? value.journey : structuredClone(ABOUT_PAGE_DEFAULTS.journey),
    dna: Array.isArray(value?.dna) ? value.dna : [...ABOUT_PAGE_DEFAULTS.dna],
    selectedSportsEventIds: Array.isArray(value?.selectedSportsEventIds) ? value.selectedSportsEventIds : [],
    selectedCulturalEventIds: Array.isArray(value?.selectedCulturalEventIds) ? value.selectedCulturalEventIds : [],
    selectedMemoryIds: Array.isArray(value?.selectedMemoryIds) ? value.selectedMemoryIds : [],
    collegeWebsite: typeof value?.collegeWebsite === 'string' ? value.collegeWebsite : '',
  };
}
