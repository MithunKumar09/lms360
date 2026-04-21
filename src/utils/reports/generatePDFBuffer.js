/**
 * Generate PDF Buffer
 * 
 * Main PDF generation function using jsPDF
 */

import jsPDF from 'jspdf';

/**
 * Generate PDF buffer from analytics data and chart images
 * 
 * @param {Object} options - PDF generation options
 * @param {Object} options.analytics - Analytics data
 * @param {Object} options.quiz - Quiz information
 * @param {Object} options.organization - Organization information (optional)
 * @param {Object} options.chartImages - Chart images as base64 strings
 * @param {string} options.reportType - Report type (student | instructor | admin | superadmin)
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generatePDFBuffer(options) {
  const {
    analytics,
    quiz,
    organization = null,
    chartImages = {},
    reportType = 'instructor',
  } = options;

  // Create new PDF document (A4 portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Helper function to add new page if needed
  const checkNewPage = (requiredHeight) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addText = (text, x, y, maxWidth, fontSize = 10, fontStyle = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length * (fontSize * 0.4); // Approximate line height
  };

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Quiz Performance Report', margin, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(quiz?.title || 'Quiz Report', margin, 30);
  
  if (organization) {
    doc.text(organization.name || '', margin, 35);
  }

  doc.text(new Date().toLocaleDateString(), pageWidth - margin - 30, 30);

  currentY = 50;

  // Summary Cards Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, currentY);
  currentY += 10;

  if (analytics?.scoreSummary) {
    const summary = analytics.scoreSummary;
    const cardHeight = 30;
    const cardWidth = (contentWidth - 10) / 4;

    checkNewPage(cardHeight + 10);

    // Attempts Card
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, currentY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Attempts', margin + 5, currentY + 8);
    doc.setFontSize(14);
    doc.text(summary.totalAttempts.toString(), margin + 5, currentY + 18);

    // Average Score Card
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin + cardWidth + 5, currentY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Average Score', margin + cardWidth + 10, currentY + 8);
    doc.setFontSize(14);
    doc.text(summary.averageScore ? `${summary.averageScore.toFixed(1)}%` : 'N/A', margin + cardWidth + 10, currentY + 18);

    // Pass Rate Card
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin + (cardWidth + 5) * 2, currentY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Pass Rate', margin + (cardWidth + 5) * 2 + 5, currentY + 8);
    doc.setFontSize(14);
    doc.text(`${summary.passRate.toFixed(1)}%`, margin + (cardWidth + 5) * 2 + 5, currentY + 18);

    // Highest Score Card
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin + (cardWidth + 5) * 3, currentY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Highest Score', margin + (cardWidth + 5) * 3 + 5, currentY + 8);
    doc.setFontSize(14);
    doc.text(summary.maxScore ? `${summary.maxScore.toFixed(1)}%` : 'N/A', margin + (cardWidth + 5) * 3 + 5, currentY + 18);

    currentY += cardHeight + 15;
  }

  // Score Distribution Chart
  if (chartImages.scoreDistribution) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Score Distribution', margin, currentY);
    currentY += 10;

    try {
      const imgWidth = contentWidth;
      const imgHeight = 50;
      doc.addImage(chartImages.scoreDistribution, 'PNG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (error) {
      console.error('Error adding score distribution chart:', error);
      doc.text('Chart unavailable', margin, currentY);
      currentY += 20;
    }
  }

  // Question Difficulty Chart
  if (chartImages.questionDifficulty) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Question Difficulty Analysis', margin, currentY);
    currentY += 10;

    try {
      const imgWidth = contentWidth;
      const imgHeight = 50;
      doc.addImage(chartImages.questionDifficulty, 'PNG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (error) {
      console.error('Error adding question difficulty chart:', error);
      doc.text('Chart unavailable', margin, currentY);
      currentY += 20;
    }
  }

  // Historical Trend Chart
  if (chartImages.historicalTrend) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Historical Performance Trend', margin, currentY);
    currentY += 10;

    try {
      const imgWidth = contentWidth;
      const imgHeight = 50;
      doc.addImage(chartImages.historicalTrend, 'PNG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (error) {
      console.error('Error adding historical trend chart:', error);
      doc.text('Chart unavailable', margin, currentY);
      currentY += 20;
    }
  }

  // Course-wise Breakdown (admin/superadmin only)
  if ((reportType === 'admin' || reportType === 'superadmin') && chartImages.courseWise) {
    checkNewPage(60);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Course-wise Performance', margin, currentY);
    currentY += 10;

    try {
      const imgWidth = contentWidth;
      const imgHeight = 50;
      doc.addImage(chartImages.courseWise, 'PNG', margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    } catch (error) {
      console.error('Error adding course-wise chart:', error);
      doc.text('Chart unavailable', margin, currentY);
      currentY += 20;
    }
  }

  // Recommendations Section
  if (analytics?.recommendations && analytics.recommendations.length > 0) {
    checkNewPage(40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations', margin, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    analytics.recommendations.forEach((rec, index) => {
      checkNewPage(10);
      doc.text(`${index + 1}. ${rec}`, margin + 5, currentY);
      currentY += 8;
    });
  }

  // Footer on each page
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'Generated by Edurock Quiz System',
      margin,
      pageHeight - 10
    );
  }

  // Generate PDF buffer
  try {
    const pdfBlob = doc.output('blob');
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    if (!buffer || buffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    return buffer;
  } catch (error) {
    console.error('Error generating PDF buffer:', error);
    throw new Error(`PDF generation failed: ${error.message || 'Unknown error'}`);
  }
}

export default generatePDFBuffer;

