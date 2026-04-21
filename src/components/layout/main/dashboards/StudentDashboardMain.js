//src/components/layout/main/dashboards/StudentDashboardMain.js
import CounterStudent from "@/components/sections/sub-section/dashboards/CounterStudent";
import StudentRegisteredEventsWorkshops from "@/components/sections/sub-section/dashboards/StudentRegisteredEventsWorkshops";
import StudentInsightsStatic from "@/components/sections/sub-section/dashboards/StudentInsightsStatic";
import React from "react";

const StudentDashboardMain = () => {
  return (
    <>
    <StudentInsightsStatic />
      <CounterStudent />
      <StudentRegisteredEventsWorkshops />
    </>
  );
};

export default StudentDashboardMain;
