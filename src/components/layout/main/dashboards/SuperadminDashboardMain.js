import CounterAdmin from "@/components/sections/sub-section/dashboards/CounterAdmin";
import ChartDashboard from "@/components/shared/dashboards/ChartDashboard";
import CourseInquiries from "@/components/sections/sub-section/dashboards/CourseInquiries";

const SuperadminDashboardMain = () => {
  return (
    <>
      <CounterAdmin />
      <ChartDashboard />
      <CourseInquiries />
    </>
  );
};

export default SuperadminDashboardMain;


