"use client";

import React from 'react';
import { FiX, FiDownload, FiPrinter } from 'react-icons/fi';
import IconButton from '@/components/quiz/buttons/IconButton';
import PrimaryButton from '@/components/quiz/buttons/PrimaryButton';
import SecondaryButton from '@/components/quiz/buttons/SecondaryButton';
import QuizReportComponent from './QuizReportComponent';
import { useGeneratePDFReport } from '@/hooks/api/useQuizReport';

const QuizReportPreviewModal = ({ 
  isOpen, 
  onClose, 
  quizId, 
  reportType,
  analytics,
  className = '' 
}) => {
  const generatePDFMutation = useGeneratePDFReport();

  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    generatePDFMutation.mutate({
      quizId,
      reportType,
      includeCharts: true,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-xl max-w-7xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-whiteColor dark:bg-darkdeep3-dark border-b border-borderColor dark:border-borderColor-dark p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Quiz Performance Report
          </h2>
          <div className="flex items-center gap-3">
            <SecondaryButton
              onClick={handlePrint}
              icon={FiPrinter}
              size="sm"
            >
              Print
            </SecondaryButton>
            <PrimaryButton
              onClick={handleDownloadPDF}
              icon={FiDownload}
              size="sm"
              loading={generatePDFMutation.isPending}
            >
              Download PDF
            </PrimaryButton>
            <IconButton
              icon={FiX}
              onClick={onClose}
              variant="outline"
              size="sm"
              ariaLabel="Close modal"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {analytics ? (
            <QuizReportComponent
              quizId={quizId}
              reportType={reportType}
              analytics={analytics}
              onViewPreview={null}
            />
          ) : (
            <QuizReportComponent
              quizId={quizId}
              reportType={reportType}
              onViewPreview={null}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizReportPreviewModal;

