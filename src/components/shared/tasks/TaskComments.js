"use client";

import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuthStore } from "@/store/index.js";

/**
 * TaskComments Component
 * 
 * Displays and manages task comments (view, add).
 * 
 * @param {Object} props
 * @param {Array} props.comments - Array of comment objects
 * @param {Function} props.onAddComment - Handler for adding comment (receives comment string)
 * @param {boolean} props.canComment - Whether user can add comments
 * @param {boolean} props.isSubmitting - Whether a comment is being submitted
 */
export default function TaskComments({
  comments = [],
  onAddComment,
  canComment = true,
  isSubmitting = false,
}) {
  const user = useAuthStore((state) => state.user);
  const [newComment, setNewComment] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedComment = newComment.trim();
    
    // Validation
    if (!trimmedComment) {
      setErrors({ comment: 'Comment cannot be empty' });
      return;
    }

    if (trimmedComment.length > 5000) {
      setErrors({ comment: 'Comment must be at most 5000 characters' });
      return;
    }

    if (onAddComment) {
      onAddComment(trimmedComment);
      setNewComment("");
      setErrors({});
    }
  };

  const getUserName = (commentUser) => {
    if (!commentUser) return 'Unknown';
    const firstName = commentUser.firstName || commentUser.first_name || '';
    const lastName = commentUser.lastName || commentUser.last_name || '';
    const name = `${firstName} ${lastName}`.trim();
    return name || commentUser.email || 'Unknown';
  };

  const isCurrentUser = (commentUser) => {
    return user?.id && commentUser?.id && user.id === commentUser.id;
  };

  return (
    <div className="w-full">
      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-contentColor dark:text-contentColor-dark">
          <i className="icofont-comment text-4xl mb-2 opacity-50"></i>
          <p className="text-sm">No comments yet</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`flex gap-3 ${
                isCurrentUser(comment.user) ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {comment.user?.avatarUrl ? (
                  <img
                    src={comment.user.avatarUrl}
                    alt={getUserName(comment.user)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primaryColor/20 text-primaryColor flex items-center justify-center text-sm font-bold">
                    {(getUserName(comment.user)[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>

              {/* Comment Content */}
              <div className={`flex-1 ${isCurrentUser(comment.user) ? 'flex flex-col items-end' : ''}`}>
                <div
                  className={`inline-block p-3 rounded-md ${
                    isCurrentUser(comment.user)
                      ? 'bg-primaryColor text-whiteColor'
                      : 'bg-gray-100 dark:bg-gray-800 text-blackColor dark:text-blackColor-dark'
                  }`}
                >
                  {!isCurrentUser(comment.user) && (
                    <p className="text-xs font-semibold mb-1 opacity-80">
                      {getUserName(comment.user)}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{comment.comment}</p>
                </div>
                <p
                  className={`text-xs text-contentColor dark:text-contentColor-dark mt-1 ${
                    isCurrentUser(comment.user) ? 'text-right' : ''
                  }`}
                >
                  {comment.createdAt
                    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
                    : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      {canComment && (
        <form onSubmit={handleSubmit} className="mt-4">
          <div>
            <label
              htmlFor="task-comment-input"
              className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
            >
              Add a comment
            </label>
            <textarea
              id="task-comment-input"
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
                if (errors.comment) {
                  setErrors({ ...errors, comment: '' });
                }
              }}
              rows={4}
              placeholder="Write a comment..."
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor resize-none"
              disabled={isSubmitting}
            />
            {errors.comment && (
              <p className="text-xs text-red-500 mt-1">{errors.comment}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-contentColor dark:text-contentColor-dark">
                {newComment.length}/5000 characters
              </p>
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="px-4 py-2 text-sm font-medium text-whiteColor bg-primaryColor rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
