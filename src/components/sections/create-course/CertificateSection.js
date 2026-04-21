'use client';

import React, { useState, useRef, useEffect } from 'react';
import MediaUpload from '@/components/shared/forms/MediaUpload.js';
import FieldError from '@/components/shared/errors/FieldError.js';

/**
 * Certificate Section Component
 * 
 * Provides two options for certificate configuration:
 * 1. Choose Prebuilt Template - Select from prebuilt HTML templates
 * 2. Upload Certificate - Upload custom PDF/Image certificate
 */
const CertificateSection = ({ 
  certificateMode = 'prebuilt', // 'prebuilt' | 'upload'
  onModeChange,
  selectedTemplateId = null,
  onTemplateSelect,
  uploadedCertificateUrl = '',
  onCertificateUpload,
  validationErrors = {},
}) => {
  const [localMode, setLocalMode] = useState(certificateMode);

  // Sync local mode with prop changes
  React.useEffect(() => {
    setLocalMode(certificateMode);
  }, [certificateMode]);

  const handleModeChange = (mode) => {
    setLocalMode(mode);
    if (onModeChange) {
      onModeChange(mode);
    }
    // Clear selections when switching modes
    if (mode === 'prebuilt') {
      if (onCertificateUpload) onCertificateUpload('');
    } else {
      if (onTemplateSelect) onTemplateSelect(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Mode Toggle */}
      <div className="mb-5">
        <label className="mb-3 block font-semibold text-contentColor dark:text-contentColor-dark">
          Certificate Type
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => handleModeChange('prebuilt')}
            className={`flex-1 py-10px px-5 rounded-md border-2 transition-all ${
              localMode === 'prebuilt'
                ? 'border-primaryColor dark:border-primaryColor bg-primaryColor/10 dark:bg-primaryColor/20 text-primaryColor dark:text-primaryColor'
                : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor dark:hover:border-primaryColor text-contentColor dark:text-contentColor-dark'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              <span className="font-medium">Choose Prebuilt Template</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('upload')}
            className={`flex-1 py-10px px-5 rounded-md border-2 transition-all ${
              localMode === 'upload'
                ? 'border-primaryColor dark:border-primaryColor bg-primaryColor/10 dark:bg-primaryColor/20 text-primaryColor dark:text-primaryColor'
                : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor dark:hover:border-primaryColor text-contentColor dark:text-contentColor-dark'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="font-medium">Upload Certificate</span>
            </div>
          </button>
        </div>
      </div>

      {/* Prebuilt Template Mode */}
      {localMode === 'prebuilt' && (
        <div>
          <label className="mb-3 block font-semibold text-contentColor dark:text-contentColor-dark">
            Select Certificate Template
          </label>
          <TemplateChooser
            selectedTemplateId={selectedTemplateId}
            onSelect={onTemplateSelect}
            error={validationErrors.certificateTemplateId}
          />
          <FieldError error={validationErrors.certificateTemplateId} field="certificateTemplateId" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Choose a prebuilt template. The template will be customized with student and course information when the certificate is generated.
          </p>
        </div>
      )}

      {/* Upload Certificate Mode */}
      {localMode === 'upload' && (
        <div>
          <MediaUpload
            value={uploadedCertificateUrl || ''}
            onChange={onCertificateUpload}
            label="Upload Certificate (PDF/Image)"
            placeholder="Enter certificate URL or upload file"
            accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
            mediaType="file"
            error={validationErrors.certificateUpload}
            showPreview={true}
          />
          <FieldError error={validationErrors.certificateUpload} field="certificateUpload" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Upload a custom certificate template (PDF or Image). This will be used as-is for all students who complete the course.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Certificate Template Preview Component
 * 
 * Renders a certificate template HTML with sample data for preview
 */
const CertificateTemplatePreview = ({ templateHtml, className = '' }) => {
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!templateHtml) {
      setIsLoading(false);
      return;
    }

    // Sample data for preview
    const sampleData = {
      studentName: 'John Doe',
      name: 'John Doe',
      student_name: 'John Doe',
      courseName: 'Advanced Web Development',
      course: 'Advanced Web Development',
      course_name: 'Advanced Web Development',
      completionDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      completion_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      domain: typeof window !== 'undefined' ? (window.location.hostname || 'edurock.com') : 'edurock.com',
      website: typeof window !== 'undefined' ? (window.location.hostname || 'edurock.com') : 'edurock.com',
      verificationCode: 'VER-123456',
      verification_code: 'VER-123456',
      verificationUrl: typeof window !== 'undefined' ? `${window.location.origin}/verify-certificate?code=VER-123456` : '#',
      verification_url: typeof window !== 'undefined' ? `${window.location.origin}/verify-certificate?code=VER-123456` : '#',
      // QR code placeholder - use a simple SVG placeholder for preview
      qrCode: `<div style="width: 100px; height: 100px; margin: 0 auto; background: #f0f0f0; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; border-radius: 4px;">QR Code</div>`,
      qr_code: `<div style="width: 100px; height: 100px; margin: 0 auto; background: #f0f0f0; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; border-radius: 4px;">QR Code</div>`,
      qrcode: `<div style="width: 100px; height: 100px; margin: 0 auto; background: #f0f0f0; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666; border-radius: 4px;">QR Code</div>`,
    };

    // Replace placeholders with sample data
    let filledHtml = templateHtml;
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    
    filledHtml = filledHtml.replace(placeholderRegex, (match, key) => {
      // Try exact key first
      if (sampleData[key] !== undefined && sampleData[key] !== null) {
        return String(sampleData[key]);
      }
      
      // Try case-insensitive match
      const lowerKey = key.toLowerCase();
      const dataKeys = Object.keys(sampleData);
      const matchedKey = dataKeys.find(k => k.toLowerCase() === lowerKey);
      if (matchedKey && sampleData[matchedKey] !== undefined && sampleData[matchedKey] !== null) {
        return String(sampleData[matchedKey]);
      }
      
      return match;
    });

    // Also handle common variations
    const commonPlaceholders = {
      '{{studentName}}': sampleData.studentName,
      '{{student_name}}': sampleData.studentName,
      '{{studentname}}': sampleData.studentName,
      '{{courseName}}': sampleData.courseName,
      '{{course_name}}': sampleData.courseName,
      '{{coursename}}': sampleData.courseName,
      '{{completionDate}}': sampleData.completionDate,
      '{{completion_date}}': sampleData.completionDate,
      '{{completiondate}}': sampleData.completionDate,
      '{{domain}}': sampleData.domain,
      '{{website}}': sampleData.domain,
      '{{verificationCode}}': sampleData.verificationCode,
      '{{verification_code}}': sampleData.verificationCode,
      '{{verificationcode}}': sampleData.verificationCode,
      '{{qrCode}}': sampleData.qrCode,
      '{{qr_code}}': sampleData.qrCode,
      '{{qrcode}}': sampleData.qrCode,
    };

    Object.entries(commonPlaceholders).forEach(([placeholder, value]) => {
      if (value) {
        filledHtml = filledHtml.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'gi'), value);
      }
    });

    setPreviewHtml(filledHtml);
    setIsLoading(false);
  }, [templateHtml]);

  if (isLoading || !templateHtml || !previewHtml) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center p-4">
          {isLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor mx-auto"></div>
          ) : (
            <>
              <svg
                className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No Preview</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width: '100%', height: '100%' }}>
      <iframe
        srcDoc={previewHtml}
        className="w-full h-full border-0"
        style={{
          transform: 'scale(0.3)',
          transformOrigin: 'top left',
          width: '333.33%',
          height: '333.33%',
          pointerEvents: 'none',
        }}
        title="Certificate Preview"
        sandbox="allow-same-origin"
        loading="lazy"
      />
    </div>
  );
};

/**
 * Template Chooser Component
 * 
 * Displays prebuilt certificate templates in a grid for selection
 */
const TemplateChooser = ({ selectedTemplateId, onSelect, error }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  // Fetch templates on mount
  React.useEffect(() => {
    let isMounted = true;
    
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setErrorState(null);
        const response = await fetch('/api/certificates/templates');
        
        if (!isMounted) return;
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.templates) {
          // Filter to only show prebuilt templates (uploaded templates are not selectable)
          const prebuiltTemplates = data.templates.filter(t => t.type === 'prebuilt');
          if (isMounted) {
            setTemplates(prebuiltTemplates);
          }
        } else {
          if (isMounted) {
            setErrorState(data.error || 'Failed to load templates');
          }
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        if (isMounted) {
          setErrorState('Failed to load certificate templates. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTemplates();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor"></div>
        <span className="ml-3 text-contentColor dark:text-contentColor-dark">Loading templates...</span>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <p className="text-red-600 dark:text-red-400 text-sm">{errorState}</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-contentColor dark:text-contentColor-dark text-sm">
          No certificate templates available. Please contact an administrator to add templates.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <div
          key={template.id}
          onClick={() => {
            if (onSelect) {
              onSelect(template.id);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (onSelect) {
                onSelect(template.id);
              }
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Select certificate template: ${template.name}`}
          className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primaryColor dark:focus:ring-primaryColor ${
            selectedTemplateId === template.id
              ? 'border-primaryColor dark:border-primaryColor ring-2 ring-primaryColor dark:ring-primaryColor'
              : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor dark:hover:border-primaryColor'
          }`}
        >
          {/* Thumbnail */}
          <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden relative">
            {template.thumbnailUrl ? (
              <img
                src={template.thumbnailUrl}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : template.templateHtml ? (
              <CertificateTemplatePreview
                templateHtml={template.templateHtml}
                className="w-full h-full"
              />
            ) : (
              <div className="text-center p-4">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No Preview</p>
              </div>
            )}
          </div>

          {/* Template Info */}
          <div className="p-3 bg-whiteColor dark:bg-whiteColor-dark">
            <h4 className="font-semibold text-sm text-headingColor dark:text-headingColor-dark mb-1">
              {template.name}
            </h4>
            {template.description && (
              <p className="text-xs text-contentColor dark:text-contentColor-dark line-clamp-2">
                {template.description}
              </p>
            )}
          </div>

          {/* Selected Indicator */}
          {selectedTemplateId === template.id && (
            <div className="absolute top-2 right-2 bg-primaryColor text-whiteColor rounded-full p-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CertificateSection;

