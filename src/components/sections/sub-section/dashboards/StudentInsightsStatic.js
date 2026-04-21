"use client";
import React from "react";

/* ---------- Small Helpers ---------- */

const StatCard = ({ title, value, sub, trend, positive = true }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <span
        className={`text-xs font-semibold ${
          positive ? "text-green-600" : "text-orange-500"
        }`}
      >
        {trend}
      </span>
    </div>
    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    <p className="text-xs text-gray-500 mt-1">{sub}</p>
    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 w-[60%]" />
    </div>
  </div>
);

/* ---------- Main Component ---------- */

const StudentInsightsStatic = () => {
  return (
    <section className="mb-10 space-y-6">

      {/* ================= TOP KPI ROW ================= */}
{/* ================= TOP KPI ROW (PIXEL FIXED) ================= */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

  {/* Completion Rate */}
  <div className="bg-white border border-gray-200 rounded-[14px] p-5">
    <div className="flex justify-between items-center">
      <span className="text-[12px] font-medium text-gray-800">
        Completion Rate
      </span>
      <div className="flex items-center gap-1 text-[12px] font-semibold text-green-600">
        <span className="w-4 h-4 rounded-sm bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
          ↗
        </span>
        +8%
      </div>
    </div>

    <div className="mt-3 text-[24px] font-bold text-gray-900">40%</div>

    <p className="mt-1 text-[10px] text-gray-500">
      Momentum matters. Keep finishing
    </p>

    <div className="mt-4 h-[4px] bg-[#E9E7F5] rounded-full">
      <div className="h-full w-[40%] bg-[#7B61FF] rounded-full" />
    </div>
  </div>

  {/* Weekly Stats */}
  <div className="bg-white border border-gray-200 rounded-[14px] p-5">
    <div className="flex justify-between items-center">
      <span className="text-[13px] font-medium text-gray-800">
        Weekly Stats
      </span>
      <div className="flex items-center gap-1 text-[12px] font-semibold text-green-600">
        <span className="w-4 h-4 rounded-sm bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
          ↗
        </span>
        +3h
      </div>
    </div>

    <div className="mt-3 text-[24px] font-bold text-gray-900">
      12h/20h <span className="text-[10px] font-medium text-gray-400">(Best 22h)</span>
    </div>

    <p className="mt-1 text-[12px] text-gray-500">
      8 more hours to stay on track
    </p>

    <div className="mt-4 h-[4px] bg-[#E9E7F5] rounded-full">
      <div className="h-full w-[60%] bg-[#7B61FF] rounded-full" />
    </div>
  </div>

  {/* Consistency */}
  <div className="bg-white border border-gray-200 rounded-[14px] p-5 flex justify-between">
    <div>
      <span className="text-[13px] font-medium text-gray-800">
        Consistency
      </span>
      <div className="mt-3 text-[24px] font-bold text-gray-900">78%</div>
      <p className="mt-1 text-[10px] text-gray-500">
        You are more consistent than most
      </p>
    </div>

    <div className="relative w-[44px] h-[44px]">
      <svg width="44" height="44">
        <circle cx="22" cy="22" r="18" stroke="#E5E7EB" strokeWidth="3" fill="none" />
        <circle
          cx="22"
          cy="22"
          r="18"
          stroke="#7B61FF"
          strokeWidth="3"
          fill="none"
          strokeDasharray="113"
          strokeDashoffset="25"
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-[10px] font-medium text-gray-600 leading-tight">
        <span>5/7</span>
        <span>Days</span>
      </span>
    </div>
  </div>

  {/* Goal Alignment */}
  <div className="bg-white border border-gray-200 rounded-[14px] p-5 flex justify-between">
    <div>
      <span className="text-[12px] font-medium text-gray-800">
        Goal Alignment
      </span>
      <div className="mt-3 text-[14px] font-semibold text-gray-900">
        Gap: <span className="text-orange-600">-6%</span> off track
      </div>
      <p className="mt-1 text-[10px] text-gray-500">
        Add 3–4 hours extra this week to realign
      </p>
    </div>

    <div className="relative w-[44px] h-[44px]">
      <svg width="44" height="44">
        <circle cx="22" cy="22" r="18" stroke="#E5E7EB" strokeWidth="3" fill="none" />
        <circle
          cx="22"
          cy="22"
          r="18"
          stroke="#F59E0B"
          strokeWidth="3"
          fill="none"
          strokeDasharray="113"
          strokeDashoffset="45"
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-gray-700">
        60%
      </span>
    </div>
  </div>

</div>



      {/* ================= MIDDLE GRID ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

{/* Daily Study Hours */}
<div className="bg-white border border-gray-200 rounded-[14px] p-5">

  {/* Header */}
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs">
        🕒
      </span>
      <h3 className="font-semibold text-gray-900">
        Daily Study Hours
      </h3>
    </div>

    <span className="text-[13px] font-semibold text-green-600">
      80% Achieved
    </span>
  </div>

  {/* Date Navigation */}
  <div className="flex justify-center items-center gap-4 mt-3 text-[13px] text-gray-500">
    <button className="px-2">‹</button>
    <span>Dec 25–31 (2025)</span>
    <button className="px-2">›</button>
  </div>

  {/* Chart Area */}
  <div className="mt-6 flex">

    {/* Y-axis (subtle) */}
    <div className="flex flex-col justify-between h-[220px] pr-3 text-[11px] text-gray-400">
      <span>10</span>
      <span>8</span>
      <span>6</span>
      <span>4</span>
      <span>2</span>
      <span>0</span>
    </div>

    {/* Bars */}
    <div className="flex items-end gap-[16px] h-[220px] border-b border-[#E9E7F5]">
      {[9, 6, 8, 7, 9, 8, 9].map((v, i) => (
        <div key={i} className="flex flex-col items-center h-full justify-end">
<div
  style={{ height: `${(v / 10) * 100}%` }}
  className="w-[38px] rounded-md bg-gradient-to-t from-[#E9E7F5] to-[#7B61FF]"
/>
          <span className="mt-2 text-[12px] text-gray-500">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}
          </span>
        </div>
      ))}
    </div>
  </div>
</div>

{/* ================= Batch Progress ================= */}
<div className="bg-white border border-gray-200 rounded-[18px] p-6 space-y-6">

  {/* Header */}
  <div className="flex justify-between items-start">
    <div>
      <h3 className="text-[18px] font-semibold text-gray-900">
        Batch Progress
      </h3>
      <p className="mt-2 text-[15px] text-gray-900 font-medium">
        Current Batch 8: Professional
      </p>
      <p className="mt-1 text-[14px] text-gray-600">
        Progress to next Batch 9
      </p>
    </div>

    {/* Badge */}
    <div className="w-[72px] h-[72px] rounded-full overflow-hidden shadow-sm">
      {/* replace src with your badge image */}
      <img
        src="/batch-badge.png"
        alt="Batch Badge"
        className="w-full h-full object-cover"
      />
    </div>
  </div>

  {/* Progress Bar */}
  <div className="h-[12px] bg-gray-200 rounded-full overflow-hidden">
    <div className="h-full w-[82%] bg-gradient-to-r from-[#7B61FF] via-[#5A3FFF] to-[#2E1065] rounded-full" />
  </div>

  {/* Stats */}
  <div className="flex justify-between items-center text-[14px] text-gray-800">
    <div className="flex items-center gap-2">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span>122 / 150</span>
    </div>

    <div className="flex items-center gap-2">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span>8,000 / 9,000 Exp</span>
    </div>
  </div>

  {/* Career Progress */}
  <div className="pt-4">
    <h4 className="text-[16px] font-semibold text-gray-900 mb-4">
      Career & Job Progress
    </h4>

    <div className="flex items-start gap-4 overflow-hidden">

      {/* Timeline */}
      <div className="relative flex-1 max-w-[calc(100%-96px)]">

{/* Connector background */}
<div className="absolute top-[14px] left-0 right-0 h-[3px] bg-gray-200 rounded-full" />

{/* Connector progress */}
<div
  className="absolute top-[14px] left-0 h-[3px] bg-gradient-to-r from-[#7B61FF] to-[#5A3FFF] rounded-full"
  style={{ width: "44%" }} // 5/10 certificates → visual match
/>


        <div className="relative flex justify-between">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex flex-col items-center w-[32px]">

              {/* Certificate */}
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <rect
                  x="4"
                  y="3"
                  width="16"
                  height="14"
                  rx="2"
                  stroke={i < 5 ? "#7B61FF" : "#9CA3AF"}
                  strokeWidth="2"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="2"
                  stroke={i < 5 ? "#7B61FF" : "#9CA3AF"}
                  strokeWidth="2"
                />
              </svg>

              {i >= 5 && (
                <svg className="mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="9" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                  <path d="M8 11V8a4 4 0 118 0v3" stroke="#9CA3AF" strokeWidth="2"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Internship */}
      <div className="w-[110px] flex flex-col items-center text-center text-[14px] text-gray-800">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 7V5h8v2" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span className="mt-2 font-semibold">
          Internship<br />Access
        </span>
      </div>
    </div>
  </div>

  {/* Footer */}
  <p className="text-[14px] text-gray-700">
    <span className="font-semibold">5/10 Certificates Earned</span>{" "}
    <span className="text-gray-500">
      (Complete all 10 certificate to get access of internship)
    </span>
  </p>
</div>



      </div>

{/* ================= BOTTOM GRID ================= */}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

  {/* ================= Assignments & Deadlines ================= */}
  <div className="xl:col-span-2 bg-white border border-gray-200 rounded-[18px] p-6">
    <h3 className="text-[16px] font-semibold text-gray-900 mb-5 flex items-center gap-2">
      <span className="text-purple-600">🎯</span>
      Assignments & Deadlines
    </h3>

    <div className="bg-[#F8F7FC] rounded-[16px] p-5 grid grid-cols-1 md:grid-cols-2 gap-5">

      {/* Assignment Card */}
      <div className="bg-[#FBFAFF] rounded-[14px] p-5 border border-gray-200">
        <div className="flex justify-between items-start mb-3">
          <p className="font-semibold text-gray-900">
            Course: React Mastery
          </p>
          <span className="text-[12px] px-3 py-1 rounded-full bg-purple-100 text-purple-600 font-medium">
            High Priority
          </span>
        </div>

        <p className="text-[14px] text-gray-600 mb-4">
          Task: Implement custom hooks (useFetch, useDebounce)
        </p>

        <div className="flex justify-between items-center text-[13px] mb-5">
          <span className="flex items-center gap-1 text-gray-500">
            ⏱ ~60 minutes
          </span>
<span className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-[13px] font-medium">
  ⏳ Deadline in 10 days
</span>

        </div>

        <button className="w-full h-[40px] rounded-[10px]
 bg-gradient-to-r from-[#7B61FF] to-[#5A3FFF] text-white font-semibold">
          Start Now
        </button>
      </div>

      {/* Quiz Card */}
      <div className="bg-white rounded-[14px] p-5 border border-gray-200">
        <p className="font-semibold text-gray-900 mb-2">
          JavaScript Fundamentals Quiz
        </p>

        <p className="text-[14px] text-gray-600 mb-4">
          Format: 20 MCQs + 2 code snippets
        </p>

        <div className="flex justify-between items-center text-[13px] mb-5">
          <span className="flex items-center gap-1 text-gray-500">
            ⏱ ~30 minutes
          </span>
          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-600 font-medium">
            ⏳ Deadline in 10 days
          </span>
        </div>

        <button className="w-full h-[40px] rounded-[10px] bg-gradient-to-r from-[#7B61FF] to-[#5A3FFF] text-white font-semibold">
          Take Quiz
        </button>
      </div>
    </div>
  </div>

  {/* ================= Performance Summary ================= */}
  <div className="bg-white border border-gray-200 rounded-[18px] p-6">
    <h3 className="text-[16px] font-semibold text-gray-900 mb-5 flex items-center gap-2">
      <span className="text-purple-600">📊</span>
      Performance Summary
    </h3>

<div className="grid grid-cols-2 gap-4">

  <div className="bg-gray-100 rounded-[14px] p-4 flex justify-between items-center">
    <span className="text-[13px] text-gray-700">Courses Enrolled</span>
    <span className="text-[14px] font-semibold text-gray-900">8</span>
  </div>

  <div className="bg-purple-100 rounded-[14px] p-4 flex justify-between items-center">
    <span className="text-[13px] text-purple-700">Avg Progress</span>
    <span className="text-[14px] font-semibold text-purple-700">40%</span>
  </div>

  <div className="bg-green-100 rounded-[14px] p-4 flex justify-between items-center">
    <span className="text-[13px] text-green-700">On Track</span>
    <span className="text-[14px] font-semibold text-green-700">6</span>
  </div>

  <div className="rounded-[14px] p-4 flex justify-between items-center">
    <span className="text-[13px] text-gray-700">Off Track</span>
    <span className="text-[14px] font-semibold text-gray-900">2</span>
  </div>

</div>

  </div>
</div>

    </section>
  );
};

export default StudentInsightsStatic;
