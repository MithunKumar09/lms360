/**
 * Settings Table Component
 * 
 * Reusable table component for displaying course settings data with pagination
 */

"use client";

import { useMemo } from "react";
import Pagination from "./Pagination";

const SettingsTable = ({
  data = [],
  columns = [],
  onEdit,
  onDelete,
  onToggle,
  loading = false,
  emptyMessage = "No data available",
  itemsPerPage = 10,
  currentPage = 1,
  onPageChange,
  showPagination = true,
}) => {
  // Calculate paginated data
  const paginatedData = useMemo(() => {
    if (!showPagination || itemsPerPage <= 0) {
      return data;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage, showPagination]);

  if (loading) {
    return (
      <div className="text-center py-10">
        <span className="text-contentColor dark:text-contentColor-dark">Loading...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <span className="text-contentColor dark:text-contentColor-dark">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-lightGrey5 dark:bg-whiteColor-dark border-b-2 border-borderColor dark:border-borderColor-dark">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-5px py-10px md:px-5 font-normal text-blackColor dark:text-blackColor-dark"
                >
                  {col.label}
                </th>
              ))}
              <th className="px-5px py-10px md:px-5 font-normal text-blackColor dark:text-blackColor-dark">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              className={`
                leading-1.8 md:leading-1.8
                ${rowIdx % 2 === 0
                  ? "bg-whiteColor dark:bg-whiteColor-dark"
                  : "bg-lightGrey5 dark:bg-whiteColor-dark"
                }
              `}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-5px py-10px md:px-5">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              <td className="px-5px py-10px md:px-5">
                <div className="flex gap-2">
                  {onToggle && (
                    <button
                      onClick={() => onToggle(row.id)}
                      className={`
                        flex items-center gap-1 text-xs font-bold px-2 py-1 rounded
                        ${row.status === 1
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                        }
                        hover:text-primaryColor dark:hover:text-primaryColor
                      `}
                      title={row.status === 1 ? "Deactivate" : "Activate"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {row.status === 1 ? (
                          <path d="M18 6L6 18M6 6l12 12" />
                        ) : (
                          <path d="M20 6L9 17l-5-5" />
                        )}
                      </svg>
                      {row.status === 1 ? "Active" : "Inactive"}
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="flex items-center gap-1 text-xs font-bold text-blackColor dark:text-blackColor-dark hover:text-primaryColor dark:hover:text-primaryColor px-2 py-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(row.id)}
                      className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-1"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && data.length > itemsPerPage && (
        <Pagination
          totalItems={data.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={onPageChange}
          showInfo={true}
        />
      )}
    </>
  );
};

export default SettingsTable;

