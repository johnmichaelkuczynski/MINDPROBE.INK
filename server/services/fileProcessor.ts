import multer from 'multer';
import { Request } from 'express';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// For PDF processing
const pdfParse = async (buffer: Buffer): Promise<string> => {
  try {
    // Load pdf-parse without initialization issues by lazy loading
    const pdfParseFunction = require('pdf-parse');
    const data = await pdfParseFunction(buffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF parse error:', error);
    // Try to handle common PDF parsing issues
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('ENOENT')) {
      throw new Error('PDF file appears to be corrupted or invalid');
    }
    throw new Error('Failed to parse PDF file: ' + errorMessage);
  }
};

// For Word document processing  
const mammothParse = async (buffer: Buffer): Promise<string> => {
  try {
    const mammothLib = require('mammoth');
    const result = await mammothLib.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Mammoth parse error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error('Failed to parse Word document: ' + errorMessage);
  }
};

export const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: any, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, and text files are allowed.'));
    }
  },
});

export class FileProcessor {
  static async extractText(file: any): Promise<string> {
    const { buffer, mimetype, originalname } = file;
    const extension = path.extname(originalname).toLowerCase();

    try {
      switch (true) {
        case mimetype === 'application/pdf' || extension === '.pdf':
          return await pdfParse(buffer);
        
        case mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             mimetype === 'application/msword' ||
             extension === '.docx' || 
             extension === '.doc':
          return await mammothParse(buffer);
        
        case mimetype === 'text/plain' || extension === '.txt':
          return buffer.toString('utf-8');
        
        default:
          throw new Error('Unsupported file type');
      }
    } catch (error) {
      console.error('File processing error:', error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static validateFile(file: any): { valid: boolean; error?: string } {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Invalid file type. Only PDF, Word, and text files are allowed.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 10MB limit.' };
    }

    return { valid: true };
  }
}
