import useIsTrue from "@/hooks/useIsTrue";
import Link from "next/link";
import React from "react";
import useAuth from "@/hooks/useAuth";
import NotificationBell from "./NotificationBell";

const LoginButton = () => {
  const isHome2Dark = useIsTrue("/home-2-dark");
  const { isAuthenticated } = useAuth();
  
  // When authenticated, show notification bell component
  if (isAuthenticated) {
    return (
      <div className="mr-[7px] 2xl:mr-15px">
        <NotificationBell variant="default" />
      </div>
    );
  }
  
  // When not authenticated, show person icon that navigates to login
  return (
    <Link
      href="/login"
      className="text-size-12 2xl:text-size-15 px-15px py-2 text-blackColor hover:text-whiteColor bg-whiteColor block hover:bg-primaryColor border border-borderColor1 rounded-standard font-semibold mr-[7px] 2xl:mr-15px dark:text-blackColor-dark dark:bg-whiteColor-dark dark:hover:bg-primaryColor dark:hover:text-whiteColor dark:hover:border-primaryColor"
    >
      {isHome2Dark ? "Login" : <i className="icofont-user-alt-5"></i>}
    </Link>
  );
};

export default LoginButton;
