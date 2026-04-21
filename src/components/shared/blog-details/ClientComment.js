'use client';

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { useCourseComments, useCreateCourseComment, useDeleteCourseComment } from "@/hooks/api/useCourseComments";
import { formatDateShort } from "@/lib/utils/dateFormatter";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import { useAuthStore } from "@/store";
import userPlaceholder from "@/assets/images/placeholder/user-placeholder.png";
import blogDetailsImage1 from "@/assets/images/blog-details/blog-details__1.png";

const ClientComment = ({ courseId }) => {
  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const { isAuthenticated, user } = useAuthStore();

  const { data: commentsData, isLoading, isError, error } = useCourseComments(
    courseId,
    { page, limit: 10, enabled: !!courseId }
  );

  const createComment = useCreateCourseComment();
  const deleteComment = useDeleteCourseComment();

  const comments = commentsData?.comments || [];
  const pagination = commentsData?.pagination || { hasMore: false, total: 0 };

  const handleReply = async (parentId, commentText) => {
    if (!isAuthenticated) {
      alert('Please log in to reply');
      return;
    }
    if (!commentText.trim()) {
      alert('Reply text cannot be empty');
      return;
    }
    try {
      await createComment.mutateAsync({
        courseId,
        commentText,
        parentId
      });
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    try {
      await deleteComment.mutateAsync({ courseId, commentId });
    } catch (err) {
      // Error handled by hook
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase();
    } catch (error) {
      return '--';
    }
  };

  const renderComment = (comment, isReply = false) => {
    const canDelete = isAuthenticated && (user?.id === comment.userId || user?.role === 'admin' || user?.role === 'superadmin');
    const isPending = comment.status === 'pending';

    return (
      <li key={comment.id} className={`flex gap-30px mb-10 ${isReply ? 'lg:pl-100px' : ''}`}>
        <div className="flex-shrink-0">
          <div>
            <Image
              src={comment.userAvatar || userPlaceholder}
              alt={comment.userName || "User"}
              className="w-20 h-20 rounded-full object-cover"
              width={80}
              height={80}
              placeholder="blur"
              blurDataURL={userPlaceholder.blurDataURL}
            />
          </div>
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <div>
              <h4>
                <Link
                  href={`/instructors/${comment.userId}`}
                  className="text-lg font-semibold text-blackColor hover:text-primaryColor dark:text-blackColor-dark dark:hover:text-primaryColor leading-25px"
                >
                  {comment.userName || 'Anonymous'}
                </Link>
              </h4>
              <p className="text-xs font-medium text-contentColor dark:text-contentColor-dark leading-29px uppercase mb-5px">
                {formatDate(comment.createdAt)}
                {isPending && (
                  <span className="ml-2 text-yellow-500">(Pending Approval)</span>
                )}
              </p>
            </div>
            <div className="author__icon flex items-center gap-2">
              {!isReply && isAuthenticated && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="group text-primaryColor hover:text-secondaryColor"
                  title="Reply"
                >
                  <svg
                    width="26"
                    height="19"
                    viewBox="0 0 26 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      className="group-hover:fill-primaryColor dark:fill-blackColor-dark dark:group-hover:fill-primaryColor block"
                      d="M5.91943 10.2031L12.1694 16.4531C13.3413 17.625 15.3726 16.8047 15.3726 15.125V12.3516C19.9819 12.5469 20.0991 13.5625 19.4351 15.8672C18.9272 17.5469 20.8413 18.9141 22.2866 17.9375C24.2788 16.5703 25.3726 14.8516 25.3726 12.3516C25.3726 6.76562 20.3726 5.67188 15.3726 5.47656V2.66406C15.3726 0.984375 13.3413 0.164062 12.1694 1.33594L5.91943 7.58594C5.17725 8.28906 5.17725 9.5 5.91943 10.2031ZM7.24756 8.875L13.4976 2.625V7.3125C18.1851 7.3125 23.4976 7.58594 23.4976 12.3516C23.4976 14.5391 22.3647 15.6328 21.2319 16.375C22.8335 11.0625 18.8491 10.4375 13.4976 10.4375V15.125L7.24756 8.875ZM0.919434 7.58594C0.177246 8.28906 0.177246 9.5 0.919434 10.2031L7.16943 16.4531C7.95068 17.2734 9.12256 17.1562 9.82568 16.4531L2.24756 8.875L9.82568 1.33594C9.12256 0.632812 7.95068 0.515625 7.16943 1.33594L0.919434 7.58594Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  <i className="icofont-trash"></i>
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-contentColor dark:text-contentColor-dark leading-23px mb-15px">
            {comment.commentText}
          </p>

          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mb-10 p-4 bg-lightGrey12 dark:bg-darkdeep3-dark rounded-md">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                className="w-full p-3 mb-2 bg-transparent text-sm text-contentColor dark:text-contentColor-dark border border-borderColor2 dark:border-borderColor2-dark rounded resize-none"
                rows="3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReply(comment.id, replyText)}
                  disabled={createComment.isPending || !replyText.trim()}
                  className="px-4 py-2 text-sm bg-primaryColor text-whiteColor rounded hover:bg-primaryColor-dark disabled:opacity-50"
                >
                  {createComment.isPending ? 'Posting...' : 'Post Reply'}
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="px-4 py-2 text-sm bg-borderColor dark:bg-borderColor-dark text-contentColor dark:text-contentColor-dark rounded hover:bg-borderColor-dark"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Render replies */}
          {comment.replies && comment.replies.length > 0 && (
            <ul>
              {comment.replies.map(reply => renderComment(reply, true))}
            </ul>
          )}
        </div>
      </li>
    );
  };

  if (isLoading) {
    return (
      <div className="pt-50px pb-15px border-y border-borderColor2 dark:border-borderColor2-dark">
        <h4 className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark mb-30px !leading-30px">
          Comments
        </h4>
        <SkeletonLoader type="list-item" count={3} className="h-32 mb-4" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-50px pb-15px border-y border-borderColor2 dark:border-borderColor2-dark">
        <h4 className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark mb-30px !leading-30px">
          Comments
        </h4>
        <p className="text-red-500 text-center py-10">
          Error loading comments: {error?.message || 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-50px pb-15px border-y border-borderColor2 dark:border-borderColor2-dark">
      <h4
        className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark mb-30px !leading-30px"
        data-aos="fade-up"
      >
        ({pagination.total || 0}) Comment{pagination.total !== 1 ? 's' : ''}
      </h4>
      {comments.length === 0 ? (
        <p className="text-contentColor dark:text-contentColor-dark text-center py-10">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <>
          <ul>
            {comments.map(comment => renderComment(comment))}
          </ul>
          
          {/* Pagination */}
          {pagination.hasMore && (
            <div className="flex justify-center mt-30px">
              <button
                onClick={() => setPage(prev => prev + 1)}
                className="px-25px py-10px text-sm bg-primaryColor text-whiteColor rounded hover:bg-primaryColor-dark"
              >
                Load More Comments
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientComment;
