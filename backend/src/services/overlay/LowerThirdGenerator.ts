/**
 * LowerThirdGenerator - Creates styled lower third graphics
 *
 * Generates PNG images for lower thirds (name/title overlays) using:
 * - Canvas-based rendering for precise control
 * - Style presets matching content creator archetypes
 * - Dynamic sizing based on text content
 */

import { createCanvas, registerFont, CanvasRenderingContext2D } from 'canvas';
import * as path from 'path';
import * as fs from 'fs';
import {
    LowerThirdData,
    LowerThirdStyle,
    LOWER_THIRD_PRESETS,
    GenerateLowerThirdRequest,
    GenerateLowerThirdResult,
} from './OverlayTypes';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface RenderDimensions {
    width: number;
    height: number;
    padding: number;
    nameSize: number;
    subtitleSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class LowerThirdGenerator {
    private static instance: LowerThirdGenerator;
    private outputDir: string;

    private constructor() {
        this.outputDir = path.join(process.cwd(), 'uploads', 'overlays');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    static getInstance(): LowerThirdGenerator {
        if (!LowerThirdGenerator.instance) {
            LowerThirdGenerator.instance = new LowerThirdGenerator();
        }
        return LowerThirdGenerator.instance;
    }

    /**
     * Generate a lower third graphic
     */
    async generate(request: GenerateLowerThirdRequest): Promise<GenerateLowerThirdResult> {
        const { name, subtitle, style, customColors, width, height } = request;

        // Get style preset
        const preset = LOWER_THIRD_PRESETS[style];
        const colors = {
            primary: customColors?.primary || preset.colors.primary,
            secondary: customColors?.secondary || preset.colors.secondary,
            text: customColors?.text || preset.colors.text,
        };

        // Calculate dimensions
        const dimensions = this.calculateDimensions(name, subtitle, width, height);

        // Create canvas
        const canvas = createCanvas(dimensions.width, dimensions.height);
        const ctx = canvas.getContext('2d');

        // Render based on style
        switch (style) {
            case 'minimal':
                this.renderMinimal(ctx, name, subtitle, colors, dimensions);
                break;
            case 'modern':
                this.renderModern(ctx, name, subtitle, colors, dimensions);
                break;
            case 'news':
                this.renderNews(ctx, name, subtitle, colors, dimensions);
                break;
            case 'tech':
                this.renderTech(ctx, name, subtitle, colors, dimensions);
                break;
            case 'gaming':
                this.renderGaming(ctx, name, subtitle, colors, dimensions);
                break;
            case 'elegant':
                this.renderElegant(ctx, name, subtitle, colors, dimensions);
                break;
            case 'creator':
                this.renderCreator(ctx, name, subtitle, colors, dimensions);
                break;
            default:
                this.renderMinimal(ctx, name, subtitle, colors, dimensions);
        }

        // Save to file
        const filename = `lower_third_${Date.now()}.png`;
        const outputPath = path.join(this.outputDir, filename);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);

        return {
            url: `/uploads/overlays/${filename}`,
            width: dimensions.width,
            height: dimensions.height,
        };
    }

    /**
     * Calculate dimensions based on text content
     */
    private calculateDimensions(
        name: string,
        subtitle: string | undefined,
        requestedWidth?: number,
        requestedHeight?: number
    ): RenderDimensions {
        // Base sizes
        const nameSize = 48;
        const subtitleSize = 24;
        const padding = 24;

        // Estimate text width using approximate character widths
        const nameWidth = name.length * nameSize * 0.6;
        const subtitleWidth = subtitle ? subtitle.length * subtitleSize * 0.5 : 0;

        // Calculate dimensions
        const contentWidth = Math.max(nameWidth, subtitleWidth);
        const width = requestedWidth || Math.max(contentWidth + padding * 2, 400);

        const contentHeight = nameSize + (subtitle ? subtitleSize + 8 : 0);
        const height = requestedHeight || contentHeight + padding * 2;

        return { width, height, padding, nameSize, subtitleSize };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STYLE RENDERERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Minimal style: Clean text with subtle background
     */
    private renderMinimal(
        ctx: CanvasRenderingContext2D,
        name: string,
        subtitle: string | undefined,
        colors: { primary: string; secondary: string; text: string },
        dim: RenderDimensions
    ): void {
        // Semi-transparent background
        ctx.fillStyle = colors.primary;
        this.roundRect(ctx, 0, 0, dim.width, dim.height, 8);
        ctx.fill();

        // Name text
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${dim.nameSize}px Inter, Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(name, dim.padding, dim.padding);

        // Subtitle if present
        if (subtitle) {
            ctx.font = `${dim.subtitleSize}px Inter, Arial, sans-serif`;
            ctx.globalAlpha = 0.8;
            ctx.fillText(subtitle, dim.padding, dim.padding + dim.nameSize + 8);
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Modern style: Gradient background with bold text
     */
    private renderModern(
        ctx: CanvasRenderingContext2D,
        name: string,
        subtitle: string | undefined,
        colors: { primary: string; secondary: string; text: string },
        dim: RenderDimensions
    ): void {
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, dim.width, 0);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, colors.secondary);
        ctx.fillStyle = gradient;
        this.roundRect(ctx, 0, 0, dim.width, dim.height, 12);
        ctx.fill();

        // Accent line
        ctx.fillStyle = colors.text;
        ctx.fillRect(dim.padding, dim.padding, 4, dim.height - dim.padding * 2);

        // Name text
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${dim.nameSize}px Inter, Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(name, dim.padding + 16, dim.padding);

        // Subtitle
        if (subtitle) {
            ctx.font = `${dim.subtitleSize}px Inter, Arial, sans-serif`;
            ctx.globalAlpha = 0.9;
            ctx.fillText(subtitle, dim.padding + 16, dim.padding + dim.nameSize + 8);
            ctx.globalAlpha = 1;
        }
    }

    /**
     * News style: TV news bar aesthetic
     */
    private renderNews(
        ctx: CanvasRenderingContext2D,
        name: string,
        subtitle: string | undefined,
        colors: { primary: string; secondary: string; text: string },
        dim: RenderDimensions
    ): void {
        // Main background bar
        ctx.fillStyle = colors.primary;
        ctx.fillRect(0, 0, dim.width, dim.height);

        // Accent strip on left
        ctx.fillStyle = colors.secondary;
        ctx.fillRect(0, 0, 8, dim.height);

        // Divider line
        ctx.fillStyle = colors.text;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(dim.padding, dim.height / 2, dim.width - dim.padding * 2, 1);
        ctx.globalAlpha = 1;

        // Name (uppercase for news style)
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${dim.nameSize}px Roboto Condensed, Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(name.toUpperCase(), dim.padding + 8, dim.padding - 4);

        // Subtitle/Title
        if (subtitle) {
            ctx.font = `${dim.subtitleSize}px Roboto Condensed, Arial, sans-serif`;
            ctx.fillText(subtitle.toUpperCase(), dim.padding + 8, dim.padding + dim.nameSize + 4);
        }
    }

    /**
     * Tech style: Clean, modern tech reviewer aesthetic
     */
    private renderTech(
        ctx: CanvasRenderingContext2D,
        name: string,
        subtitle: string | undefined,
        colors: { primary: string; secondary: string; text: string },
        dim: RenderDimensions
    ): void {
        // Background with slight gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, dim.height);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(1, this.adjustBrightness(colors.primary, -20));
        ctx.fillStyle = gradient;
        this.roundRect(ctx, 0, 0, dim.width, dim.height, 4);
        ctx.fill();

        // Glowing accent line
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 10;
        ctx.fillStyle = colors.text;
        ctx.fillRect(0, dim.height - 3, dim.width, 3);
        ctx.shadowBlur = 0;

        // Name
        ctx.fillStyle = colors.text;
        ctx.font = `600 ${dim.nameSize}px SF Pro Display, -apple-system, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(name, dim.padding, dim.padding);

        // Subtitle with tech styling
        if (subtitle) {
            ctx.font = `400 ${dim.subtitleSize}px SF Pro Display, -apple-system, sans-serif`;
            ctx.globalAlpha = 0.8;
            ctx.fillText(subtitle, dim.padding, dim.padding + dim.nameSize + 6);
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Gaming style: RGB neon aesthetic
     */
    private renderGaming(
        ctx: CanvasRenderingContext2D,
        name: string,
        subtitle: string | undefined,
        colors: { primary: string; secondary: string; text: string },
        dim: RenderDimensions
    ): void {
        // Dark background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.roundRect(ctx, 0, 0, dim.width, dim.height, 8);
        ctx.fill();

        // Neon border glow
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        this.roundRect(ctx, 2, 2, dim.width - 4, dim.height - 4, 6);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // RGB accent gradient at bottom
        const rgbGradient = ctx.createLinearGradient(0, 0, dim.width, 0);
        rgbGradient.addColorStop(0, colors.primary);
        rgbGradient.addColorStop(0.5, colors.secondary);
        rgbGradient.addColorStop(1, colors.primary);
        ctx.fillStyle = rgbGradient;
        ctx.fillRect(4, dim.height - 4, dim.width - 8, 2);

        // Glowing name text
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 8;
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${dim.nameSize}px Orbitron, monospace`;
        ctx.textBaseline = 'top';
        ctx.fillText(name.toUpperCase(), dim.padding, dim.padding);
        ctx.shadowBlur = 0;

        // Subtitle
        if (subtitle) {
            ctx.font = `${dim.subtitleSize}px Orbitron, monospace`;
            ctx.globalAlpha = 0.8;
            ctx.fillText(subtitle.toUpperCase(), dim.padding, dim.padding + dim.nameSize + 8);
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Elegant style: Luxury serif aesthetic
     */
    private renderElegant(
        ctx: CanvasRenderingContext2D,
        name: string,
        subtitle: string | undefined,
        colors: { primary: string; secondary: string; text: string },
        dim: RenderDimensions
    ): void {
        // Subtle background
        ctx.fillStyle = colors.primary;
        ctx.fillRect(0, 0, dim.width, dim.height);

        // Gold accent line
        ctx.fillStyle = colors.secondary;
        ctx.fillRect(dim.padding, dim.height - 8, dim.width - dim.padding * 2, 2);

        // Decorative elements
        ctx.fillRect(dim.padding, dim.padding, 40, 2);
        ctx.fillRect(dim.padding, dim.padding, 2, 20);

        // Name in elegant serif
        ctx.fillStyle = colors.text;
        ctx.font = `${dim.nameSize}px Playfair Display, Georgia, serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(name, dim.padding + 20, dim.padding + 16);

        // Subtitle in lighter weight
        if (subtitle) {
            ctx.font = `italic ${dim.subtitleSize}px Playfair Display, Georgia, serif`;
            ctx.globalAlpha = 0.9;
            ctx.fillText(subtitle, dim.padding + 20, dim.padding + dim.nameSize + 20);
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Creator style: YouTube creator aesthetic
     */
    private renderCreator(
        ctx: CanvasRenderingContext2D,
        name: string,
        subtitle: string | undefined,
        colors: { primary: string; secondary: string; text: string },
        dim: RenderDimensions
    ): void {
        // Background with YouTube-style dark theme
        ctx.fillStyle = colors.secondary;
        this.roundRect(ctx, 0, 0, dim.width, dim.height, 12);
        ctx.fill();

        // Red accent bar (YouTube-style)
        ctx.fillStyle = colors.primary;
        ctx.fillRect(0, 0, 6, dim.height);
        this.roundRect(ctx, 0, 0, 6, dim.height, 12);
        ctx.fill();

        // Name
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${dim.nameSize}px YouTube Sans, Roboto, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(name, dim.padding + 8, dim.padding);

        // Channel/subtitle
        if (subtitle) {
            ctx.font = `${dim.subtitleSize}px YouTube Sans, Roboto, sans-serif`;
            ctx.globalAlpha = 0.7;
            ctx.fillText(subtitle, dim.padding + 8, dim.padding + dim.nameSize + 6);
            ctx.globalAlpha = 1;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Draw a rounded rectangle
     */
    private roundRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Adjust color brightness
     */
    private adjustBrightness(hex: string, amount: number): string {
        // Handle rgba format
        if (hex.startsWith('rgba')) {
            const match = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                const r = Math.max(0, Math.min(255, parseInt(match[1]) + amount));
                const g = Math.max(0, Math.min(255, parseInt(match[2]) + amount));
                const b = Math.max(0, Math.min(255, parseInt(match[3]) + amount));
                return `rgb(${r}, ${g}, ${b})`;
            }
        }

        // Handle hex format
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
        const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    /**
     * Get all available styles for UI
     */
    getAvailableStyles(): Array<{ id: LowerThirdStyle; name: string; description: string }> {
        return Object.entries(LOWER_THIRD_PRESETS).map(([id, preset]) => ({
            id: id as LowerThirdStyle,
            name: preset.name,
            description: preset.description,
        }));
    }
}

export default LowerThirdGenerator;
