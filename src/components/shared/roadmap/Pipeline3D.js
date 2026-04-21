"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pipeline3D Component
 * 
 * Displays a 3D pipeline visualization with:
 * - CSS 3D transforms for depth
 * - Animated progress fill
 * - Milestone markers positioned along pipeline
 * - Smooth transitions and hover effects
 */
const Pipeline3D = ({ progress, milestones = [], totalMilestones = 4 }) => {
  const pipelineRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  // Animate progress fill
  useEffect(() => {
    const targetWidth = Math.min(progress, 100);
    const duration = 1000; // 1 second animation
    const startTime = Date.now();
    const startWidth = progressWidth;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progressRatio, 3);
      const currentWidth = startWidth + (targetWidth - startWidth) * easeOut;
      
      setProgressWidth(currentWidth);

      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [progress]);

  // Calculate milestone positions (evenly distributed along pipeline)
  const getMilestonePosition = (milestoneNumber) => {
    if (totalMilestones === 0) return 0;
    if (totalMilestones === 1) return 50;
    return ((milestoneNumber - 1) / (totalMilestones - 1)) * 100;
  };

  return (
    <div className="pipeline-3d-container relative w-full">
      {/* Mobile: Simplified pipeline */}
      <div className="block md:hidden">
        <div className="relative h-8 w-full">
          <div className="relative h-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primaryColor to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressWidth}%` }}
            />
            {/* Simple milestone dots */}
            {milestones.map((milestone) => {
              const position = getMilestonePosition(milestone.number);
              const isCompleted = milestone.completed && milestone.stampAwarded;
              return (
                <div
                  key={milestone.number}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  style={{ left: `${position}%` }}
                >
                  <div
                    className={`
                      w-4 h-4 rounded-full border-2
                      ${isCompleted 
                        ? 'bg-yellow-400 border-yellow-600' 
                        : 'bg-gray-400 border-gray-500'
                      }
                    `}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tablet & Desktop: Full 3D pipeline */}
      <div className="hidden md:block">
        <div className="relative w-full h-24">
          {/* 3D Pipeline Track */}
          <div
            ref={pipelineRef}
            className="pipeline-3d-track relative w-full h-16"
            style={{
              perspective: '1000px',
              transformStyle: 'preserve-3d',
              transform: 'translateZ(0)', // GPU acceleration
              willChange: 'transform', // Optimize for animations
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Pipeline Base (3D Tube) */}
            <div
              className="pipeline-base absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
                boxShadow: `
                  inset 0 2px 4px rgba(0, 0, 0, 0.3),
                  0 4px 8px rgba(0, 0, 0, 0.2),
                  0 0 0 1px rgba(255, 255, 255, 0.1)
                `,
                transform: isHovered 
                  ? 'perspective(1000px) rotateX(5deg) scale(1.02)' 
                  : 'perspective(1000px) rotateX(0deg) scale(1)',
                transition: 'transform 0.3s ease-out',
              }}
            >
              {/* Pipeline Inner Glow */}
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                }}
              />
            </div>

            {/* Progress Fill (3D Effect) */}
            <div
              className="pipeline-progress absolute left-0 top-0 h-full rounded-full overflow-hidden"
              style={{
                width: `${progressWidth}%`,
                transition: 'width 0.3s ease-out',
              }}
            >
              {/* Gradient Fill */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 50%, #3b82f6 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'gradient-shift 3s ease infinite',
                  boxShadow: `
                    inset 0 -2px 4px rgba(255, 255, 255, 0.2),
                    0 2px 8px rgba(59, 130, 246, 0.4),
                    0 0 12px rgba(59, 130, 246, 0.3)
                  `,
                  transform: 'perspective(1000px) rotateX(-2deg)',
                }}
              >
                {/* Shine Effect */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
                    animation: 'shine 2s ease-in-out infinite',
                  }}
                />
              </div>
            </div>

            {/* Milestone Markers */}
            {milestones.map((milestone) => {
              const position = getMilestonePosition(milestone.number);
              const isCompleted = milestone.completed && milestone.stampAwarded;
              const isInProgress = progressWidth >= position && !isCompleted;

              return (
                <div
                  key={milestone.number}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  style={{
                    left: `${position}%`,
                    transform: `translate(-50%, -50%) ${isHovered ? 'scale(1.1)' : 'scale(1)'}`,
                    transition: 'transform 0.3s ease-out',
                  }}
                >
                  {/* Milestone Marker Circle */}
                  <div
                    className={`
                      w-8 h-8 rounded-full
                      flex items-center justify-center
                      border-2
                      transition-all duration-300
                      ${isCompleted 
                        ? 'bg-yellow-400 border-yellow-600 shadow-lg shadow-yellow-500/50' 
                        : isInProgress
                        ? 'bg-blue-400 border-blue-600 shadow-md shadow-blue-500/30 animate-pulse'
                        : 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500'
                      }
                    `}
                    style={{
                      transform: isCompleted 
                        ? 'perspective(1000px) rotateY(15deg) scale(1.1)' 
                        : 'perspective(1000px) rotateY(0deg) scale(1)',
                      boxShadow: isCompleted
                        ? '0 4px 12px rgba(234, 179, 8, 0.5), 0 0 8px rgba(234, 179, 8, 0.3)'
                        : '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    {/* Milestone Number */}
                    <span
                      className={`
                        text-xs font-bold
                        ${isCompleted ? 'text-yellow-900' : 'text-gray-700 dark:text-gray-300'}
                      `}
                    >
                      {milestone.number}
                    </span>
                  </div>

                  {/* Connection Line (if not last milestone) */}
                  {milestone.number < totalMilestones && (
                    <div
                      className={`
                        absolute top-1/2 left-full w-4 h-0.5
                        ${isCompleted ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'}
                        transition-colors duration-300
                      `}
                      style={{
                        transform: 'translateY(-50%)',
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Progress Percentage Display */}
            <div
              className="absolute -bottom-6 left-0 right-0 text-center"
            >
              <span className="text-xs font-semibold text-contentColor dark:text-contentColor-dark">
                {Math.round(progressWidth)}% Complete
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pipeline3D;
