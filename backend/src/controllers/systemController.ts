import { Request, Response } from 'express';
import { exec } from 'child_process';
import os from 'os';

export const systemController = {
  openFolder: async (req: Request, res: Response) => {
    try {
      const { path } = req.body;
      if (!path) {
        return res.status(400).json({ error: 'Path is required' });
      }

      console.log(`[System] Opening folder: ${path}`);

      let command = '';
      switch (process.platform) {
        case 'darwin':
          command = `open "${path}"`;
          break;
        case 'win32':
          command = `explorer "${path}"`;
          break;
        case 'linux':
          command = `xdg-open "${path}"`;
          break;
        default:
          return res.status(500).json({ error: 'Unsupported platform' });
      }

      exec(command, error => {
        if (error) {
          console.error('Failed to open folder:', error);
          return res.status(500).json({ error: 'Failed to open folder' });
        }
        res.json({ success: true, message: 'Folder opened' });
      });
    } catch (error) {
      console.error('System error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
