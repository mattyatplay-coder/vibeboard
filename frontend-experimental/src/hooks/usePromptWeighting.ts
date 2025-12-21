
import { useCallback } from 'react';

interface UsePromptWeightingProps {
    value: string;
    onChange: (value: string) => void;
    onPropChange?: (value: string) => void;
}

export function usePromptWeighting({ value, onChange, onPropChange }: UsePromptWeightingProps) {
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            // delta: 0.1 for up, -0.1 for down
            const delta = e.key === 'ArrowUp' ? 0.1 : -0.1;

            // Helper to format float to max 2 decimals, like 1.1, 1.25
            const fmt = (n: number) => parseFloat(n.toFixed(2));

            const fullText = value;

            let updateStart = start;
            let updateEnd = end;

            // Case 1: Cursor is inside a (...) block?
            // We scan backwards for '(' and forwards for ')'
            // AND ensure no other '(' or ')' inside (simple nesting check or assumed flat for now)

            const beforeCursor = fullText.slice(0, start);
            const afterCursor = fullText.slice(end);

            const lastOpen = beforeCursor.lastIndexOf('(');
            const nextClose = afterCursor.indexOf(')');

            let expanded = false;

            if (lastOpen !== -1 && nextClose !== -1) {
                // Potential group
                const groupContent = fullText.slice(lastOpen + 1, end + nextClose);
                // Check if it matches key:value or just key
                // If it has a colon, it handles weight.
                // We also check that it doesn't contain inner parens (nested structure avoidance for simple robust parser)
                if (groupContent.includes(':') && !groupContent.includes('(') && !groupContent.includes(')')) {
                    // Likely a weight block like "cat:1.1" inside parens
                    updateStart = lastOpen;
                    updateEnd = end + nextClose + 1; // include closing paren
                    expanded = true;
                }
            }

            let textToUpdate = fullText.slice(updateStart, updateEnd);
            let replacement = textToUpdate;

            // Regex to parse (text:weight)
            const weightRegex = /^\((.+):([0-9.]+)\)$/;
            const match = textToUpdate.match(weightRegex);

            if (match) {
                // It is already (text:weight)
                const content = match[1];
                const currentWeight = parseFloat(match[2]);
                const newWeight = fmt(currentWeight + delta);
                replacement = `(${content}:${newWeight})`;
            } else {
                // It is NOT yet weighted or we selected plain text

                // Check if it matches (text)
                const plainParens = /^\((.+)\)$/;
                const plainMatch = textToUpdate.match(plainParens);

                if (plainMatch) {
                    // (text) case -> (text:1.1)
                    const content = plainMatch[1];
                    const newWeight = fmt(1.0 + delta);
                    replacement = `(${content}:${newWeight})`;
                } else {
                    // Plain text case: "cat" -> "(cat:1.1)"
                    // If selection was empty, we need to grab the word under cursor if we didn't expand
                    if (!expanded && start === end) {
                        // Grab word
                        // Simple heuristic: read until whitespace
                        const text = fullText;
                        let s = start;
                        let e = end;
                        while (s > 0 && !/\s/.test(text[s - 1]) && text[s - 1] !== '(' && text[s - 1] !== ')') s--;
                        while (e < text.length && !/\s/.test(text[e]) && text[e] !== '(' && text[e] !== ')') e++;

                        updateStart = s;
                        updateEnd = e;
                        textToUpdate = text.slice(s, e);
                    }

                    if (textToUpdate.trim().length === 0) return; // Nothing to update

                    // Wrap
                    const newWeight = fmt(1.0 + delta);
                    replacement = `(${textToUpdate}:${newWeight})`;
                }
            }

            const nextPrompt = fullText.slice(0, updateStart) + replacement + fullText.slice(updateEnd);
            onChange(nextPrompt);
            if (onPropChange) onPropChange(nextPrompt);

            // Restore cursor relative to change
            // We want to keep selection covering the modified group usually
            setTimeout(() => {
                if (textarea) {
                    textarea.selectionStart = updateStart;
                    textarea.selectionEnd = updateStart + replacement.length;
                }
            }, 0);
        }
    }, [value, onChange, onPropChange]);

    return { handleKeyDown };
}
