//src/app/dashboards/student-leaderboard/page.js
"use client";
import React, { useState } from "react";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";   import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";   
import LeaderboardHeader from "./components/LeaderboardHeader";
import LeaderboardSearch from "./components/LeaderboardSearch";
import LeaderboardTabs from "./components/LeaderboardTabs";
import LeaderboardPodium from "./components/LeaderboardPodium";
import LeaderboardList from "./components/LeaderboardList";
import HowItWorksModal from "./components/HowItWorksModal";

const LeaderboardPage = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
        <AuthGuard allowedRoles="student">
          <PageWrapper>
      {/* FULL WIDTH CONTAINER */}
<section className="w-full px-4 py-8">
  <div
    className="
      mx-auto
      w-full
      max-w-full
      sm:max-w-[420px]
      md:max-w-[720px]
      lg:max-w-[1100px]
      xl:max-w-[1400px]

      transition-[max-width]
      bg-white
            dark:bg-gradient-to-br 
      dark:from-[#020617] 
      dark:via-[#020617] 
      dark:to-[#020617] 
      rounded-2xl 
      duration-300
      ease-in-out
    "
  >
          <LeaderboardHeader />
          <LeaderboardSearch />
          <LeaderboardTabs onHowItWorks={() => setShowHowItWorks(true)} />
          <LeaderboardPodium />
          <LeaderboardList />
        </div>
      </section>

      {showHowItWorks && (
        <HowItWorksModal onClose={() => setShowHowItWorks(false)} />
      )}
          </PageWrapper>
        </AuthGuard>
  );
};

export default LeaderboardPage;
