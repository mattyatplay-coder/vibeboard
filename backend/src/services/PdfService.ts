const pdf = require('pdf-parse');
import fs from 'fs';

export class PdfService {
  /**
   * Extracts text content from a PDF buffer.
   * @param buffer The PDF file buffer
   * @returns The extracted text
   */
  static async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error('Failed to parse PDF buffer:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extracts text content from a PDF file path.
   * @param filePath The absolute path to the PDF file
   * @returns The extracted text
   */
  static async extractTextFromFile(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
      }
      const buffer = fs.readFileSync(filePath);
      return await this.extractTextFromBuffer(buffer);
    } catch (error) {
      console.error(`Failed to parse PDF file at ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Extracts metadata from a PDF buffer.
   * @param buffer The PDF file buffer
   * @returns The PDF metadata (info, numpages, etc.)
   */
  static async getMetadata(buffer: Buffer): Promise<any> {
    try {
      const data = await pdf(buffer);
      return {
        numpages: data.numpages,
        numrender: data.numrender,
        info: data.info,
        metadata: data.metadata,
        version: data.version,
      };
    } catch (error) {
      console.error('Failed to extract PDF metadata:', error);
      throw new Error('Failed to extract metadata from PDF');
    }
  }
}
