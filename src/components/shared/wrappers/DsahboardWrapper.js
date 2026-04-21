"use client";

import HeroDashboard from "@/components/sections/hero-banners/HeroDashboard";
import AnnouncementMarquee from "@/components/shared/announcements/AnnouncementMarquee";

const DsahboardWrapper = ({ children }) => {
  return (
    <>
      <HeroDashboard />
      <AnnouncementMarquee />
      {children}
    </>
  );
};

export default DsahboardWrapper;
