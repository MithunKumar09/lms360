'use client';

import React, { useState } from 'react';
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import Link from "next/link";
import { useCourseInquiries, useUpdateInquiryStatus, useDeleteInquiry } from '@/hooks/api/useCourseInquiries';
import { formatDateShort } from '@/lib/utils/dateFormatter';
import useSweetAlert from '@/hooks/useSweetAlert';

const CourseInquiries = ({ courseId = null }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const createAlert = useSweetAlert();

  // Fetch all inquiries if no courseId, or specific course inquiries if courseId provided
  const { data: inquiriesData, isLoading, isError, error } = useCourseInquiries(
    courseId || 'all', 
    { 
      status: statusFilter === 'all' ? null : statusFilter,
      page,
      limit: 10,
      enabled: true
    }
  );

  const updateStatus = useUpdateInquiryStatus();
  const deleteInquiry = useDeleteInquiry();

  const inquiries = inquiriesData?.inquiries || [];
  const pagination = inquiriesData?.pagination || { hasMore: false, total: 0 };
  const statistics = inquiriesData?.statistics || { total: 0, new: 0, read: 0, replied: 0, archived: 0 };

  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      await updateStatus.mutateAsync({ inquiryId, status: newStatus });
      createAlert({
        icon: 'success',
        title: 'Success',
        text: 'Inquiry status updated successfully'
      });
    } catch (error) {
      createAlert({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update inquiry status'
      });
    }
  };

  const handleDelete = async (inquiryId) => {
    const result = await createAlert({
      icon: 'warning',
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await deleteInquiry.mutateAsync(inquiryId);
        createAlert({
          icon: 'success',
          title: 'Deleted!',
          text: 'Inquiry has been deleted.'
        });
      } catch (error) {
        createAlert({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete inquiry'
        });
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500 text-white';
      case 'read':
        return 'bg-yellow-500 text-white';
      case 'replied':
        return 'bg-green-500 text-white';
      case 'archived':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-300 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Course Inquiries</HeadingDashboard>
        <p className="text-contentColor dark:text-contentColor-dark text-center py-10">
          Loading inquiries...
        </p>
      </div>
    );
  }

  if (isError) {
    // Safely extract error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
      ? error 
      : error?.message || 'Failed to load inquiries';
    
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Course Inquiries</HeadingDashboard>
        <p className="text-red-500 text-center py-10">
          Error: {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 max-h-137.5 overflow-auto">
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-25px">
  <HeadingDashboard
    className="text-xl font-bold"
    path={courseId ? `/courses/${courseId}` : "/courses"}
  >
    Course Inquiries ({statistics.total})
  </HeadingDashboard>
        
        {/* Statistics */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
            New: {statistics.new}
          </span>
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
            Read: {statistics.read}
          </span>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            Replied: {statistics.replied}
          </span>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-15px flex gap-2 flex-wrap">
        <button
          onClick={() => { setStatusFilter('all'); setPage(1); }}
          className={`px-15px py-5px text-sm rounded ${
            statusFilter === 'all'
              ? 'bg-primaryColor text-whiteColor'
              : 'bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark'
          }`}
        >
          All
        </button>
        <button
          onClick={() => { setStatusFilter('new'); setPage(1); }}
          className={`px-15px py-5px text-sm rounded ${
            statusFilter === 'new'
              ? 'bg-primaryColor text-whiteColor'
              : 'bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark'
          }`}
        >
          New
        </button>
        <button
          onClick={() => { setStatusFilter('read'); setPage(1); }}
          className={`px-15px py-5px text-sm rounded ${
            statusFilter === 'read'
              ? 'bg-primaryColor text-whiteColor'
              : 'bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark'
          }`}
        >
          Read
        </button>
        <button
          onClick={() => { setStatusFilter('replied'); setPage(1); }}
          className={`px-15px py-5px text-sm rounded ${
            statusFilter === 'replied'
              ? 'bg-primaryColor text-whiteColor'
              : 'bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark'
          }`}
        >
          Replied
        </button>
        <button
          onClick={() => { setStatusFilter('archived'); setPage(1); }}
          className={`px-15px py-5px text-sm rounded ${
            statusFilter === 'archived'
              ? 'bg-primaryColor text-whiteColor'
              : 'bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark'
          }`}
        >
          Archived
        </button>
      </div>

      <div className="overflow-auto">
        {inquiries.length === 0 ? (
          <p className="text-contentColor dark:text-contentColor-dark text-center py-10">
            No inquiries found
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-sm md:text-base text-blackColor dark:text-blackColor-dark bg-lightGrey5 dark:bg-whiteColor-dark leading-1.8 md:leading-1.8">
              <tr>
                <th className="px-5px py-10px md:px-5">Course</th>
                <th className="px-5px py-10px md:px-5">Name</th>
                <th className="px-5px py-10px md:px-5">Email</th>
                <th className="px-5px py-10px md:px-5">Message</th>
                <th className="px-5px py-10px md:px-5">Status</th>
                <th className="px-5px py-10px md:px-5">Date</th>
                <th className="px-5px py-10px md:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="text-size-13 md:text-base text-contentColor dark:text-contentColor-dark font-normal">
              {Array.isArray(inquiries) && inquiries.map((inquiry, index) => {
                if (!inquiry || typeof inquiry !== 'object') {
                  return null;
                }
                return (
                  <tr 
                    key={inquiry.id || index} 
                    className={`leading-1.8 md:leading-1.8 ${index % 2 === 0 ? '' : 'bg-lightGrey5 dark:bg-whiteColor-dark'}`}
                  >
                    <td className="px-5px py-10px md:px-5">
                      {inquiry.courseTitle ? (
                        <Link 
                          href={`/course-details-3?courseId=${inquiry.courseId || ''}`}
                          className="text-primaryColor hover:underline"
                        >
                          {inquiry.courseTitle}
                        </Link>
                      ) : (
                        <span>--</span>
                      )}
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      <p>{inquiry.name || '--'}</p>
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      {inquiry.email ? (
                        <a 
                          href={`mailto:${inquiry.email}`}
                          className="text-primaryColor hover:underline"
                        >
                          {inquiry.email}
                        </a>
                      ) : (
                        <span>--</span>
                      )}
                    </td>
                    <td className="px-5px py-10px md:px-5 max-w-xs">
                      <p className="truncate" title={inquiry.message || ''}>
                        {inquiry.message || '--'}
                      </p>
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      <select
                        value={inquiry.status || 'new'}
                        onChange={(e) => inquiry.id && handleStatusChange(inquiry.id, e.target.value)}
                        className={`text-xs px-10px py-5px rounded border-0 ${getStatusBadgeClass(inquiry.status || 'new')}`}
                        disabled={updateStatus.isPending || !inquiry.id}
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="replied">Replied</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      <p className="text-xs">{inquiry.createdAt ? formatDateShort(inquiry.createdAt) : '--'}</p>
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => inquiry.id && handleDelete(inquiry.id)}
                          disabled={deleteInquiry.isPending || !inquiry.id}
                          className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
                          title="Delete"
                        >
                          <i className="icofont-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && typeof pagination.totalPages === 'number' && pagination.totalPages > 1 && (
        <div className="mt-20px flex justify-between items-center">
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            Page {pagination.page || 1} of {pagination.totalPages} ({pagination.total || 0} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={pagination.page === 1}
              className="px-15px py-5px text-sm bg-primaryColor text-whiteColor rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={!pagination.hasMore}
              className="px-15px py-5px text-sm bg-primaryColor text-whiteColor rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseInquiries;

