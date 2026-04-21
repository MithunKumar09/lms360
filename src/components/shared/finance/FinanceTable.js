/**
 * Finance Table Component
 * 
 * Reusable table component for financial data with sorting and pagination
 */

"use client";

import { useState, useMemo } from "react";
import Pagination from "@/components/shared/others/Pagination";

const FinanceTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No data available",
  onRowClick,
  onSort,
  sortColumn = "",
  sortOrder = "desc",
  pagination = null,
  onPageChange,
  itemsPerPage = 20,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (columnKey) => {
    if (onSort) {
      const newOrder = sortColumn === columnKey && sortOrder === "asc" ? "desc" : "asc";
      onSort(columnKey, newOrder);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (onPageChange) {
      onPageChange(page);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-50px">
        <div className="inline-block animate-spin rounded-full h-32px w-32px border-b-2 border-primaryColor"></div>
        <p className="text-contentColor dark:text-contentColor-dark mt-10px">Loading...</p>
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="text-center py-50px">
        <p className="text-contentColor dark:text-contentColor-dark">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-lightGrey5 dark:bg-darkdeep1 text-blackColor dark:text-blackColor-dark">
          <tr>
            {Array.isArray(columns) && columns
              .filter(column => column && typeof column === 'object' && column.key)
              .map((column) => (
              <th
                key={column.key}
                className={`px-15px py-10px text-14px font-semibold ${
                  column.sortable ? "cursor-pointer hover:bg-lightGrey6 dark:hover:bg-darkdeep2" : ""
                }`}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-5px">
                  {column.label || ''}
                  {column.sortable && sortColumn === column.key && (
                    <i
                      className={`icofont-arrow-${sortOrder === "asc" ? "up" : "down"} text-primaryColor`}
                    ></i>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-14px text-contentColor dark:text-contentColor-dark">
          {data
            .filter(row => row && typeof row === 'object')
            .map((row, index) => (
            <tr
              key={row.id || index}
              className={`border-b border-borderColor dark:border-borderColor-dark ${
                onRowClick ? "cursor-pointer hover:bg-lightGrey5 dark:hover:bg-darkdeep1" : ""
              }`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {Array.isArray(columns) && columns
                .filter(column => column && typeof column === 'object' && column.key)
                .map((column) => (
                <td key={column.key} className="px-15px py-10px">
                  {column.render ? column.render(row[column.key], row) : (row[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="mt-20px">
          <Pagination
            currentPage={pagination.page || currentPage}
            pages={Array.from({ length: pagination.pages || 1 }, (_, i) => i + 1)}
            skip={(pagination.page - 1) * itemsPerPage}
            limit={itemsPerPage}
            totalItems={pagination.total || 0}
            handlePagesnation={(page) => handlePageChange(page)}
          />
        </div>
      )}
    </div>
  );
};

export default FinanceTable;

