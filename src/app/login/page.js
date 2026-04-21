import LoginMain from "@/components/layout/main/LoginMain";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import LoginGuard from "@/components/shared/guards/LoginGuard";

export const metadata = {
  title: "Login/Register | Edurock - Education LMS Template",
  description: "Login/Register | Edurock - Education LMS Template",
};
const Login = () => {
  return (
    <LoginGuard>
      <PageWrapper>
        <main>
          <LoginMain />
          <ThemeController />
        </main>
      </PageWrapper>
    </LoginGuard>
  );
};

export default Login;
