'use client';

import { useState, useRef } from 'react';
import useSweetAlert from '@/hooks/useSweetAlert';

export default function ClassesBulkImportMain({ defaultOrgId = null, isSuperadmin = true }) {
  const alert = useSweetAlert();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [orgCode, setOrgCode] = useState('');
  const [orgId, setOrgId] = useState(defaultOrgId || '');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [results, setResults] = useState(null);

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      await parseOnServer(f);
    }
  };

  const onBrowse = async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      await parseOnServer(f);
    }
  };

  const parseOnServer = async (f) => {
    setIsParsing(true);
    setResults(null);
    try {
      const form = new FormData();
      form.append('file', f);
      const res = await fetch('/api/cohorts/import?mode=parse', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse file');
      setHeaders(data.headers || []);
      setRows(data.preview || []);
      alert('success', `Parsed ${data.preview?.length || 0} rows`);
    } catch (err) {
      alert('error', err.message || 'Parse failed');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert('error', 'Please select a CSV/XLSX file first');
      return;
    }
    if (isSuperadmin && !orgCode && !orgId) {
      alert('error', 'Provide either org_code or choose an organization');
      return;
    }
    setIsImporting(true);
    setResults(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (isSuperadmin && orgCode) form.append('org_code', orgCode);
      if (orgId) form.append('orgId', orgId);
      form.append('dedupe', 'skip'); // default behavior, UI toggle can change later
      const res = await fetch('/api/cohorts/import', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResults(data);
      alert('success', `Imported: ${data.summary?.created || 0} created, ${data.summary?.updated || 0} updated, ${data.summary?.skipped || 0} skipped`);
    } catch (err) {
      alert('error', err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-20px">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={onDrop}
        className="border-2 border-dashed border-borderColor dark:border-borderColor-dark rounded-lg p-30px text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        role="button"
        aria-label="Upload CSV or XLSX file"
      >
        <input ref={fileInputRef} type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={onBrowse} />
        <div className="flex flex-col items-center gap-10px">
          <svg className="w-10 h-10 text-contentColor dark:text-contentColor-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6h.1a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm">Drag and drop CSV/XLSX here, or click to browse</p>
          {file && <p className="text-xs text-placeholder">Selected: {file.name}</p>}
          {isParsing && <p className="text-xs text-placeholder">Parsing...</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-15px">
        {isSuperadmin && (
          <div>
            <label className="block text-sm mb-5px">Org Code (superadmin)</label>
            <input
              type="text"
              value={orgCode}
              onChange={(e) => setOrgCode(e.target.value)}
              placeholder="e.g. EDU001"
              className="w-full h-42px px-12px border border-borderColor dark:border-borderColor-dark rounded"
            />
          </div>
        )}
        <div className="md:col-span-2 flex items-end gap-10px">
          <button type="button" onClick={handleImport} disabled={!file || isImporting} className="px-18px py-10px bg-primaryColor text-whiteColor rounded disabled:opacity-50">
            {isImporting ? 'Importing...' : 'Start Import'}
          </button>
          <a
            href="/api/cohorts/export?format=csv&page=1&limit=1"
            className="px-18px py-10px border border-borderColor dark:border-borderColor-dark rounded"
          >
            Download Template (CSV headers)
          </a>
        </div>
      </div>

      {/* Preview Grid */}
      {headers.length > 0 && rows.length > 0 && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} className="text-left px-12px py-10px border-b">{h}</th>
                ))}
                <th className="px-12px py-10px border-b">Validation</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((row, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  {headers.map((h) => (
                    <td key={h} className="px-12px py-8px">{row[h]}</td>
                  ))}
                  <td className="px-12px py-8px">
                    {Array.isArray(row._errors) && row._errors.length > 0 ? (
                      <span className="text-red-600">Invalid</span>
                    ) : (
                      <span className="text-green-600">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 200 && <div className="p-10px text-xs text-center text-placeholder">Showing first 200 rows...</div>}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark p-15px">
          <h3 className="font-semibold mb-8px">Results</h3>
          <div className="text-sm mb-10px">
            Created: {results.summary?.created || 0} | Updated: {results.summary?.updated || 0} | Skipped: {results.summary?.skipped || 0}
          </div>
          <div className="max-h-72 overflow-auto border border-borderColor dark:border-borderColor-dark rounded">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left px-10px py-8px border-b">Row</th>
                  <th className="text-left px-10px py-8px border-b">Status</th>
                  <th className="text-left px-10px py-8px border-b">Reason</th>
                </tr>
              </thead>
              <tbody>
                {(results.rows || []).map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-10px py-6px">{r.rowNumber}</td>
                    <td className="px-10px py-6px">{r.status}</td>
                    <td className="px-10px py-6px">{r.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


