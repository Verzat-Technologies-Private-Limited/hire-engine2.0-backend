const fs = require('fs');
const path = require('path');
const {PDFParse} = require('pdf-parse');
const mammoth = require('mammoth');
const logger = require('../config/logger');

/**
 * Retrieve file buffer from MemoryStorage, local disk, or remote URL (Cloudinary).
 * @param {object} file - Multer file object
 * @returns {Promise<Buffer>}
 */
async function getFileBuffer(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  // 1. In-memory buffer
  if (file.buffer && Buffer.isBuffer(file.buffer)) {
    return file.buffer;
  }

  // 2. Remote URL (e.g. Cloudinary secure_url)
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    try {
      const response = await fetch(file.path);
      if (!response.ok) {
        throw new Error(`Failed to download file from URL (${response.status} ${response.statusText})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      logger.error('Error fetching file buffer from remote URL', {
        url: file.path,
        error: err.message,
      });
      throw err;
    }
  }

  // 3. Local filesystem path
  if (file.path && typeof file.path === 'string') {
    return fs.promises.readFile(file.path);
  }

  throw new Error('Unable to resolve file buffer from provided file object');
}

/**
 * Extract raw plain text from PDF, Word (.docx/.doc), or TXT documents.
 * @param {object} file - Multer file object (must contain path/buffer, mimetype, originalname)
 * @returns {Promise<{ text: string, buffer: Buffer, mimetype: string, originalname: string }>}
 */
async function extractTextFromFile(file) {
  const buffer = await getFileBuffer(file);
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/^\./, '');
  const mimetype = (file.mimetype || '').toLowerCase();

  let extractedText = '';

  try {
    if (ext === 'pdf' || mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      const pdfData = await parser.getText();
      extractedText = pdfData.text || '';
      await parser.destroy();
    } else if (
      ext === 'docx' ||
      ext === 'doc' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      try {
        const mammothResult = await mammoth.extractRawText({ buffer });
        extractedText = mammothResult.value || '';
      } catch (docErr) {
        logger.warn('Mammoth failed to extract docx, falling back to utf-8 text read', {
          error: docErr.message,
        });
        extractedText = buffer.toString('utf-8');
      }
    } else {
      // Plain text or fallback
      extractedText = buffer.toString('utf-8');
    }
  } catch (err) {
    logger.error('Error extracting text from file', {
      filename: file.originalname,
      mimetype: file.mimetype,
      error: err.message,
    });
    // Fallback to string extraction if binary parser errors
    extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\t\r\n]/g, ' ');
  }

  // Clean up excessive whitespace
  const cleanText = extractedText.replace(/\r\n/g, '\n').trim();

  return {
    text: cleanText,
    buffer,
    mimetype: file.mimetype || 'application/octet-stream',
    originalname: file.originalname || 'document',
  };
}

module.exports = {
  getFileBuffer,
  extractTextFromFile,
};
