import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';

interface MagicPromptButtonProps {
  currentPrompt: string;
  onPromptEnhanced: (enhancedPrompt: string) => void;
  className?: string;
}

export function MagicPromptButton({
  currentPrompt,
  onPromptEnhanced,
  className,
}: MagicPromptButtonProps) {
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
          maxTokens: 200,
        }),
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
      console.error('Failed to enhance prompt:', error);
      // Optional: Show toast error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip content="Enhance Prompt with AI" side="top">
      <button
        type="button"
        onClick={handleEnhance}
        disabled={isLoading || !currentPrompt.trim()}
        className={clsx(
          'relative rounded-lg p-2 transition-all',
          isLoading
            ? 'bg-purple-500/20 text-purple-300'
            : 'text-gray-400 hover:bg-purple-500/20 hover:text-purple-300',
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
      </button>
    </Tooltip>
  );
}
