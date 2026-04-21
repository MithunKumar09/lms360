"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";

export default function BrandCertificateVerification() {
  const [verificationCode, setVerificationCode] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const { data: verificationData, isLoading, refetch } = useQuery({
    queryKey: ['brandCertificateVerification', verificationCode],
    queryFn: async () => {
      if (!verificationCode || verificationCode.trim().length === 0) {
        return null;
      }

      const response = await apiClient.get(`/brand/certificates/verify/${verificationCode}`);
      if (!response.success) {
        throw new Error(response.error || 'Certificate not found or invalid');
      }
      return response.data;
    },
    enabled: false, // Manual trigger only
    retry: false,
  });

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length === 0) {
      return;
    }
    setHasSearched(true);
    await refetch();
  };

  const certificate = verificationData?.certificate;

  return (
    <div className="w-full">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="mb-4">
            <h1 className="h3 mb-2 fw-bold text-dark">Verify Certificate</h1>
            <p className="text-muted mb-0 small">
              Enter a certificate verification code to verify its authenticity.
            </p>
          </div>

          <form onSubmit={handleVerify} className="mb-4">
            <div className="row">
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  disabled={isLoading}
                />
              </div>
              <div className="col-md-4">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isLoading || !verificationCode || verificationCode.trim().length === 0}
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          </form>

          {hasSearched && !isLoading && (
            <>
              {certificate ? (
                <div className="alert alert-success">
                  <h5 className="alert-heading">✓ Certificate Verified</h5>
                  <hr />
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-2">
                        <strong>Certificate Name:</strong> {certificate.certificate_name || 'N/A'}
                      </p>
                      <p className="mb-2">
                        <strong>Issued To:</strong> {certificate.student_name || 'N/A'}
                      </p>
                      <p className="mb-2">
                        <strong>Student Email:</strong> {certificate.student_email || 'N/A'}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-2">
                        <strong>Issued By:</strong> {certificate.brand_name || 'N/A'}
                      </p>
                      <p className="mb-2">
                        <strong>Issued Date:</strong>{' '}
                        {certificate.issued_at
                          ? new Date(certificate.issued_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                      <p className="mb-2">
                        <strong>Verification Code:</strong> {certificate.verification_code || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {certificate.certificate_url && (
                    <div className="mt-3">
                      <a
                        href={certificate.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary me-2"
                      >
                        View Certificate
                      </a>
                      <a
                        href={certificate.certificate_url}
                        download
                        className="btn btn-sm btn-outline-primary"
                      >
                        Download PDF
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert alert-danger">
                  <h5 className="alert-heading">✗ Certificate Not Found</h5>
                  <p className="mb-0">
                    The verification code you entered is invalid or the certificate does not exist.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
