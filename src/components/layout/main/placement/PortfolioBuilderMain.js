/**
 * Portfolio Builder Main Component
 */

'use client';

import { useState } from 'react';
import { usePortfolio, useUpdatePortfolio, useGeneratePortfolio } from '@/hooks/api/usePlacement.js';
import PortfolioEditor from '@/components/shared/placement/PortfolioEditor.js';
import PortfolioPreview from '@/components/shared/placement/PortfolioPreview.js';

export default function PortfolioBuilderMain() {
  const { data: portfolio, isLoading } = usePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const generatePortfolio = useGeneratePortfolio();
  const [isPublic, setIsPublic] = useState(portfolio?.isPublic || false);

  const handleSave = async (portfolioData) => {
    try {
      await updatePortfolio.mutateAsync({
        portfolioData,
        isPublic
      });
    } catch (error) {
      console.error('Error saving portfolio:', error);
      alert('Failed to save portfolio');
    }
  };

  const handleAutoFill = async () => {
    try {
      await generatePortfolio.mutateAsync();
    } catch (error) {
      console.error('Error generating portfolio:', error);
      alert('Failed to generate portfolio');
    }
  };

  const handleTogglePublic = async () => {
    const newIsPublic = !isPublic;
    setIsPublic(newIsPublic);
    if (portfolio) {
      try {
        await updatePortfolio.mutateAsync({
          portfolioData: portfolio.portfolioData,
          isPublic: newIsPublic
        });
      } catch (error) {
        setIsPublic(!newIsPublic); // Revert on error
        console.error('Error updating portfolio visibility:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const portfolioData = portfolio?.portfolioData || {
    about: {},
    skills: [],
    projects: [],
    courses: [],
    certificates: [],
    education: [],
    achievements: []
  };

  const publicUrl = portfolio?.isPublic && portfolio?.portfolioSlug
    ? typeof window !== 'undefined' 
      ? `${window.location.origin}/portfolio/${portfolio.portfolioSlug}`
      : `/portfolio/${portfolio.portfolioSlug}`
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Portfolio Builder</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Create and customize your portfolio</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleAutoFill}
              disabled={generatePortfolio.isPending}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
            >
              {generatePortfolio.isPending ? 'Generating...' : 'Auto-Fill'}
            </button>
            <button
              onClick={handleTogglePublic}
              className={`px-4 py-2 rounded-lg ${
                isPublic
                  ? 'bg-green-600 text-whiteColor hover:bg-green-600/90'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              {isPublic ? 'Make Private' : 'Make Public'}
            </button>
          </div>
        </div>
        {publicUrl && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Public URL:</strong>{' '}
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {publicUrl}
              </a>
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="lg:col-span-1">
          <PortfolioEditor portfolioData={portfolioData} onSave={handleSave} />
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Preview</h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <PortfolioPreview portfolioData={portfolioData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
