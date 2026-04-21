/**
 * Export Chart as Image
 * 
 * Utility to export Chart.js canvas to image for PDF embedding
 */

/**
 * Export Chart.js canvas to base64 image
 * 
 * @param {HTMLCanvasElement} canvas - Chart.js canvas element
 * @param {Object} options - Export options
 * @returns {Promise<string>} Base64 image string
 */
export async function exportChartAsImage(canvas, options = {}) {
  if (!canvas) {
    throw new Error('Canvas element is required');
  }

  const {
    format = 'image/png',
    quality = 1.0,
    width = canvas.width,
    height = canvas.height,
  } = options;

  try {
    // Create a new canvas with the desired dimensions
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');

    // Fill with white background (for PDF)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Draw the original canvas onto the export canvas
    ctx.drawImage(canvas, 0, 0, width, height);

    // Convert to base64
    const base64 = exportCanvas.toDataURL(format, quality);
    return base64;
  } catch (error) {
    console.error('Error exporting chart as image:', error);
    throw error;
  }
}

/**
 * Export Chart.js canvas to blob
 * 
 * @param {HTMLCanvasElement} canvas - Chart.js canvas element
 * @param {Object} options - Export options
 * @returns {Promise<Blob>} Image blob
 */
export async function exportChartAsBlob(canvas, options = {}) {
  if (!canvas) {
    throw new Error('Canvas element is required');
  }

  const {
    format = 'image/png',
    quality = 1.0,
  } = options;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Get chart canvas element from Chart.js instance
 * 
 * @param {Object} chartInstance - Chart.js instance
 * @returns {HTMLCanvasElement|null} Canvas element
 */
export function getChartCanvas(chartInstance) {
  if (!chartInstance || !chartInstance.canvas) {
    return null;
  }
  return chartInstance.canvas;
}

export default {
  exportChartAsImage,
  exportChartAsBlob,
  getChartCanvas,
};

