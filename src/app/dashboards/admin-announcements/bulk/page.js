import AnnouncementsBulkImportMain from "@/components/layout/main/announcements/AnnouncementsBulkImportMain.js";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  description: "Bulk Import Announcements | Admin",
};

export default function Admin_BulkAnnouncementsPage() {
	return (
		<PageWrapper>
			<main>
				<DsahboardWrapper>
					<DashboardContainer>
						<AnnouncementsBulkImportMain />
					</DashboardContainer>
				</DsahboardWrapper>
				<ThemeController />
			</main>
		</PageWrapper>
	);
}


