import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";
import Testimonials3 from "@/components/sections/testimonials/Testimonials3";
import React from "react";

const InstructorDetailsMain = ({ instructor, links, roles, socialLinks, rating }) => {
  return (
    <>
      <HeroPrimary path={"Instructor page"} title={"Instructor page"} />
      <Testimonials3 
        instructor={instructor} 
        links={links} 
        roles={roles}
        socialLinks={socialLinks}
        rating={rating}
        isInsTructorDetails={true} 
      />
    </>
  );
};

export default InstructorDetailsMain;
