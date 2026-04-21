/**
 * Reviews Table Skeleton
 * 
 * Loading skeleton for reviews table
 */

const ReviewsTableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left">
        <thead className="text-sm md:text-base text-blackColor dark:text-blackColor-dark bg-lightGrey5 dark:bg-whiteColor-dark leading-1.8 md:leading-1.8">
          <tr>
            <th className="px-5px py-10px md:px-5">Student</th>
            <th className="px-5px py-10px md:px-5">Date</th>
            <th className="px-5px py-10px md:px-5">Feedback</th>
          </tr>
        </thead>
        <tbody className="text-size-13 md:text-base text-contentColor dark:text-contentColor-dark font-normal">
          {Array.from({ length: rows }).map((_, index) => (
            <tr
              key={index}
              className={`leading-1.8 md:leading-1.8 ${
                index % 2 === 1 ? 'bg-lightGrey5 dark:bg-whiteColor-dark' : ''
              }`}
            >
              <th className="px-5px py-10px md:px-5 font-normal">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
              <td className="px-5px py-10px md:px-5">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </td>
              <td className="px-5px py-10px md:px-5">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReviewsTableSkeleton;

