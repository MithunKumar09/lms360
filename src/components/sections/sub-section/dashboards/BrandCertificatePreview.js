"use client";

import { useState, useEffect } from "react";
import { generateBrandCertificateHTML } from "@/lib/certificates/brandGenerator.js";
import { generateVerificationCode } from "@/lib/certificates/generator.js";

// Note: This component uses client-side certificate generation
// For production, consider server-side rendering or API-based preview

export default function BrandCertificatePreview({ templateDesign }) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!templateDesign || !templateDesign.logo_url) {
      setPreviewHtml("");
      return;
    }

    const generatePreview = async () => {
      setIsLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
        const verificationCode = generateVerificationCode();
        
        const html = await generateBrandCertificateHTML(
          templateDesign,
          {
            student_name: "John Doe",
            course_name: "Sample Course",
            issued_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            brand_name: "Sample Brand",
          },
          verificationCode,
          baseUrl
        );
        
        setPreviewHtml(html);
      } catch (error) {
        console.error('Error generating preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generatePreview();
  }, [templateDesign]);

  if (!templateDesign || !templateDesign.logo_url) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Upload a brand logo to see certificate preview
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border-2 border-gray-300 dark:border-gray-600">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Generating preview...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h5 className="fw-semibold mb-3">Certificate Preview</h5>
      <div className="border-2 border-borderColor dark:border-borderColor-dark rounded-md overflow-hidden bg-white">
        <div 
          className="certificate-preview-container"
          style={{ 
            width: '100%', 
            aspectRatio: templateDesign.layout === 'landscape' ? '4/3' : '3/4',
            overflow: 'auto'
          }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
      <p className="text-xs text-muted mt-2">
        This is a preview. Actual certificates will include student-specific information.
      </p>
    </div>
  );
}
