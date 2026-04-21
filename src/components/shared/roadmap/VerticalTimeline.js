"use client";

import { useEffect, useState } from "react";

/**
 * VerticalTimeline Component
 * 
 * Displays a vertical timeline with:
 * - Vertical progress line with gradient fill
 * - Milestone nodes positioned along timeline
 * - Active milestone with pulse animation
 * - Completed milestones with stamp icons
 * - Smooth progress fill animation
 * - Responsive design (horizontal on mobile)
 */
const VerticalTimeline = ({ 
  progress = 0, 
  milestones = [], 
  totalMilestones = 4,
  onMilestoneClick 
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Animate progress fill
  useEffect(() => {
    const targetProgress = Math.min(Math.max(progress, 0), 100);
    const duration = 1000;
    const startTime = Date.now();
    const startProgress = animatedProgress;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - progressRatio, 3);
      const currentProgress = startProgress + (targetProgress - startProgress) * easeOut;
      
      setAnimatedProgress(currentProgress);

      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [progress]);

  // Calculate milestone positions (evenly distributed along timeline)
  const getMilestonePosition = (milestoneNumber) => {
    if (totalMilestones === 0) return 0;
    if (totalMilestones === 1) return 50;
    return ((milestoneNumber - 1) / (totalMilestones - 1)) * 100;
  };

  // Determine if milestone is active (current progress point)
  const isMilestoneActive = (milestoneNumber) => {
    const position = getMilestonePosition(milestoneNumber);
    const nextPosition = milestoneNumber < totalMilestones 
      ? getMilestonePosition(milestoneNumber + 1)
      : 100;
    return animatedProgress >= position && animatedProgress < nextPosition;
  };

  // Determine if milestone is reached (progress has passed this milestone)
  const isMilestoneReached = (milestoneNumber) => {
    const position = getMilestonePosition(milestoneNumber);
    // Add a small threshold (2%) to account for rounding and ensure milestone fills when reached
    return animatedProgress >= position - 2;
  };

  // Get progress gradient colors based on progress level
  const getProgressGradient = () => {
    if (progress >= 75) return 'from-green-500 to-green-600';
    if (progress >= 50) return 'from-yellow-500 to-green-500';
    if (progress >= 25) return 'from-orange-500 to-yellow-500';
    return 'from-red-500 to-orange-500';
  };

  return (
    <div className="roadmap-timeline-container">
      {/* Mobile: Horizontal Timeline */}
      <div className="block md:hidden mb-4">
        <div className="relative h-2 w-full">
          {/* Progress Line */}
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getProgressGradient()} rounded-full transition-all duration-500`}
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
          
          {/* Milestone Dots */}
          {milestones.map((milestone) => {
            const position = getMilestonePosition(milestone.number);
            const isCompleted = milestone.completed && milestone.stampAwarded;
            const isActive = isMilestoneActive(milestone.number);
            const isReached = isMilestoneReached(milestone.number);
            
            return (
              <div
                key={milestone.number}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: `${position}%` }}
              >
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 transition-all duration-300
                    ${isCompleted 
                      ? 'bg-yellow-400 border-yellow-600 shadow-lg' 
                      : isReached
                      ? 'bg-green-500 border-green-600 shadow-md'
                      : 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500'
                    }
                    ${isActive && !isCompleted ? 'animate-pulse' : ''}
                  `}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Vertical Timeline */}
      <div className="hidden md:block timeline-vertical" style={{ minHeight: '240px' }}>
        {/* Progress Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 right-0 bg-gradient-to-b ${getProgressGradient()} rounded-full transition-all duration-500`}
            style={{ 
              height: `${animatedProgress}%`,
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
            }}
          >
            {/* Shimmer Effect */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
                backgroundSize: '100% 200%',
                animation: 'snake-shimmer 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* Milestone Nodes */}
        {milestones.map((milestone) => {
          const position = getMilestonePosition(milestone.number);
          const isCompleted = milestone.completed && milestone.stampAwarded;
          const isActive = isMilestoneActive(milestone.number);
          const isReached = isMilestoneReached(milestone.number);
          
          return (
            <TimelineNode
              key={milestone.number}
              milestone={milestone}
              position={position}
              isCompleted={isCompleted}
              isActive={isActive}
              isReached={isReached}
              onClick={() => onMilestoneClick?.(milestone.number)}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * TimelineNode Component
 * 
 * Individual milestone node in the timeline
 */
const TimelineNode = ({ milestone, position, isCompleted, isActive, isReached, onClick }) => {
  const { number, stampType } = milestone;

  // Get stamp icon based on type
  const getStampIcon = () => {
    if (!isCompleted) return null;
    
    switch (stampType) {
      case 'trophy_gold':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'trophy_blue':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'finishing':
      default:
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-10 transition-all duration-300"
      style={{ top: `${position}%` }}
    >
      <button
        onClick={onClick}
        disabled={!isCompleted}
        className={`
          timeline-node
          w-10 h-10 rounded-full
          flex items-center justify-center
          border-2 transition-all duration-300
          ${isCompleted 
            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-600 shadow-lg shadow-yellow-500/50 cursor-pointer hover:scale-110' 
            : isReached
            ? 'bg-green-500 border-green-600 shadow-md shadow-green-500/30 cursor-default'
            : 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500 cursor-default opacity-60'
          }
          ${isActive && !isCompleted ? 'animate-pulse-glow' : ''}
        `}
      >
        {isCompleted ? (
          <div className="relative">
            {getStampIcon()}
            {/* Number badge */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-700 rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">{number}</span>
            </div>
          </div>
        ) : (
          <span className={`text-xs font-bold ${isReached ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {number}
          </span>
        )}
      </button>
    </div>
  );
};

export default VerticalTimeline;
