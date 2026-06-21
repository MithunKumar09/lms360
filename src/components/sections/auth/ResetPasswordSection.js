"use client";

import Image from "next/image";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/sections/auth/ResetPasswordForm";
import shapImage2 from "@/assets/images/education/hero_shape2.png";
import shapImage3 from "@/assets/images/education/hero_shape3.png";
import shapImage4 from "@/assets/images/education/hero_shape4.png";
import shapImage5 from "@/assets/images/education/hero_shape5.png";

const ResetPasswordSection = () => {
  return (
    <section className="relative">
      <div className="container py-100px">
        <div className="md:w-2/3 mx-auto">
          <div className="shadow-container bg-whiteColor dark:bg-whiteColor-dark pt-10px px-5 pb-10 md:p-50px md:pt-30px rounded-5px">
            {/* ResetPasswordForm reads the ?token= query via useSearchParams,
                which must sit inside a Suspense boundary in the App Router. */}
            <Suspense
              fallback={
                <div className="text-center py-10 text-contentColor dark:text-contentColor-dark">
                  Loading...
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Animated background shapes — matches ForgotPasswordSection.js */}
      <div>
        <Image
          loading="lazy"
          className="absolute right-[14%] top-[30%] animate-move-var"
          src={shapImage2}
          alt="Shape"
        />
        <Image
          loading="lazy"
          className="absolute left-[5%] top-1/2 animate-move-hor"
          src={shapImage3}
          alt="Shape"
        />
        <Image
          loading="lazy"
          className="absolute left-1/2 bottom-[60px] animate-spin-slow"
          src={shapImage4}
          alt="Shape"
        />
        <Image
          loading="lazy"
          className="absolute left-1/2 top-10 animate-spin-slow"
          src={shapImage5}
          alt="Shape"
        />
      </div>
    </section>
  );
};

export default ResetPasswordSection;
