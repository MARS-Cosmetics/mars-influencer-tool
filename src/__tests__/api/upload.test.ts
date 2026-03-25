import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the upload validation logic extracted from the route.
// The actual route uses formData and writes files, so we test the validation
// rules independently without actually writing files.

// Replicate the validation logic from the upload route
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/csv',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function validateUpload(file: { type: string; size: number; name: string } | null): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Accepted: PDF, JPEG, PNG, WebP, XLSX, CSV',
    };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}

describe('Upload Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Allowed file types', () => {
    it('should accept PDF files', () => {
      const result = validateUpload({
        type: 'application/pdf',
        size: 1024,
        name: 'contract.pdf',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept JPEG files', () => {
      const result = validateUpload({
        type: 'image/jpeg',
        size: 2048,
        name: 'photo.jpg',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept PNG files', () => {
      const result = validateUpload({
        type: 'image/png',
        size: 3072,
        name: 'screenshot.png',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept WebP files', () => {
      const result = validateUpload({
        type: 'image/webp',
        size: 1024,
        name: 'image.webp',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept XLSX files', () => {
      const result = validateUpload({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 5120,
        name: 'report.xlsx',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept CSV files', () => {
      const result = validateUpload({
        type: 'text/csv',
        size: 512,
        name: 'data.csv',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Rejected file types', () => {
    it('should reject .exe files', () => {
      const result = validateUpload({
        type: 'application/x-msdownload',
        size: 1024,
        name: 'malware.exe',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should reject .js files', () => {
      const result = validateUpload({
        type: 'application/javascript',
        size: 1024,
        name: 'script.js',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should reject .html files', () => {
      const result = validateUpload({
        type: 'text/html',
        size: 1024,
        name: 'page.html',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should reject .svg files', () => {
      const result = validateUpload({
        type: 'image/svg+xml',
        size: 1024,
        name: 'icon.svg',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should reject application/zip files', () => {
      const result = validateUpload({
        type: 'application/zip',
        size: 1024,
        name: 'archive.zip',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });
  });

  describe('File size limits', () => {
    it('should accept files under 10MB', () => {
      const result = validateUpload({
        type: 'application/pdf',
        size: 5 * 1024 * 1024, // 5MB
        name: 'document.pdf',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept files exactly at 10MB', () => {
      const result = validateUpload({
        type: 'application/pdf',
        size: 10 * 1024 * 1024, // exactly 10MB
        name: 'large.pdf',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject files over 10MB', () => {
      const result = validateUpload({
        type: 'application/pdf',
        size: 10 * 1024 * 1024 + 1, // 10MB + 1 byte
        name: 'too-large.pdf',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should reject files way over the limit', () => {
      const result = validateUpload({
        type: 'image/jpeg',
        size: 50 * 1024 * 1024, // 50MB
        name: 'huge-image.jpg',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });
  });

  describe('Empty and null files', () => {
    it('should reject null file (no file provided)', () => {
      const result = validateUpload(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No file provided');
    });

    it('should reject empty file (0 bytes)', () => {
      const result = validateUpload({
        type: 'application/pdf',
        size: 0,
        name: 'empty.pdf',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('Filename sanitization pattern', () => {
    it('should match the sanitization regex used in the route', () => {
      // The route uses: file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

      expect(sanitize('my file (1).pdf')).toBe('my_file__1_.pdf');
      expect(sanitize('report@2024.xlsx')).toBe('report_2024.xlsx');
      expect(sanitize('normal-file.png')).toBe('normal-file.png');
      expect(sanitize('file name with spaces.csv')).toBe('file_name_with_spaces.csv');
    });
  });
});
