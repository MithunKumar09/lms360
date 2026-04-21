/**
 * Posting Detail Main Component
 * 
 * Displays full posting details with eligibility check and apply functionality
 */

'use client';

import { useRouter } from 'next/navigation';
import { usePosting, useCreateApplication } from '@/hooks/api/usePlacement.js';
import Link from 'next/link';
import { useState } from 'react';

export default function PostingDetailMain({ postingId, postingType }) {
  const router = useRouter();
  const { data: posting, isLoading, error } = usePosting(postingId);
  const createApplication = useCreateApplication();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [notes, setNotes] = useState('');
  const externalApplicationLink = posting?.applicationLink || null;
  const isEligible = posting?.eligibility?.eligible !== false;

  const handleApply = async () => {
    if (!posting) return;

    try {
      await createApplication.mutateAsync({
        postingId: posting.id,
        coverLetter: coverLetter || null,
        notes: notes || null
      });
      setShowApplyModal(false);
      router.push('/dashboards/student-placement');
    } catch (error) {
      alert(error.message || 'Failed to submit application');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !posting) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error?.message || 'Posting not found'}</p>
          <Link
            href={`/dashboards/student-placement/${postingType === 'internship' ? 'internships' : 'jobs'}`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            ← Back to {postingType === 'internship' ? 'Internships' : 'Jobs'}
          </Link>
        </div>
      </div>
    );
  }

  const backPath = `/dashboards/student-placement/${postingType === 'internship' ? 'internships' : 'jobs'}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href={backPath}
          className="text-blue-600 hover:text-blue-700 mb-2 inline-block"
        >
          ← Back to {postingType === 'internship' ? 'Internships' : 'Jobs'}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{posting.title}</h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mt-2">{posting.companyName}</p>
            {posting.location && (
              <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mr-1"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {posting.location}
              </p>
            )}
          </div>
          <span
            className={`px-4 py-2 text-sm rounded-full ${
              posting.postingType === 'internship'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {posting.postingType}
          </span>
        </div>
      </div>

      {/* Eligibility Warning */}
      {posting.eligibility && !posting.eligibility.eligible && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Not Eligible</h3>
          <p className="text-red-700">{posting.eligibility.reason}</p>
        </div>
      )}

      {/* Application Status */}
      {posting.hasApplied && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-semibold mb-2">Application Status</h3>
          <p className="text-blue-700">
            You have already applied for this position. Status: <span className="font-medium">{posting.applicationStatus}</span>
          </p>
          {posting.applicationId && (
            <Link
              href={`/dashboards/student-placement/applications/${posting.applicationId}`}
              className="mt-2 inline-block text-blue-600 hover:text-blue-700 text-sm"
            >
              View Application Details →
            </Link>
          )}
        </div>
      )}

      {/* Salary Information */}
      {posting.salaryDisplay && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Salary</h2>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{posting.salaryDisplay}</p>
        </div>
      )}

      {/* Description */}
      {posting.description && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Description</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{posting.description}</p>
          </div>
        </div>
      )}

      {/* Requirements */}
      {posting.requirements && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Requirements</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{posting.requirements}</p>
          </div>
        </div>
      )}

      {/* Responsibilities */}
      {posting.responsibilities && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Responsibilities</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{posting.responsibilities}</p>
          </div>
        </div>
      )}

      {/* Required Skills */}
      {posting.requiredSkills && posting.requiredSkills.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {posting.requiredSkills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Preferred Qualifications */}
      {posting.preferredQualifications && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Preferred Qualifications</h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{posting.preferredQualifications}</p>
          </div>
        </div>
      )}

      {/* Application Deadline */}
      {posting.applicationDeadline && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Application Deadline</h2>
          <p className="text-gray-700 dark:text-gray-300">
            {new Date(posting.applicationDeadline).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Apply Button */}
      {!posting.hasApplied && isEligible && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {externalApplicationLink ? (
            <a
              href={externalApplicationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-6 py-3 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 font-semibold text-lg inline-block text-center"
            >
              Apply on External Site
            </a>
          ) : (
            <button
              onClick={() => setShowApplyModal(true)}
              className="w-full px-6 py-3 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 font-semibold text-lg"
            >
              Apply Now
            </button>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && !externalApplicationLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Apply for {posting.title}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cover Letter (Optional)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Write a cover letter explaining why you're a good fit for this position..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={createApplication.isPending}
                className="flex-1 px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createApplication.isPending ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
