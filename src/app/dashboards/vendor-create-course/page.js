import CreateCourseMain from "@/components/layout/main/CreateCourseMain";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Create Course | Vendor Dashboard | Edurock - Education LMS Template",
  description: "Create Course | Vendor Dashboard | Edurock - Education LMS Template",
};

const VendorCreateCourse = () => {
  return (
    <AuthGuard allowedRoles="vendor">
      <PageWrapper>
        <main>
          <CreateCourseMain isVendorMode={true} />
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default VendorCreateCourse;

