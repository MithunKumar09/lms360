import HeroReference from "@/components/sections/home-reference/HeroReference";
import HowToEnroll from "@/components/sections/home-reference/HowToEnroll";
import CoreProductsGrid from "@/components/sections/home-reference/CoreProductsGrid";
import BrowseCategories from "@/components/sections/home-reference/BrowseCategories";
import FeaturedCourses from "@/components/sections/home-reference/FeaturedCourses";
import StatsTrust from "@/components/sections/home-reference/StatsTrust";
import CommunityBanner from "@/components/sections/home-reference/CommunityBanner";
import FAQSplit from "@/components/sections/home-reference/FAQSplit";
import LatestArticles from "@/components/sections/home-reference/LatestArticles";
import PricingReference from "@/components/sections/home-reference/PricingReference";
import FooterCtaBand from "@/components/sections/home-reference/FooterCtaBand";
import React from "react";

export default function Home1() {
  return (
    <>
      <HeroReference />
      <HowToEnroll />
      <CoreProductsGrid />
      <BrowseCategories />
      <FeaturedCourses />
      <StatsTrust />
      <CommunityBanner />
      <FAQSplit />
      <LatestArticles />
      <PricingReference />
      <FooterCtaBand />
    </>
  );
}
