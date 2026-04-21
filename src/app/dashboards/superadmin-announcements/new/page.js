import AnnouncementFormMain from "@/components/layout/main/announcements/AnnouncementFormMain.js";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";

export const metadata = {
  description: "Create Announcement | Superadmin",
};

export default function Superadmin_NewAnnouncementPage() {
	return (
		<SuperadminGuard>
			<AuthGuard allowedRoles="superadmin" requireMfa={true}>
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
			</AuthGuard>
		</SuperadminGuard>
	);
}


