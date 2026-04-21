"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";

export default function BrandCertificatesMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch brand's certificates
  const { data: certificatesData, isLoading } = useQuery({
    queryKey: ['brandCertificates', userId],
    queryFn: async () => {
      const response = await apiClient.get('/brand/certificates');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch certificates');
      }
      return response.data;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const certificates = certificatesData?.certificates || [];

  // Delete mutation
  const deleteCertificateMutation = useMutation({
    mutationFn: async (certificateId) => {
      const response = await apiClient.delete(`/brand/certificates/${certificateId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete certificate');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandCertificates'] });
      createAlert('success', 'Certificate template deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete certificate error:', error);
      createAlert('error', error.message || 'Failed to delete certificate');
    },
  });

  const handleDelete = async (certificateId, certificateName) => {
    if (!confirm(`Are you sure you want to delete "${certificateName}"?`)) {
      return;
    }
    await deleteCertificateMutation.mutateAsync(certificateId);
  };

  const filteredCertificates = certificates.filter((cert) =>
    searchTerm
      ? cert.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
      {/* Header */}
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
                Certificate Templates
              </h2>
              <p className="text-contentColor dark:text-contentColor-dark">
                Manage your certificate templates
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboards/brand-certificates/create')}
              className="px-6 py-3 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors shadow-md hover:shadow-lg"
            >
              + Create Template
            </button>
          </div>
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
            <p className="text-contentColor dark:text-contentColor-dark text-lg mb-2">
              {searchTerm ? 'No certificates found matching your search.' : 'No certificate templates found. Create your first template!'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/dashboards/brand-certificates/create')}
                className="mt-4 px-6 py-3 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
              >
                + Create Your First Template
              </button>
            )}
          </div>
        )}

        {/* Certificates List */}
        {filteredCertificates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px lg:gap-30px">
            {filteredCertificates.map((certificate) => (
              <div
                key={certificate.id}
                className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-all duration-300 p-6"
              >
              <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor mb-2">
                {certificate.name}
              </h3>
              {certificate.description && (
                <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
                  {certificate.description}
                </p>
              )}
              <div className="space-y-1 text-xs text-contentColor dark:text-contentColor-dark mb-3">
                <p>
                  <strong>Issued:</strong> {certificate.issued_count || 0}
                </p>
                <p>
                  <strong>Auto Issue:</strong> {certificate.auto_issue ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => router.push(`/dashboards/brand-certificates/${certificate.id}/issued`)}
                  className="px-3 py-1 text-xs font-semibold text-green-600 bg-green-50 rounded-md hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
                >
                  View Issued
                </button>
                <button
                  onClick={() => router.push(`/dashboards/brand-certificates/create?edit=${certificate.id}`)}
                  className="px-3 py-1 text-xs font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(certificate.id, certificate.name)}
                  disabled={deleteCertificateMutation.isPending}
                  className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
