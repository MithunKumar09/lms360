/**
 * QuizCard Component
 * 
 * Modern, reusable quiz card with cover image, meta info, badges, and role-based action buttons
 * Figma-style design with hover effects and responsive layout
 */

'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiPlay,
  FiCopy,
  FiFileText,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiHelpCircle,
  FiBookOpen,
} from 'react-icons/fi';
import QuizStatusBadge from './badges/QuizStatusBadge.js';
import QuizTypeBadge from './badges/QuizTypeBadge.js';
import AttemptProgressBadge from './badges/AttemptProgressBadge.js';
import IconButton from './buttons/IconButton.js';
import OutlineButton from './buttons/OutlineButton.js';
import PrimaryButton from './buttons/PrimaryButton.js';
import ReminderDropdownButton from '@/components/reminders/ReminderDropdownButton.js';

const QuizCard = ({
  quiz,
  role = 'instructor',
  context = 'manage',
  onEdit,
  onDelete,
  onView,
  onAttempt,
  onPreview,
  onDuplicate,
  onViewAttempts,
  onGenerateReport,
  onViewReport,
  onReminderSet,
  showProgress = false,
  attemptCount = 0,
  progress = null,
  className = '',
}) => {
  // Extract quiz data
  const {
    id,
    title,
    description,
    coverImageUrl,
    totalMarks,
    passingMarks,
    timeLimitMinutes,
    maxAttempts,
    status,
    quizType,
    questionCount,
    courseTitle,
    orgName,
    startDate,
    endDate,
  } = quiz || {};

  // Determine if quiz is upcoming
  const isUpcoming = startDate && new Date(startDate) > new Date();
  const displayStatus = isUpcoming ? 'upcoming' : status || 'draft';

  // Get cover image or placeholder
  const coverImage = coverImageUrl || '/images/quiz-placeholder.svg';
  const hasCoverImage = coverImageUrl && coverImageUrl !== '/images/quiz-placeholder.svg';

  // Format time limit
  const timeLimitText = timeLimitMinutes
    ? `${timeLimitMinutes} min`
    : 'Unlimited';

  // Format description (truncate)
  const truncatedDescription = description
    ? description.length > 100
      ? `${description.substring(0, 100)}...`
      : description
    : 'No description available';

  // Role-based action buttons
  const actionButtons = useMemo(() => {
    const buttons = [];

    if (role === 'instructor') {
      if (onEdit) {
        buttons.push(
          <IconButton
            key="edit"
            icon={FiEdit}
            onClick={() => onEdit(id)}
            variant="primary"
            size="sm"
            tooltip="Edit Quiz"
            ariaLabel="Edit Quiz"
          />
        );
      }
      if (onPreview) {
        buttons.push(
          <IconButton
            key="preview"
            icon={FiEye}
            onClick={() => onPreview(id)}
            variant="secondary"
            size="sm"
            tooltip="Preview Quiz"
            ariaLabel="Preview Quiz"
          />
        );
      }
      if (onDelete) {
        buttons.push(
          <IconButton
            key="delete"
            icon={FiTrash2}
            onClick={() => onDelete(id, title)}
            variant="danger"
            size="sm"
            tooltip="Delete Quiz"
            ariaLabel="Delete Quiz"
          />
        );
      }
      if (onViewAttempts) {
        buttons.push(
          <IconButton
            key="attempts"
            icon={FiFileText}
            onClick={() => onViewAttempts(id)}
            variant="secondary"
            size="sm"
            tooltip="View Attempts"
            ariaLabel="View Attempts"
          />
        );
      }
    } else if (role === 'admin') {
      if (onEdit) {
        buttons.push(
          <IconButton
            key="edit"
            icon={FiEdit}
            onClick={() => onEdit(id)}
            variant="primary"
            size="sm"
            tooltip="Edit Quiz"
            ariaLabel="Edit Quiz"
          />
        );
      }
      if (onPreview) {
        buttons.push(
          <IconButton
            key="preview"
            icon={FiEye}
            onClick={() => onPreview(id)}
            variant="secondary"
            size="sm"
            tooltip="Preview Quiz"
            ariaLabel="Preview Quiz"
          />
        );
      }
      if (onDelete) {
        buttons.push(
          <IconButton
            key="delete"
            icon={FiTrash2}
            onClick={() => onDelete(id, title)}
            variant="danger"
            size="sm"
            tooltip="Delete Quiz"
            ariaLabel="Delete Quiz"
          />
        );
      }
      if (onDuplicate) {
        buttons.push(
          <IconButton
            key="duplicate"
            icon={FiCopy}
            onClick={() => onDuplicate(id)}
            variant="secondary"
            size="sm"
            tooltip="Duplicate Quiz"
            ariaLabel="Duplicate Quiz"
          />
        );
      }
      if (onViewAttempts) {
        buttons.push(
          <IconButton
            key="attempts"
            icon={FiFileText}
            onClick={() => onViewAttempts(id)}
            variant="secondary"
            size="sm"
            tooltip="View Attempts"
            ariaLabel="View Attempts"
          />
        );
      }
      if (onGenerateReport) {
        buttons.push(
          <IconButton
            key="report"
            icon={FiBarChart2}
            onClick={() => onGenerateReport(id)}
            variant="secondary"
            size="sm"
            tooltip="Generate Report"
            ariaLabel="Generate Report"
          />
        );
      }
    } else if (role === 'superadmin') {
      // Same as admin
      if (onEdit) {
        buttons.push(
          <IconButton
            key="edit"
            icon={FiEdit}
            onClick={() => onEdit(id)}
            variant="primary"
            size="sm"
            tooltip="Edit Quiz"
            ariaLabel="Edit Quiz"
          />
        );
      }
      if (onPreview) {
        buttons.push(
          <IconButton
            key="preview"
            icon={FiEye}
            onClick={() => onPreview(id)}
            variant="secondary"
            size="sm"
            tooltip="Preview Quiz"
            ariaLabel="Preview Quiz"
          />
        );
      }
      if (onDelete) {
        buttons.push(
          <IconButton
            key="delete"
            icon={FiTrash2}
            onClick={() => onDelete(id, title)}
            variant="danger"
            size="sm"
            tooltip="Delete Quiz"
            ariaLabel="Delete Quiz"
          />
        );
      }
      if (onDuplicate) {
        buttons.push(
          <IconButton
            key="duplicate"
            icon={FiCopy}
            onClick={() => onDuplicate(id)}
            variant="secondary"
            size="sm"
            tooltip="Duplicate Quiz"
            ariaLabel="Duplicate Quiz"
          />
        );
      }
      if (onViewAttempts) {
        buttons.push(
          <IconButton
            key="attempts"
            icon={FiFileText}
            onClick={() => onViewAttempts(id)}
            variant="secondary"
            size="sm"
            tooltip="View Attempts"
            ariaLabel="View Attempts"
          />
        );
      }
      if (onGenerateReport) {
        buttons.push(
          <IconButton
            key="report"
            icon={FiBarChart2}
            onClick={() => onGenerateReport(id)}
            variant="secondary"
            size="sm"
            tooltip="Generate Report"
            ariaLabel="Generate Report"
          />
        );
      }
    } else if (role === 'student' && context === 'student-view') {
      if (onAttempt && displayStatus === 'published') {
        buttons.push(
          <PrimaryButton
            key="attempt"
            onClick={() => onAttempt(id)}
            icon={FiPlay}
            size="sm"
            fullWidth
          >
            {attemptCount > 0 ? 'Retake Quiz' : 'Start Quiz'}
          </PrimaryButton>
        );
      }
      if (onView && progress && progress.isCompleted) {
        buttons.push(
          <OutlineButton
            key="view"
            onClick={() => onView(id)}
            variant="primary"
            size="sm"
            fullWidth
          >
            View Results
          </OutlineButton>
        );
      }
      if (onViewReport && progress && progress.isCompleted) {
        buttons.push(
          <OutlineButton
            key="view-report"
            onClick={() => onViewReport(id)}
            variant="secondary"
            size="sm"
            fullWidth
            icon={FiBarChart2}
          >
            View Report
          </OutlineButton>
        );
      }
    }

return buttons;
}, [
  role,
  context,
  id,
  title,
  displayStatus,
  attemptCount,
  progress,
  quiz,
  maxAttempts,
  onEdit,
  onDelete,
  onView,
  onAttempt,
  onPreview,
  onDuplicate,
  onViewAttempts,
  onGenerateReport,
  onViewReport,
  onReminderSet,
]);

  return (
    <div
      className={`
        group bg-whiteColor dark:bg-whiteColor-dark
        rounded-xl shadow-lg hover:shadow-2xl
        overflow-hidden
        transition-all duration-300
        hover:scale-[1.02]
        flex flex-col
        ${className}
      `}
    >
      {/* Cover Image */}
      <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {hasCoverImage ? (
          <Image
            src={coverImage}
            alt={title || 'Quiz'}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03] will-change-transform"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primaryColor/20 to-secondaryColor/20">
            <FiBookOpen className="w-16 h-16 text-primaryColor/50" />
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          <QuizStatusBadge status={displayStatus} />
          {quizType && <QuizTypeBadge quizType={quizType} />}
        </div>

        {/* Organization Badge (Superadmin only) */}
        {role === 'superadmin' && orgName && (
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2 py-1 bg-black/50 text-white text-xs font-semibold rounded">
              {orgName}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2 line-clamp-2">
          {title || 'Untitled Quiz'}
        </h3>

        {/* Description */}
        <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2 flex-shrink-0">
          {truncatedDescription}
        </p>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 mb-3 text-xs text-contentColor dark:text-contentColor-dark">
          <div className="flex items-center gap-1">
            <FiClock className="w-4 h-4" />
            <span>{timeLimitText}</span>
          </div>
          <div className="flex items-center gap-1">
            <FiHelpCircle className="w-4 h-4" />
            <span>{questionCount || 0} questions</span>
          </div>
          <div className="flex items-center gap-1">
            <FiCheckCircle className="w-4 h-4" />
            <span>{maxAttempts || 'Unlimited'} attempts</span>
          </div>
        </div>

        {/* Course Title */}
        {courseTitle && (
          <div className="mb-3">
            <span className="text-xs text-contentColor dark:text-contentColor-dark">
              Course: <span className="font-semibold">{courseTitle}</span>
            </span>
          </div>
        )}

        {/* Progress Bar (Student view only) */}
        {showProgress && context === 'student-view' && progress && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-contentColor dark:text-contentColor-dark">
                Progress
              </span>
              <span className="text-xs text-contentColor dark:text-contentColor-dark">
                {progress.percentage || 0}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primaryColor transition-all duration-300"
                style={{ width: `${progress.percentage || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Attempt Progress Badge (Student view) */}
        {context === 'student-view' && attemptCount > 0 && (
          <div className="mb-3">
            <AttemptProgressBadge
              currentAttempt={attemptCount}
              maxAttempts={maxAttempts}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-3 border-t border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between gap-2">
            {role === 'student' && context === 'student-view' ? (
              <div className="w-full space-y-2">
                {actionButtons}
                {displayStatus === 'published' && onReminderSet && (
                  <div className="flex items-center justify-end mt-2">
<ReminderDropdownButton
  quizId={id}
  quizTitle={title}
  startDate={startDate}
  onReminderSet={onReminderSet}
/>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {actionButtons}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuizCard);

