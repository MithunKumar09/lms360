"use client";

import EventAnalytics from "@/components/sections/sub-section/dashboards/EventAnalytics";
import CertificateAnalytics from "@/components/sections/sub-section/dashboards/CertificateAnalytics";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import TabButtonSecondary from "@/components/shared/buttons/TabButtonSecondary";
import TabContentWrapper from "@/components/shared/wrappers/TabContentWrapper";
import useTab from "@/hooks/useTab";

export default function BrandAnalyticsMain() {
  const { currentIdx, handleTabClick } = useTab();
  const tabButtons = [
    {
      name: "EVENT ANALYTICS",
      content: <EventAnalytics />,
    },
    {
      name: "CERTIFICATE ANALYTICS",
      content: <CertificateAnalytics />,
    },
  ];

  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Analytics & Insights</HeadingDashboard>
        
        <div className="flex flex-wrap mb-10px lg:mb-50px rounded gap-10px">
          {tabButtons?.map(({ name }, idx) => (
            <TabButtonSecondary
              key={idx}
              name={name}
              currentIdx={currentIdx}
              idx={idx}
              handleTabClick={handleTabClick}
              button={"small"}
            />
          ))}
        </div>
        
        <div>
          {tabButtons?.map(({ content }, idx) => (
            <TabContentWrapper
              key={idx}
              isShow={currentIdx === idx ? true : false}
            >
              {content}
            </TabContentWrapper>
          ))}
        </div>
      </div>
    </div>
  );
}

