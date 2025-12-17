import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
// Ensure upload directory exists - SAFELY
try {
    if (!fs.existsSync(uploadDir)) {
        // Only try to create if it doesn't look like a broken symlink
        // lstatSync throws if file doesn't exist, returns stats if it does (even broken symlink)
        try {
            const stats = fs.lstatSync(uploadDir);
            if (stats.isSymbolicLink()) {
                console.warn('[Upload] Uploads is a broken symlink. Skipping mkdir.');
            } else {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } catch (e) {
            // File truly doesn't exist
            fs.mkdirSync(uploadDir, { recursive: true });
        }
    }
} catch (err) {
    console.warn('[Upload] Failed to create upload directory:', err);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

export const upload = multer({ storage });
