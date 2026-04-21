"use client";

/**
 * ProgressBadge Component
 * 
 * Displays a circular progress badge with:
 * - Large percentage display
 * - Gradient background based on progress level
 * - Smooth animations
 * - Professional styling
 */
const ProgressBadge = ({ progress = 0, size = 'lg' }) => {
  const progressPercentage = Math.round(progress);

  // Get gradient colors based on progress level
  const getGradientClass = () => {
    if (progress >= 75) return 'from-green-500 to-green-600';
    if (progress >= 50) return 'from-yellow-500 to-green-500';
    if (progress >= 25) return 'from-orange-500 to-yellow-500';
    return 'from-red-500 to-orange-500';
  };

  // Get size classes
  const sizeClasses = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-20 h-20 text-xl',
    lg: 'w-24 h-24 text-2xl',
  };

  return (
    <div className={`
      ${sizeClasses[size]}
      rounded-full
      bg-gradient-to-br ${getGradientClass()}
      flex items-center justify-center
      font-bold text-white
      shadow-lg
      transition-all duration-300
      hover:scale-105
      relative overflow-hidden
    `}>
      {/* Shine Effect */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
          animation: 'shine 2s ease-in-out infinite',
        }}
      />
      
      {/* Percentage Text */}
      <span className="relative z-10">{progressPercentage}%</span>
      
      {/* Glow Effect */}
      <div
        className="absolute inset-0 rounded-full opacity-50 blur-md"
        style={{
          background: `linear-gradient(135deg, ${progress >= 75 ? '#10b981' : progress >= 50 ? '#fbbf24' : progress >= 25 ? '#f59e0b' : '#ef4444'} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
};

export default ProgressBadge;
