import { Router } from 'express';
import { createDataset, listDatasets } from '../controllers/datasetController';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for temp storage
const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// router.post('/', upload.array('files'), createDataset);
router.post('/', upload.fields([
    { name: 'files', maxCount: 1000 },
    { name: 'referenceFiles', maxCount: 20 }
]), createDataset);
router.get('/', listDatasets);

export default router;
