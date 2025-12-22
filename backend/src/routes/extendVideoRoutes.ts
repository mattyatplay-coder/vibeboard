import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  analyzeVideo,
  recommendModel,
  enhancePrompt,
  generateExtension,
} from '../controllers/extendVideoController';

const router = Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.post('/analyze', upload.single('video'), analyzeVideo);
router.post('/recommend-model', recommendModel);
router.post('/enhance-prompt', enhancePrompt);
router.post('/generate', generateExtension);

export default router;
