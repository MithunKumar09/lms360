"use client";

import { useState } from "react";
import { useInstructorRequestsList } from "@/hooks/api/useInstructorRequests";
import InstructorRequestList from "@/components/shared/instructor-requests/InstructorRequestList";
import InstructorRequestHistory from "@/components/shared/instructor-requests/InstructorRequestHistory";
import InstructorRequestReports from "@/components/shared/instructor-requests/InstructorRequestReports";

const AdminInstructorRequestsMain = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [filters, setFilters] = useState({
    status: "pending",
    search: "",
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch requests based on active tab
  const { data: requestsData, isLoading } = useInstructorRequestsList(
    {
      status: activeTab === "pending" ? "pending" : activeTab === "history" ? undefined : undefined,
      page,
      limit,
    },
    { enabled: activeTab === "pending" || activeTab === "history" }
  );

  const tabs = [
    { id: "pending", label: "Pending Requests", count: requestsData?.pagination?.total || 0 },
    { id: "history", label: "History", count: null },
    { id: "reports", label: "Reports", count: null },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
          Instructor Requests
        </h1>
        <p className="text-contentColor dark:text-contentColor-dark">
          Review and manage instructor promotion requests from users
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-borderColor dark:border-borderColor-dark mb-6">
        <div className="flex flex-wrap gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
                setFilters({ ...filters, status: tab.id === "pending" ? "pending" : "" });
              }}
              className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primaryColor text-primaryColor"
                  : "border-transparent text-contentColor dark:text-contentColor-dark hover:text-primaryColor"
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primaryColor/10 text-primaryColor rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "pending" && (
          <InstructorRequestList
            requests={requestsData?.requests || []}
            isLoading={isLoading}
            pagination={requestsData?.pagination}
            page={page}
            setPage={setPage}
            filters={filters}
            setFilters={setFilters}
          />
        )}
        {activeTab === "history" && (
          <InstructorRequestHistory
            page={page}
            setPage={setPage}
            filters={filters}
            setFilters={setFilters}
          />
        )}
        {activeTab === "reports" && <InstructorRequestReports />}
      </div>
    </div>
  );
};

export default AdminInstructorRequestsMain;

