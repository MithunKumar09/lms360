/**
 * Generate PDF Service
 * 
 * Main PDF generation service that orchestrates PDF creation
 * This is a wrapper that can be extended for server-side chart rendering
 */

import generatePDFBuffer from '@/utils/reports/generatePDFBuffer.js';

/**
 * Generate PDF report with analytics and charts
 * 
 * @param {Object} options - PDF generation options
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generatePDF(options) {
  const {
    analytics,
    quiz,
    organization,
    chartImages = {},
    reportType,
  } = options;

  // Generate PDF buffer
  const pdfBuffer = await generatePDFBuffer({
    analytics,
    quiz,
    organization,
    chartImages,
    reportType,
  });

  return pdfBuffer;
}

export default generatePDF;

