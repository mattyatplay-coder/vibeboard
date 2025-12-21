#!/usr/bin/env node
/**
 * Export Claude Code Session to Markdown
 *
 * Reads the JSONL conversation file and exports it as a clean markdown file
 * with key decisions, files modified, and conversation summary.
 *
 * Usage:
 *   node export-session.js <jsonl-path> <output-path> [session-title]
 *
 * Or via environment:
 *   TRANSCRIPT_PATH=<path> SESSION_TITLE="My Session" node export-session.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Get paths from args or environment
const jsonlPath = process.argv[2] || process.env.TRANSCRIPT_PATH;
const outputPath = process.argv[3] || process.env.OUTPUT_PATH;
const sessionTitle = process.argv[4] || process.env.SESSION_TITLE || 'Claude Code Session';

if (!jsonlPath) {
    console.error('Usage: node export-session.js <jsonl-path> <output-path> [title]');
    console.error('  Or set TRANSCRIPT_PATH environment variable');
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
                const entry = JSON.parse(line);
                messages.push(entry);
            } catch (e) {
                // Skip malformed lines
            }
        }
    }
    return messages;
}

function extractKeyInfo(messages) {
    const summary = {
        userMessages: [],
        assistantMessages: [],
        toolCalls: [],
        filesModified: new Set(),
        keyDecisions: [],
        errors: [],
        startTime: null,
        endTime: null,
    };

    for (const msg of messages) {
        // Track timestamps
        if (msg.timestamp) {
            if (!summary.startTime) summary.startTime = msg.timestamp;
            summary.endTime = msg.timestamp;
        }

        // Extract user messages
        if (msg.type === 'user') {
            const content = msg.message?.content;
            if (content) {
                // Content can be string or array of content blocks
                if (typeof content === 'string' && content.length > 0) {
                    // Skip command messages and system messages
                    if (!content.startsWith('<command-message>') && !content.startsWith('<system')) {
                        summary.userMessages.push(content.substring(0, 500));
                    }
                } else if (Array.isArray(content)) {
                    content.forEach(block => {
                        if (block.type === 'text' && block.text &&
                            !block.text.startsWith('<command-message>') &&
                            !block.text.startsWith('# Session')) {
                            summary.userMessages.push(block.text.substring(0, 500));
                        }
                    });
                }
            }
        }

        // Extract assistant messages and tool calls
        if (msg.type === 'assistant') {
            const content = msg.message?.content;
            if (content && Array.isArray(content)) {
                content.forEach(block => {
                    // Text content from assistant
                    if (block.type === 'text' && block.text) {
                        summary.assistantMessages.push(block.text.substring(0, 1000));

                        // Look for key patterns in assistant text
                        const patterns = [
                            /(The (?:issue|fix|problem|solution|root cause) (?:is|was)[^.]+\.)/gi,
                            /(I (?:fixed|updated|modified|changed|added|removed|refactored)[^.]+\.)/gi,
                            /(This (?:fixes|resolves|addresses|implements)[^.]+\.)/gi
                        ];
                        patterns.forEach(pattern => {
                            const matches = block.text.match(pattern);
                            if (matches) {
                                matches.slice(0, 3).forEach(m => summary.keyDecisions.push(m));
                            }
                        });
                    }

                    // Tool use blocks
                    if (block.type === 'tool_use') {
                        const toolName = block.name;
                        const input = block.input || {};

                        // Track file modifications
                        if (toolName === 'Edit' || toolName === 'Write') {
                            const filePath = input.file_path || input.path;
                            if (filePath) {
                                // Extract relative path from vibeboard
                                const relativePath = filePath.replace(/.*\/vibeboard\//, '');
                                summary.filesModified.add(relativePath);
                            }
                        }

                        summary.toolCalls.push({
                            name: toolName,
                            timestamp: msg.timestamp
                        });
                    }
                });
            }
        }

        // Track errors
        if (msg.type === 'error') {
            const errContent = msg.message?.content || msg.content || 'Unknown error';
            summary.errors.push(typeof errContent === 'string' ? errContent : JSON.stringify(errContent));
        }
    }

    return summary;
}

function generateMarkdown(summary, title) {
    const now = new Date().toISOString().split('T')[0];
    const filesArray = Array.from(summary.filesModified);

    let md = `# ${title}\n\n`;
    md += `**Date**: ${now}\n`;
    md += `**Duration**: ${summary.startTime ? new Date(summary.startTime).toLocaleTimeString() : 'Unknown'} - ${summary.endTime ? new Date(summary.endTime).toLocaleTimeString() : 'Unknown'}\n\n`;

    // Summary stats
    md += `## Session Summary\n\n`;
    md += `- **User Messages**: ${summary.userMessages.length}\n`;
    md += `- **Tool Calls**: ${summary.toolCalls.length}\n`;
    md += `- **Files Modified**: ${filesArray.length}\n`;
    md += `- **Errors Encountered**: ${summary.errors.length}\n\n`;

    // Files modified
    if (filesArray.length > 0) {
        md += `## Files Modified\n\n`;
        filesArray.sort().forEach(f => {
            md += `- \`${f}\`\n`;
        });
        md += `\n`;
    }

    // Key decisions
    if (summary.keyDecisions.length > 0) {
        md += `## Key Decisions & Insights\n\n`;
        [...new Set(summary.keyDecisions)].slice(0, 10).forEach(d => {
            md += `- ${d.replace(/\n/g, ' ').trim()}\n`;
        });
        md += `\n`;
    }

    // User requests (first 10)
    if (summary.userMessages.length > 0) {
        md += `## User Requests\n\n`;
        summary.userMessages.slice(0, 10).forEach((msg, i) => {
            const preview = msg.replace(/\n/g, ' ').substring(0, 200);
            md += `${i + 1}. ${preview}${msg.length > 200 ? '...' : ''}\n`;
        });
        md += `\n`;
    }

    // Errors if any
    if (summary.errors.length > 0) {
        md += `## Errors Encountered\n\n`;
        summary.errors.slice(0, 5).forEach(e => {
            md += `- ${e.substring(0, 200)}...\n`;
        });
        md += `\n`;
    }

    // Tool usage summary
    const toolCounts = {};
    summary.toolCalls.forEach(tc => {
        toolCounts[tc.name] = (toolCounts[tc.name] || 0) + 1;
    });

    if (Object.keys(toolCounts).length > 0) {
        md += `## Tool Usage\n\n`;
        Object.entries(toolCounts)
            .sort((a, b) => b[1] - a[1])
            .forEach(([name, count]) => {
                md += `- **${name}**: ${count} calls\n`;
            });
    }

    return md;
}

async function main() {
    console.log(`Reading session from: ${jsonlPath}`);

    if (!fs.existsSync(jsonlPath)) {
        console.error(`File not found: ${jsonlPath}`);
        process.exit(1);
    }

    const messages = await parseJsonl(jsonlPath);
    console.log(`Parsed ${messages.length} entries`);

    const summary = extractKeyInfo(messages);
    console.log(`Found ${summary.filesModified.size} files modified`);
    console.log(`Found ${summary.keyDecisions.length} key decisions`);

    const markdown = generateMarkdown(summary, sessionTitle);

    if (outputPath) {
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, markdown);
        console.log(`Exported to: ${outputPath}`);
    } else {
        // Print to stdout
        console.log('\n--- EXPORTED MARKDOWN ---\n');
        console.log(markdown);
    }
}

main().catch(console.error);
