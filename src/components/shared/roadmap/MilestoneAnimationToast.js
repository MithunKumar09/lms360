"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import finishingAnimation from "@/assets/lottie/finishinganimation.json";
import trophyBlue from "@/assets/lottie/trophyblue.json";
import trophyGold from "@/assets/lottie/Trophygold.json";
import { useRoadmap } from "@/hooks/api/useRoadmap";

// Lazy load Lottie for better performance
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * MilestoneAnimationToast Component
 * 
 * Displays Lottie animation toast on milestone completion:
 * - Different animations based on stamp type
 * - Auto-dismiss after animation
 * - Non-blocking overlay
 * - Smooth fade in/out
 * - Confetti effect for gold trophy
 */
const MilestoneAnimationToast = ({ 
  stampType = 'finishing', 
  milestoneNumber = 1,
  courseId,
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lottieError, setLottieError] = useState(false);
  
  const { refetch } = useRoadmap();

  // Load appropriate animation based on stamp type
  useEffect(() => {
    switch (stampType) {
      case 'trophy_gold':
        setAnimationData(trophyGold);
        setShowConfetti(true); // Show confetti for gold trophy
        break;
      case 'trophy_blue':
        setAnimationData(trophyBlue);
        break;
      case 'finishing':
      default:
        setAnimationData(finishingAnimation);
        break;
    }
    
    // Trigger fade-in
    setTimeout(() => setIsVisible(true), 100);
  }, [stampType]);

  // Auto-dismiss and refresh roadmap
  useEffect(() => {
    if (animationComplete) {
      // Refresh roadmap data to show updated stamps
      refetch();
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 500); // Wait for fade-out
      }, 2000); // Show for 2 seconds after animation

      return () => clearTimeout(timer);
    }
  }, [animationComplete, onClose, refetch]);

  // Handle animation complete
  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  // Fallback if Lottie fails to load
  if (lottieError || !animationData) {
    return (
      <div
        className={`
          fixed inset-0 z-50
          flex items-center justify-center
          pointer-events-none
          transition-opacity duration-500
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className={`
            relative
            bg-white dark:bg-gray-800
            rounded-2xl
            shadow-2xl
            p-8
            max-w-md w-full mx-4
            pointer-events-auto
            transform transition-all duration-500
            ${isVisible 
              ? 'scale-100 translate-y-0' 
              : 'scale-95 translate-y-4'
            }
          `}
        >
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 500);
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 mb-4 flex items-center justify-center bg-green-100 dark:bg-green-900 rounded-full">
              <svg className="w-16 h-16 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
              🎉 Milestone Completed!
            </h3>
            <p className="text-contentColor dark:text-contentColor-dark">
              {getMessage()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You&apos;ve earned a {stampType.replace('_', ' ')} stamp!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get toast message based on stamp type
  const getMessage = () => {
    switch (stampType) {
      case 'trophy_gold':
        return `🎉 Congratulations! You've earned a Gold Trophy for completing Milestone ${milestoneNumber}!`;
      case 'trophy_blue':
        return `🌟 Great job! You've earned a Blue Trophy for completing Milestone ${milestoneNumber}!`;
      case 'finishing':
      default:
        return `✨ Well done! You've completed Milestone ${milestoneNumber}!`;
    }
  };

  return (
    <>
      {/* Confetti Effect (for gold trophy) */}
      {showConfetti && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <ConfettiEffect />
        </div>
      )}

      {/* Toast Overlay */}
      <div
        className={`
          fixed inset-0 z-50
          flex items-center justify-center
          pointer-events-none
          transition-opacity duration-500
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Toast Container */}
        <div
          className={`
            relative
            bg-white dark:bg-gray-800
            rounded-2xl
            shadow-2xl
            p-8
            max-w-md w-full mx-4
            pointer-events-auto
            transform transition-all duration-500
            ${isVisible 
              ? 'scale-100 translate-y-0' 
              : 'scale-95 translate-y-4'
            }
          `}
          style={{
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)',
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 500);
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Animation Container */}
          <div className="flex flex-col items-center justify-center">
            {/* Lottie Animation */}
            <div className="w-64 h-64 mb-4">
              <Lottie
                animationData={animationData}
                loop={false}
                autoplay={true}
                onComplete={handleAnimationComplete}
                onError={() => setLottieError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            </div>

            {/* Message */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
                🎉 Milestone Completed!
              </h3>
              <p className="text-contentColor dark:text-contentColor-dark mb-1">
                {getMessage()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You&apos;ve earned a {stampType.replace('_', ' ')} stamp!
              </p>
            </div>

            {/* Progress Indicator (if animation is playing) */}
            {!animationComplete && (
              <div className="mt-4 w-full max-w-xs">
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primaryColor to-green-500 rounded-full"
                    style={{
                      animation: 'progress-fill 3s ease-out forwards',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Confetti Effect Component
const ConfettiEffect = () => {
  return (
    <div className="confetti-container">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 4)],
          }}
        />
      ))}
    </div>
  );
};

export default MilestoneAnimationToast;
