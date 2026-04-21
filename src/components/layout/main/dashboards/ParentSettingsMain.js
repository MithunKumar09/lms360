import SettingsTab from "@/components/shared/dashboards/SettingsTab";

// Parent settings uses the same SettingsTab component as student
// The component will automatically adapt based on user role
const ParentSettingsMain = () => {
  return <SettingsTab />;
};

export default ParentSettingsMain;
