import AnnouncementFormMain from "@/components/layout/main/announcements/AnnouncementFormMain.js";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  description: "Create Announcement | Vendor",
};

export default function Vendor_NewAnnouncementPage() {
	return (
		<PageWrapper>
			<main>
				<DsahboardWrapper>
					<DashboardContainer>
						<AnnouncementFormMain mode="create" />
					</DashboardContainer>
				</DsahboardWrapper>
				<ThemeController />
			</main>
		</PageWrapper>
	);
}


