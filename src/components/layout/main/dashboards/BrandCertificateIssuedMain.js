"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import BrandCertificateIssuance from "@/components/sections/sub-section/dashboards/BrandCertificateIssuance";
import { format } from "date-fns";

export default function BrandCertificateIssuedMain({ certificateId }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('issued'); // 'issued' or 'issue'

  // Fetch issued certificates
  const { data: issuedData, isLoading } = useQuery({
    queryKey: ['brandCertificateIssued', certificateId],
    queryFn: async () => {
      const response = await apiClient.get(`/brand/certificates/${certificateId}/issued`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch issued certificates');
      }
      return response.data;
    },
    enabled: !!certificateId && activeTab === 'issued',
  });

  const issuedCertificates = issuedData?.certificates || [];

  if (!certificateId) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Certificate ID is required</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <button
            onClick={() => router.push('/dashboards/brand-certificates')}
            className="mb-4 px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:bg-lightGrey5 dark:hover:bg-gray-800 transition-colors"
          >
            ← Back to Certificates
          </button>
          
          {/* Tabs */}
          <div className="flex gap-2 border-b-2 border-borderColor dark:border-borderColor-dark">
            <button
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'issued'
                  ? 'text-primaryColor border-b-2 border-primaryColor'
                  : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor'
              }`}
              onClick={() => setActiveTab('issued')}
            >
              Issued Certificates
            </button>
            <button
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'issue'
                  ? 'text-primaryColor border-b-2 border-primaryColor'
                  : 'text-contentColor dark:text-contentColor-dark hover:text-primaryColor'
              }`}
              onClick={() => setActiveTab('issue')}
            >
              Issue New
            </button>
          </div>
        </div>

        {activeTab === 'issue' ? (
          <BrandCertificateIssuance certificateId={certificateId} />
        ) : (
          <>
            {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-contentColor dark:text-contentColor-dark">Loading issued certificates...</p>
                </div>
              ) : issuedCertificates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-contentColor dark:text-contentColor-dark">
                    No certificates have been issued yet for this template.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-borderColor dark:border-borderColor-dark">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Student Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Student Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Verification Code</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Issued Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-blackColor dark:text-blackColor-dark">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issuedCertificates.map((cert) => {
                        const generationStatus = cert.generation_status || 'pending';
                        const getStatusBadge = (status) => {
                          const statusConfig = {
                            pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-400', label: 'Pending' },
                            processing: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-800 dark:text-blue-400', label: 'Processing' },
                            completed: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-800 dark:text-green-400', label: 'Completed' },
                            failed: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-800 dark:text-red-400', label: 'Failed' },
                          };
                          const config = statusConfig[status] || statusConfig.pending;
                          return (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
                              {config.label}
                            </span>
                          );
                        };

                        return (
                          <tr key={cert.id} className="border-b border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-gray-800 transition-colors">
                            <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">{cert.student_name || 'N/A'}</td>
                            <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">{cert.student_email || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <code className="text-xs px-2 py-1 bg-lightGrey5 dark:bg-gray-800 rounded text-contentColor dark:text-contentColor-dark">
                                {cert.verification_code || 'N/A'}
                              </code>
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(generationStatus)}
                              {cert.generation_error && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1" title={cert.generation_error}>
                                  Error: {cert.generation_error.substring(0, 30)}...
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-contentColor dark:text-contentColor-dark">
                              {cert.issued_at
                                ? format(new Date(cert.issued_at), 'PPP')
                                : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2 flex-wrap">
                                {cert.certificate_url && generationStatus === 'completed' && (
                                  <>
                                    <a
                                      href={cert.certificate_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 text-xs font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
                                    >
                                      View
                                    </a>
                                    <a
                                      href={cert.certificate_url}
                                      download
                                      className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                                    >
                                      Download
                                    </a>
                                  </>
                                )}
                                {generationStatus === 'processing' && (
                                  <span className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md dark:bg-blue-900/20 dark:text-blue-400">
                                    Generating...
                                  </span>
                                )}
                                {generationStatus === 'failed' && (
                                  <span className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
                                    Generation Failed
                                  </span>
                                )}
                                {cert.verification_code && (
                                  <a
                                    href={`/certificates/verify/${cert.verification_code}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-50 rounded-md hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                                  >
                                    Verify
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
