import { redirect } from 'next/navigation';

export const metadata = {
  title: "Mentor Dashboard | Edurock - Education LMS Template",
  description: "Mentor Dashboard | Edurock - Education LMS Template",
};

/**
 * Legacy alumni-dashboard route - redirects to mentor-dashboard
 * This maintains backward compatibility for any existing links
 */
const Alumni_Dashboard = () => {
  redirect('/dashboards/mentor-dashboard');
};

export default Alumni_Dashboard;


