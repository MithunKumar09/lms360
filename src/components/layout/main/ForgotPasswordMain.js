import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";
import ForgotPasswordSection from "@/components/sections/auth/ForgotPasswordSection";

const ForgotPasswordMain = () => {
  return (
    <>
      <HeroPrimary
        path={"Forgot Password"}
        title={"Forgot Password"}
      />
      <ForgotPasswordSection />
    </>
  );
};

export default ForgotPasswordMain;