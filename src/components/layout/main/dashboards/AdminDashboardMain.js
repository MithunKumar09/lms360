import AdminFeedbacks from "@/components/sections/sub-section/dashboards/AdminFeedbacks";
import CounterAdminForAdmin from "@/components/sections/sub-section/dashboards/CounterAdminForAdmin";
import ChartDashboard from "@/components/shared/dashboards/ChartDashboard";
import CourseInquiries from "@/components/sections/sub-section/dashboards/CourseInquiries";
import CommentManagement from "@/components/sections/sub-section/dashboards/CommentManagement";
import AdminFinanceSummary from "@/components/sections/sub-section/dashboards/AdminFinanceSummary";

const AdminDashboardMain = () => {
  return (
    <>
      <CounterAdminForAdmin />
      <AdminFinanceSummary />
      <ChartDashboard />
      <AdminFeedbacks />
      <CourseInquiries />
      <CommentManagement />
    </>
  );
};

export default AdminDashboardMain;
