"use client";

import { useState } from "react";
import useSweetAlert from "@/hooks/useSweetAlert";

export default function BulkImportUsersForm({ actorRole = "superadmin", onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const createAlert = useSweetAlert();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.csv')) {
        createAlert('error', 'Please select a CSV file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      createAlert('error', 'Please select a CSV file');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('actorRole', actorRole);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(Math.round(percentComplete));
        }
      });

      // Handle response
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          createAlert('success', `Successfully imported ${response.created || 0} users`);
          setFile(null);
          setProgress(0);
          if (onSuccess) {
            onSuccess();
          }
        } else {
          const response = JSON.parse(xhr.responseText);
          createAlert('error', response.error || 'Failed to import users');
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        createAlert('error', 'Network error. Please try again.');
        setUploading(false);
        setProgress(0);
      });

      xhr.open('POST', '/api/users/bulk-import');
      xhr.send(formData);
    } catch (error) {
      createAlert('error', error.message || 'Failed to import users');
      setUploading(false);
      setProgress(0);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const headers = [
      'email',
      'first_name',
      'last_name',
      'role',
      'org_id',
      'cohort_id',
      'section_id',
      'roll_no',
      'vendor_category',
      'company_name',
      'gstin',
      'graduation_year',
      'program_node_id',
      'mfa_required',
      'temp_password'
    ];
    
    const csvContent = headers.join(',') + '\n' +
      'example@email.com,John,Doe,student,,,,,,,,,false,';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-whiteColor dark:bg-whiteColor-dark p-4 border">
        <h3 className="font-semibold mb-3">CSV File Upload</h3>
        
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Select CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
            className="form-control"
          />
          {file && (
            <p className="text-xs text-textColor/70 dark:text-textColor-dark/70 mt-2">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {uploading && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Uploading...</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            <strong>CSV Format Requirements:</strong>
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
            <li>First row must contain column headers</li>
            <li>Required columns: email, role</li>
            <li>Optional columns: first_name, last_name, org_id, cohort_id, etc.</li>
            <li>Email must be unique</li>
            <li>Role must be one of: student, instructor, admin, vendor, parent, alumni</li>
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-4 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Download Template
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={uploading || !file}
        >
          {uploading ? "Importing..." : "Import Users"}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={uploading}
          onClick={() => {
            setFile(null);
            setProgress(0);
          }}
        >
          Reset
        </button>
      </div>
    </form>
  );
}

