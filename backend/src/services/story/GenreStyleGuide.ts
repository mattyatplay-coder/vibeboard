/**
 * GenreStyleGuide - Comprehensive storytelling and visual style reference system
 *
 * Integrates:
 * - Genre-specific storytelling conventions
 * - Director visual styles (Wes Anderson, Denis Villeneuve, etc.)
 * - Cinematographer references
 * - Pixar 22 Rules of Storytelling
 * - Script analysis for voice/tone matching
 */

// ═══════════════════════════════════════════════════════════════════════════
// PIXAR 22 RULES OF STORYTELLING
// ═══════════════════════════════════════════════════════════════════════════

export const PIXAR_STORYTELLING_RULES = [
  {
    rule: 1,
    title: 'Admiration Over Success',
    description: 'You admire a character for trying more than for their successes.',
    application:
      'Show characters struggling, failing, and persisting. The effort matters more than the outcome.',
  },
  {
    rule: 2,
    title: 'Audience Interest',
    description:
      "Keep in mind what's interesting to you as an audience, not what's fun to do as a writer.",
    application: 'Always ask: would I want to watch this? Cut self-indulgent scenes.',
  },
  {
    rule: 3,
    title: 'Theme Discovery',
    description:
      "Trying for theme is important, but you won't see what the story is actually about til you're at the end of it.",
    application: "Write the draft, then refine theme in revision. Don't force meaning.",
  },
  {
    rule: 4,
    title: 'Story Spine',
    description:
      'Once upon a time there was ___. Every day, ___. One day ___. Because of that, ___. Until finally ___.',
    application: 'Use this formula to structure any story. Fill in the blanks for clarity.',
  },
  {
    rule: 5,
    title: 'Simplify and Focus',
    description: 'Simplify. Focus. Combine characters. Hop over detours.',
    application: 'Cut unnecessary subplots and characters. Every element must serve the story.',
  },
  {
    rule: 6,
    title: 'Challenge Your Characters',
    description: 'What is your character good at, comfortable with? Throw the opposite at them.',
    application: 'Fish out of water scenarios. Make the introvert perform publicly.',
  },
  {
    rule: 7,
    title: 'Ending Before Middle',
    description: 'Come up with your ending before you figure out your middle.',
    application: "Know where you're going. The ending informs all choices.",
  },
  {
    rule: 8,
    title: 'Finish and Move On',
    description:
      "Finish your story, let go even if it's not perfect. In an ideal world you have both, but move on.",
    application: 'Done is better than perfect. Ship it.',
  },
  {
    rule: 9,
    title: 'Break the Block',
    description: "When you're stuck, make a list of what WOULDN'T happen next.",
    application: "Elimination reveals possibilities. What definitely won't happen?",
  },
  {
    rule: 10,
    title: 'Internalize Stories You Like',
    description: 'Pull apart the stories you like. What you like in them is a part of you.',
    application: 'Study why certain stories resonate. Those elements are your voice.',
  },
  {
    rule: 11,
    title: 'Write It Down',
    description:
      "Putting it on paper lets you start fixing it. If it stays in your head, it's a perfect idea you'll never share.",
    application: 'Externalize ideas immediately. Perfect is the enemy of done.',
  },
  {
    rule: 12,
    title: 'Discount First Ideas',
    description:
      'Discount the 1st thing that comes to mind. And the 2nd, 3rd, 4th, 5th – get the obvious out of the way.',
    application: 'Push past clichés. The 6th idea is usually the interesting one.',
  },
  {
    rule: 13,
    title: 'Give Characters Opinions',
    description:
      "Give your characters opinions. Passive/malleable might seem likable to you as you write, but it's poison to the audience.",
    application: 'Characters must want things strongly. No wishy-washy protagonists.',
  },
  {
    rule: 14,
    title: 'Why This Story?',
    description:
      "Why must you tell THIS story? What's the belief burning within you that your story feeds off of?",
    application: 'Connect to personal truth. Stories need authentic emotional cores.',
  },
  {
    rule: 15,
    title: 'Character Empathy',
    description:
      'If you were your character, in this situation, how would you feel? Honesty lends credibility.',
    application: 'Feel what your characters feel. Authentic emotion resonates.',
  },
  {
    rule: 16,
    title: 'Stakes and Failure',
    description:
      "What are the stakes? Give us reason to root for the character. What happens if they don't succeed?",
    application: 'Establish clear consequences. The audience must fear failure.',
  },
  {
    rule: 17,
    title: 'No Wasted Work',
    description:
      "No work is ever wasted. If it's not working, let go and move on – it'll come back around to be useful later.",
    application: 'Save cut scenes. They often inspire future work.',
  },
  {
    rule: 18,
    title: 'Know Yourself',
    description:
      'You have to know yourself: the difference between doing your best & fussing. Story is testing, not refining.',
    application: 'Know when to stop polishing. Testing beats perfecting.',
  },
  {
    rule: 19,
    title: 'Coincidence Complications',
    description:
      'Coincidences to get characters into trouble are great; coincidences to get them out of it are cheating.',
    application: 'Characters must solve their own problems. No deus ex machina.',
  },
  {
    rule: 20,
    title: 'Exercise: Deconstruct Movies',
    description:
      'Take the building blocks of a movie you dislike. How would you rearrange them into what you DO like?',
    application: 'Learn from bad examples. Reconstruction teaches structure.',
  },
  {
    rule: 21,
    title: 'Identify With Characters',
    description:
      "You gotta identify with your situation/characters, can't just write 'cool'. What would make YOU act that way?",
    application: 'Ground fantastical situations in real emotion.',
  },
  {
    rule: 22,
    title: 'Story Essence',
    description:
      "What's the essence of your story? Most economical telling of it? If you know that, you can build out from there.",
    application: 'Distill to one sentence. Everything else supports that core.',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// DIRECTOR VISUAL STYLES
// ═══════════════════════════════════════════════════════════════════════════

export interface DirectorStyle {
  name: string;
  knownFor: string[];
  visualSignature: string[];
  colorPalette: string[];
  cameraWork: string[];
  lightingStyle: string[];
  compositionRules: string[];
  moodKeywords: string[];
  promptPrefix: string;
  genres: string[];
}

export const DIRECTOR_STYLES: Record<string, DirectorStyle> = {
  'wes-anderson': {
    name: 'Wes Anderson',
    knownFor: [
      'The Grand Budapest Hotel',
      'Moonrise Kingdom',
      'The Royal Tenenbaums',
      'Fantastic Mr. Fox',
      'Isle of Dogs',
    ],
    visualSignature: [
      'Symmetrical framing',
      'Centered subjects',
      'Flat, tableau-like compositions',
      'Whimsical miniature aesthetic',
      'Elaborate tracking shots',
      'Handwritten text overlays',
    ],
    colorPalette: [
      'Pastel pink',
      'Mint green',
      'Mustard yellow',
      'Coral',
      'Powder blue',
      'Cream',
      'Terracotta',
      'Burgundy',
      'Seafoam',
      'Mauve',
    ],
    cameraWork: [
      'Perfectly centered frames',
      'Flat, frontal compositions',
      'Lateral tracking shots',
      'Snap zooms',
      "Overhead bird's-eye views",
      'Planimetric framing',
    ],
    lightingStyle: [
      'Soft, even lighting',
      'No harsh shadows',
      'Storybook quality light',
      'Warm, nostalgic tones',
    ],
    compositionRules: [
      'Perfect bilateral symmetry',
      'Characters face camera directly',
      'Geometric precision',
      'Layered depth with distinct planes',
      'Miniature diorama aesthetic',
    ],
    moodKeywords: ['whimsical', 'nostalgic', 'melancholic', 'quirky', 'bittersweet', 'deadpan'],
    promptPrefix:
      'Wes Anderson style, symmetrical composition, pastel color palette, centered framing, whimsical aesthetic, storybook quality,',
    genres: ['Comedy', 'Drama', 'Animation'],
  },
  'denis-villeneuve': {
    name: 'Denis Villeneuve',
    knownFor: ['Blade Runner 2049', 'Dune', 'Arrival', 'Sicario', 'Prisoners'],
    visualSignature: [
      'Vast, imposing landscapes',
      'Minimalist compositions',
      'Monumental architecture',
      'Geometric shapes',
      'Atmospheric haze',
      'Silhouettes against light',
    ],
    colorPalette: [
      'Orange and teal',
      'Desaturated earth tones',
      'Golden hour amber',
      'Cold steel blue',
      'Sand beige',
      'Smoke gray',
      'Burnt sienna',
    ],
    cameraWork: [
      'Slow, deliberate camera movements',
      'Extreme wide shots establishing scale',
      'Long takes',
      'Aerial perspectives',
      'Steady, hypnotic pacing',
    ],
    lightingStyle: [
      'Strong directional light',
      'Volumetric lighting through dust/fog',
      'Harsh desert sun',
      'Neon in darkness',
      'Chiaroscuro contrast',
    ],
    compositionRules: [
      'Tiny figures in vast spaces',
      'Strong geometric shapes',
      'Negative space dominance',
      'Architectural framing',
      'Rule of thirds with emphasis on empty space',
    ],
    moodKeywords: ['epic', 'contemplative', 'ominous', 'sublime', 'existential', 'awe-inspiring'],
    promptPrefix:
      'Denis Villeneuve cinematography, epic scale, atmospheric, volumetric lighting, vast landscapes, minimalist composition,',
    genres: ['Sci-Fi', 'Thriller', 'Drama'],
  },
  'christopher-nolan': {
    name: 'Christopher Nolan',
    knownFor: ['Inception', 'Interstellar', 'The Dark Knight', 'Dunkirk', 'Oppenheimer'],
    visualSignature: [
      'IMAX large format photography',
      'Practical effects over CGI',
      'Complex non-linear narratives',
      'Rotating/tilting environments',
      'Time manipulation visuals',
    ],
    colorPalette: [
      'Steel blue',
      'Warm amber',
      'Deep black',
      'Cool gray',
      'Desaturated tones',
      'High contrast',
    ],
    cameraWork: [
      'Handheld intensity',
      'Sweeping aerial shots',
      'Zero-gravity sequences',
      'Time-lapse',
      'Rotating sets',
    ],
    lightingStyle: [
      'Natural light preference',
      'High contrast',
      'Practical light sources',
      'Dramatic shadows',
    ],
    compositionRules: [
      'IMAX aspect ratio framing',
      'Depth through layered action',
      'Environmental storytelling',
      'Scale through human reference',
    ],
    moodKeywords: ['cerebral', 'intense', 'epic', 'mind-bending', 'visceral', 'profound'],
    promptPrefix:
      'Christopher Nolan style, IMAX quality, practical effects, high contrast, epic scale, cerebral intensity,',
    genres: ['Sci-Fi', 'Thriller', 'Action', 'Drama'],
  },
  'david-fincher': {
    name: 'David Fincher',
    knownFor: ['Fight Club', 'Se7en', 'Gone Girl', 'The Social Network', 'Zodiac'],
    visualSignature: [
      'Meticulously controlled lighting',
      'Invisible camera movements',
      'Desaturated color grade',
      'Perfect precision in every frame',
      'Digital sharpness',
    ],
    colorPalette: [
      'Sickly yellow-green',
      'Cold blue',
      'Muddy brown',
      'Desaturated',
      'Processed colors',
      'Dark shadows',
    ],
    cameraWork: [
      'Smooth, invisible dolly moves',
      'Perfect steadicam',
      'CGI-enhanced camera flights',
      'Static tension shots',
      'Impossible camera moves',
    ],
    lightingStyle: [
      'Motivated practical lighting',
      'Pools of light in darkness',
      'Fluorescent sickness',
      'Controlled shadows',
      'Low-key noir influence',
    ],
    compositionRules: [
      'Mathematical precision',
      'Framing that creates unease',
      'Depth through lighting',
      'Clinical detachment',
    ],
    moodKeywords: ['meticulous', 'unsettling', 'clinical', 'obsessive', 'dark', 'precise'],
    promptPrefix:
      'David Fincher style, meticulously lit, desaturated colors, clinical precision, dark atmosphere, controlled composition,',
    genres: ['Thriller', 'Drama', 'Horror', 'Noir'],
  },
  'terrence-malick': {
    name: 'Terrence Malick',
    knownFor: ['The Tree of Life', 'The Thin Red Line', 'Badlands', 'Days of Heaven'],
    visualSignature: [
      'Magic hour photography',
      'Natural light only',
      'Poetic voiceover',
      'Nature as character',
      'Ethereal, dreamlike quality',
    ],
    colorPalette: [
      'Golden hour warmth',
      'Natural greens',
      'Sky blues',
      'Earth tones',
      'Soft pastels',
      'Organic colors',
    ],
    cameraWork: [
      'Floating steadicam',
      'Natural, observational style',
      'Circling subjects',
      'Looking up at sky/trees',
      'Intimate handheld',
    ],
    lightingStyle: [
      'Exclusively natural light',
      'Golden hour obsession',
      'Backlit silhouettes',
      'Dappled sunlight',
      'God rays through nature',
    ],
    compositionRules: [
      'Wide angle close-ups',
      'Subjects off-center',
      'Sky in every frame',
      'Nature dominating',
      'Impressionistic framing',
    ],
    moodKeywords: [
      'meditative',
      'spiritual',
      'lyrical',
      'transcendent',
      'contemplative',
      'ethereal',
    ],
    promptPrefix:
      'Terrence Malick style, golden hour lighting, natural light, ethereal atmosphere, poetic composition, dreamlike quality,',
    genres: ['Drama', 'Romance', 'Fantasy'],
  },
  'stanley-kubrick': {
    name: 'Stanley Kubrick',
    knownFor: ['2001: A Space Odyssey', 'The Shining', 'A Clockwork Orange', 'Full Metal Jacket'],
    visualSignature: [
      'One-point perspective',
      'Symmetrical compositions',
      'Unsettling wide-angle lenses',
      'Slow zooms',
      'Long Steadicam tracking shots',
    ],
    colorPalette: [
      'Bold primary colors',
      'Clinical whites',
      'Ominous reds',
      'Cold institutional tones',
      'Stark contrast',
    ],
    cameraWork: [
      'Steady tracking shots',
      'Slow deliberate zooms',
      'Static tableau compositions',
      'Low angle power shots',
      'Symmetrical framing',
    ],
    lightingStyle: [
      'Practical light sources only',
      'Candlelight scenes',
      'Stark overhead fluorescents',
      'High contrast',
      'Unnatural color casts',
    ],
    compositionRules: [
      'Vanishing point perspective',
      'Perfect symmetry',
      'Subjects centered in corridors',
      'Geometric precision',
      'Unsettling angles',
    ],
    moodKeywords: ['unsettling', 'cold', 'clinical', 'obsessive', 'dystopian', 'hypnotic'],
    promptPrefix:
      'Stanley Kubrick style, one-point perspective, symmetrical composition, unsettling atmosphere, clinical precision, bold colors,',
    genres: ['Sci-Fi', 'Horror', 'Drama', 'Thriller'],
  },
  'ridley-scott': {
    name: 'Ridley Scott',
    knownFor: ['Blade Runner', 'Alien', 'Gladiator', 'The Martian', 'Kingdom of Heaven'],
    visualSignature: [
      'Smoke and atmosphere',
      'Backlighting through haze',
      'Industrial environments',
      'Epic battle sequences',
      'Detailed world-building',
    ],
    colorPalette: [
      'Blue noir',
      'Golden antiquity',
      'Industrial gray',
      'Amber warmth',
      'Neon accents',
      'Dusty earth',
    ],
    cameraWork: [
      'Slow revealing crane shots',
      'Atmospheric wide shots',
      'Intimate handheld action',
      'Aerial establishing shots',
    ],
    lightingStyle: [
      'Volumetric shafts of light',
      'Smoke-filled atmospherics',
      'Backlit silhouettes',
      'Practical neon',
      'Harsh sun through windows',
    ],
    compositionRules: [
      'Layered depth through atmosphere',
      'Environmental framing',
      'Scale through architecture',
      'Gothic grandeur',
    ],
    moodKeywords: ['epic', 'atmospheric', 'gritty', 'immersive', 'grand', 'textured'],
    promptPrefix:
      'Ridley Scott style, atmospheric lighting, smoke and haze, epic scale, detailed environments, volumetric light shafts,',
    genres: ['Sci-Fi', 'Action', 'Drama', 'Fantasy'],
  },
  'quentin-tarantino': {
    name: 'Quentin Tarantino',
    knownFor: [
      'Pulp Fiction',
      'Kill Bill',
      'Inglourious Basterds',
      'Django Unchained',
      'Once Upon a Time in Hollywood',
    ],
    visualSignature: [
      '70mm film grain',
      'Chapter title cards',
      'Trunk shots',
      'Split diopter',
      'Feet close-ups',
      'Mexican standoffs',
    ],
    colorPalette: [
      'Saturated primaries',
      '70s browns',
      'Blood red',
      'Grindhouse yellow',
      'Retro warmth',
    ],
    cameraWork: [
      'Long unbroken takes',
      'Low angle "trunk shots"',
      'Crash zooms',
      '360-degree tracking',
      'Split screen',
    ],
    lightingStyle: [
      'Stylized genre lighting',
      'Noir shadows',
      'Saturated color gels',
      '70s warm tones',
    ],
    compositionRules: [
      'Characters framed in conversation',
      'Deep focus dialogue',
      'Profile two-shots',
      'Extreme close-ups',
    ],
    moodKeywords: ['stylized', 'violent', 'witty', 'retro', 'referential', 'pulpy'],
    promptPrefix:
      'Quentin Tarantino style, 70mm film grain, stylized violence, retro aesthetic, saturated colors, genre homage,',
    genres: ['Action', 'Thriller', 'Western', 'Drama'],
  },
  'wong-kar-wai': {
    name: 'Wong Kar-wai',
    knownFor: ['In the Mood for Love', 'Chungking Express', '2046', 'Happy Together'],
    visualSignature: [
      'Step-printed slow motion',
      'Neon-lit nightscapes',
      'Cramped Hong Kong interiors',
      'Smoke and rain',
      'Reflections and glass',
    ],
    colorPalette: [
      'Saturated neon',
      'Rich reds',
      'Deep greens',
      'Midnight blue',
      'Film noir shadows',
      'Warm amber',
    ],
    cameraWork: [
      'Handheld intimacy',
      'Step-printing effect',
      'Slow motion romance',
      'Through glass and mirrors',
    ],
    lightingStyle: [
      'Neon from signs',
      'Practical light only',
      'Color gels',
      'Shadows concealing faces',
    ],
    compositionRules: [
      'Framing through doorways',
      'Obscured faces',
      'Reflections as metaphor',
      'Negative space longing',
    ],
    moodKeywords: ['romantic', 'melancholic', 'nostalgic', 'sensual', 'lonely', 'yearning'],
    promptPrefix:
      'Wong Kar-wai style, neon-lit, step-printed motion, romantic melancholy, rich saturated colors, intimate framing,',
    genres: ['Romance', 'Drama'],
  },
  'hayao-miyazaki': {
    name: 'Hayao Miyazaki / Studio Ghibli',
    knownFor: ['Spirited Away', 'My Neighbor Totoro', 'Princess Mononoke', "Howl's Moving Castle"],
    visualSignature: [
      'Hand-drawn animation',
      'Lush natural environments',
      'Flying sequences',
      'Food rendered lovingly',
      'Magical realism',
    ],
    colorPalette: [
      'Vibrant greens',
      'Sky blues',
      'Sunset oranges',
      'Soft pastels',
      'Natural earth tones',
      'Magical purples',
    ],
    cameraWork: [
      'Sweeping aerial flights',
      'Patient environmental pans',
      'Character-focused close-ups',
      'Wind animation',
    ],
    lightingStyle: [
      'Soft, natural light',
      'Magical glows',
      'Dramatic weather',
      'Golden afternoons',
    ],
    compositionRules: [
      'Characters small in vast nature',
      'Detailed backgrounds',
      'Weather as emotion',
      'Peaceful mundane moments',
    ],
    moodKeywords: ['magical', 'peaceful', 'adventurous', 'nostalgic', 'environmental', 'wonder'],
    promptPrefix:
      'Studio Ghibli style, Hayao Miyazaki, hand-drawn animation aesthetic, lush natural environments, magical realism, vibrant colors,',
    genres: ['Animation', 'Fantasy', 'Drama'],
  },
  'spike-jonze': {
    name: 'Spike Jonze',
    knownFor: ['Her', 'Being John Malkovich', 'Where the Wild Things Are', 'Adaptation'],
    visualSignature: [
      'Saturated warm tones',
      'Intimate handheld',
      'Retro-futurism',
      'Practical effects',
      'Emotional authenticity',
    ],
    colorPalette: [
      'Warm oranges',
      'Soft reds',
      'Cream whites',
      'Muted pastels',
      'Nostalgic warmth',
    ],
    cameraWork: [
      'Documentary-style handheld',
      'Intimate close-ups',
      'Natural movements',
      'Observational style',
    ],
    lightingStyle: ['Soft, diffused light', 'Window light', 'Warm practicals', 'Natural ambiance'],
    compositionRules: [
      'Characters centered emotionally',
      'Environmental context',
      'Intimate framing',
      'Humanistic approach',
    ],
    moodKeywords: ['intimate', 'melancholic', 'whimsical', 'humanistic', 'tender', 'surreal'],
    promptPrefix:
      'Spike Jonze style, warm saturated tones, intimate framing, retro-futuristic, emotional authenticity, humanistic,',
    genres: ['Drama', 'Romance', 'Comedy', 'Sci-Fi'],
  },
  'coen-brothers': {
    name: 'Coen Brothers',
    knownFor: [
      'No Country for Old Men',
      'Fargo',
      'The Big Lebowski',
      'True Grit',
      'Inside Llewyn Davis',
    ],
    visualSignature: [
      'Wide-angle distortion',
      'Dark humor in framing',
      'Regional authenticity',
      'Stark landscapes',
      'Precise composition',
    ],
    colorPalette: [
      'Earthy browns',
      'Cold blues',
      'Snowy whites',
      'Desert tans',
      'Period-accurate tones',
    ],
    cameraWork: [
      'Smooth dolly moves',
      'Low-angle menace',
      'Wide establishing shots',
      'POV tension',
    ],
    lightingStyle: [
      'Harsh natural light',
      'Noir shadows',
      'Practical sources',
      'Environmental authenticity',
    ],
    compositionRules: [
      'Characters isolated in frame',
      'Environmental storytelling',
      'Symmetry with unease',
      'Genre homage framing',
    ],
    moodKeywords: ['darkly comic', 'fatalistic', 'quirky', 'violent', 'absurd', 'deadpan'],
    promptPrefix:
      'Coen Brothers style, wide-angle composition, dark humor, regional authenticity, stark landscapes, precise framing,',
    genres: ['Thriller', 'Comedy', 'Western', 'Noir', 'Drama'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CINEMATOGRAPHER STYLES
// ═══════════════════════════════════════════════════════════════════════════

export interface CinematographerStyle {
  name: string;
  knownFor: string[];
  signature: string[];
  lightingApproach: string[];
  preferredAspectRatios: string[];
  promptKeywords: string[];
}

export const CINEMATOGRAPHER_STYLES: Record<string, CinematographerStyle> = {
  'roger-deakins': {
    name: 'Roger Deakins',
    knownFor: ['Blade Runner 2049', '1917', 'Skyfall', 'No Country for Old Men', 'Sicario'],
    signature: [
      'Motivated natural lighting',
      'Single source illumination',
      'Architectural framing',
      'Atmospheric depth',
      'Painterly compositions',
    ],
    lightingApproach: [
      'One strong key light',
      'Practical motivation',
      'Soft fill or none',
      'Silhouettes in doorways',
      'Window light mastery',
    ],
    preferredAspectRatios: ['2.39:1', '1.85:1'],
    promptKeywords: [
      'Roger Deakins cinematography',
      'single source lighting',
      'painterly',
      'atmospheric',
      'motivated lighting',
    ],
  },
  'emmanuel-lubezki': {
    name: 'Emmanuel "Chivo" Lubezki',
    knownFor: ['The Revenant', 'Gravity', 'Children of Men', 'Birdman', 'Tree of Life'],
    signature: [
      'Natural light exclusively',
      'Extremely long takes',
      'Wide-angle intimacy',
      'Floating camera',
      'Magic hour obsession',
    ],
    lightingApproach: [
      'Only natural or practical light',
      'Fire and candlelight',
      'Overcast soft light',
      'Golden/blue hour',
      'No artificial fill',
    ],
    preferredAspectRatios: ['2.39:1', '1.85:1'],
    promptKeywords: [
      'Lubezki cinematography',
      'natural light only',
      'long take',
      'wide-angle',
      'magic hour',
    ],
  },
  'janusz-kaminski': {
    name: 'Janusz Kamiński',
    knownFor: ["Schindler's List", 'Saving Private Ryan', 'Minority Report', 'Lincoln'],
    signature: [
      'Harsh backlight',
      'Smoke and atmosphere',
      'Bleached highlights',
      'Gritty texture',
      'God rays',
    ],
    lightingApproach: [
      'Strong backlight',
      'Smoke diffusion',
      'Overexposed highlights',
      'High contrast',
      'Shafts of light',
    ],
    preferredAspectRatios: ['1.85:1', '2.39:1'],
    promptKeywords: [
      'Kamiński cinematography',
      'harsh backlight',
      'bleached highlights',
      'atmospheric smoke',
      'God rays',
    ],
  },
  'hoyte-van-hoytema': {
    name: 'Hoyte van Hoytema',
    knownFor: ['Interstellar', 'Dunkirk', 'Oppenheimer', 'Her', 'Spectre'],
    signature: [
      'IMAX large format',
      'Natural lighting',
      'Intimate even in epic',
      'Texture and grain',
      'Practical in-camera',
    ],
    lightingApproach: [
      'Natural light preference',
      'Practical sources',
      'Soft even exposure',
      'Available light documentary style',
    ],
    preferredAspectRatios: ['1.43:1 IMAX', '2.39:1'],
    promptKeywords: [
      'Hoytema cinematography',
      'IMAX quality',
      'natural light',
      'intimate epic',
      'textured',
    ],
  },
  'bradford-young': {
    name: 'Bradford Young',
    knownFor: ['Arrival', 'Selma', 'Solo: A Star Wars Story', 'When They See Us'],
    signature: [
      'Underexposed shadows',
      'Rich dark skin tones',
      'Intimate portraits',
      'Soft diffused light',
      'Emotional darkness',
    ],
    lightingApproach: [
      'Underexposure as aesthetic',
      'Soft window light',
      'Rich shadows',
      'Faces emerging from darkness',
    ],
    preferredAspectRatios: ['2.39:1', '1.85:1'],
    promptKeywords: [
      'Bradford Young cinematography',
      'underexposed',
      'rich shadows',
      'intimate portraits',
      'soft diffused',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GENRE STYLE GUIDES
// ═══════════════════════════════════════════════════════════════════════════

export interface GenreGuide {
  genre: string;
  description: string;
  storytellingConventions: string[];
  visualTropes: string[];
  pacing: string;
  archetypes: string[];
  emotionalBeats: string[];
  suggestedDirectors: string[];
  suggestedCinematographers: string[];
  colorPalette: string[];
  lightingMoods: string[];
  promptPrefix: string;
  negativePrompt: string;
}

export const GENRE_GUIDES: Record<string, GenreGuide> = {
  noir: {
    genre: 'Noir',
    description:
      'Dark, cynical crime dramas featuring morally ambiguous protagonists, femme fatales, and shadowy urban settings.',
    storytellingConventions: [
      'Voiceover narration from cynical protagonist',
      'Non-linear flashback structure',
      'Morally ambiguous characters',
      'Femme fatale manipulator',
      'Doomed protagonist',
      'Crime and corruption themes',
      'Fate and destiny motifs',
    ],
    visualTropes: [
      'High contrast black and white or desaturated color',
      'Venetian blind shadows',
      'Rain-slicked streets',
      'Neon signs reflecting in puddles',
      'Cigarette smoke curling',
      'Tilted "Dutch angles"',
      'Deep shadows hiding faces',
    ],
    pacing: 'Slow burn tension with sudden violence',
    archetypes: ['Private detective', 'Femme fatale', 'Corrupt official', 'Fall guy', 'Crime boss'],
    emotionalBeats: ['Cynicism', 'Betrayal', 'Obsession', 'Doom', 'Moral compromise'],
    suggestedDirectors: ['david-fincher', 'coen-brothers'],
    suggestedCinematographers: ['roger-deakins', 'janusz-kaminski'],
    colorPalette: ['Deep black', 'Silver gray', 'Blood red accents', 'Neon glow', 'Smoke white'],
    lightingMoods: [
      'Low-key',
      'Hard shadows',
      'Single source',
      'Silhouettes',
      'Venetian blind patterns',
    ],
    promptPrefix:
      'film noir style, high contrast, deep shadows, 1940s aesthetic, rain-slicked streets, neon glow, cigarette smoke,',
    negativePrompt: 'bright, cheerful, saturated colors, daylight, happy, cartoon',
  },
  action: {
    genre: 'Action',
    description:
      'High-energy films featuring physical feats, combat, chases, and explosive set pieces.',
    storytellingConventions: [
      'Clear hero vs villain conflict',
      'Escalating stakes',
      'Ticking clock urgency',
      'Training/preparation montage',
      'Betrayal from ally',
      'Final confrontation climax',
    ],
    visualTropes: [
      'Wide shots of destruction',
      'Quick cutting during fights',
      'Slow-motion impact moments',
      'Practical stunts',
      'Vehicle chases',
      'Explosions and debris',
    ],
    pacing: 'Fast-paced with brief quiet moments',
    archetypes: [
      'Reluctant hero',
      'Sidekick',
      'Mastermind villain',
      'Love interest in danger',
      'Mentor figure',
    ],
    emotionalBeats: ['Adrenaline', 'Triumph', 'Sacrifice', 'Revenge', 'Survival'],
    suggestedDirectors: ['christopher-nolan', 'ridley-scott', 'quentin-tarantino'],
    suggestedCinematographers: ['hoyte-van-hoytema', 'janusz-kaminski'],
    colorPalette: ['Steel blue', 'Explosion orange', 'Military green', 'Night black', 'Fire red'],
    lightingMoods: ['High contrast', 'Practical explosions', 'Blue hour', 'Emergency lighting'],
    promptPrefix:
      'action movie style, dynamic composition, high energy, dramatic lighting, epic scale, cinematic,',
    negativePrompt: 'static, boring, peaceful, slow, mundane',
  },
  horror: {
    genre: 'Horror',
    description:
      'Films designed to frighten and unsettle through supernatural or psychological threats.',
    storytellingConventions: [
      'Isolated setting',
      'Warnings ignored',
      'Escalating dread',
      'False safety moments',
      'Revelation of monster/threat',
      'Survivor girl trope',
      'Ambiguous ending',
    ],
    visualTropes: [
      'Deep shadows and darkness',
      'Jump scare setups',
      'POV of threat',
      'Slow creeping camera',
      'Distorted faces',
      'Empty spaces that feel occupied',
    ],
    pacing: 'Building dread punctuated by terror',
    archetypes: ['Final girl', 'The skeptic', 'The believer', 'First victim', 'Monster/killer'],
    emotionalBeats: ['Unease', 'Dread', 'Terror', 'Disgust', 'Relief', 'Final shock'],
    suggestedDirectors: ['stanley-kubrick', 'david-fincher'],
    suggestedCinematographers: ['roger-deakins', 'bradford-young'],
    colorPalette: ['Deep black', 'Sickly green', 'Blood red', 'Pale flesh', 'Moonlight blue'],
    lightingMoods: ['Underlit', 'Flickering', 'Harsh contrast', 'Moonlight', 'Candlelight'],
    promptPrefix:
      'horror movie style, unsettling atmosphere, deep shadows, creepy, ominous lighting, dread,',
    negativePrompt: 'bright, happy, cheerful, safe, comfortable, daylight',
  },
  romance: {
    genre: 'Romance',
    description: 'Stories centered on romantic love, relationships, and emotional connection.',
    storytellingConventions: [
      'Meet cute introduction',
      'Obstacles to union',
      'Misunderstandings',
      'Grand romantic gesture',
      'Declaration of love',
      'Happy or bittersweet ending',
    ],
    visualTropes: [
      'Soft focus close-ups',
      'Golden hour lighting',
      'Rain as romantic catalyst',
      'Longing gazes',
      'Physical proximity tension',
      'Beautiful locations',
    ],
    pacing: 'Gentle rhythm with emotional crescendos',
    archetypes: [
      'Star-crossed lovers',
      'Best friend love interest',
      'Rival for affection',
      'Wise friend',
      'Disapproving parent',
    ],
    emotionalBeats: ['Attraction', 'Longing', 'Joy', 'Heartbreak', 'Reunion', 'Love'],
    suggestedDirectors: ['wong-kar-wai', 'spike-jonze', 'terrence-malick'],
    suggestedCinematographers: ['emmanuel-lubezki', 'bradford-young'],
    colorPalette: ['Warm gold', 'Soft pink', 'Sunset orange', 'Cream', 'Rose'],
    lightingMoods: ['Golden hour', 'Soft diffused', 'Candlelight', 'Fairy lights', 'Window light'],
    promptPrefix:
      'romantic movie style, soft lighting, warm tones, intimate, beautiful, emotional, golden hour,',
    negativePrompt: 'harsh, cold, violent, scary, industrial, ugly',
  },
  'sci-fi': {
    genre: 'Sci-Fi',
    description:
      "Speculative fiction exploring futuristic technology, space, time, and humanity's relationship with science.",
    storytellingConventions: [
      'World-building exposition',
      'Technology as metaphor',
      'Humanity vs machines/aliens',
      'Scientific problem solving',
      'Exploration of "what if"',
      'Commentary on present through future',
    ],
    visualTropes: [
      'Futuristic architecture',
      'Holographic displays',
      'Space vistas',
      'Clean or dystopian environments',
      'Advanced technology',
      'Alien landscapes',
    ],
    pacing: 'Thoughtful with action set pieces',
    archetypes: [
      'Scientist hero',
      'AI companion',
      'Corporate villain',
      'Alien other',
      'Chosen one',
    ],
    emotionalBeats: ['Wonder', 'Discovery', 'Existential dread', 'Hope', 'Transcendence'],
    suggestedDirectors: [
      'denis-villeneuve',
      'christopher-nolan',
      'ridley-scott',
      'stanley-kubrick',
    ],
    suggestedCinematographers: ['roger-deakins', 'hoyte-van-hoytema'],
    colorPalette: [
      'Steel blue',
      'Neon accents',
      'Space black',
      'Holographic',
      'Orange/teal contrast',
    ],
    lightingMoods: ['Volumetric', 'Neon glow', 'Starlight', 'Laboratory', 'Alien atmospheres'],
    promptPrefix:
      'science fiction style, futuristic, cinematic, epic scale, advanced technology, atmospheric,',
    negativePrompt: 'medieval, primitive, rustic, old-fashioned, hand-made',
  },
  comedy: {
    genre: 'Comedy',
    description: 'Films designed to entertain and amuse through humor, wit, and comic situations.',
    storytellingConventions: [
      'Setup and punchline structure',
      'Escalating absurdity',
      'Misunderstandings driving plot',
      'Fish out of water',
      'Rule of three',
      'Callback jokes',
    ],
    visualTropes: [
      'Bright, even lighting',
      'Wide shots for physical comedy',
      'Reaction shots',
      'Visual gags in frame',
      'Timing through editing',
    ],
    pacing: 'Brisk with comedic timing',
    archetypes: [
      'Lovable loser',
      'Straight man',
      'Wild card',
      'Authority figure to undermine',
      'Love interest',
    ],
    emotionalBeats: ['Laughter', 'Embarrassment', 'Triumph of underdog', 'Warmth', 'Surprise'],
    suggestedDirectors: ['wes-anderson', 'coen-brothers', 'spike-jonze'],
    suggestedCinematographers: ['roger-deakins'],
    colorPalette: ['Bright primaries', 'Warm tones', 'Pastels for quirky', 'Natural for grounded'],
    lightingMoods: ['Even and bright', 'Natural feeling', 'Sitcom style', 'Occasionally stylized'],
    promptPrefix: 'comedy style, bright lighting, warm tones, approachable, charming, expressive,',
    negativePrompt: 'dark, scary, depressing, violent, gritty',
  },
  thriller: {
    genre: 'Thriller',
    description:
      'Suspenseful films that keep audiences on edge through tension, mystery, and psychological stakes.',
    storytellingConventions: [
      'Mystery to unravel',
      'Red herrings',
      'Ticking clock pressure',
      'Paranoia and distrust',
      'Twist revelations',
      'Narrow escapes',
    ],
    visualTropes: [
      'Shadows concealing threats',
      'Claustrophobic framing',
      'Surveillance perspectives',
      'Faces half in shadow',
      'Empty spaces with menace',
    ],
    pacing: 'Escalating tension with brief releases',
    archetypes: [
      'Ordinary person in danger',
      'Unreliable narrator',
      'Hidden villain',
      'Helpful stranger',
      'Authority figure',
    ],
    emotionalBeats: ['Suspicion', 'Fear', 'Paranoia', 'Relief', 'Shock', 'Survival'],
    suggestedDirectors: ['david-fincher', 'christopher-nolan', 'denis-villeneuve'],
    suggestedCinematographers: ['roger-deakins', 'bradford-young'],
    colorPalette: [
      'Desaturated',
      'Cold blues',
      'Sickly yellows',
      'Clinical whites',
      'Shadow blacks',
    ],
    lightingMoods: ['Low-key', 'Motivated practical', 'Surveillance harsh', 'Interrogation style'],
    promptPrefix:
      'thriller style, suspenseful atmosphere, tense, shadows, paranoid mood, cinematic,',
    negativePrompt: 'cheerful, bright, safe, comfortable, relaxed, cartoon',
  },
  drama: {
    genre: 'Drama',
    description:
      'Character-driven stories exploring human emotion, relationships, and meaningful themes.',
    storytellingConventions: [
      'Character transformation arc',
      'Internal conflict externalized',
      'Relationships tested',
      'Difficult choices',
      'Cathartic climax',
      'Thematic resolution',
    ],
    visualTropes: [
      'Close-ups capturing emotion',
      'Natural lighting',
      'Intimate framings',
      'Environmental character',
      'Quiet moments',
    ],
    pacing: 'Measured, character-driven',
    archetypes: [
      'Flawed protagonist',
      'Supporting confidant',
      'Antagonist representing obstacle',
      'Mentor',
      'Love interest',
    ],
    emotionalBeats: ['Struggle', 'Growth', 'Loss', 'Connection', 'Acceptance', 'Transformation'],
    suggestedDirectors: ['terrence-malick', 'spike-jonze', 'denis-villeneuve'],
    suggestedCinematographers: ['emmanuel-lubezki', 'roger-deakins', 'bradford-young'],
    colorPalette: ['Natural tones', 'Earth colors', 'Muted palettes', 'Emotional color grading'],
    lightingMoods: [
      'Natural light',
      'Soft and flattering',
      'Emotional contrast',
      'Time of day as mood',
    ],
    promptPrefix:
      'dramatic cinematography, emotional lighting, intimate framing, naturalistic, character-focused,',
    negativePrompt: 'action-packed, flashy, exaggerated, cartoon, superficial',
  },
  western: {
    genre: 'Western',
    description:
      'Stories set in the American Old West featuring frontier justice, outlaws, and wilderness.',
    storytellingConventions: [
      'Stranger comes to town',
      'Revenge quest',
      'Law vs lawlessness',
      'Civilization vs wilderness',
      'Showdown climax',
      'Codes of honor',
    ],
    visualTropes: [
      'Wide vistas',
      'Dusty towns',
      'Harsh sunlight',
      'Silhouettes at sunset',
      'Extreme close-ups (eyes)',
      'Wide shots of riders',
    ],
    pacing: 'Slow build to explosive confrontation',
    archetypes: [
      'Lone gunslinger',
      'Corrupt sheriff',
      'Innocent settler',
      'Outlaw gang',
      'Native American',
    ],
    emotionalBeats: ['Isolation', 'Justice', 'Revenge', 'Honor', 'Sacrifice', 'Redemption'],
    suggestedDirectors: ['coen-brothers', 'quentin-tarantino'],
    suggestedCinematographers: ['roger-deakins', 'emmanuel-lubezki'],
    colorPalette: ['Dust brown', 'Sun-bleached', 'Desert gold', 'Sky blue', 'Blood red'],
    lightingMoods: ['Harsh sun', 'Dusty atmosphere', 'Golden hour', 'Campfire', 'Moonlit'],
    promptPrefix:
      'western movie style, vast landscapes, dusty atmosphere, golden hour, cinematic wide shots,',
    negativePrompt: 'urban, modern, technology, futuristic, green, lush',
  },
  fantasy: {
    genre: 'Fantasy',
    description:
      'Stories featuring magical elements, mythical creatures, and otherworldly settings.',
    storytellingConventions: [
      "Hero's journey structure",
      'Quest narrative',
      'Magic system with rules',
      'Good vs evil conflict',
      'Prophecy and destiny',
      'World-building lore',
    ],
    visualTropes: [
      'Magical lighting effects',
      'Fantastical creatures',
      'Epic landscapes',
      'Medieval-inspired architecture',
      'Enchanted forests',
      'Grand castles',
    ],
    pacing: 'Epic scope with intimate character moments',
    archetypes: ['Chosen one', 'Wise mentor', 'Dark lord', 'Loyal companion', 'Mysterious ally'],
    emotionalBeats: ['Wonder', 'Courage', 'Friendship', 'Sacrifice', 'Triumph', 'Magic'],
    suggestedDirectors: ['ridley-scott', 'hayao-miyazaki', 'terrence-malick'],
    suggestedCinematographers: ['roger-deakins', 'emmanuel-lubezki'],
    colorPalette: ['Rich greens', 'Royal purples', 'Gold accents', 'Mystical blues', 'Fire orange'],
    lightingMoods: [
      'Magical glow',
      'Ethereal',
      'Dramatic contrast',
      'Forest dappled',
      'Torchlight',
    ],
    promptPrefix:
      'fantasy movie style, magical atmosphere, epic scale, mystical lighting, otherworldly,',
    negativePrompt: 'mundane, realistic, urban, modern, technology, plain',
  },
  documentary: {
    genre: 'Documentary',
    description: 'Non-fiction films presenting real events, people, and issues.',
    storytellingConventions: [
      'Interview-driven narrative',
      'Archival footage integration',
      'Observational sequences',
      'Expert testimony',
      'Personal journey structure',
      'Issue-driven thesis',
    ],
    visualTropes: [
      'Handheld intimacy',
      'Natural lighting',
      'Talking head interviews',
      'B-roll coverage',
      'Real locations',
      'Text overlays',
    ],
    pacing: 'Information-driven with emotional moments',
    archetypes: ['Subject/protagonist', 'Expert voices', 'Narrator', 'Witnesses', 'Opposition'],
    emotionalBeats: ['Discovery', 'Empathy', 'Outrage', 'Understanding', 'Call to action'],
    suggestedDirectors: [],
    suggestedCinematographers: ['bradford-young', 'emmanuel-lubezki'],
    colorPalette: ['Natural colors', 'Authentic tones', 'Archival warm', 'Interview neutral'],
    lightingMoods: [
      'Natural available',
      'Interview key light',
      'Observational',
      'Real environments',
    ],
    promptPrefix: 'documentary style, natural lighting, authentic, real, intimate, observational,',
    negativePrompt: 'stylized, fantasy, artificial, staged, dramatic lighting',
  },
  animation: {
    genre: 'Animation',
    description:
      'Films created through animation techniques, often featuring stylized worlds and characters.',
    storytellingConventions: [
      'Universal themes for all ages',
      'Visual metaphors',
      'Songs as emotional beats (often)',
      'Comic relief sidekicks',
      'Clear moral lessons',
      'Transformation arcs',
    ],
    visualTropes: [
      'Exaggerated expressions',
      'Impossible camera moves',
      'Vibrant color palettes',
      'Detailed backgrounds',
      'Character design emphasis',
      'Squash and stretch',
    ],
    pacing: 'Dynamic with varied rhythms',
    archetypes: ['Plucky hero', 'Sidekick', 'Mentor', 'Villain with style', 'Love interest'],
    emotionalBeats: ['Wonder', 'Adventure', 'Sadness', 'Joy', 'Courage', 'Love'],
    suggestedDirectors: ['hayao-miyazaki', 'wes-anderson'],
    suggestedCinematographers: [],
    colorPalette: [
      'Vibrant primaries',
      'Rich saturated',
      'Stylized palettes',
      'Emotional color shifts',
    ],
    lightingMoods: ['Stylized', 'Dramatic for effect', 'Soft and appealing', 'Magical glow'],
    promptPrefix:
      'animated movie style, vibrant colors, expressive, stylized, cinematic animation,',
    negativePrompt: 'live action, photorealistic, gritty, dark, muted, ugly',
  },
  musical: {
    genre: 'Musical',
    description: 'Films where characters express themselves through song and dance.',
    storytellingConventions: [
      'Songs advance plot/emotion',
      '"I want" song early',
      'Dance as expression',
      'Reprise for transformation',
      'Ensemble numbers',
      'Big finale',
    ],
    visualTropes: [
      'Theatrical staging',
      'Colorful costumes',
      'Elaborate sets',
      'Dance choreography',
      'Lighting shifts for numbers',
      'Wide shots for dance',
    ],
    pacing: 'Rhythmic with musical numbers',
    archetypes: [
      'Dreamer protagonist',
      'Love interest',
      'Villain with a song',
      'Comic ensemble',
      'Mentor',
    ],
    emotionalBeats: ['Dream', 'Love', 'Conflict', 'Despair', 'Triumph', 'Joy'],
    suggestedDirectors: ['wes-anderson'],
    suggestedCinematographers: [],
    colorPalette: ['Bold saturated', 'Stage-lit', 'Costume colors', 'Theatrical'],
    lightingMoods: ['Stage lighting', 'Spotlight', 'Dramatic shifts', 'Golden warmth'],
    promptPrefix:
      'musical movie style, theatrical, colorful, expressive, dynamic staging, cinematic,',
    negativePrompt: 'dull, gray, static, mundane, realistic, gritty',
  },
  commercial: {
    genre: 'Commercial',
    description: 'Short-form advertising content designed to promote products or brands.',
    storytellingConventions: [
      'Problem/solution structure',
      'Lifestyle aspiration',
      'Product hero shot',
      'Call to action',
      'Brand consistency',
      'Emotional hook',
    ],
    visualTropes: [
      'Perfect lighting',
      'Product beauty shots',
      'Lifestyle imagery',
      'Fast cutting',
      'Motion graphics',
      'Logo reveals',
    ],
    pacing: 'Quick, punchy, memorable',
    archetypes: [
      'Aspirational user',
      'Product as hero',
      'Brand spokesperson',
      'Satisfied customer',
    ],
    emotionalBeats: ['Desire', 'Solution', 'Satisfaction', 'Aspiration', 'Trust'],
    suggestedDirectors: ['wes-anderson', 'spike-jonze'],
    suggestedCinematographers: ['hoyte-van-hoytema'],
    colorPalette: ['Brand colors', 'Clean whites', 'Aspirational tones', 'Product-enhancing'],
    lightingMoods: ['Perfect studio', 'Lifestyle natural', 'Product glamour', 'Clean and bright'],
    promptPrefix:
      'commercial photography style, perfect lighting, polished, aspirational, product-focused,',
    negativePrompt: 'amateur, poor quality, dark, gritty, messy, unpolished',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // MATURE CONTENT - Only accessible when matureContent flag is enabled
  // ═══════════════════════════════════════════════════════════════════════════
  adult: {
    genre: 'Adult / OnlyFans',
    description:
      'Intimate, sensual content for mature audiences. Glamour and boudoir aesthetics with tasteful cinematography.',
    storytellingConventions: [
      'Slow reveal and anticipation building',
      'Fantasy fulfillment narrative',
      'Power dynamics and roleplay',
      'Voyeuristic perspective',
      'Connection and intimacy focus',
      'Tease and suggestion over explicit',
    ],
    visualTropes: [
      'Soft focus and bokeh',
      'Silhouettes and shadows',
      'Slow camera movements',
      'Close-ups on expressions',
      'Lingering gazes',
      'Suggestive framing',
      'Luxurious environments',
    ],
    pacing: 'Slow, sensual, building tension',
    archetypes: [
      'The Temptress/Seducer',
      'The Innocent',
      'The Voyeur',
      'The Dominant',
      'The Submissive',
      'Fantasy Partner',
    ],
    emotionalBeats: ['Attraction', 'Tension', 'Desire', 'Surrender', 'Ecstasy', 'Afterglow'],
    suggestedDirectors: ['wong-kar-wai', 'terrence-malick'],
    suggestedCinematographers: ['emmanuel-lubezki', 'bradford-young'],
    colorPalette: [
      'Warm golden',
      'Deep crimson',
      'Soft pink',
      'Midnight purple',
      'Candlelight amber',
    ],
    lightingMoods: [
      'Candlelight',
      'Golden hour',
      'Low-key intimate',
      'Rim light silhouettes',
      'Soft diffused',
    ],
    promptPrefix:
      'intimate boudoir photography, sensual lighting, glamour aesthetic, soft focus, romantic atmosphere, tasteful, artistic,',
    negativePrompt:
      'harsh lighting, documentary style, unflattering angles, clinical, cold, aggressive, violent',
  },
  hardcore: {
    genre: 'XXX / Hardcore',
    description:
      'Explicit XXX pornographic content with graphic sexual acts. Professional adult film production with clear visibility of all action.',
    storytellingConventions: [
      'Minimal plot, maximum action',
      'Fantasy scenario setup (pizza delivery, stepfamily, casting couch)',
      'Position progression (foreplay → oral → penetration → climax)',
      'POV and gonzo style coverage',
      'Money shot / cumshot as climax',
      'Multiple performer combinations',
    ],
    visualTropes: [
      'Extreme close-ups of genitals',
      'POV penetration shots',
      'Gonzo handheld style',
      'Reverse angle coverage',
      'Money shot framing',
      'Position transition coverage',
      'Facial reaction shots during climax',
    ],
    pacing: 'Building intensity through positions to climactic money shot',
    archetypes: [
      'The MILF',
      'The Stepdaughter',
      'The Pizza Guy',
      'The Casting Director',
      'The Pool Boy',
      'The Massage Therapist',
      'The Babysitter',
    ],
    emotionalBeats: [
      'Setup/Scenario',
      'Seduction',
      'Foreplay',
      'Oral',
      'Penetration',
      'Position Changes',
      'Build to Climax',
      'Money Shot',
    ],
    suggestedDirectors: ['michael-bay', 'zack-snyder'], // For dynamic action coverage
    suggestedCinematographers: ['robert-richardson', 'hoyte-van-hoytema'],
    colorPalette: [
      'Warm skin tones',
      'High contrast',
      'Natural daylight',
      'Studio white',
      'Ring light glow',
    ],
    lightingMoods: [
      'High-key studio',
      'Ring light beauty',
      'Overhead practical',
      'Natural window',
      'Bright and clear',
    ],
    promptPrefix:
      'XXX pornographic film, explicit graphic sexual content, clear genital visibility, penetration close-up, money shot, professional adult production, hardcore,',
    negativePrompt:
      'dark shadows, blurry genitals, poor quality, obscured action, soft focus, censored, pixelated',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a director style by key
 */
export function getDirectorStyle(directorKey: string): DirectorStyle | undefined {
  return DIRECTOR_STYLES[directorKey];
}

/**
 * Get all directors suitable for a genre
 */
export function getDirectorsForGenre(genre: string): DirectorStyle[] {
  const normalizedGenre = genre.toLowerCase().replace('-', '');
  return Object.values(DIRECTOR_STYLES).filter(d =>
    d.genres.some(g => g.toLowerCase().replace('-', '') === normalizedGenre)
  );
}

/**
 * Get a cinematographer style by key
 */
export function getCinematographerStyle(
  cinematographerKey: string
): CinematographerStyle | undefined {
  return CINEMATOGRAPHER_STYLES[cinematographerKey];
}

/**
 * Get genre guide by genre name
 */
export function getGenreGuide(genre: string): GenreGuide | undefined {
  const normalizedGenre = genre.toLowerCase().replace(/[\s-]/g, '-');
  return GENRE_GUIDES[normalizedGenre];
}

/**
 * Build a comprehensive prompt prefix combining genre, director, and cinematographer styles
 */
export function buildStylePrefix(
  genre: string,
  directorKey?: string,
  cinematographerKey?: string
): string {
  const parts: string[] = [];

  // Add genre style
  const genreGuide = getGenreGuide(genre);
  if (genreGuide) {
    parts.push(genreGuide.promptPrefix);
  }

  // Add director style
  if (directorKey) {
    const director = getDirectorStyle(directorKey);
    if (director) {
      parts.push(director.promptPrefix);
    }
  }

  // Add cinematographer keywords
  if (cinematographerKey) {
    const cinematographer = getCinematographerStyle(cinematographerKey);
    if (cinematographer) {
      parts.push(cinematographer.promptKeywords.join(', '));
    }
  }

  return parts.join(' ');
}

/**
 * Get relevant Pixar rules for a story situation
 */
export function getPixarRulesForSituation(
  situation: string
): (typeof PIXAR_STORYTELLING_RULES)[0][] {
  const situationLower = situation.toLowerCase();
  const relevantRules: (typeof PIXAR_STORYTELLING_RULES)[0][] = [];

  // Character development
  if (situationLower.includes('character') || situationLower.includes('protagonist')) {
    relevantRules.push(
      PIXAR_STORYTELLING_RULES[0], // Admiration over success
      PIXAR_STORYTELLING_RULES[5], // Challenge characters
      PIXAR_STORYTELLING_RULES[12], // Give characters opinions
      PIXAR_STORYTELLING_RULES[14], // Character empathy
      PIXAR_STORYTELLING_RULES[20] // Identify with characters
    );
  }

  // Structure
  if (situationLower.includes('structure') || situationLower.includes('plot')) {
    relevantRules.push(
      PIXAR_STORYTELLING_RULES[3], // Story spine
      PIXAR_STORYTELLING_RULES[4], // Simplify and focus
      PIXAR_STORYTELLING_RULES[6] // Ending before middle
    );
  }

  // Stakes and conflict
  if (situationLower.includes('stakes') || situationLower.includes('conflict')) {
    relevantRules.push(
      PIXAR_STORYTELLING_RULES[15], // Stakes and failure
      PIXAR_STORYTELLING_RULES[18] // Coincidences
    );
  }

  // Writer's block
  if (situationLower.includes('stuck') || situationLower.includes('block')) {
    relevantRules.push(
      PIXAR_STORYTELLING_RULES[7], // Finish and move on
      PIXAR_STORYTELLING_RULES[8], // Break the block
      PIXAR_STORYTELLING_RULES[10], // Write it down
      PIXAR_STORYTELLING_RULES[11], // Discount first ideas
      PIXAR_STORYTELLING_RULES[16] // No wasted work
    );
  }

  // Theme
  if (situationLower.includes('theme') || situationLower.includes('meaning')) {
    relevantRules.push(
      PIXAR_STORYTELLING_RULES[2], // Theme discovery
      PIXAR_STORYTELLING_RULES[13], // Why this story
      PIXAR_STORYTELLING_RULES[21] // Story essence
    );
  }

  // Return all rules if no specific match or very few matches
  if (relevantRules.length < 3) {
    return PIXAR_STORYTELLING_RULES;
  }

  return relevantRules;
}

/**
 * Get negative prompt for a genre
 */
export function getGenreNegativePrompt(genre: string): string {
  const guide = getGenreGuide(genre);
  return guide?.negativePrompt || 'low quality, blurry, distorted';
}

/**
 * List all available visual styles (directors + cinematographers)
 */
export function getAllVisualStyles(): { directors: string[]; cinematographers: string[] } {
  return {
    directors: Object.keys(DIRECTOR_STYLES),
    cinematographers: Object.keys(CINEMATOGRAPHER_STYLES),
  };
}

export default {
  PIXAR_STORYTELLING_RULES,
  DIRECTOR_STYLES,
  CINEMATOGRAPHER_STYLES,
  GENRE_GUIDES,
  getDirectorStyle,
  getDirectorsForGenre,
  getCinematographerStyle,
  getGenreGuide,
  buildStylePrefix,
  getPixarRulesForSituation,
  getGenreNegativePrompt,
  getAllVisualStyles,
};
