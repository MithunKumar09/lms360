/**
 * Server echo types for Users feature derived from Zod schemas.
 * Keep in sync with userSchemas.js.
 */

export type RoleCode = 'superadmin' | 'admin' | 'instructor' | 'student' | 'vendor' | 'parent' | 'alumni';
export type MFAType = 'none' | 'totp' | 'email_otp';
export type UserStatus = 'active' | 'suspended';
export type InviteDelivery = 'invite_link' | 'temp_password_email';

export interface BaseIdentity {
	email: string;
	first_name?: string;
	last_name?: string;
	avatar_url?: string;
}

export interface BaseSecurity {
	mfa_required?: boolean;
	mfa_method?: MFAType;
	must_reset_password?: boolean;
	status?: UserStatus;
}

export interface StudentScope {
	role: 'student';
	org_id?: string;
	cohort_id: string;
	section_id?: string | null;
	roll_no?: string;
	program_node_id?: string | null;
}

export interface InstructorScope {
	role: 'instructor';
	org_id?: string;
	cohort_ids?: string[];
	offering_ids?: string[];
}

export interface ParentScope {
	role: 'parent';
	org_id?: string;
	linked_student_ids: string[];
}

export interface AdminScope {
	role: 'admin';
	org_id?: string;
}

export interface VendorScope {
	role: 'vendor';
	org_id?: string;
	vendor_category: string;
	company_name?: string;
	gstin?: string;
}

export interface AlumniScope {
	role: 'alumni';
	org_id?: string;
	graduation_year: number;
	program_node_id?: string | null;
}

export type UserScope =
	| StudentScope
	| InstructorScope
	| ParentScope
	| AdminScope
	| VendorScope
	| AlumniScope;

export type UserCreateInput =
	& BaseIdentity
	& BaseSecurity
	& {
		role: RoleCode;
		temp_password: string;
		org_id?: string;
	}
	& Partial<UserScope>;

export type UserInviteInput =
	& BaseIdentity
	& BaseSecurity
	& {
		role: RoleCode;
		delivery: InviteDelivery;
		expiry_hours?: number;
		org_id?: string;
	}
	& Partial<UserScope>;

