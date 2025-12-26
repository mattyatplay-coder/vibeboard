import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { GenerationService } from '../GenerationService';
import { GenerationOptions } from '../generators/GenerationProvider';
import * as fal from "@fal-ai/serverless-client";

// Pose Preset Types
export type PosePresetKey =
    | 'universal' | 'swimwear' | 'casual' | 'formal' | 'fantasy' | 'anime' | 'cartoon' | 'pixar3d'
    // Base character presets (multi-outfit identity training)
    | 'pixar3d_teen_surfer_base' | 'pixar3d_adult_surfer_base'
    // Surfer/Action presets
    | 'pixar3d_surfer' | 'pixar3d_surfer_wetsuit' | 'pixar3d_surfer_kid'
    // Animal presets
    | 'pixar3d_sea_turtle' | 'pixar3d_quadruped' | 'pixar3d_avian' | 'pixar3d_aquatic' | 'pixar3d_reptile';

export interface PosePreset {
    name: string;
    description: string;
    stylePrefix?: string; // Added to all prompts for style consistency
    poses: string[];
}

// Custom preset interface (from database or passed in)
export interface CustomPosePresetData {
    name: string;
    description?: string;
    stylePrefix?: string;
    poses: string[];
}

// Pose Presets - clothing/style-aware pose sets
export const POSE_PRESETS: Record<PosePresetKey, PosePreset> = {
    universal: {
        name: "Universal",
        description: "Works with any character type - no clothing-specific poses",
        poses: [
            // Core angles (essential for LoRA)
            "front view, facing camera directly, standing straight with arms at sides",
            "three-quarter view, body angled toward camera's left side, standing",
            "three-quarter view, body angled toward camera's right side, standing",
            "side profile, nose pointing toward left edge of frame, standing",
            "side profile, nose pointing toward right edge of frame, standing",
            "back view looking over shoulder at camera",

            // Different framings
            "close-up portrait, head and shoulders only, cropped at chest, no body visible below shoulders",
            "medium shot cropped at waist, upper body only, no legs visible, relaxed pose",
            "full body shot, standing confidently",

            // Expression variations
            "smiling warmly, friendly expression, front view",
            "serious expression, focused look, front view",
            "looking up thoughtfully, head tilted back slightly",

            // Universal action poses (no pockets, no clothing-dependent actions)
            "arms crossed confidently, standing, front view",
            "one hand on hip, casual confident pose",
            "arms relaxed at sides, weight shifted to one leg, relaxed stance",
            "walking pose, caught mid-stride, three-quarter view",
            "sitting casually, three-quarter view",

            // Dynamic poses
            "pointing forward with index finger, front view",
            "waving hand in greeting, front view",
            "hand on chin, thinking pose, three-quarter view",
        ]
    },

    swimwear: {
        name: "Swimwear / Minimal Clothing",
        description: "Bikinis, underwear, shirtless - no pocket or heavy clothing poses",
        poses: [
            // Core angles
            "front view, facing camera directly, standing straight with arms at sides",
            "three-quarter view, body angled toward camera's left side, standing",
            "three-quarter view, body angled toward camera's right side, standing",
            "side profile, nose pointing toward left edge of frame, standing",
            "side profile, nose pointing toward right edge of frame, standing",
            "back view looking over shoulder at camera",

            // Framings
            "close-up portrait, head and shoulders only, cropped at chest, no body visible below shoulders",
            "medium shot cropped at waist, upper body only, no legs visible",
            "full body shot, standing confidently",

            // Expressions
            "smiling warmly, friendly expression, front view",
            "serious expression, confident look, front view",
            "looking away thoughtfully, candid moment",

            // Swimwear-appropriate poses
            "arms crossed confidently, standing, front view",
            "one hand on hip, casual confident pose",
            "both hands on hips, power pose, front view",
            "arms relaxed at sides, weight shifted, relaxed stance",
            "walking pose, caught mid-stride, three-quarter view",

            // Beach/pool appropriate
            "hand running through hair, candid pose",
            "arms stretched overhead, stretching pose",
            "sitting casually, three-quarter view",
        ]
    },

    casual: {
        name: "Casual Clothing",
        description: "T-shirts, jeans, dresses - includes pockets and everyday poses",
        poses: [
            // Core angles
            "front view, facing camera directly, standing straight with arms at sides",
            "three-quarter view, body angled toward camera's left side, standing",
            "three-quarter view, body angled toward camera's right side, standing",
            "side profile, nose pointing toward left edge of frame, standing",
            "side profile, nose pointing toward right edge of frame, standing",
            "back view looking over shoulder at camera",

            // Framings
            "close-up portrait, head and shoulders only, cropped at chest, no body visible below shoulders",
            "medium shot cropped at waist, upper body only, no legs visible, relaxed pose",
            "full body shot, standing confidently",

            // Expressions
            "smiling warmly, friendly expression, front view",
            "serious expression, focused look, front view",
            "laughing naturally, candid expression",

            // Casual poses (includes pockets)
            "arms crossed confidently, standing, front view",
            "one hand on hip, casual confident pose",
            "hands in pockets, relaxed stance",
            "thumbs hooked in pockets, casual stance",
            "walking pose, caught mid-stride, three-quarter view",
            "sitting casually, three-quarter view",
            "leaning against wall, casual pose, three-quarter view",

            // Dynamic
            "waving hand in greeting, front view",
            "hand on chin, thinking pose, three-quarter view",
        ]
    },

    formal: {
        name: "Formal / Business",
        description: "Suits, professional attire - dignified poses",
        poses: [
            // Core angles
            "front view, facing camera directly, standing straight with arms at sides",
            "three-quarter view, body angled toward camera's left side, standing",
            "three-quarter view, body angled toward camera's right side, standing",
            "side profile, nose pointing toward left edge of frame, standing",
            "side profile, nose pointing toward right edge of frame, standing",

            // Framings
            "close-up portrait, head and shoulders only, cropped at chest, professional headshot",
            "medium shot cropped at waist, upper body only, professional pose",
            "full body shot, standing confidently, professional stance",

            // Professional expressions
            "confident smile, professional expression, front view",
            "serious expression, authoritative look, front view",
            "slight smile, approachable professional expression",

            // Business poses
            "arms crossed confidently, standing, front view",
            "hands clasped in front, professional stance",
            "one hand adjusting tie or collar, professional gesture",
            "hands in suit pockets, confident business pose",
            "sitting in chair, professional pose, three-quarter view",
            "standing with briefcase or folder, professional",

            // Presentation poses
            "gesturing while speaking, presentation pose",
            "hand extended for handshake, welcoming pose",
        ]
    },

    fantasy: {
        name: "Fantasy / Armor",
        description: "Knights, warriors, fantasy characters - heroic and combat poses",
        poses: [
            // Core angles
            "front view, facing camera directly, standing heroically",
            "three-quarter view, body angled toward camera's left side, battle stance",
            "three-quarter view, body angled toward camera's right side, alert pose",
            "side profile, nose pointing toward left edge of frame, vigilant stance",
            "side profile, nose pointing toward right edge of frame, looking into distance",
            "back view looking over shoulder at camera, cape flowing",

            // Framings
            "close-up portrait, head and shoulders only, cropped at chest, intense expression",
            "medium shot cropped at waist, upper body armor visible",
            "full body shot, heroic stance, weapon ready",

            // Fantasy expressions
            "determined expression, steely gaze, front view",
            "battle cry expression, fierce look, front view",
            "stoic expression, noble bearing, front view",

            // Combat/heroic poses
            "arms crossed over chest, imposing stance",
            "hand resting on sword hilt, ready stance",
            "defensive stance, shield raised",
            "attack pose, weapon drawn, dynamic angle",
            "kneeling pose, one knee down, respectful",
            "standing victorious, weapon raised",

            // Dynamic fantasy
            "casting spell pose, hands glowing with energy",
            "looking at magical artifact, examining pose",
            "walking through mystical environment, adventurer pose",
        ]
    },

    anime: {
        name: "Anime Character",
        description: "2D anime style - exaggerated expressions and dynamic poses",
        stylePrefix: "anime style, 2D illustration",
        poses: [
            // Core angles
            "front view, facing camera directly, standing with confident anime pose",
            "three-quarter view, body angled toward camera's left side, dynamic stance",
            "three-quarter view, body angled toward camera's right side, action ready",
            "side profile, nose pointing toward left edge of frame, wind in hair",
            "side profile, nose pointing toward right edge of frame, dramatic profile",
            "back view looking over shoulder at camera, hair flowing",

            // Framings
            "close-up portrait, head and shoulders only, cropped at chest, expressive eyes",
            "medium shot cropped at waist, upper body only, dynamic pose",
            "full body shot, iconic anime stance",

            // Anime expressions (exaggerated)
            "big cheerful smile, sparkly eyes, happy expression, front view",
            "determined expression, intense eyes, serious anime look",
            "surprised expression, wide eyes, shocked anime reaction",
            "blushing shyly, embarrassed anime expression",

            // Anime poses
            "peace sign near face, cute pose, front view",
            "fist pump, excited victory pose",
            "arms crossed, tsundere pose, looking away",
            "hands on hips, confident protagonist pose",
            "running pose, dynamic motion lines implied",
            "jumping pose, mid-air, excited",

            // Action anime
            "battle stance, ready to fight",
            "pointing dramatically, accusation pose",
            "hand reaching toward camera, dramatic reach",
        ]
    },

    cartoon: {
        name: "Cartoon / Mascot",
        description: "Chibi, mascots, simplified characters - big expressions, simple poses",
        stylePrefix: "cartoon style, mascot character",
        poses: [
            // Core angles (simpler for cartoon)
            "front view, facing camera directly, standing with arms at sides",
            "three-quarter view, body angled slightly, friendly stance",
            "side profile, simple silhouette pose",

            // Framings
            "close-up portrait, head and shoulders only, big expressive face",
            "medium shot, upper body visible, cute pose",
            "full body shot, simple standing pose",

            // Big cartoon expressions
            "huge smile, very happy expression, front view",
            "surprised face, big round eyes, shocked expression",
            "sad expression, puppy dog eyes, front view",
            "angry expression, puffed cheeks, front view",
            "winking, playful expression, front view",

            // Simple cartoon poses
            "waving hello, friendly wave, front view",
            "thumbs up, encouraging pose, front view",
            "arms spread wide, welcoming pose",
            "jumping for joy, excited pose",
            "sitting cutely, three-quarter view",
            "sleeping pose, peaceful expression",

            // Mascot poses
            "dancing pose, happy movement",
            "pointing at something, directing attention",
            "shrugging, confused pose",
        ]
    },

    pixar3d: {
        name: "3D Pixar Style",
        description: "Pixar/Disney 3D animation style - smooth features, expressive eyes, soft lighting. Use Jixar LoRA (ohwx trigger).",
        stylePrefix: "3D Pixar animation style, smooth rounded features, expressive large eyes, soft cinematic lighting",
        poses: [
            // Core angles (Pixar style emphasizes facial expressiveness)
            "front view, facing camera directly, standing confidently, friendly demeanor",
            "three-quarter view, body angled toward camera's left side, warm expression",
            "three-quarter view, body angled toward camera's right side, curious look",
            "side profile, nose pointing toward left edge of frame, thoughtful pose",
            "side profile, nose pointing toward right edge of frame, looking into distance",
            "back view looking over shoulder at camera, slight smile",

            // Framings (Pixar loves close-ups for emotion)
            "close-up portrait, head and shoulders only, cropped at chest, warm expressive eyes, soft lighting",
            "medium shot cropped at waist, upper body only, no legs visible, friendly pose",
            "full body shot, standing in characteristic pose, environment visible",

            // Pixar-style expressions (big, clear emotions)
            "big warm smile, happy expression, eyes squinted with joy, front view",
            "surprised expression, wide eyes, raised eyebrows, mouth open, front view",
            "determined expression, focused eyes, slight frown, front view",
            "sad expression, downcast eyes, subtle frown, emotional moment",
            "laughing heartily, head tilted back slightly, genuine joy",
            "thinking expression, hand on chin, looking up thoughtfully",

            // Character moments (storytelling poses)
            "arms crossed, confident stance, slight smirk, front view",
            "hands on hips, proud pose, chin up, front view",
            "pointing forward with enthusiasm, excited gesture",
            "waving hello, friendly greeting, warm smile",
            "walking confidently, caught mid-stride, purposeful movement",

            // Environmental context poses (from ComfyUI workflow learnings)
            "sitting casually, relaxed pose, comfortable setting",
            "standing in doorway, transitional moment, three-quarter view",
            "looking at something off-camera, curious expression, engaged pose",
        ]
    },

    // ============================================
    // BASE CHARACTER PRESETS - Multi-Outfit Identity Training
    // ============================================

    pixar3d_teen_surfer_base: {
        name: "Teen Surfer Base (Multi-Outfit)",
        description: "BASE CHARACTER LoRA - trains identity across multiple outfits. White background. For Mylin-style teen surfer characters.",
        stylePrefix: "3D Pixar animation style, teenage boy, athletic lean build, messy brown hair, expressive eyes, white background",
        poses: [
            // ===========================================
            // OUTFIT 1: Signature Look (Gengar t-shirt + black board shorts)
            // ===========================================

            // Core turnaround - Signature outfit
            "teenage boy wearing gray Gengar Pokemon t-shirt and black board shorts, standing facing camera directly, arms relaxed at sides, neutral expression, white background",
            "teenage boy wearing gray Gengar Pokemon t-shirt and black board shorts, three-quarter view facing left, standing relaxed, white background",
            "teenage boy wearing gray Gengar Pokemon t-shirt and black board shorts, three-quarter view facing right, standing relaxed, white background",
            "teenage boy wearing gray Gengar Pokemon t-shirt and black board shorts, side profile facing left, standing straight, white background",
            "teenage boy wearing gray Gengar Pokemon t-shirt and black board shorts, back view looking over shoulder at camera, white background",

            // Expressions - Signature outfit
            "teenage boy wearing gray Gengar t-shirt, close-up face and shoulders, big friendly smile, white background",
            "teenage boy wearing gray Gengar t-shirt, close-up face, serious determined expression, white background",
            "teenage boy wearing gray Gengar t-shirt, close-up face, laughing genuinely, eyes squinted with joy, white background",

            // ===========================================
            // OUTFIT 2: Competition Rashguard
            // ===========================================

            // Core turnaround - Rashguard
            "teenage boy wearing tight blue competition rashguard swim shirt and black board shorts, standing facing camera directly, athletic stance, white background",
            "teenage boy wearing tight blue competition rashguard and black board shorts, three-quarter view facing left, confident pose, white background",
            "teenage boy wearing tight blue competition rashguard and black board shorts, three-quarter view facing right, white background",
            "teenage boy wearing tight blue rashguard, side profile facing left, athletic build visible, white background",
            "teenage boy wearing blue rashguard and black shorts, back view looking over shoulder, white background",

            // Expressions - Rashguard
            "teenage boy wearing blue rashguard, close-up face, competitive focused expression, white background",
            "teenage boy wearing blue rashguard, close-up face, excited pre-competition smile, white background",

            // ===========================================
            // OUTFIT 3: Shirtless with Board Shorts
            // ===========================================

            // Core turnaround - Shirtless
            "teenage boy shirtless wearing only black board shorts, standing facing camera, lean athletic torso, relaxed arms, white background",
            "teenage boy shirtless in black board shorts, three-quarter view facing left, athletic build, white background",
            "teenage boy shirtless in black board shorts, three-quarter view facing right, white background",
            "teenage boy shirtless in black shorts, side profile facing left, lean athletic physique, white background",
            "teenage boy shirtless in black shorts, back view looking over shoulder at camera, white background",

            // Expressions - Shirtless
            "teenage boy shirtless, close-up face and shoulders, confident relaxed smile, white background",
            "teenage boy shirtless, close-up face, focused intense expression, white background",

            // ===========================================
            // OUTFIT 4: Casual Hoodie (off-beach look)
            // ===========================================

            // Core turnaround - Hoodie
            "teenage boy wearing dark blue zip-up hoodie and jeans, standing facing camera, casual relaxed pose, white background",
            "teenage boy wearing blue hoodie and jeans, three-quarter view facing left, hands in hoodie pocket, white background",
            "teenage boy wearing blue hoodie and jeans, three-quarter view facing right, casual stance, white background",
            "teenage boy wearing blue hoodie, side profile facing left, hood down, white background",

            // Expressions - Hoodie
            "teenage boy wearing blue hoodie, close-up face, thoughtful expression, white background",
            "teenage boy wearing blue hoodie, close-up face, happy genuine smile, white background",

            // ===========================================
            // UNIVERSAL POSES (outfit-agnostic, model fills in)
            // ===========================================

            // Action poses - various outfits implied
            "teenage boy arms crossed confidently, slight smirk, front view, white background",
            "teenage boy hands on hips, proud confident stance, front view, white background",
            "teenage boy walking mid-stride, casual confident walk, three-quarter view, white background",
            "teenage boy sitting cross-legged on ground, relaxed casual pose, white background",
            "teenage boy crouching low in athletic stance, ready position, front view, white background",
            "teenage boy jumping in air, arms raised in celebration, joyful expression, white background",
        ]
    },

    pixar3d_adult_surfer_base: {
        name: "Adult Surfer Base (Multi-Outfit)",
        description: "BASE CHARACTER LoRA - trains identity across multiple outfits. White background. For Koa, Matt, Chase style adult surfer characters.",
        stylePrefix: "3D Pixar animation style, adult man, athletic muscular build, sun-kissed skin, expressive eyes, white background",
        poses: [
            // ===========================================
            // OUTFIT 1: Board Shorts Only (signature beach look)
            // ===========================================

            // Core turnaround - Board shorts
            "adult man shirtless wearing colorful tropical board shorts, standing facing camera directly, muscular athletic build, relaxed arms, white background",
            "adult man shirtless in board shorts, three-quarter view facing left, athletic muscular build visible, white background",
            "adult man shirtless in board shorts, three-quarter view facing right, confident stance, white background",
            "adult man shirtless in board shorts, side profile facing left, muscular physique, white background",
            "adult man shirtless in board shorts, back view looking over shoulder at camera, muscular back, white background",

            // Expressions - Board shorts
            "adult man shirtless, close-up face and shoulders, warm friendly smile, white background",
            "adult man shirtless, close-up face, serious focused expression, white background",
            "adult man shirtless, close-up face, laughing joyfully, white background",

            // ===========================================
            // OUTFIT 2: Full Wetsuit (competition/cold water)
            // ===========================================

            // Core turnaround - Wetsuit
            "adult man wearing full black wetsuit, standing facing camera directly, athletic stance, white background",
            "adult man in black wetsuit, three-quarter view facing left, confident pose, white background",
            "adult man in black wetsuit, three-quarter view facing right, white background",
            "adult man in wetsuit, side profile facing left, athletic build, white background",
            "adult man in wetsuit, back view looking over shoulder at camera, white background",

            // Expressions - Wetsuit
            "adult man in wetsuit, close-up face, competitive determined expression, white background",
            "adult man in wetsuit, close-up face, victorious smile, white background",

            // ===========================================
            // OUTFIT 3: Tank Top and Shorts (casual beach)
            // ===========================================

            // Core turnaround - Tank top
            "adult man wearing white tank top and khaki shorts, standing facing camera, casual relaxed, white background",
            "adult man in tank top and shorts, three-quarter view facing left, relaxed stance, white background",
            "adult man in tank top and shorts, three-quarter view facing right, white background",
            "adult man in tank top, side profile facing left, white background",

            // Expressions - Tank top
            "adult man in white tank top, close-up face, laid-back friendly smile, white background",

            // ===========================================
            // OUTFIT 4: Hawaiian Shirt (off-beach casual)
            // ===========================================

            // Core turnaround - Hawaiian shirt
            "adult man wearing open hawaiian floral shirt showing chest and board shorts, standing facing camera, relaxed surfer vibe, white background",
            "adult man in hawaiian shirt and shorts, three-quarter view facing left, casual confident, white background",
            "adult man in hawaiian shirt, three-quarter view facing right, white background",

            // Expressions - Hawaiian shirt
            "adult man in hawaiian shirt, close-up face, warm genuine smile, white background",

            // ===========================================
            // UNIVERSAL POSES
            // ===========================================

            "adult man arms crossed confidently over chest, muscular arms, slight smirk, front view, white background",
            "adult man hands on hips, proud confident stance, front view, white background",
            "adult man walking mid-stride, confident purposeful walk, three-quarter view, white background",
            "adult man sitting casually, relaxed pose, white background",
            "adult man crouching in athletic ready stance, front view, white background",
        ]
    },

    // ============================================
    // SURFER/ACTION PRESETS - Pixar 3D Style
    // ============================================

    pixar3d_surfer: {
        name: "Surfer Action (Board Shorts)",
        description: "ACTION POSES ONLY - surfing, beach, water. Use with base character LoRA. For Koa, Matt style characters.",
        stylePrefix: "3D Pixar animation style, surfer character, athletic build, sun-kissed skin, beach lighting, ocean environment",
        poses: [
            // Beach poses with board - explicit descriptions
            "standing on sandy beach holding white surfboard tucked under right arm, relaxed confident stance, ocean waves in background",
            "walking along beach carrying surfboard on top of head with both hands, balancing it, sandy feet",
            "kneeling on beach rubbing wax bar on surfboard surface, focused on task, board flat on sand",
            "sitting cross-legged on sand next to surfboard stuck upright in sand, watching ocean waves, relaxed",

            // Entering water - explicit body positions
            "wading into knee-deep ocean water carrying surfboard under arm, waves splashing around legs",
            "lying flat on stomach on surfboard in ocean, both arms reaching forward into water mid-paddle stroke, chin up looking ahead",
            "pushing surfboard nose down underwater while diving under approaching wave, body angled down following board",
            "sitting upright straddling surfboard in calm ocean water, legs dangling in water on each side, hands resting on board",

            // Riding waves - explicit visual descriptions with proper surf stance
            "standing sideways on surfboard riding down face of large blue-green wave, feet perpendicular to board, knees deeply bent in low crouch, arms out for balance, water spraying",
            "standing sideways on surfboard carving hard turn on wave face, feet perpendicular to board, body leaning dramatically into turn, back hand trailing in water, huge spray of white water behind",
            "crouched low sideways on surfboard inside hollow barrel wave tube, feet perpendicular to board, back hand trailing fingers dragging in curling wave wall, front arm forward for balance, calm focused expression, water cylinder overhead",
            "standing sideways on surfboard launching off top of wave into the air, feet perpendicular to board, arms spread wide, completely airborne over ocean",
            "landing sideways on surfboard on wave surface after aerial, feet perpendicular to board, knees bent absorbing impact, water splashing",
            "standing sideways on very front tip of long surfboard, feet perpendicular to board, arms outstretched like wings, graceful nose-riding balance pose on small wave",

            // Wipeout and fun - explicit actions
            "falling sideways off surfboard into wave, surprised expression, arms flailing, big splash of white water",
            "head and shoulders emerging from ocean water after falling, wet hair, laughing expression, surfboard floating nearby",
            "standing in waist-deep water both fists raised overhead in celebration, huge smile, surfboard floating beside",

            // Post-surf
            "walking out of shallow water onto beach carrying surfboard under arm, dripping wet, satisfied smile, sunset",
        ]
    },

    pixar3d_surfer_wetsuit: {
        name: "Pro Surfer Action (Wetsuit)",
        description: "ACTION POSES ONLY - competition surfing, pro moves. Use with base character LoRA. For Chase Maddox style characters.",
        stylePrefix: "3D Pixar animation style, professional surfer character, athletic build, full black wetsuit, competitive ocean lighting",
        poses: [
            // Competition prep - explicit descriptions
            "standing on beach in full black wetsuit pulling zipper cord up back of neck, focused determined expression",
            "standing on beach in wetsuit doing arm stretches, surfboard stuck in sand nearby, warming up",
            "wearing wetsuit with colored competition jersey vest over it, looking at number on chest, beach background",
            "standing on beach in wetsuit shielding eyes with hand, staring intently at ocean waves, studying them",
            "in wetsuit listening to older coach gesturing and explaining, nodding seriously, beach setting",

            // In water - explicit body positions
            "lying flat on stomach on surfboard in ocean wearing wetsuit, arms pulling through water powerfully, paddling fast",
            "in wetsuit pushing surfboard nose down underwater diving under big wave, body following board down at angle",
            "sitting upright on surfboard in ocean wearing wetsuit, legs in water, looking at horizon watching for waves",
            "lying on surfboard paddling hard looking back over shoulder at approaching wave, determined expression",

            // Pro surfing action - very explicit visual descriptions with proper surf stance
            "in wetsuit jumping up from lying to standing sideways on surfboard in one explosive motion, feet landing perpendicular to board, arms swinging up for balance",
            "in wetsuit standing sideways on surfboard at bottom of huge wave, feet perpendicular to board, crouched very low with back hand trailing in water, front arm pointing up wave face, about to power into turn",
            "in wetsuit standing sideways on surfboard carving hard turn on wave face, feet perpendicular to board, body leaning dramatically into turn, massive spray arc behind",
            "in wetsuit standing sideways on surfboard hitting top of wave lip vertically, feet perpendicular to board, board angled straight up, explosion of white spray at contact point",
            "in wetsuit standing sideways on surfboard riding over crumbling white foam section of wave, feet perpendicular to board, balanced and controlled",
            "in wetsuit crouched low sideways on surfboard inside hollow barrel wave tube, feet perpendicular to board, back hand trailing fingers dragging in curling wave wall, front arm forward, calm focused expression, water cylinder overhead",
            "in wetsuit standing sideways on surfboard flying high in air above wave doing full spinning rotation, feet perpendicular to board, ocean far below",
            "in wetsuit landing sideways on surfboard on wave after aerial, feet perpendicular to board, knees bent deep absorbing impact, perfect landing",

            // Emotions/celebration - explicit
            "in wetsuit on surfboard in water pumping fist in air, screaming in celebration, just finished wave",
            "in wetsuit lying on surfboard paddling back out through waves, determined focused face",
            "in wetsuit standing on beach with surfboard, both arms raised high overhead in victory pose, huge smile",
            "in wetsuit hand placed on chest over heart, humble grateful expression, thanking crowd",
            "in wetsuit sitting on beach looking down disappointed, surfboard beside, processing loss",
        ]
    },

    pixar3d_surfer_kid: {
        name: "Teen Prodigy Action",
        description: "ACTION POSES ONLY - prodigy-level surfing + areas still developing. Use with base character LoRA. For Mylin style characters.",
        stylePrefix: "3D Pixar animation style, teenage surfer prodigy, lean athletic build, confident youthful energy, competitive ocean lighting",
        poses: [
            // Pre-competition - explicit descriptions
            "teenage boy standing on beach holding short surfboard vertically beside him, serious expression looking at ocean, assessing waves",
            "teenage boy on beach doing leg stretches, surfboard stuck in sand nearby, determined game face, competition prep",
            "teenage boy sitting on beach watching adult surfers ride waves in distance, studying intently, learning from them",
            "teenage boy listening to adult coach pointing at ocean and explaining, nodding with serious focus, beach setting",

            // In water - explicit body positions
            "teenage boy lying flat on stomach on surfboard in ocean, one arm fully extended forward reaching into water while other arm pulls back through water mid-paddle stroke, chin up looking ahead, determined expression",
            "teenage boy underwater duck diving under large wave, hands gripping both rails of surfboard with elbows bent, body pressed close to board, nose of board angled upward through turbulent white water above, viewed from below",
            "teenage boy straddling surfboard in ocean, torso leaning forward with weight centered, both legs hanging completely submerged in water on either side of board, feet underwater not visible, sitting far back on board so nose tilts up out of water, hands resting on board in front of him, looking around at other surfers positioning strategically",
            "teenage boy lying on stomach on surfboard paddling hard toward incoming wave, arms alternating pulling through water with urgency, head turned looking back over shoulder at approaching wave, timing it perfectly",

            // Advanced surfing action - prodigy level explicit
            "teenage boy exploding up from lying to standing on surfboard in fast athletic motion, natural talent showing",
            "teenage boy standing sideways on surfboard at the lowest point of wave face near the water line, feet perpendicular to board with body facing wave, crouched very low with back hand trailing in water, front arm pointing up the wave face, about to power up into a turn, wave towering above him",
            "teenage boy standing sideways on surfboard carving hard turn on wave face, feet perpendicular to board, body leaning dramatically into the turn with back knee bent, front arm reaching toward wave, rear arm extended for balance, huge arc of white water spray behind",
            "teenage boy standing sideways on surfboard at very top of wave lip, feet perpendicular to board, board angled straight up vertically, body compressed with knees bent, about to smack the lip and redirect down, massive explosion of white water spray at point of contact",
            "teenage boy crouched low sideways on surfboard inside hollow barrel wave tube, body facing left with feet perpendicular to board, knees deeply bent in low athletic crouch, back hand trailing fingers dragging in the curling wave wall behind him, front arm extended forward for balance, calm focused expression looking toward bright exit of tube, water curling overhead forming perfect cylinder, professional composed demeanor",
            "teenage boy standing sideways on surfboard riding out of barrel wave tube exit, feet perpendicular to board, wave collapsing behind him as he escapes, both fists pumped overhead in celebration, huge triumphant smile, spit spray from tube visible, daylight ahead",
            "teenage boy and surfboard completely airborne high above the wave, standing sideways on board with feet perpendicular to board length, body separated from water, arms spread wide for balance, ocean visible far below, mid-air during aerial maneuver",
            "teenage boy landing sideways on surfboard after aerial, feet perpendicular to board, slightly wobbling, not quite perfect but recovering, still learning",

            // Areas still developing - explicit learning moments
            "teenage boy on surfboard turning too hard and losing balance slightly, learning from mistake",
            "teenage boy falling into water off surfboard after failed aerial attempt, determined not discouraged expression",
            "teenage boy back on surfboard after falling, shaking off water, resilient ready to try again expression",
            "teenage boy on beach watching adult pro do advanced trick on wave, studying carefully, taking mental notes",

            // Emotional range - explicit teenage intensity
            "teenage boy on surfboard in water pumping both fists, huge excited smile, celebrating good wave",
            "teenage boy sitting on surfboard looking frustrated, missed an opportunity, competitive fire in eyes",
            "teenage boy on beach looking humble, slight smile, knows he still has much to learn",
            "teenage boy on beach bouncing with nervous energy before competition, channeling it, ready to go",
            "teenage boy standing proud after beating older surfer, confident but not arrogant smile",
            "teenage boy sitting on beach after loss looking disappointed, but already planning next time",

            // Off-water prodigy life
            "teenage boy sitting watching surfing video on phone screen, analyzing and learning, focused",
            "teenage boy laughing with group of other teen surfers on beach, friendship and camaraderie",
        ]
    },

    // ============================================
    // ANIMAL PRESETS - Pixar 3D Style
    // ============================================

    pixar3d_sea_turtle: {
        name: "Sea Turtle EAC Action (Crush Style)",
        description: "ACTION POSES ONLY - EAC current riding, tricks, expressions. Use with base turtle LoRA. Finding Nemo aesthetic.",
        stylePrefix: "3D Pixar animation style, sea turtle character, smooth green shell, large expressive eyes, underwater lighting with light rays, Finding Nemo aesthetic",
        poses: [
            // Crush-style expressions - explicit Pixar style
            "sea turtle with half-closed relaxed eyes and peaceful smile, totally chill surfer dude expression, front view underwater",
            "sea turtle with eyes wide open and huge excited grin showing joy, stoked happy expression, underwater blue background",
            "sea turtle with gentle knowing smile and warm eyes, wise old mentor expression, three-quarter view underwater",
            "sea turtle with head tilted back laughing, eyes squinted with genuine joy, happy underwater moment",
            "sea turtle with eyes huge and round, mouth open in surprise, shocked dude expression, underwater",

            // Swimming action poses - explicit body descriptions
            "sea turtle gliding through blue water with all four flippers tucked close to body, peaceful serene expression, riding current",
            "sea turtle swimming forward with front flippers pushing through water mid-stroke, determined focused expression",
            "sea turtle angled downward diving toward sandy ocean floor, adventurous exploring pose, blue water above",
            "sea turtle head breaking through water surface from below, taking breath, sky visible above water line",
            "sea turtle doing spinning barrel roll through water, body rotating, playful dizzy expression",

            // Interactive poses - explicit
            "sea turtle with one front flipper extended outward in friendly wave greeting gesture, warm smile",
            "sea turtle looking upward at ocean surface, golden light rays streaming down through water, contemplative expression",
            "sea turtle swimming alongside colorful school of small fish, happy community moment, friendship",

            // EAC (East Australian Current) Action Poses - Finding Nemo inspired explicit
            "sea turtle riding fast blue ocean current with all four flippers spread wide like surfing, huge stoked grin, speed lines",
            "sea turtle swooping through rushing current in S-curve body motion, flippers steering, exhilarated wild expression",
            "sea turtle spinning in swirling water vortex doing barrel rolls, dizzy joyful expression, bubbles everywhere",
            "sea turtle at front of group of other turtles in current, looking back at them, confident leader guide pose",
            "sea turtle angling flippers up catching underwater updraft current, rising upward motion, excited expression",
            "sea turtle racing side by side with colorful fish in fast current, competitive fun, determined playful grin",
            "sea turtle doing flipper trick in current, one flipper raised showing off, playful cocky expression",
            "large sea turtle swimming beside small baby turtle in current, teaching patiently, mentor and student",
            "sea turtle exiting fast current dramatically with splash and bubbles, flippers spread, righteous exit pose",
            "two sea turtles slapping flippers together like high five in current, celebration, surfer bro moment",
        ]
    },

    pixar3d_aquatic: {
        name: "Aquatic Action (Fish/Dolphins/Whales)",
        description: "ACTION POSES ONLY - swimming, diving, jumping, interacting. Use with base aquatic LoRA. Finding Nemo/Dory style.",
        stylePrefix: "3D Pixar animation style, aquatic character, smooth scales or skin, expressive eyes, underwater caustic lighting",
        poses: [
            // Expressions (Finding Nemo style)
            "happy expression, big smile, sparkling eyes, swimming forward",
            "worried expression, wide eyes, small frown, anxious darting",
            "excited expression, mouth open in joy, fins wiggling rapidly",
            "confused expression, head tilted, puzzled look, circling",
            "determined expression, focused eyes, serious mission pose, charging",

            // Swimming action poses
            "fast swimming, streamlined body, speed lines implied, racing",
            "leisurely float, relaxed pose, drifting in current, peaceful",
            "diving deep, angled downward, exploratory pose, adventurous",
            "surfacing, breaking through water, dramatic emergence, breaching",
            "circling pose, body curved, investigating something, curious",
            "zigzag swimming, evading motion, playful chase",
            "spiral dive, corkscrewing through water, dynamic spin",
            "burst of speed, explosive acceleration, escaping or chasing",

            // Interactive action
            "peeking out from coral, cautious curious pose, ready to dart",
            "swimming with bubbles, playful moment, bubble chase",
            "chasing smaller fish playfully, friendly pursuit",
            "jumping through surface, dolphin leap, joyful breach",
            "swimming alongside friend, synchronized movement, companionship",
            "hiding behind rock, peeking out, shy curious moment",
            "exploring shipwreck, adventurous investigation, brave",
            "riding ocean current, gliding effortlessly, surfer style",
        ]
    },

    pixar3d_quadruped: {
        name: "Quadruped Action (Dogs/Cats/Horses)",
        description: "ACTION POSES ONLY - running, jumping, playing, hunting. Use with base quadruped LoRA. Expressive movement.",
        stylePrefix: "3D Pixar animation style, quadruped animal character, expressive face, soft fur texture, warm lighting",
        poses: [
            // Expressions in action
            "happy expression, tongue out, big smile, running joyfully",
            "focused expression, ears forward, chasing something, determined",
            "playful expression, play bow, eager to pounce, excited eyes",
            "surprised expression, ears back, startled jump, comical",
            "alert expression, sniffing air, investigating scent, curious",

            // Running/Movement action
            "running full speed, legs extended, joyful sprint, dynamic motion",
            "galloping, all four feet off ground, maximum speed, thrilling",
            "trotting confidently, mid-stride, purposeful movement",
            "bounding through grass, leaping motion, carefree energy",
            "skidding to a stop, dramatic halt, dust kicking up",
            "quick direction change, pivoting, agile turn",

            // Jumping/Leaping action
            "jumping up to catch something, all four feet off ground, focused",
            "leaping over obstacle, graceful arc, athletic pose",
            "pouncing on toy, mid-air attack pose, playful predator",
            "jumping for joy, excited leap, unbridled happiness",

            // Playing action
            "play bow, front down rear up, inviting to play",
            "rolling on back, playful wiggle, silly moment",
            "chasing tail, spinning, comedic pose",
            "tugging on rope toy, determined pull, playful tug-of-war",
            "fetching ball in mouth, proud return, mission accomplished",

            // Interactive action
            "pawing at something, curious investigation, gentle touch",
            "digging pose, dirt flying, focused excavation",
            "shaking off water, spray everywhere, post-swim shake",
            "stretching, big yawn, waking up motion, morning routine",
        ]
    },

    pixar3d_avian: {
        name: "Avian Action (Birds)",
        description: "ACTION POSES ONLY - flying, diving, singing, hunting. Use with base bird LoRA. Dynamic wings, personality.",
        stylePrefix: "3D Pixar animation style, bird character, detailed feathers, expressive eyes and beak, natural lighting",
        poses: [
            // Expressions in action
            "happy expression, singing loudly, beak wide open, joyful",
            "surprised expression, feathers ruffled, startled flap, alarmed",
            "determined expression, focused dive, hunting pose, fierce",
            "excited expression, wings flapping rapidly, eager anticipation",
            "proud expression, chest puffed, displaying feathers, strutting",

            // Flight action
            "takeoff, wings powering up, launching from perch, explosive",
            "mid-flight, wings up, soaring gracefully, freedom pose",
            "mid-flight, wings down, powerful downstroke, gaining altitude",
            "diving, wings tucked, plummeting toward target, streamlined",
            "landing, wings braking, feet extended, arriving at perch",
            "gliding, wings extended flat, riding thermals, peaceful soar",
            "banking turn, wings tilted, sharp aerial maneuver, agile",
            "hovering, rapid wing beats, hummingbird style, stationary flight",

            // Hunting/Foraging action
            "swooping down, talons extended, catching prey, focused",
            "pecking at food, quick jabs, foraging motion",
            "catching insect mid-air, quick snap, precise timing",
            "carrying food in beak, flying home, provider pose",

            // Interactive action
            "chasing another bird, playful aerial pursuit, competitive",
            "singing on branch, beak open, melodic performance, joyful",
            "bathing in puddle, splashing, cleaning feathers, refreshing",
            "ruffling feathers, shaking off, fluffing up, maintenance",
            "courtship display, wings spread, dancing, impressive show",
            "hopping on ground, searching, curious exploration",
        ]
    },

    pixar3d_reptile: {
        name: "Reptile Action (Lizards/Snakes/Crocs)",
        description: "ACTION POSES ONLY - hunting, climbing, swimming, striking. Use with base reptile LoRA. Unique movement.",
        stylePrefix: "3D Pixar animation style, reptile character, detailed scales, surprisingly expressive eyes, warm basking light",
        poses: [
            // Expressions in action
            "excited expression, alert posture, spotted prey, eager anticipation",
            "surprised expression, eyes wide, startled leap, alarmed",
            "focused expression, hunting stare, locked on target, intense",
            "happy expression, eye smile, successful catch, satisfied",
            "curious expression, head tilted, investigating new thing",

            // Hunting/Striking action
            "lunging forward, mouth open, striking at prey, explosive",
            "stalking low, body pressed to ground, sneaking closer",
            "pouncing, mid-air leap, catching insect, precise timing",
            "tongue extended far, tasting air, sensory tracking",
            "coiling to strike, tense posture, ready to spring",
            "successful catch, prey in mouth, triumphant pose",

            // Movement action
            "running on hind legs, comedic sprint, panicked escape",
            "climbing vertical surface, gripping with toes, ascending",
            "leaping between branches, mid-air jump, agile",
            "swimming, body undulating, powerful tail propulsion",
            "burrowing, digging motion, disappearing into sand",
            "quick direction change, body whipping around, agile turn",

            // Interactive action
            "basking, shifting position, finding perfect sun angle",
            "tail whip, defensive swipe, warning motion",
            "puffing up throat, display behavior, making self bigger",
            "camouflage change, blending with environment, color shift",
            "shedding skin, emerging fresh, renewal moment",
            "confrontation pose, mouth open, asserting dominance",
        ]
    }
};

// Legacy export for backwards compatibility
const POSE_PROMPTS = POSE_PRESETS.universal.poses;

export class DatasetGeneratorService {
    private generationService: GenerationService;

    constructor() {
        this.generationService = new GenerationService('fal');
    }

    /**
     * Get available preset keys for UI
     */
    static getPresetOptions(): { key: PosePresetKey; name: string; description: string }[] {
        return Object.entries(POSE_PRESETS).map(([key, preset]) => ({
            key: key as PosePresetKey,
            name: preset.name,
            description: preset.description
        }));
    }

    /**
     * Upload local file to Fal Storage
     */
    private async uploadToFalResult(filePath: string): Promise<string> {
        try {
            console.log(`[DatasetGenerator] Uploading source to Fal: ${filePath}`);
            const fileBuffer = fs.readFileSync(filePath);
            const blob = new Blob([fileBuffer]);
            const url = await fal.storage.upload(blob);
            return url;
        } catch (error) {
            console.error("Fal upload failed:", error);
            throw new Error("Failed to upload source image to Fal");
        }
    }

    /**
     * Generate a synthetic dataset from a single source image
     * Uses Flux 2 Max for character consistency with pose variation
     *
     * @param presetKeyOrCustom - Either a built-in preset key or a custom preset object
     */
    async generateVariations(
        sourceImage: string, // Local file path or URL
        triggerWord: string,
        basePrompt: string = "a person",
        projectId: string,
        jobId: string,
        characterDescription?: string,
        presetKeyOrCustom: PosePresetKey | CustomPosePresetData = 'universal'
    ): Promise<{ count: number; outputDir: string }> {
        console.log(`[DatasetGenerator] Starting generation for Job ${jobId}...`);

        // Get the pose preset - either built-in or custom
        let preset: PosePreset | CustomPosePresetData;
        let presetName: string;

        if (typeof presetKeyOrCustom === 'string') {
            // Built-in preset by key
            preset = POSE_PRESETS[presetKeyOrCustom] || POSE_PRESETS.universal;
            presetName = preset.name;
            console.log(`[DatasetGenerator] Using built-in preset: ${presetKeyOrCustom}`);
        } else {
            // Custom preset object passed directly
            preset = presetKeyOrCustom;
            presetName = preset.name || 'Custom';
            console.log(`[DatasetGenerator] Using custom preset: ${presetName} (${preset.poses.length} poses)`);
        }

        const poses = preset.poses;
        const stylePrefix = preset.stylePrefix || '';

        // 1. Setup Output Directory
        const outputDir = path.resolve(__dirname, `../../../datasets/synthetic_${jobId}`);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 2. Prepare Source Image URL
        let sourceUrl = sourceImage;
        if (!sourceImage.startsWith('http')) {
            if (fs.existsSync(sourceImage)) {
                sourceUrl = await this.uploadToFalResult(sourceImage);
                console.log(`[DatasetGenerator] Source uploaded: ${sourceUrl}`);
            } else {
                throw new Error(`Source image not found at ${sourceImage}`);
            }
        }

        // 3. Prepare Description for captions
        let descriptionToUse = characterDescription || "";
        descriptionToUse = descriptionToUse.replace(/@[Ii]mage\d+[,\s]*/g, '').trim();

        if (!descriptionToUse) {
            try {
                console.log(`[DatasetGenerator] 🔍 No description provided, analyzing source image...`);
                // Enhanced analysis prompt that detects style
                const analysisPrompt = "Describe this character briefly: art style (realistic, anime, cartoon, 3D render), hair color, hair style, facial hair, clothing, accessories. Be specific about colors and style. Do not describe background.";
                const autoCaption = await this.generationService.analyzeImage(sourceUrl, analysisPrompt);
                console.log(`[DatasetGenerator] 🤖 Auto-Caption: "${autoCaption.substring(0, 150)}"`);
                descriptionToUse = autoCaption;
            } catch (err) {
                console.warn(`[DatasetGenerator] Warning: Auto-captioning failed, using trigger word only.`, err);
                descriptionToUse = "character";
            }
        } else {
            console.log(`[DatasetGenerator] 📝 Using user-provided description: "${descriptionToUse.substring(0, 100)}..."`);
        }

        // Add style prefix if present
        if (stylePrefix) {
            descriptionToUse = `${stylePrefix}, ${descriptionToUse}`;
        }

        // 4. Generate pose variations using Flux 2 Max
        let generatedCount = 0;
        const totalPoses = poses.length;

        console.log(`[DatasetGenerator] ⚡ Using Flux 2 Max for ${totalPoses} pose variations (${presetName} preset)...`);

        for (let i = 0; i < totalPoses; i++) {
            const posePrompt = poses[i];

            // Build prompt: simple, direct format that worked in testing
            // Format: [description], [pose], white background
            const fullPrompt = `${descriptionToUse}, ${posePrompt}, white background`;

            // Determine aspect ratio based on framing type
            // Close-ups need square, medium shots need 3:4, full body needs 9:16
            const isCloseUp = posePrompt.includes('close-up') || posePrompt.includes('head and shoulders');
            const isMediumShot = posePrompt.includes('medium shot') || posePrompt.includes('cropped at waist');
            const aspectRatio = isCloseUp ? '1:1' : isMediumShot ? '3:4' : '9:16';

            console.log(`[DatasetGenerator] Generating ${i + 1}/${totalPoses}: "${posePrompt}" (${aspectRatio})`);

            try {
                // Use Flux 2 Max edit endpoint
                const result: any = await fal.subscribe("fal-ai/flux-2-max/edit", {
                    input: {
                        prompt: fullPrompt,
                        image_urls: [sourceUrl], // Reference image for character consistency
                        aspect_ratio: aspectRatio,
                        num_images: 1,
                        output_format: "png",
                        safety_tolerance: 5,
                    },
                    logs: true,
                });

                if (result.images && result.images.length > 0) {
                    const imageUrl = result.images[0].url;
                    const poseName = posePrompt.split(',')[0].replace(/\s+/g, '_');
                    const filename = `gen_${String(generatedCount).padStart(2, '0')}_${poseName}.png`;
                    const filePath = path.join(outputDir, filename);

                    // Save caption for LoRA training
                    // Format: trigger_word, clean character description (no pose info)
                    const captionPath = path.join(outputDir, filename.replace('.png', '.txt'));
                    const caption = `${triggerWord}, ${descriptionToUse}`;
                    fs.writeFileSync(captionPath, caption);

                    await this.downloadImage(imageUrl, filePath);
                    generatedCount++;
                    console.log(`   ✅ Saved: ${filename}`);
                } else {
                    console.error(`   ❌ Failed: No output images`);
                }
            } catch (err: any) {
                console.error(`   ❌ Error for pose "${posePrompt}": ${err.message}`);
            }

            // Small delay between requests to avoid rate limiting
            if (i < totalPoses - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`[DatasetGenerator] ✅ Complete. Generated ${generatedCount}/${totalPoses} images.`);
        return { count: generatedCount, outputDir };
    }

    private async downloadImage(url: string, outputPath: string): Promise<void> {
        const writer = fs.createWriteStream(outputPath);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }
}

export const datasetGenerator = new DatasetGeneratorService();
