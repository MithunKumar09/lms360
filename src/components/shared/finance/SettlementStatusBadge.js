/**
 * Settlement Status Badge Component
 * 
 * Displays settlement status with appropriate styling
 */

"use client";

const SettlementStatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'processed':
        return {
          label: 'Processed',
          className: 'bg-greencolor text-white',
        };
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-yellow-500 text-white',
        };
      case 'failed':
        return {
          label: 'Failed',
          className: 'bg-red-500 text-white',
        };
      case 'reversed':
        return {
          label: 'Reversed',
          className: 'bg-orange-500 text-white',
        };
      default:
        return {
          label: status || 'Unknown',
          className: 'bg-gray-400 text-white',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
};

export default SettlementStatusBadge;

