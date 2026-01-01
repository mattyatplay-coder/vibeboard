import fs from 'fs';
import path from 'path';

/**
 * Configuration for network storage mount validation
 */
export interface StorageConfig {
  uploadsPath: string;
  networkVolumePath?: string;
  requireNetworkMount: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: StorageConfig = {
  uploadsPath: path.join(process.cwd(), 'uploads'),
  networkVolumePath: '/Volumes/Samsung.SSD.990.PRO.2TB',
  requireNetworkMount: false, // Set to true after migration
};

/**
 * Validates that required storage is accessible
 * Call this before starting the server
 */
export function validateStorage(config: Partial<StorageConfig> = {}): void {
  const cfg = { ...defaultConfig, ...config };

  console.log('[Storage] Validating storage configuration...');

  // Check if uploads directory exists
  const uploadsPath = cfg.uploadsPath;

  if (!fs.existsSync(uploadsPath)) {
    throw new Error(
      `[Storage] Uploads directory not found: ${uploadsPath}\n` +
        `Please ensure the uploads directory exists or the symlink is valid.`
    );
  }

  // Check if it's a symlink
  const stats = fs.lstatSync(uploadsPath);
  if (stats.isSymbolicLink()) {
    const target = fs.readlinkSync(uploadsPath);
    console.log(`[Storage] Uploads is a symlink -> ${target}`);

    // Verify the symlink target is accessible
    if (!fs.existsSync(uploadsPath)) {
      throw new Error(
        `[Storage] Symlink target is not accessible: ${target}\n` +
          `Please ensure the network drive is mounted.`
      );
    }

    // If network mount is required, verify the volume
    if (cfg.requireNetworkMount && cfg.networkVolumePath) {
      if (!fs.existsSync(cfg.networkVolumePath)) {
        throw new Error(
          `[Storage] Network volume not mounted: ${cfg.networkVolumePath}\n` +
            `Please connect and mount the Samsung SSD before starting the server.`
        );
      }
      console.log(`[Storage] Network volume verified: ${cfg.networkVolumePath}`);
    }
  } else {
    console.log(`[Storage] Uploads is a local directory`);
  }

  // Verify write access - use unique filename to avoid stale SMB locks
  const testFile = path.join(uploadsPath, `.write-test-${Date.now()}`);
  try {
    fs.writeFileSync(testFile, 'test');

    // Verify existence before attempting cleanup
    // Note: Network drives might have latency, but sync write should be done.
    if (fs.existsSync(testFile)) {
      try {
        fs.unlinkSync(testFile);
      } catch (e: any) {
        // If the file is already gone (likely due to network race or weird cache), that's fine.
        if (e.code !== 'ENOENT') {
          console.warn(`[Storage] Warning: Failed to cleanup test file: ${testFile}`, e.message);
        }
      }
    }
    console.log('[Storage] Write access verified');
  } catch (err: any) {
    // Try to clean up stale test files
    try {
      const files = fs.readdirSync(uploadsPath);
      for (const file of files) {
        if (file.startsWith('.write-test')) {
          try {
            fs.unlinkSync(path.join(uploadsPath, file));
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }

    throw new Error(
      `[Storage] Cannot write to uploads directory: ${uploadsPath}\n` +
        `Error: ${err instanceof Error ? err.message : err}`
    );
  }

  console.log('[Storage] ✅ Storage validation passed');
}

/**
 * Get storage status for health checks
 */
export function getStorageStatus(): {
  uploadsPath: string;
  isSymlink: boolean;
  symlinkTarget?: string;
  isAccessible: boolean;
  networkMounted?: boolean;
} {
  const uploadsPath = defaultConfig.uploadsPath;

  const result: ReturnType<typeof getStorageStatus> = {
    uploadsPath,
    isSymlink: false,
    isAccessible: false,
  };

  try {
    if (!fs.existsSync(uploadsPath)) {
      return result;
    }

    const stats = fs.lstatSync(uploadsPath);
    result.isSymlink = stats.isSymbolicLink();

    if (result.isSymlink) {
      result.symlinkTarget = fs.readlinkSync(uploadsPath);
    }

    result.isAccessible = fs.existsSync(uploadsPath);

    if (defaultConfig.networkVolumePath) {
      result.networkMounted = fs.existsSync(defaultConfig.networkVolumePath);
    }
  } catch {
    // Ignore errors, return partial status
  }

  return result;
}
