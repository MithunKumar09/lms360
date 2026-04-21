"use client";

import { useEffect, useState } from "react";

/**
 * AnimatedProgressBar Component
 * 
 * Progress bar with snake animation effect:
 * - Smooth gradient fill
 * - Animated shimmer/snake effect
 * - Real-time progress updates
 * - Customizable colors
 */
const AnimatedProgressBar = ({ 
  progress = 0, 
  height = 12,
  showPercentage = true,
  gradientColors = ['#3b82f6', '#10b981'],
  className = '',
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Animate progress changes
  useEffect(() => {
    const targetProgress = Math.min(Math.max(progress, 0), 100);
    const duration = 800; // Animation duration in ms
    const startTime = Date.now();
    const startProgress = animatedProgress;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progressRatio, 3);
      const currentProgress = startProgress + (targetProgress - startProgress) * easeOut;
      
      setAnimatedProgress(currentProgress);

      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [progress]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Background Track */}
      <div
        className="w-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
        style={{ height: `${height}px` }}
      >
        {/* Progress Fill */}
        <div
          className="relative h-full rounded-full overflow-hidden transition-all duration-300"
          style={{ width: `${animatedProgress}%` }}
        >
          {/* Gradient Background */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
              boxShadow: `0 2px 8px rgba(59, 130, 246, 0.3)`,
            }}
          >
            {/* Snake/Shimmer Animation */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'snake-shimmer 2s ease-in-out infinite',
                transform: 'translateX(-100%)',
              }}
            />
          </div>

          {/* Glow Effect */}
          <div
            className="absolute inset-0 rounded-full opacity-50"
            style={{
              background: `radial-gradient(circle at center, ${gradientColors[0]} 0%, transparent 70%)`,
              filter: 'blur(4px)',
            }}
          />
        </div>
      </div>

      {/* Percentage Display */}
      {showPercentage && (
        <div className="absolute -bottom-5 right-0 text-xs font-semibold text-contentColor dark:text-contentColor-dark">
          {Math.round(animatedProgress)}%
        </div>
      )}
    </div>
  );
};

export default AnimatedProgressBar;
