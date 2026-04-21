"use client";

import { useState } from "react";
import { useParentStudentAchievements } from "@/hooks/api/useParent";
import ParentStudentSelector from "./ParentStudentSelector";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";
import useTab from "@/hooks/useTab";
import TabContentWrapper from "@/components/shared/wrappers/TabContentWrapper";
import TabButtonSecondary from "@/components/shared/buttons/TabButtonSecondary";

/**
 * ParentAchievements Component
 * 
 * Displays achievements & certificates:
 * - Badges earned display
 * - Certificate gallery
 * - Reward collection view
 * - Recognition awards
 * - Special achievements
 * - Timeline of accomplishments
 */
const ParentAchievements = () => {
  const { currentIdx, handleTabClick } = useTab();
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const { data, isLoading, error } = useParentStudentAchievements({
    studentId: selectedStudentId,
  });

  // Show student selector if no student selected
  if (!selectedStudentId) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Achievements & Certificates
          </h2>
        </div>
        <div className="mb-6">
          <ParentStudentSelector
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            showLabel={true}
          />
        </div>
        <div className="text-center py-10">
          <p className="text-contentColor dark:text-contentColor-dark">
            Please select a child to view their achievements and certificates.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Achievements & Certificates
            </h2>
            <div className="w-64">
              <ParentStudentSelector
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                showLabel={false}
                placeholder="Select child..."
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark p-6">
              <SkeletonLoader count={3} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
              Achievements & Certificates
            </h2>
            <div className="w-64">
              <ParentStudentSelector
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                showLabel={false}
                placeholder="Select child..."
              />
            </div>
          </div>
        </div>
        <div className="text-center py-10">
          <p className="text-red-500">{error?.message || 'Failed to load achievements data'}</p>
        </div>
      </div>
    );
  }

  const achievements = data?.achievements || {};
  const badges = achievements.badges || [];
  const certificates = achievements.certificates || [];
  const rewards = achievements.rewards || [];
  const timeline = achievements.timeline || [];

  const tabButtons = [
    {
      name: "BADGES",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-15px lg:gap-30px">
          {badges.length > 0 ? (
            badges.map((badge, idx) => (
              <div
                key={idx}
                className="p-6 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark text-center transition-shadow hover:shadow-lg"
              >
                <div className="text-6xl mb-4">{badge.icon || "🏅"}</div>
                <h3 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                  {badge.name}
                </h3>
                <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3">
                  {badge.description}
                </p>
                <p className="text-xs text-contentColor dark:text-contentColor-dark">
                  Earned: {new Date(badge.earnedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <NoData message="No badges earned yet." />
            </div>
          )}
        </div>
      ),
    },
    {
      name: "CERTIFICATES",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.length > 0 ? (
            certificates.map((certificate, idx) => (
              <div
                key={idx}
                className="p-6 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark transition-shadow hover:shadow-lg"
              >
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">📜</div>
                  <h3 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                    {certificate.name}
                  </h3>
                  <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3">
                    {certificate.courseName || certificate.description}
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-contentColor dark:text-contentColor-dark">
                    Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
                  </p>
                  {certificate.verificationCode && (
                    <p className="text-xs text-contentColor dark:text-contentColor-dark">
                      Code: {certificate.verificationCode}
                    </p>
                  )}
                  {certificate.url && (
                    <a
                      href={certificate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-4 text-center px-4 py-2 bg-primaryColor text-whiteColor rounded hover:bg-primaryColor/90 transition-colors"
                    >
                      View Certificate
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <NoData message="No certificates earned yet." />
            </div>
          )}
        </div>
      ),
    },
    {
      name: "REWARDS",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-15px lg:gap-30px">
          {rewards.length > 0 ? (
            rewards.map((reward, idx) => (
              <div
                key={idx}
                className="p-6 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark transition-shadow hover:shadow-lg"
              >
                <div className="text-5xl mb-4">{reward.icon || "🎁"}</div>
                <h3 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                  {reward.name}
                </h3>
                <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3">
                  {reward.description}
                </p>
                <p className="text-xs text-contentColor dark:text-contentColor-dark">
                  Earned: {new Date(reward.earnedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <NoData message="No rewards collected yet." />
            </div>
          )}
        </div>
      ),
    },
    {
      name: "TIMELINE",
      content: (
        <div className="space-y-4">
          {timeline.length > 0 ? (
            timeline.map((item, idx) => (
              <div
                key={idx}
                className="relative pl-8 pb-8 border-l-2 border-borderColor dark:border-borderColor-dark"
              >
                <div className="absolute -left-2 top-0 w-4 h-4 bg-primaryColor rounded-full"></div>
                <div className="p-4 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg2 shadow-accordion-dark">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-blackColor dark:text-blackColor-dark">
                      {item.title}
                    </h3>
                    <span className="text-xs text-contentColor dark:text-contentColor-dark">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-contentColor dark:text-contentColor-dark">
                    {item.description}
                  </p>
                  {item.type && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-primaryColor/10 text-primaryColor">
                      {item.type}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <NoData message="No achievements timeline available." />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Achievements & Certificates
          </h2>
          <div className="w-full md:w-64 flex-shrink-0">
            <ParentStudentSelector
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              showLabel={false}
              placeholder="Select child..."
            />
          </div>
        </div>
      </div>

      <div className="tab">
        <div className="tab-links flex flex-wrap mb-10px lg:mb-50px rounded gap-10px justify-center">
          {tabButtons?.map(({ name }, idx) => (
            <TabButtonSecondary
              key={idx}
              name={name}
              idx={idx}
              currentIdx={currentIdx}
              handleTabClick={handleTabClick}
              button={"small"}
            />
          ))}
        </div>
        <div>
          {tabButtons?.map(({ content }, idx) => (
            <TabContentWrapper
              key={idx}
              isShow={idx === currentIdx ? true : false}
            >
              {content}
            </TabContentWrapper>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParentAchievements;
