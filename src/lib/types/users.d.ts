// Draft shared types for Users feature (server echo)

export type RoleCode = 'superadmin' | 'admin' | 'instructor' | 'student' | 'vendor' | 'parent' | 'alumni';
export type MFAType = 'none' | 'totp' | 'email_otp';
export type UserStatus = 'active' | 'suspended';

export interface BaseUserIdentity {
	email: string;
	first_name?: string;
	last_name?: string;
	avatar_url?: string | null;
}

export interface BaseSecurity {
	mfa_required?: boolean;
	mfa_method?: MFAType;
	must_reset_password?: boolean;
}

export interface UserScopeStudent {
	role: 'student';
	org_id?: string; // superadmin only
	cohort_id: string;
	section_id?: string | null;
	roll_no?: string | null;
	program_node_id?: string | null;
}

export interface UserScopeInstructor {
	role: 'instructor';
	org_id?: string; // superadmin only
	cohort_ids?: string[];
	offering_ids?: string[];
}

export interface UserScopeParent {
	role: 'parent';
	org_id?: string; // superadmin only
	linked_student_ids: string[];
}

export interface UserScopeAdmin {
	role: 'admin';
	org_id?: string; // superadmin only
}

export interface UserScopeVendor {
	role: 'vendor';
	org_id?: string; // superadmin only
	vendor_category: string;
	company_name?: string;
	gstin?: string;
}

export interface UserScopeAlumni {
	role: 'alumni';
	org_id?: string; // superadmin only
	graduation_year: number;
	program_node_id?: string | null;
}

export type UserScope =
	| UserScopeStudent
	| UserScopeInstructor
	| UserScopeParent
	| UserScopeAdmin
	| UserScopeVendor
	| UserScopeAlumni;

export type UserCreateInput =
	& BaseUserIdentity
	& BaseSecurity
	& {
		role: RoleCode;
		temp_password: string;
		status?: UserStatus;
		org_id?: string; // superadmin can set
	}
	& Partial<UserScope>;

export type InviteDelivery = 'invite_link' | 'temp_password_email';

export type UserInviteInput =
	& BaseUserIdentity
	& BaseSecurity
	& {
		role: RoleCode;
		delivery: InviteDelivery;
		expiry_hours?: number; // 1..168
		org_id?: string; // superadmin can set
	}
	& Partial<UserScope>;

export {}; // ensure module


