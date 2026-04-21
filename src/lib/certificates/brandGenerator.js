/**
 * Brand Certificate Generation Utilities
 * 
 * Handles brand certificate template filling, PDF/image generation, and storage
 * 
 * Note: PDF/image generation functions are client-side only.
 * For server-side generation, use a service like Puppeteer, WeasyPrint, or PDFShift.
 */

import QRCode from 'qrcode';
import { generateVerificationUrl } from './generator.js';
import { buildR2PublicUrl } from '@/lib/r2/r2.js';

/**
 * Generate brand certificate HTML from template design
 * 
 * @param {Object} templateDesign - Template design data
 * @param {Object} certificateData - Certificate data (student name, course, etc.)
 * @param {string} verificationCode - Verification code
 * @param {string} baseUrl - Base URL for verification
 * @returns {Promise<string>} Generated HTML
 */
export async function generateBrandCertificateHTML(templateDesign, certificateData, verificationCode, baseUrl) {
  const {
    logo_url,
    background_color = '#ffffff',
    text_color = '#000000',
    border_color = '#000000',
    border_width = 2,
    font_family = 'Arial',
    title_font_size = 24,
    body_font_size = 16,
    layout = 'landscape',
  } = templateDesign;

  const { student_name, course_name, issued_date, brand_name } = certificateData;
  const verificationUrl = generateVerificationUrl(verificationCode, baseUrl);

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 150,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  // Determine dimensions based on layout
  const isLandscape = layout === 'landscape';
  const width = isLandscape ? 1123 : 794; // A4 dimensions in pixels (at 96 DPI)
  const height = isLandscape ? 794 : 1123;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: ${width}px;
          height: ${height}px;
          background-color: ${background_color};
          color: ${text_color};
          font-family: ${font_family}, sans-serif;
          border: ${border_width}px solid ${border_color};
          position: relative;
          overflow: hidden;
        }
        .certificate-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          text-align: center;
        }
        .logo {
          max-width: 200px;
          max-height: 100px;
          margin-bottom: 30px;
        }
        .title {
          font-size: ${title_font_size}px;
          font-weight: bold;
          margin-bottom: 20px;
          text-transform: uppercase;
        }
        .certificate-text {
          font-size: ${body_font_size}px;
          line-height: 1.6;
          margin-bottom: 30px;
          max-width: 80%;
        }
        .student-name {
          font-size: ${title_font_size * 0.8}px;
          font-weight: bold;
          margin: 20px 0;
          text-decoration: underline;
        }
        .course-name {
          font-size: ${body_font_size * 1.2}px;
          font-weight: 600;
          margin: 15px 0;
        }
        .date {
          font-size: ${body_font_size}px;
          margin-top: 30px;
        }
        .verification {
          position: absolute;
          bottom: 20px;
          right: 20px;
          font-size: 10px;
          color: #666;
        }
        .qr-code {
          position: absolute;
          bottom: 20px;
          left: 20px;
          width: 80px;
          height: 80px;
        }
        .verification-code {
          font-size: 9px;
          margin-top: 5px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        ${logo_url ? `<img src="${logo_url}" alt="${brand_name}" class="logo" />` : ''}
        <div class="title">Certificate of Completion</div>
        <div class="certificate-text">
          This is to certify that
        </div>
        <div class="student-name">${student_name || 'Student Name'}</div>
        <div class="certificate-text">
          has successfully completed
        </div>
        <div class="course-name">${course_name || 'Course Name'}</div>
        <div class="date">
          Issued on ${issued_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="verification">
          <div>Verification Code:</div>
          <div class="verification-code">${verificationCode}</div>
        </div>
        <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Generate brand certificate PDF from HTML (Client-side only)
 * 
 * Note: This function is for client-side use. For server-side generation,
 * use a service like Puppeteer, WeasyPrint, or PDFShift.
 * 
 * @param {string} html - Certificate HTML
 * @param {Object} templateDesign - Template design (for dimensions)
 * @returns {Promise<Blob>} PDF blob
 */
export async function generateBrandCertificatePDF(html, templateDesign) {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called on the client side');
  }

  // Dynamic import for client-side only
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const { layout = 'landscape' } = templateDesign;
  const isLandscape = layout === 'landscape';

  // Create a temporary container to render HTML
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = isLandscape ? '1123px' : '794px';
  container.style.height = isLandscape ? '794px' : '1123px';
  document.body.appendChild(container);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: isLandscape ? 1123 : 794,
      height: isLandscape ? 794 : 1123,
    });

    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF(isLandscape ? 'landscape' : 'portrait', 'px', [1123, 794]);
    const imgWidth = isLandscape ? 1123 : 794;
    const imgHeight = isLandscape ? 794 : 1123;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    return pdf.output('blob');
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Generate brand certificate image from HTML (Client-side only)
 * 
 * Note: This function is for client-side use. For server-side generation,
 * use a service like Puppeteer or headless browser.
 * 
 * @param {string} html - Certificate HTML
 * @param {Object} templateDesign - Template design (for dimensions)
 * @returns {Promise<Blob>} Image blob (PNG)
 */
export async function generateBrandCertificateImage(html, templateDesign) {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called on the client side');
  }

  // Dynamic import for client-side only
  const { default: html2canvas } = await import('html2canvas');

  const { layout = 'landscape' } = templateDesign;
  const isLandscape = layout === 'landscape';

  // Create a temporary container to render HTML
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = isLandscape ? '1123px' : '794px';
  container.style.height = isLandscape ? '794px' : '1123px';
  document.body.appendChild(container);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: isLandscape ? 1123 : 794,
      height: isLandscape ? 794 : 1123,
    });

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

/**
 * Upload certificate file to R2 storage (Client-side)
 * 
 * @param {Blob} fileBlob - File blob (PDF or image)
 * @param {string} contentType - Content type (application/pdf or image/png)
 * @param {string} certificateId - Certificate ID
 * @param {string} studentId - Student ID
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadCertificateToR2(fileBlob, contentType, certificateId, studentId) {
  const timestamp = Date.now();
  const extension = contentType === 'application/pdf' ? 'pdf' : 'png';
  const key = `certificates/brand/${certificateId}/${studentId}-${timestamp}.${extension}`;

  // Get presigned URL from API
  const presignResponse = await fetch('/api/uploads/r2/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      contentType,
      bytes: fileBlob.size,
    }),
  });

  if (!presignResponse.ok) {
    throw new Error('Failed to get presigned URL');
  }

  const { uploadUrl, publicUrl } = await presignResponse.json();

  // Upload file
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: fileBlob,
    headers: {
      'Content-Type': contentType,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload certificate to R2');
  }

  return publicUrl;
}
