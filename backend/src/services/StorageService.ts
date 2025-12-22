import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import axios from 'axios';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private publicUrl: string;
  private useLocal: boolean = false;
  private localUploadDir: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;

    // Check if AWS creds are present
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        forcePathStyle: !!endpoint,
      });
      this.bucketName = process.env.AWS_BUCKET_NAME || 'vibeboard-generations';
      this.publicUrl = process.env.AWS_PUBLIC_URL || '';
    } else {
      console.warn('AWS Credentials not found. Using local storage.');
      this.useLocal = true;
      this.bucketName = 'local';
      this.publicUrl = 'http://localhost:3000/uploads'; // Assuming Next.js serves public folder
    }

    // Setup local dir
    this.localUploadDir = path.join(process.cwd(), '../frontend/public/uploads');
    if (this.useLocal) {
      const fs = require('fs');
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
    }
  }

  /**
   * Downloads a file from a URL and uploads it to S3 or saves locally.
   */
  async uploadFromUrl(url: string, prefix: string = 'generations'): Promise<string> {
    try {
      console.log(`Downloading from ${url}...`);
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
      });

      const contentType = response.headers['content-type'];
      const extension =
        this.getExtensionFromContentType(contentType) || path.extname(url).split('?')[0] || '.bin';
      const filename = `${uuidv4()}${extension}`;
      const key = `${prefix}/${filename}`;

      if (this.useLocal) {
        return this.saveLocally(response.data, filename);
      }

      console.log(`Uploading to S3 bucket ${this.bucketName} with key ${key}...`);
      if (!this.s3Client) throw new Error('S3 Client not initialized');

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: response.data,
          ContentType: contentType,
          ACL: 'public-read',
        },
      });

      await upload.done();

      const s3Url = this.publicUrl ? `${this.publicUrl}/${key}` : this.getS3Url(key);

      console.log(`Upload complete: ${s3Url}`);
      return s3Url;
    } catch (error: any) {
      console.error('StorageService upload failed:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Uploads a file buffer or stream to S3 or saves locally.
   */
  async uploadFile(
    body: any,
    contentType: string,
    prefix: string = 'generations'
  ): Promise<string> {
    try {
      const extension = this.getExtensionFromContentType(contentType) || '.bin';
      const filename = `${uuidv4()}${extension}`;
      const key = `${prefix}/${filename}`;

      if (this.useLocal) {
        return this.saveLocally(body, filename);
      }

      console.log(`Uploading to S3 bucket ${this.bucketName} with key ${key}...`);
      if (!this.s3Client) throw new Error('S3 Client not initialized');

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
          ACL: 'public-read',
        },
      });

      await upload.done();

      const s3Url = this.publicUrl ? `${this.publicUrl}/${key}` : this.getS3Url(key);

      console.log(`Upload complete: ${s3Url}`);
      return s3Url;
    } catch (error: any) {
      console.error('StorageService upload failed:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  private async saveLocally(body: any, filename: string): Promise<string> {
    const fs = require('fs');
    const filePath = path.join(this.localUploadDir, filename);

    console.log(`Saving locally to ${filePath}...`);

    if (body.pipe) {
      // Stream
      const writer = fs.createWriteStream(filePath);
      body.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } else {
      // Buffer
      fs.writeFileSync(filePath, body);
    }

    return `${this.publicUrl}/${filename}`;
  }

  private getS3Url(key: string): string {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    if (endpoint) {
      return `${endpoint}/${this.bucketName}/${key}`;
    }
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  private getExtensionFromContentType(contentType: string): string | null {
    switch (contentType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'video/mp4':
        return '.mp4';
      case 'video/webm':
        return '.webm';
      case 'audio/mpeg':
        return '.mp3';
      case 'audio/wav':
        return '.wav';
      default:
        return null;
    }
  }
}
