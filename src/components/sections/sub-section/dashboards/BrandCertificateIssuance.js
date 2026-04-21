"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";

export default function BrandCertificateIssuance({ certificateId }) {
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Fetch eligible students (those who meet criteria)
  const { data: eligibleStudentsData, isLoading } = useQuery({
    queryKey: ['brandCertificateEligibleStudents', certificateId],
    queryFn: async () => {
      const response = await apiClient.get(`/brand/certificates/${certificateId}/eligible-students`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch eligible students');
      }
      return response.data;
    },
    enabled: !!certificateId,
  });

  const eligibleStudents = eligibleStudentsData?.students || [];

  // Issue certificate mutation
  const issueCertificateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/brand/certificates/${certificateId}/issue`, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to issue certificate');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandCertificateEligibleStudents', certificateId] });
      queryClient.invalidateQueries({ queryKey: ['brandCertificateIssued', certificateId] });
      setSelectedStudentIds([]);
      createAlert('success', 'Certificates issued successfully!');
    },
    onError: (error) => {
      console.error('Issue certificate error:', error);
      createAlert('error', error.message || 'Failed to issue certificates');
    },
  });

  const handleSelectStudent = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === eligibleStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(eligibleStudents.map((s) => s.id));
    }
  };

  const handleIssueSelected = async () => {
    if (selectedStudentIds.length === 0) {
      createAlert('warning', 'Please select at least one student');
      return;
    }

    if (!confirm(`Issue certificates to ${selectedStudentIds.length} student(s)?`)) {
      return;
    }

    await issueCertificateMutation.mutateAsync({
      student_ids: selectedStudentIds,
    });
  };

  const handleIssueSingle = async (studentId) => {
    if (!confirm('Issue certificate to this student?')) {
      return;
    }

    await issueCertificateMutation.mutateAsync({
      student_ids: [studentId],
    });
  };

  const filteredStudents = eligibleStudents.filter((student) =>
    searchTerm
      ? student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading eligible students...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="mb-4">
            <h1 className="h3 mb-2 fw-bold text-dark">Issue Certificates</h1>
            <p className="text-muted mb-0 small">
              Select students who meet the criteria and issue certificates to them.
            </p>
          </div>

          {selectedStudentIds.length > 0 && (
            <div className="mb-4 p-3 bg-primaryColor/10 rounded-md">
              <div className="d-flex align-items-center justify-content-between">
                <span className="fw-semibold">
                  {selectedStudentIds.length} student(s) selected
                </span>
                <button
                  onClick={handleIssueSelected}
                  disabled={issueCertificateMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {issueCertificateMutation.isPending ? 'Issuing...' : 'Issue Selected'}
                </button>
              </div>
            </div>
          )}

          <div className="mb-3">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
            />
          </div>

          {eligibleStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-contentColor dark:text-contentColor-dark">
                No eligible students found. Students must meet the certificate criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <button
                  onClick={handleSelectAll}
                  className="btn btn-sm btn-outline-primary"
                >
                  {selectedStudentIds.length === eligibleStudents.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.length === eligibleStudents.length && eligibleStudents.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Course</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => handleSelectStudent(student.id)}
                          />
                        </td>
                        <td>{student.name || 'N/A'}</td>
                        <td>{student.email || 'N/A'}</td>
                        <td>{student.course_title || 'N/A'}</td>
                        <td>
                          <span className="badge bg-success">
                            {student.progress_percentage || 0}%
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleIssueSingle(student.id)}
                            disabled={issueCertificateMutation.isPending}
                            className="btn btn-sm btn-primary"
                          >
                            Issue
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
