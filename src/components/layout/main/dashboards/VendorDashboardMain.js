import CounterVendor from "@/components/sections/sub-section/dashboards/CounterVendor";
import ChartDashboard from "@/components/shared/dashboards/ChartDashboard";
import CommentManagement from "@/components/sections/sub-section/dashboards/CommentManagement";

const VendorDashboardMain = () => {
  return (
    <>
      <CounterVendor />
      <ChartDashboard />
      <CommentManagement />
    </>
  );
};

export default VendorDashboardMain;

