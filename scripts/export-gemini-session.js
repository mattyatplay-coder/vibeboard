const fs = require('fs');
const path = require('path');

// Configuration
const HISTORY_FILE = path.join(__dirname, '../.agent/session_history.json');
const BACKUP_DIR = '/Volumes/Samsung.SSD.990.PRO.2TB/vibeboard backup/chathistory';

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`Backup directory not found: ${BACKUP_DIR}`);
    // Fallback to local backup if drive not mounted
    const LOCAL_BACKUP = path.join(__dirname, '../backups/chathistory');
    if (!fs.existsSync(LOCAL_BACKUP)) fs.mkdirSync(LOCAL_BACKUP, { recursive: true });
    console.log(`Falling back to local backup: ${LOCAL_BACKUP}`);
    process.env.BACKUP_TARGET = LOCAL_BACKUP;
} else {
    process.env.BACKUP_TARGET = BACKUP_DIR;
}

const TARGET_DIR = process.env.BACKUP_TARGET;

try {
    if (!fs.existsSync(HISTORY_FILE)) {
        throw new Error(`History file not found at ${HISTORY_FILE}`);
    }

    const historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));

    // Get the latest session (assuming last in array is most recent, or we process all)
    // For this continuity script, we want to export the *current* session details.
    // Since the JSON is updated by the system, we'll take the last entry as the most relevant context.

    const latestSession = historyData[historyData.length - 1];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `gemini_session_${timestamp}.md`;
    const outputPath = path.join(TARGET_DIR, filename);

    let content = `# Gemini Session Export - ${new Date().toLocaleString()}\n\n`;

    // Add Summary from history if available
    if (latestSession) {
        content += `## Session: ${latestSession.name}\n\n`;

        if (latestSession.keyDecisions && latestSession.keyDecisions.length > 0) {
            content += `### Key Decisions\n`;
            latestSession.keyDecisions.forEach(decision => {
                content += `- ${decision}\n`;
            });
            content += `\n`;
        }

        if (latestSession.filesModified && latestSession.filesModified.length > 0) {
            content += `### Files Modified\n`;
            latestSession.filesModified.forEach(file => {
                content += `- \`${file}\`\n`;
            });
            content += `\n`;
        }

        if (latestSession.preview) {
            content += `### Preview/Summary\n${latestSession.preview}\n\n`;
        }
    } else {
        content += `*No structured session history found in JSON.*\n`;
    }

    // Add Placeholder for manual continuity notes
    content += `### Continuity Notes\n`;
    content += `*Auto-generated export. Add manual notes here.* \n`;

    fs.writeFileSync(outputPath, content);
    console.log(`Session export successful: ${outputPath}`);

} catch (error) {
    console.error('Export failed:', error.message);
    process.exit(1);
}
