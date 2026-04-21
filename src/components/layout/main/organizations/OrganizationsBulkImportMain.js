/**
 * Organizations Bulk Import Main Component
 * 
 * Multi-step component for bulk importing organizations from CSV/XLSX files.
 * Steps: 1. Upload File, 2. Preview & Validate, 3. Import
 * 
 * @module main/organizations/OrganizationsBulkImportMain
 */

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSweetAlert from '@/hooks/useSweetAlert';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';
import ValidationError from '@/components/shared/errors/ValidationError.js';

export default function OrganizationsBulkImportMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const fileInputRef = useRef(null);
  const dragOverRef = useRef(false);

  // State
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Import
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [error, setError] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [updateOnDuplicate, setUpdateOnDuplicate] = useState(true);

  /**
   * Handle file selection
   */
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.csv', '.xlsx', '.xls'];

    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    const isValidType =
      validTypes.includes(selectedFile.type) || validExtensions.includes(fileExtension);

    if (!isValidType) {
      setError('Invalid file type. Please upload a CSV or XLSX file.');
      createAlert('error', 'Invalid file type. Please upload a CSV or XLSX file.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      setError(`File size (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (5MB)`);
      createAlert('error', `File size exceeds maximum allowed size (5MB)`);
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null);
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    handleFileSelect(selectedFile);
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverRef.current = true;
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverRef.current = false;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragOverRef.current = false;

    const droppedFile = e.dataTransfer.files?.[0];
    handleFileSelect(droppedFile);
  };

  /**
   * Handle upload and preview
   */
  const handleUploadAndPreview = async () => {
    if (!file) {
      setError('Please select a file');
      createAlert('error', 'Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload and preview
      const response = await fetch('/api/organizations/bulk/preview', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview file');
      }

      setPreviewData(data);
      setStep(2);
      createAlert('success', `File uploaded successfully. ${data.summary.valid} valid, ${data.summary.invalid} invalid rows.`);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to upload file');
      createAlert('error', err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle import
   */
  const handleImport = async () => {
    if (!previewData || !previewData.rows) {
      setError('No data to import');
      createAlert('error', 'No data to import');
      return;
    }

    // Filter valid rows
    const validRows = previewData.rows
      .filter((row) => row.valid)
      .map((row) => row.validatedData || row.data);

    if (validRows.length === 0) {
      setError('No valid rows to import');
      createAlert('error', 'No valid rows to import. Please fix errors first.');
      return;
    }

    setImporting(true);
    setError(null);
    setStep(3);

    try {
      // Import organizations
      const response = await fetch('/api/organizations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          rows: validRows,
          options: {
            skipDuplicates,
            updateOnDuplicate,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import organizations');
      }

      setImportResults(data);
      createAlert('success', `Import completed! ${data.summary.created} created, ${data.summary.updated} updated, ${data.summary.skipped} skipped.`);
    } catch (err) {
      console.error('Error importing organizations:', err);
      setError(err.message || 'Failed to import organizations');
      createAlert('error', err.message || 'Failed to import organizations');
      setStep(2); // Go back to preview step
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  /**
   * Download template
   */
  const handleDownloadTemplate = async (format = 'csv') => {
    try {
      const response = await fetch(`/api/organizations/template?format=${format}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `organizations-template.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      createAlert('success', 'Template downloaded successfully');
    } catch (err) {
      console.error('Error downloading template:', err);
      createAlert('error', err.message || 'Failed to download template');
    }
  };

  /**
   * Reset form
   */
  const handleReset = () => {
    setStep(1);
    setFile(null);
    setFileName('');
    setPreviewData(null);
    setImportResults(null);
    setError(null);
    setSkipDuplicates(false);
    setUpdateOnDuplicate(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="pb-100px">
      {/* Header */}
      <div className="mb-30px flex flex-col sm:flex-row gap-20px items-start sm:items-center justify-between">
        <div>
          <h1 className="text-size-30 text-blackColor dark:text-blackColor-dark font-bold mb-10px">
            Bulk Import Organizations
          </h1>
          <p className="text-contentColor dark:text-contentColor-dark text-sm">
            Import multiple organizations from CSV or XLSX file
          </p>
        </div>
        <div className="flex gap-15px">
          <button
            type="button"
            onClick={() => handleDownloadTemplate('csv')}
            className="px-20px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Download CSV Template
          </button>
          <button
            type="button"
            onClick={() => handleDownloadTemplate('xlsx')}
            className="px-20px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Download XLSX Template
          </button>
          <Link
            href="/dashboards/superadmin-organizations"
            className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
          >
            Back to List
          </Link>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          type="inline"
          variant="error"
          className="mb-25px"
          onRetry={step === 1 ? handleUploadAndPreview : step === 3 ? handleImport : null}
        />
      )}

      {/* Step 1: Upload File */}
      {step === 1 && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
            Step 1: Upload File
          </h2>

          <div
            className={`border-2 border-dashed rounded-md p-40px text-center transition-colors ${
              dragOverRef.current
                ? 'border-primaryColor dark:border-primaryColor bg-primaryColor/5'
                : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor dark:hover:border-primaryColor'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />

            {uploading ? (
              <div className="py-40px">
                <div className="mb-20px">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primaryColor"></div>
                </div>
                <p className="text-contentColor dark:text-contentColor-dark text-size-18 font-medium mb-10px">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
                <div className="mt-20px w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-primaryColor h-3 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="py-40px">
                <svg
                  className="mx-auto h-16 w-16 text-contentColor dark:text-contentColor-dark mb-20px"
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
                <p className="text-contentColor dark:text-contentColor-dark text-size-18 font-medium mb-10px">
                  <span className="font-medium text-primaryColor dark:text-primaryColor">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className="text-contentColor dark:text-contentColor-dark text-sm opacity-70 mb-20px">
                  CSV or XLSX file up to 5MB
                </p>
                {fileName && (
                  <div className="mt-20px p-15px bg-gray-100 dark:bg-gray-800 rounded">
                    <p className="text-contentColor dark:text-contentColor-dark text-sm font-medium">
                      Selected: {fileName}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {file && !uploading && (
            <div className="mt-30px flex justify-end">
              <button
                type="button"
                onClick={handleUploadAndPreview}
                className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
              >
                Upload & Preview
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview & Validate */}
      {step === 2 && previewData && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
            Step 2: Preview & Validate
          </h2>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-20px mb-30px">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-20px">
              <p className="text-contentColor dark:text-contentColor-dark text-sm mb-5px">Total Rows</p>
              <p className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark">
                {previewData.summary.total}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded p-20px">
              <p className="text-contentColor dark:text-contentColor-dark text-sm mb-5px">Valid</p>
              <p className="text-size-24 font-bold text-green-600 dark:text-green-400">
                {previewData.summary.valid}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded p-20px">
              <p className="text-contentColor dark:text-contentColor-dark text-sm mb-5px">Invalid</p>
              <p className="text-size-24 font-bold text-red-600 dark:text-red-400">
                {previewData.summary.invalid}
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-20px mb-30px">
            <h3 className="text-size-16 font-bold text-blackColor dark:text-blackColor-dark mb-15px">
              Import Options
            </h3>
            <div className="space-y-10px">
              <label className="flex items-center gap-10px cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => {
                    setSkipDuplicates(e.target.checked);
                    if (e.target.checked) setUpdateOnDuplicate(false);
                  }}
                  className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
                />
                <span className="text-contentColor dark:text-contentColor-dark text-sm">
                  Skip duplicates (if slug exists, skip the row)
                </span>
              </label>
              <label className="flex items-center gap-10px cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateOnDuplicate}
                  onChange={(e) => {
                    setUpdateOnDuplicate(e.target.checked);
                    if (e.target.checked) setSkipDuplicates(false);
                  }}
                  className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
                />
                <span className="text-contentColor dark:text-contentColor-dark text-sm">
                  Update on duplicate (if slug exists, update the organization)
                </span>
              </label>
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto mb-30px">
            <table className="w-full">
              <thead>
                <tr className="border-b border-borderColor dark:border-borderColor-dark bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                    Row
                  </th>
                  <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                    Status
                  </th>
                  <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                    Name
                  </th>
                  <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                    Code
                  </th>
                  <th className="text-left p-15px text-sm font-medium text-contentColor dark:text-contentColor-dark">
                    Errors
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, index) => (
                  <tr
                    key={index}
                    className={`border-b border-borderColor dark:border-borderColor-dark ${
                      row.valid ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'
                    }`}
                  >
                    <td className="p-15px text-contentColor dark:text-contentColor-dark text-sm">
                      {row.rowIndex}
                    </td>
                    <td className="p-15px">
                      {row.valid ? (
                        <span className="inline-flex items-center gap-5px px-10px py-5px bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-5px px-10px py-5px bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 text-xs font-medium rounded">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Invalid
                        </span>
                      )}
                    </td>
                    <td className="p-15px text-contentColor dark:text-contentColor-dark text-sm">
                      {row.data?.name || '-'}
                    </td>
                    <td className="p-15px text-contentColor dark:text-contentColor-dark text-sm font-mono">
                      {row.data?.org_code || '-'}
                    </td>
                    <td className="p-15px">
                      {row.errors && Object.keys(row.errors).length > 0 ? (
                        <div className="space-y-5px">
                          {Object.entries(row.errors).map(([field, error]) => (
                            <div key={field} className="text-xs text-red-600 dark:text-red-400">
                              <span className="font-medium">{field}:</span> {error}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-contentColor dark:text-contentColor-dark opacity-50">
                          No errors
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-15px justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Start Over
            </button>
            {previewData.summary.valid > 0 && (
              <button
                type="button"
                onClick={handleImport}
                disabled={validating}
                className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {previewData.summary.valid} Valid Row(s)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Import Results */}
      {step === 3 && importResults && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded p-25px">
          <h2 className="text-size-20 text-blackColor dark:text-blackColor-dark font-bold mb-20px">
            Step 3: Import Results
          </h2>

          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-20px mb-30px">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-20px">
              <p className="text-contentColor dark:text-contentColor-dark text-sm mb-5px">Total</p>
              <p className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark">
                {importResults.summary.total}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded p-20px">
              <p className="text-contentColor dark:text-contentColor-dark text-sm mb-5px">Created</p>
              <p className="text-size-24 font-bold text-green-600 dark:text-green-400">
                {importResults.summary.created}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-20px">
              <p className="text-contentColor dark:text-contentColor-dark text-sm mb-5px">Updated</p>
              <p className="text-size-24 font-bold text-blue-600 dark:text-blue-400">
                {importResults.summary.updated}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-20px">
              <p className="text-contentColor dark:text-contentColor-dark text-sm mb-5px">Skipped</p>
              <p className="text-size-24 font-bold text-yellow-600 dark:text-yellow-400">
                {importResults.summary.skipped}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-15px justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-25px py-10px text-size-15 text-contentColor dark:text-contentColor-dark bg-transparent border border-borderColor dark:border-borderColor-dark rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Import Another File
            </button>
            <Link
              href="/dashboards/superadmin-organizations"
              className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors text-center"
            >
              View Organizations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

