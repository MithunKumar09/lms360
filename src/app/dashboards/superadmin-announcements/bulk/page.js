import AnnouncementsBulkImportMain from "@/components/layout/main/announcements/AnnouncementsBulkImportMain.js";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";

export const metadata = {
  description: "Bulk Import Announcements | Superadmin",
};

export default function Superadmin_BulkAnnouncementsPage() {
	return (
		<SuperadminGuard>
			<AuthGuard allowedRoles="superadmin" requireMfa={true}>
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
			</AuthGuard>
		</SuperadminGuard>
	);
}


