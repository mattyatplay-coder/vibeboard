#!/usr/bin/env node
/**
 * Export Claude Code Session to Detailed Markdown
 *
 * Creates a comprehensive walkthrough document with:
 * - Full conversation flow (user requests + assistant responses)
 * - All code changes with before/after context
 * - Complete file contents that were created/modified
 * - Debugging steps and error resolutions
 *
 * Usage:
 *   node export-session-detailed.js <jsonl-path> <output-dir> [session-title]
 *
 * Outputs:
 *   - walkthrough.md - Full conversation with code
 *   - summary.md - Quick reference summary
 *   - code-changes/ - Individual file diffs
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const jsonlPath = process.argv[2] || process.env.TRANSCRIPT_PATH;
const outputDir = process.argv[3] || process.env.OUTPUT_DIR;
const sessionTitle = process.argv[4] || process.env.SESSION_TITLE || 'Session Walkthrough';

if (!jsonlPath || !outputDir) {
    console.error('Usage: node export-session-detailed.js <jsonl-path> <output-dir> [title]');
    process.exit(1);
}

async function parseJsonl(filePath) {
    const messages = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.trim()) {
            try {
                messages.push(JSON.parse(line));
            } catch (e) {
                // Skip malformed
            }
        }
    }
    return messages;
}

function extractText(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .filter(b => b.type === 'text' && b.text)
            .map(b => b.text)
            .join('\n');
    }
    return '';
}

function extractToolCalls(content) {
    if (!Array.isArray(content)) return [];
    return content.filter(b => b.type === 'tool_use').map(b => ({
        id: b.id,
        name: b.name,
        input: b.input || {}
    }));
}

function isSystemMessage(text) {
    if (!text) return true;
    return text.startsWith('<command-message>') ||
           text.startsWith('<system') ||
           text.startsWith('# Session') ||
           text.includes('This session is being continued');
}

function formatCodeBlock(code, lang = '') {
    return '```' + lang + '\n' + code + '\n```';
}

function generateDetailedWalkthrough(messages) {
    let md = `# ${sessionTitle}\n\n`;
    md += `**Generated**: ${new Date().toISOString()}\n`;
    md += `**Source**: Claude Code JSONL transcript\n\n`;
    md += `---\n\n`;

    const fileChanges = new Map(); // file -> [{type, content, timestamp}]
    const conversationFlow = [];
    let currentExchange = null;
    let toolResults = new Map(); // id -> result

    // First pass: collect tool results
    for (const msg of messages) {
        if (msg.type === 'user') {
            const content = msg.message?.content;
            if (Array.isArray(content)) {
                for (const block of content) {
                    if (block.type === 'tool_result') {
                        toolResults.set(block.tool_use_id, block.content);
                    }
                }
            }
        }
    }

    // Second pass: build conversation
    for (const msg of messages) {
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';

        if (msg.type === 'user') {
            const text = extractText(msg.message?.content);
            if (text && !isSystemMessage(text)) {
                // Start new exchange
                if (currentExchange) {
                    conversationFlow.push(currentExchange);
                }
                currentExchange = {
                    userRequest: text.substring(0, 2000),
                    timestamp,
                    assistantResponse: '',
                    toolCalls: [],
                    codeChanges: []
                };
            }
        }

        if (msg.type === 'assistant' && currentExchange) {
            const content = msg.message?.content;
            const text = extractText(content);
            const tools = extractToolCalls(content);

            if (text) {
                currentExchange.assistantResponse += text + '\n\n';
            }

            for (const tool of tools) {
                const toolInfo = {
                    name: tool.name,
                    input: tool.input,
                    result: toolResults.get(tool.id)
                };
                currentExchange.toolCalls.push(toolInfo);

                // Track file changes
                if (tool.name === 'Edit' || tool.name === 'Write') {
                    const filePath = tool.input.file_path || tool.input.path;
                    if (filePath) {
                        const relativePath = filePath.replace(/.*\/vibeboard\//, '');
                        const change = {
                            type: tool.name,
                            file: relativePath,
                            timestamp,
                            old_string: tool.input.old_string,
                            new_string: tool.input.new_string,
                            content: tool.input.content
                        };
                        currentExchange.codeChanges.push(change);

                        if (!fileChanges.has(relativePath)) {
                            fileChanges.set(relativePath, []);
                        }
                        fileChanges.get(relativePath).push(change);
                    }
                }
            }
        }
    }

    // Don't forget last exchange
    if (currentExchange) {
        conversationFlow.push(currentExchange);
    }

    // Table of Contents
    md += `## Table of Contents\n\n`;
    conversationFlow.forEach((ex, i) => {
        const preview = ex.userRequest.substring(0, 60).replace(/\n/g, ' ');
        md += `${i + 1}. [${preview}...](#exchange-${i + 1})\n`;
    });
    md += `\n---\n\n`;

    // Full walkthrough
    md += `## Full Walkthrough\n\n`;

    conversationFlow.forEach((ex, i) => {
        md += `### Exchange ${i + 1}\n`;
        md += `*${ex.timestamp}*\n\n`;

        md += `#### User Request\n`;
        md += `> ${ex.userRequest.replace(/\n/g, '\n> ')}\n\n`;

        if (ex.assistantResponse.trim()) {
            md += `#### Assistant Response\n`;
            // Truncate very long responses but keep important parts
            const response = ex.assistantResponse.trim();
            if (response.length > 3000) {
                md += response.substring(0, 1500) + '\n\n...[truncated]...\n\n' + response.substring(response.length - 1000);
            } else {
                md += response;
            }
            md += '\n\n';
        }

        if (ex.codeChanges.length > 0) {
            md += `#### Code Changes\n\n`;
            for (const change of ex.codeChanges) {
                md += `**${change.type}**: \`${change.file}\`\n\n`;
                if (change.type === 'Edit' && change.old_string && change.new_string) {
                    md += `<details>\n<summary>View diff</summary>\n\n`;
                    md += `**Before:**\n`;
                    md += formatCodeBlock(change.old_string.substring(0, 500), 'typescript');
                    md += `\n**After:**\n`;
                    md += formatCodeBlock(change.new_string.substring(0, 500), 'typescript');
                    md += `\n</details>\n\n`;
                } else if (change.type === 'Write' && change.content) {
                    md += `<details>\n<summary>View content (first 1000 chars)</summary>\n\n`;
                    md += formatCodeBlock(change.content.substring(0, 1000), 'typescript');
                    md += `\n</details>\n\n`;
                }
            }
        }

        if (ex.toolCalls.length > 0) {
            const nonFileTools = ex.toolCalls.filter(t => !['Edit', 'Write', 'Read'].includes(t.name));
            if (nonFileTools.length > 0) {
                md += `#### Other Tool Calls\n`;
                for (const tool of nonFileTools.slice(0, 5)) {
                    md += `- **${tool.name}**`;
                    if (tool.name === 'Bash' && tool.input.command) {
                        md += `: \`${tool.input.command.substring(0, 100)}\``;
                    }
                    md += '\n';
                }
                md += '\n';
            }
        }

        md += `---\n\n`;
    });

    // File Changes Summary
    md += `## All Files Modified\n\n`;
    for (const [file, changes] of fileChanges) {
        md += `### \`${file}\`\n`;
        md += `- **${changes.length}** change(s)\n`;
        for (const change of changes) {
            md += `  - ${change.type} at ${change.timestamp}\n`;
        }
        md += '\n';
    }

    return md;
}

function generateQuickSummary(messages) {
    // Use existing summary logic
    const summary = {
        userMessages: [],
        filesModified: new Set(),
        keyDecisions: [],
        toolCounts: {},
        startTime: null,
        endTime: null
    };

    for (const msg of messages) {
        if (msg.timestamp) {
            if (!summary.startTime) summary.startTime = msg.timestamp;
            summary.endTime = msg.timestamp;
        }

        if (msg.type === 'user') {
            const text = extractText(msg.message?.content);
            if (text && !isSystemMessage(text)) {
                summary.userMessages.push(text.substring(0, 200));
            }
        }

        if (msg.type === 'assistant') {
            const content = msg.message?.content;
            if (Array.isArray(content)) {
                for (const block of content) {
                    if (block.type === 'tool_use') {
                        summary.toolCounts[block.name] = (summary.toolCounts[block.name] || 0) + 1;
                        if (block.name === 'Edit' || block.name === 'Write') {
                            const fp = block.input?.file_path || block.input?.path;
                            if (fp) {
                                summary.filesModified.add(fp.replace(/.*\/vibeboard\//, ''));
                            }
                        }
                    }
                    if (block.type === 'text' && block.text) {
                        const patterns = [
                            /(The (?:issue|fix|problem|solution) (?:is|was)[^.]+\.)/gi,
                            /(I (?:fixed|updated|modified|changed|added)[^.]+\.)/gi
                        ];
                        for (const p of patterns) {
                            const matches = block.text.match(p);
                            if (matches) {
                                matches.slice(0, 2).forEach(m => summary.keyDecisions.push(m));
                            }
                        }
                    }
                }
            }
        }
    }

    let md = `# Quick Summary\n\n`;
    md += `**Duration**: ${summary.startTime ? new Date(summary.startTime).toLocaleTimeString() : '?'} - ${summary.endTime ? new Date(summary.endTime).toLocaleTimeString() : '?'}\n\n`;

    md += `## Stats\n`;
    md += `- User Messages: ${summary.userMessages.length}\n`;
    md += `- Files Modified: ${summary.filesModified.size}\n\n`;

    md += `## Files Modified\n`;
    for (const f of summary.filesModified) {
        md += `- \`${f}\`\n`;
    }
    md += '\n';

    md += `## Key Decisions\n`;
    [...new Set(summary.keyDecisions)].slice(0, 10).forEach(d => {
        md += `- ${d.replace(/\n/g, ' ')}\n`;
    });
    md += '\n';

    md += `## Tool Usage\n`;
    Object.entries(summary.toolCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([name, count]) => {
            md += `- ${name}: ${count}\n`;
        });

    return md;
}

async function main() {
    console.log(`Reading: ${jsonlPath}`);
    console.log(`Output: ${outputDir}`);

    if (!fs.existsSync(jsonlPath)) {
        console.error(`File not found: ${jsonlPath}`);
        process.exit(1);
    }

    // Create output directory
    fs.mkdirSync(outputDir, { recursive: true });

    const messages = await parseJsonl(jsonlPath);
    console.log(`Parsed ${messages.length} entries`);

    // Generate detailed walkthrough
    const walkthrough = generateDetailedWalkthrough(messages);
    fs.writeFileSync(path.join(outputDir, 'walkthrough.md'), walkthrough);
    console.log(`Created: ${path.join(outputDir, 'walkthrough.md')}`);

    // Generate quick summary
    const summary = generateQuickSummary(messages);
    fs.writeFileSync(path.join(outputDir, 'summary.md'), summary);
    console.log(`Created: ${path.join(outputDir, 'summary.md')}`);

    console.log('Done!');
}

main().catch(console.error);
