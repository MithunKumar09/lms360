import SidebarDashboard from "../dashboards/SidebarDashboard";

const DashboardContainer = ({ children }) => {
  return (
    <section className="bg-bodyBg dark:bg-bodyBg-dark">
      <div className="container-fluid-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-15px lg:gap-30px pt-15px lg:pt-30px pb-20 lg:pb-100px">
          <SidebarDashboard />
          <div className="lg:col-start-4 lg:col-span-9 pb-20 lg:pb-0">{children}</div>
        </div>
      </div>
    </section>
  );
};

export default DashboardContainer;
