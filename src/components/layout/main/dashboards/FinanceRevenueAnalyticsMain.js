/**
 * Finance Revenue Analytics Main Component
 * 
 * Displays revenue analytics with trends, breakdowns by course, and vendor revenue
 */

"use client";

import { useState } from "react";
import { useRevenue } from "@/hooks/api/useFinance.js";

const FinanceRevenueAnalyticsMain = () => {
  const [period, setPeriod] = useState("daily"); // daily, weekly, monthly
  const [groupBy, setGroupBy] = useState("period"); // period, course, vendor
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading } = useRevenue({
    filters: {
      period,
      groupBy,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    },
  });

  const revenueData = data?.data || [];
  const summary = data?.summary || {};

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Revenue Analytics
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                Analyze revenue trends, course performance, and vendor earnings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-15px mb-30px">
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Total Revenue
            </div>
            <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
              {formatCurrency(summary.totalRevenue || 0)}
            </div>
          </div>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Total Orders
            </div>
            <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
              {summary.totalOrders || 0}
            </div>
          </div>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Total Customers
            </div>
            <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
              {summary.totalCustomers || 0}
            </div>
          </div>
          <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px">
            <div className="text-12px text-contentColor dark:text-contentColor-dark mb-5px">
              Avg Order Value
            </div>
            <div className="text-24px font-bold text-blackColor dark:text-blackColor-dark">
              {formatCurrency(summary.averageOrderValue || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark p-20px md:p-30px mb-30px">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-15px">
          <div>
            <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            >
              <option value="period">Time Period</option>
              <option value="course">By Course</option>
              <option value="vendor">By Vendor</option>
            </select>
          </div>
          {groupBy === "period" && (
            <div>
              <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
          <div>
            <label className="block text-14px font-medium text-blackColor dark:text-blackColor-dark mb-8px">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-15px py-10px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            />
          </div>
        </div>
      </div>

      {/* Revenue Data Table */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark overflow-hidden">
        <div className="p-20px md:p-30px">
          <h2 className="text-20px font-bold text-blackColor dark:text-blackColor-dark mb-20px">
            {groupBy === "period" && "Revenue by Time Period"}
            {groupBy === "course" && "Revenue by Course"}
            {groupBy === "vendor" && "Revenue by Vendor"}
          </h2>

          {isLoading ? (
            <div className="text-center py-50px">
              <div className="inline-block animate-spin rounded-full h-32px w-32px border-b-2 border-primaryColor"></div>
              <p className="mt-15px text-contentColor dark:text-contentColor-dark">Loading revenue data...</p>
            </div>
          ) : revenueData.length === 0 ? (
            <div className="text-center py-50px">
              <p className="text-contentColor dark:text-contentColor-dark">No revenue data found for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-borderColor dark:border-borderColor-dark">
                    {groupBy === "period" && (
                      <>
                        <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Period
                        </th>
                        <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Revenue
                        </th>
                        <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Orders
                        </th>
                        <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Customers
                        </th>
                      </>
                    )}
                    {groupBy === "course" && (
                      <>
                        <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Course
                        </th>
                        <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Revenue
                        </th>
                        <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Enrollments
                        </th>
                        <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Students
                        </th>
                      </>
                    )}
                    {groupBy === "vendor" && (
                      <>
                        <th className="text-left py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Vendor
                        </th>
                        <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Revenue
                        </th>
                        <th className="text-right py-15px px-15px text-14px font-semibold text-blackColor dark:text-blackColor-dark">
                          Orders
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1"
                    >
                      {groupBy === "period" && (
                        <>
                          <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark">
                            {new Date(item.period).toLocaleDateString()}
                          </td>
                          <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark text-right font-semibold">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-15px px-15px text-14px text-contentColor dark:text-contentColor-dark text-right">
                            {item.orderCount}
                          </td>
                          <td className="py-15px px-15px text-14px text-contentColor dark:text-contentColor-dark text-right">
                            {item.customerCount}
                          </td>
                        </>
                      )}
                      {groupBy === "course" && (
                        <>
                          <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark">
                            {item.courseTitle || `Course ${item.courseId}`}
                          </td>
                          <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark text-right font-semibold">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-15px px-15px text-14px text-contentColor dark:text-contentColor-dark text-right">
                            {item.enrollmentCount}
                          </td>
                          <td className="py-15px px-15px text-14px text-contentColor dark:text-contentColor-dark text-right">
                            {item.studentCount}
                          </td>
                        </>
                      )}
                      {groupBy === "vendor" && (
                        <>
                          <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark">
                            {item.vendorName || item.vendorEmail || `Vendor ${item.vendorId}`}
                          </td>
                          <td className="py-15px px-15px text-14px text-blackColor dark:text-blackColor-dark text-right font-semibold">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-15px px-15px text-14px text-contentColor dark:text-contentColor-dark text-right">
                            {item.orderCount}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceRevenueAnalyticsMain;

