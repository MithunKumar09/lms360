import ProfileDetails from "@/components/shared/dashboards/ProfileDetails";
import React from "react";

// Parent profile uses the same ProfileDetails component as student
// The component will automatically adapt based on user role
const ParentProfileMain = () => {
  return <ProfileDetails />;
};

export default ParentProfileMain;
