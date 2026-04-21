/**
 * Finance Card Component
 * 
 * Reusable card component for displaying financial metrics
 */

"use client";

const FinanceCard = ({ title, value, subtitle, icon, trend, trendLabel, className = "" }) => {
  return (
    <div className={`bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px ${className}`}>
      <div className="flex items-start justify-between mb-15px">
        <div className="flex-1">
          <p className="text-14px text-contentColor dark:text-contentColor-dark mb-5px">
            {title}
          </p>
          <h3 className="text-24px md:text-28px font-bold text-blackColor dark:text-blackColor-dark">
            {value}
          </h3>
          {subtitle && (
            <p className="text-12px text-contentColor dark:text-contentColor-dark mt-5px">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-primaryColor text-32px">
            {icon}
          </div>
        )}
      </div>
      {trend !== undefined && trendLabel && (
        <div className={`flex items-center gap-5px text-12px ${trend >= 0 ? 'text-greencolor' : 'text-red-500'}`}>
          <i className={`icofont-arrow-${trend >= 0 ? 'up' : 'down'}`}></i>
          <span>{Math.abs(trend)}% {trendLabel}</span>
        </div>
      )}
    </div>
  );
};

export default FinanceCard;

