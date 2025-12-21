import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { clsx } from "clsx";

interface MagicPromptButtonProps {
    currentPrompt: string;
    onPromptEnhanced: (enhancedPrompt: string) => void;
    className?: string;
}

export function MagicPromptButton({ currentPrompt, onPromptEnhanced, className }: MagicPromptButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleEnhance = async () => {
        if (!currentPrompt.trim()) return;

        setIsLoading(true);
        try {
            const response = await fetchAPI('/llm/generate', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: `Enhance this image generation prompt to be more descriptive, artistic, and detailed. Keep the core subject but improve the style and lighting descriptions. Output ONLY the enhanced prompt, no other text.
                    
                    Original Prompt: "${currentPrompt}"`,
                    model: 'dolphin-llama3', // Use Ollama for enhanced prompting
                    temperature: 0.7,
                    maxTokens: 200
                })
            });

            if (response.content) {
                let enhanced = response.content.trim();
                // Remove surrounding quotes if present
                if (enhanced.startsWith('"') && enhanced.endsWith('"')) {
                    enhanced = enhanced.slice(1, -1);
                }
                // Remove JSON wrapper if present (e.g. {"prompt": "..."})
                if (enhanced.startsWith('{') && enhanced.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(enhanced);
                        if (parsed.prompt) enhanced = parsed.prompt;
                        else if (parsed.content) enhanced = parsed.content;
                    } catch (e) {
                        // If parse fails, just use the string but maybe strip braces?
                        // For now, assume if it parses, we use it.
                    }
                }
                onPromptEnhanced(enhanced);
            }
        } catch (error) {
            console.error("Failed to enhance prompt:", error);
            // Optional: Show toast error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleEnhance}
            disabled={isLoading || !currentPrompt.trim()}
            className={clsx(
                "p-2 rounded-lg transition-all group relative",
                isLoading ? "bg-purple-500/20 text-purple-300" : "hover:bg-purple-500/20 text-gray-400 hover:text-purple-300",
                className
            )}
            title="Enhance Prompt with AI"
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Sparkles className="w-5 h-5" />
            )}

            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Magic Enhance
            </span>
        </button>
    );
}
