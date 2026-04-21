/**
 * Resume Builder Main Component
 */

'use client';

import { useState } from 'react';
import { useResume, useUpdateResume, useGenerateResume } from '@/hooks/api/usePlacement.js';
import ResumeEditor from '@/components/shared/placement/ResumeEditor.js';
import ResumePreview from '@/components/shared/placement/ResumePreview.js';

export default function ResumeBuilderMain() {
  const { data: resume, isLoading } = useResume();
  const updateResume = useUpdateResume();
  const generateResume = useGenerateResume();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleSave = async (resumeData) => {
    try {
      await updateResume.mutateAsync({
        resumeData,
        templateId: 'modern'
      });
    } catch (error) {
      console.error('Error saving resume:', error);
      alert('Failed to save resume');
    }
  };

  const handleAutoFill = async () => {
    try {
      await generateResume.mutateAsync();
    } catch (error) {
      console.error('Error generating resume:', error);
      alert('Failed to generate resume');
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Dynamic import for client-side only libraries
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const element = document.getElementById('resume-preview');
      if (!element) {
        throw new Error('Resume preview not found');
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('resume.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const resumeData = resume?.resumeData || {
    personalInfo: {},
    education: [],
    skills: [],
    experience: [],
    projects: [],
    courses: [],
    certificates: [],
    achievements: []
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Resume Builder</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Create and customize your resume</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleAutoFill}
              disabled={generateResume.isPending}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            >
              {generateResume.isPending ? 'Generating...' : 'Auto-Fill'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 disabled:opacity-50"
            >
              {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="lg:col-span-1">
          <ResumeEditor resumeData={resumeData} onSave={handleSave} />
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Preview</h2>
            <div id="resume-preview" className="bg-white dark:bg-gray-800 p-8 border border-gray-200 dark:border-gray-700">
              <ResumePreview resumeData={resumeData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
