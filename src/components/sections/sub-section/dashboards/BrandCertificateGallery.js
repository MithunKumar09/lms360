"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import { format } from "date-fns";
import Image from "next/image";

export default function BrandCertificateGallery({ studentId }) {
  const user = useAuthStore((state) => state.user);
  const userId = studentId || user?.id;

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch student's issued certificates
  const { data: certificatesData, isLoading } = useQuery({
    queryKey: ['student-brand-certificates', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/students/certificates?type=brand`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch certificates');
      }
      return response.data;
    },
    enabled: !!userId && user?.role === 'student',
  });

  const certificates = certificatesData?.certificates || [];

  const filteredCertificates = certificates.filter((cert) =>
    searchTerm
      ? cert.certificate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.brand_name?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading certificates...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
            My Certificates
          </h2>
          <p className="text-contentColor dark:text-contentColor-dark">
            View and download your brand certificates
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search certificates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primaryColor text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md transition-all"
          />
        </div>

        {/* Empty State */}
        {filteredCertificates.length === 0 && (
          <div className="text-center py-20 bg-whiteColor dark:bg-whiteColor-dark rounded-lg border-2 border-borderColor dark:border-borderColor-dark shadow-accordion dark:shadow-accordion-dark">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-contentColor dark:text-contentColor-dark mb-4 opacity-50"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p className="text-contentColor dark:text-contentColor-dark text-lg">
              {searchTerm ? 'No certificates found matching your search.' : 'No certificates issued yet.'}
            </p>
          </div>
        )}

        {/* Certificates Grid */}
        {filteredCertificates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px lg:gap-30px">
            {filteredCertificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-all duration-300 p-6"
              >
                  <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor mb-2">
                    {cert.certificate_name}
                  </h3>
                  <p className="text-sm text-contentColor dark:text-contentColor-dark mb-2">
                    <strong>Issued by:</strong> {cert.brand_name}
                  </p>
                  <p className="text-xs text-contentColor dark:text-contentColor-dark mb-3">
                    <strong>Issued on:</strong>{' '}
                    {cert.issued_at
                      ? format(new Date(cert.issued_at), 'PPP')
                      : 'N/A'}
                  </p>
                  {cert.verification_code && (
                    <div className="mb-4 p-3 bg-lightGrey5 dark:bg-gray-800 rounded-md">
                      <p className="text-xs text-contentColor dark:text-contentColor-dark mb-1">
                        <strong>Verification Code:</strong>
                      </p>
                      <code className="text-xs px-2 py-1 bg-whiteColor dark:bg-gray-900 rounded text-contentColor dark:text-contentColor-dark block">
                        {cert.verification_code}
                      </code>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {cert.certificate_url && (
                      <>
                        <a
                          href={cert.certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center px-4 py-2 text-sm font-semibold bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 transition-colors"
                        >
                          View
                        </a>
                        <a
                          href={cert.certificate_url}
                          download
                          className="flex-1 text-center px-4 py-2 text-sm font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
                        >
                          Download
                        </a>
                      </>
                    )}
                    {cert.verification_code && (
                      <a
                        href={`/certificates/verify/${cert.verification_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 rounded-md hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                      >
                        Verify
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
