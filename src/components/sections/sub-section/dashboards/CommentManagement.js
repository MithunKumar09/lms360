'use client';

import React, { useState } from 'react';
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import Link from "next/link";
import { useAllCourseComments, useUpdateCourseComment, useDeleteCourseComment } from '@/hooks/api/useCourseComments';
import { formatDateShort } from '@/lib/utils/dateFormatter';
import useSweetAlert from '@/hooks/useSweetAlert';
import Image from 'next/image';
import userPlaceholder from '@/assets/images/placeholder/user-placeholder.png';

const CommentManagement = ({ courseId = null }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const createAlert = useSweetAlert();

  const { data: commentsData, isLoading, isError, error } = useAllCourseComments({
    courseId: courseId || null,
    status: statusFilter === 'all' ? null : statusFilter,
    page,
    limit: 10,
    enabled: true
  });

  const updateComment = useUpdateCourseComment();
  const deleteComment = useDeleteCourseComment();

  const comments = commentsData?.comments || [];
  const pagination = commentsData?.pagination || { hasMore: false, total: 0 };

  const handleStatusChange = async (commentId, newStatus, currentCourseId) => {
    try {
      await updateComment.mutateAsync({
        courseId: currentCourseId,
        commentId,
        status: newStatus
      });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async (commentId, currentCourseId) => {
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
        await deleteComment.mutateAsync({
          courseId: currentCourseId,
          commentId
        });
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'approved':
        return 'bg-green-500 text-white';
      case 'rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-300 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Comment Management</HeadingDashboard>
        <p className="text-contentColor dark:text-contentColor-dark text-center py-10">
          Loading comments...
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
      : error?.message || 'Failed to load comments';
    
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Comment Management</HeadingDashboard>
        <p className="text-red-500 text-center py-10">
          Error: {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 max-h-137.5 overflow-auto">
      <div className="flex justify-between items-center mb-25px">
        <HeadingDashboard path={courseId ? `/courses/${courseId}` : "/courses"}>
          Comment Management {courseId ? `(${pagination.total})` : `(${pagination.total})`}
        </HeadingDashboard>
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
          onClick={() => { setStatusFilter('pending'); setPage(1); }}
          className={`px-15px py-5px text-sm rounded ${
            statusFilter === 'pending'
              ? 'bg-primaryColor text-whiteColor'
              : 'bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => { setStatusFilter('approved'); setPage(1); }}
          className={`px-15px py-5px text-sm rounded ${
            statusFilter === 'approved'
              ? 'bg-primaryColor text-whiteColor'
              : 'bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => { setStatusFilter('rejected'); setPage(1); }}
          className={`px-15px py-5px text-sm rounded ${
            statusFilter === 'rejected'
              ? 'bg-primaryColor text-whiteColor'
              : 'bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark'
          }`}
        >
          Rejected
        </button>
      </div>

      <div className="overflow-auto">
        {comments.length === 0 ? (
          <p className="text-contentColor dark:text-contentColor-dark text-center py-10">
            No comments found
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-sm md:text-base text-blackColor dark:text-blackColor-dark bg-lightGrey5 dark:bg-whiteColor-dark leading-1.8 md:leading-1.8">
              <tr>
                <th className="px-5px py-10px md:px-5">User</th>
                <th className="px-5px py-10px md:px-5">Course</th>
                <th className="px-5px py-10px md:px-5">Comment</th>
                <th className="px-5px py-10px md:px-5">Status</th>
                <th className="px-5px py-10px md:px-5">Date</th>
                <th className="px-5px py-10px md:px-5">Actions</th>
              </tr>
            </thead>
            <tbody className="text-size-13 md:text-base text-contentColor dark:text-contentColor-dark font-normal">
              {Array.isArray(comments) && comments.map((comment, index) => {
                if (!comment || typeof comment !== 'object') {
                  return null;
                }
                return (
                  <tr 
                    key={comment.id || index} 
                    className={`leading-1.8 md:leading-1.8 ${index % 2 === 0 ? '' : 'bg-lightGrey5 dark:bg-whiteColor-dark'}`}
                  >
                    <td className="px-5px py-10px md:px-5">
                      <div className="flex items-center gap-2">
                        <Image
                          src={comment.userAvatar || userPlaceholder}
                          alt={comment.userName || "User"}
                          className="w-10 h-10 rounded-full object-cover"
                          width={40}
                          height={40}
                          placeholder="blur"
                          blurDataURL={userPlaceholder.blurDataURL}
                        />
                        <div>
                          <p className="font-medium">{comment.userName || '--'}</p>
                          <p className="text-xs text-contentColor dark:text-contentColor-dark">
                            {comment.userEmail || '--'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      {comment.courseTitle ? (
                        <Link 
                          href={`/course-details-3?courseId=${comment.courseId || ''}`}
                          className="text-primaryColor hover:underline"
                        >
                          {comment.courseTitle}
                        </Link>
                      ) : (
                        <span>--</span>
                      )}
                    </td>
                    <td className="px-5px py-10px md:px-5 max-w-xs">
                      <p className="truncate" title={comment.commentText || ''}>
                        {comment.commentText || '--'}
                      </p>
                      {comment.parentId && (
                        <span className="text-xs text-primaryColor">(Reply)</span>
                      )}
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      <select
                        value={comment.status || 'pending'}
                        onChange={(e) => comment.id && handleStatusChange(comment.id, e.target.value, comment.courseId)}
                        className={`text-xs px-10px py-5px rounded border-0 ${getStatusBadgeClass(comment.status || 'pending')}`}
                        disabled={updateComment.isPending || !comment.id}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      <p className="text-xs">{comment.createdAt ? formatDateShort(comment.createdAt) : '--'}</p>
                    </td>
                    <td className="px-5px py-10px md:px-5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => comment.id && handleDelete(comment.id, comment.courseId)}
                          disabled={deleteComment.isPending || !comment.id}
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

export default CommentManagement;

