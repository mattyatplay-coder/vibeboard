#!/usr/bin/env node
/**
 * Parse Chat History Exports
 *
 * Cleans RTF-formatted markdown exports from Claude Code chat history
 * and extracts structured session data for documentation.
 */

const fs = require('fs');
const path = require('path');

const CHAT_HISTORY_DIR = '/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/chathistory';

function cleanRTFArtifacts(content) {
    // Remove RTF formatting patterns
    let cleaned = content
        // Remove font declarations
        .replace(/HelveticaNeue[^;]*;/g, '')
        .replace(/\.SFNS[^;]*;/g, '')
        .replace(/\.AppleSystem[^;]*;/g, '')
        .replace(/PingFangSC[^;]*;/g, '')
        .replace(/\.SFNSMono[^;]*;/g, '')
        .replace(/\.AppleColorEmojiUI;/g, '')
        // Remove RTF control sequences
        .replace(/\\d\s*deftab720\s*tightenfactor0\s*/g, '\n')
        .replace(/\\[a-z]+\s*/g, '')
        .replace(/\*decimal\s*;+/g, '')
        .replace(/\*disc•?\s*;+/g, '')
        .replace(/;+/g, '')
        // Remove empty lines and normalize whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return cleaned;
}

function extractKeyDecisions(content) {
    const decisions = [];

    // Look for patterns that indicate decisions/conclusions
    const patterns = [
        /(?:The (?:fix|solution|issue) (?:is|was))([^.]+\.)/gi,
        /(?:Updated|Added|Created|Fixed|Removed)([^.]+\.)/gi,
        /(?:Key change:|Important:|Note:)([^.]+\.)/gi,
    ];

    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            decisions.push(match[0].trim());
        }
    });

    return [...new Set(decisions)].slice(0, 20); // Unique, max 20
}

function extractCodeChanges(content) {
    const files = new Set();

    // Look for file paths mentioned
    const filePatterns = [
        /(?:frontend|backend)\/src\/[^\s\n,]+\.(tsx?|js|json)/g,
        /components\/[^\s\n,]+\.tsx/g,
        /services\/[^\s\n,]+\.ts/g,
    ];

    filePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            files.add(match[0]);
        }
    });

    return [...files];
}

function processSession(dirPath, sessionName) {
    const walkthroughPath = path.join(dirPath, 'walkthrough.md');
    const attachmentsPath = path.join(dirPath, 'attachments');

    if (!fs.existsSync(walkthroughPath)) {
        console.error(`No walkthrough.md found in ${sessionName}`);
        return null;
    }

    const rawContent = fs.readFileSync(walkthroughPath, 'utf8');
    const cleanedContent = cleanRTFArtifacts(rawContent);

    // Get attachment count
    let attachmentCount = 0;
    if (fs.existsSync(attachmentsPath)) {
        attachmentCount = fs.readdirSync(attachmentsPath).filter(f => !f.startsWith('.')).length;
    }

    return {
        name: sessionName,
        originalLines: rawContent.split('\n').length,
        cleanedLength: cleanedContent.length,
        attachments: attachmentCount,
        keyDecisions: extractKeyDecisions(cleanedContent),
        filesModified: extractCodeChanges(cleanedContent),
        preview: cleanedContent.substring(0, 1000) + '...',
    };
}

function main() {
    console.log('Parsing Chat History...\n');

    const sessions = [];
    const dirs = fs.readdirSync(CHAT_HISTORY_DIR).filter(d =>
        fs.statSync(path.join(CHAT_HISTORY_DIR, d)).isDirectory() && !d.startsWith('.')
    );

    dirs.forEach(dir => {
        console.log(`Processing: ${dir}`);
        const result = processSession(path.join(CHAT_HISTORY_DIR, dir), dir);
        if (result) {
            sessions.push(result);
        }
    });

    // Output summary
    console.log('\n=== SUMMARY ===\n');
    sessions.forEach(s => {
        console.log(`${s.name}`);
        console.log(`  Lines: ${s.originalLines}, Attachments: ${s.attachments}`);
        console.log(`  Files Modified: ${s.filesModified.slice(0, 5).join(', ')}${s.filesModified.length > 5 ? '...' : ''}`);
        console.log(`  Key Decisions (${s.keyDecisions.length}): ${s.keyDecisions.slice(0, 3).join('; ')}`);
        console.log('');
    });

    // Write cleaned output
    const outputPath = '/Users/matthenrichmacbook/Antigravity/vibeboard/.agent/session_history.json';
    fs.writeFileSync(outputPath, JSON.stringify(sessions, null, 2));
    console.log(`\nWrote session data to: ${outputPath}`);
}

main();
