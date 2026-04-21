/**
 * Server-Side Certificate Generation
 * 
 * Generates certificate PDF/image files using Puppeteer.
 * This is the server-side implementation for certificate generation.
 */

import puppeteer from 'puppeteer';
import { generateBrandCertificateHTML } from './brandGenerator.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName, buildR2Key, buildR2PublicUrl } from '@/lib/r2/config.js';

/**
 * Generate certificate PDF from HTML using Puppeteer
 * @param {string} html - Certificate HTML
 * @param {Object} options - Generation options
 * @param {string} options.format - 'pdf' or 'png'
 * @param {Object} options.templateDesign - Template design data
 * @returns {Promise<Buffer>} Generated file buffer
 */
export async function generateCertificateFile(html, options = {}) {
  const { format = 'pdf', templateDesign = {} } = options;
  const { layout = 'landscape' } = templateDesign;
  const isLandscape = layout === 'landscape';

  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    // Set viewport based on layout
    const width = isLandscape ? 1123 : 794;
    const height = isLandscape ? 794 : 1123;

    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2, // For high DPI
    });

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    let buffer;

    if (format === 'pdf') {
      // Generate PDF
      buffer = await page.pdf({
        format: isLandscape ? 'A4' : 'A4',
        landscape: isLandscape,
        printBackground: true,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
        },
      });
    } else {
      // Generate PNG image
      buffer = await page.screenshot({
        type: 'png',
        fullPage: true,
        clip: {
          x: 0,
          y: 0,
          width,
          height,
        },
      });
    }

    return buffer;
  } finally {
    await browser.close();
  }
}

/**
 * Upload certificate file to R2 storage
 * @param {Buffer} fileBuffer - File buffer (PDF or PNG)
 * @param {string} contentType - Content type (application/pdf or image/png)
 * @param {string} key - R2 object key
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadCertificateToR2(fileBuffer, contentType, key) {
  const r2Client = getR2Client();
  const bucketName = getR2BucketName();
  const fullKey = buildR2Key(key);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fullKey,
    Body: fileBuffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await r2Client.send(command);

  return buildR2PublicUrl(key);
}

/**
 * Generate and upload certificate
 * @param {Object} params - Generation parameters
 * @param {Object} params.templateDesign - Template design data
 * @param {Object} params.certificateData - Certificate data (student name, course, etc.)
 * @param {string} params.verificationCode - Verification code
 * @param {string} params.baseUrl - Base URL for verification
 * @param {string} params.certificateId - Certificate template ID
 * @param {string} params.studentId - Student ID
 * @param {string} params.format - Format: 'pdf' or 'image'
 * @returns {Promise<Object>} Result with certificate URL
 */
export async function generateAndUploadCertificate(params) {
  const {
    templateDesign,
    certificateData,
    verificationCode,
    baseUrl,
    certificateId,
    studentId,
    format = 'pdf',
  } = params;

  // Generate HTML
  const html = await generateBrandCertificateHTML(
    templateDesign,
    certificateData,
    verificationCode,
    baseUrl
  );

  // Generate file
  const fileBuffer = await generateCertificateFile(html, {
    format,
    templateDesign,
  });

  // Upload to R2
  const contentType = format === 'pdf' ? 'application/pdf' : 'image/png';
  const extension = format === 'pdf' ? 'pdf' : 'png';
  const timestamp = Date.now();
  const key = `certificates/brand/${certificateId}/${studentId}-${timestamp}.${extension}`;

  const certificateUrl = await uploadCertificateToR2(fileBuffer, contentType, key);

  return {
    certificateUrl,
    key,
    contentType,
    size: fileBuffer.length,
  };
}

export default {
  generateCertificateFile,
  uploadCertificateToR2,
  generateAndUploadCertificate,
};
