import EventDetailsMain from "@/components/layout/main/EventDetailsMain";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Event Details | Edurock - Education LMS Template",
  description: "Event Details | Edurock - Education LMS Template",
};

const EventDetailsPage = () => {
  return (
    <PageWrapper>
      <main>
        <EventDetailsMain />
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default EventDetailsPage;
