export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	public: {
		Tables: {
			api_key_usage: {
				Row: {
					api_key_id: string;
					id: string;
					ip_address: string | null;
					path: string | null;
					used_at: string;
				};
				Insert: {
					api_key_id: string;
					id?: string;
					ip_address?: string | null;
					path?: string | null;
					used_at?: string;
				};
				Update: {
					api_key_id?: string;
					id?: string;
					ip_address?: string | null;
					path?: string | null;
					used_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "api_key_usage_api_key_id_fkey";
						columns: ["api_key_id"];
						isOneToOne: false;
						referencedRelation: "api_keys";
						referencedColumns: ["id"];
					},
				];
			};
			api_keys: {
				Row: {
					created_at: string;
					description: string | null;
					disabled: boolean;
					expires_at: string | null;
					id: string;
					key_hash: string;
					tier: string | null;
					updated_at: string;
					user_id: string | null;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					disabled?: boolean;
					expires_at?: string | null;
					id?: string;
					key_hash: string;
					tier?: string | null;
					updated_at?: string;
					user_id?: string | null;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					disabled?: boolean;
					expires_at?: string | null;
					id?: string;
					key_hash?: string;
					tier?: string | null;
					updated_at?: string;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "fk_api_keys_user";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
			jobs: {
				Row: {
					ai_labels: string[];
					board: string | null;
					categories: string[] | null;
					city: string | null;
					company: string;
					company_name: string | null;
					company_profile_url: string | null;
					country: string | null;
					created_at: string | null;
					dedupe_key: string | null;
					description: string | null;
					experience_required: string | null;
					filtered_reason: string | null;
					fingerprint: string | null;
					id: number;
					is_active: boolean | null;
					is_graduate: boolean | null;
					is_internship: boolean | null;
					is_sent: boolean | null;
					job_hash: string;
					job_hash_score: number;
					job_url: string | null;
					lang: string | null;
					lang_conf: number | null;
					language_requirements: string[] | null;
					last_seen_at: string;
					location: string | null;
					location_name: string | null;
					original_posted_date: string | null;
					platform: string | null;
					posted_at: string | null;
					region: string | null;
					scrape_timestamp: string | null;
					scraper_run_id: string | null;
					source: string;
					status: string;
					title: string;
					updated_at: string | null;
					work_environment: string | null;
					work_location: string;
				};
				Insert: {
					ai_labels?: string[];
					board?: string | null;
					categories?: string[] | null;
					city?: string | null;
					company: string;
					company_name?: string | null;
					company_profile_url?: string | null;
					country?: string | null;
					created_at?: string | null;
					dedupe_key?: string | null;
					description?: string | null;
					experience_required?: string | null;
					filtered_reason?: string | null;
					fingerprint?: string | null;
					id?: number;
					is_active?: boolean | null;
					is_graduate?: boolean | null;
					is_internship?: boolean | null;
					is_sent?: boolean | null;
					job_hash: string;
					job_hash_score?: number;
					job_url?: string | null;
					lang?: string | null;
					lang_conf?: number | null;
					language_requirements?: string[] | null;
					last_seen_at?: string;
					location?: string | null;
					location_name?: string | null;
					original_posted_date?: string | null;
					platform?: string | null;
					posted_at?: string | null;
					region?: string | null;
					scrape_timestamp?: string | null;
					scraper_run_id?: string | null;
					source: string;
					status?: string;
					title: string;
					updated_at?: string | null;
					work_environment?: string | null;
					work_location?: string;
				};
				Update: {
					ai_labels?: string[];
					board?: string | null;
					categories?: string[] | null;
					city?: string | null;
					company?: string;
					company_name?: string | null;
					company_profile_url?: string | null;
					country?: string | null;
					created_at?: string | null;
					dedupe_key?: string | null;
					description?: string | null;
					experience_required?: string | null;
					filtered_reason?: string | null;
					fingerprint?: string | null;
					id?: number;
					is_active?: boolean | null;
					is_graduate?: boolean | null;
					is_internship?: boolean | null;
					is_sent?: boolean | null;
					job_hash?: string;
					job_hash_score?: number;
					job_url?: string | null;
					lang?: string | null;
					lang_conf?: number | null;
					language_requirements?: string[] | null;
					last_seen_at?: string;
					location?: string | null;
					location_name?: string | null;
					original_posted_date?: string | null;
					platform?: string | null;
					posted_at?: string | null;
					region?: string | null;
					scrape_timestamp?: string | null;
					scraper_run_id?: string | null;
					source?: string;
					status?: string;
					title?: string;
					updated_at?: string | null;
					work_environment?: string | null;
					work_location?: string;
				};
				Relationships: [];
			};
			users: {
				Row: {
					active: boolean | null;
					career_path: string | null;
					created_at: string | null;
					delivery_paused: boolean | null;
					email: string;
					email_count: number | null;
					email_engagement_score: number | null;
					email_phase: string | null;
					email_verified: boolean | null;
					entry_level_preference: string | null;
					full_name: string | null;
					id: string;
					languages_spoken: string[] | null;
					last_email_clicked: string | null;
					last_email_opened: string | null;
					last_email_sent: string | null;
					last_engagement_date: string | null;
					onboarding_complete: boolean | null;
					re_engagement_sent: boolean | null;
					roles_selected: string[] | null;
					start_date: string | null;
					subscription_active: boolean | null;
					subscription_tier: string | null;
					target_cities: string[];
					target_employment_start_date: string | null;
					updated_at: string | null;
					verification_token: string | null;
					verification_token_expires: string | null;
					visa_status: string | null;
					work_environment: string | null;
					// Legacy fields (still used)
					company_types: string[] | null;
					professional_expertise: string | null;
					// 🆕 NEW: Premium preference fields
					skills: string[] | null;
					industries: string[] | null;
					company_size_preference: string | null;
					career_keywords: string | null;
					// 🆕 NEW: Promo code fields
					promo_code_used: string | null;
					promo_expires_at: string | null;
				};
				Insert: {
					active?: boolean | null;
					career_path?: string | null;
					created_at?: string | null;
					delivery_paused?: boolean | null;
					email: string;
					email_count?: number | null;
					email_engagement_score?: number | null;
					email_phase?: string | null;
					email_verified?: boolean | null;
					entry_level_preference?: string | null;
					full_name?: string | null;
					id?: string;
					languages_spoken?: string[] | null;
					last_email_clicked?: string | null;
					last_email_opened?: string | null;
					last_email_sent?: string | null;
					last_engagement_date?: string | null;
					onboarding_complete?: boolean | null;
					re_engagement_sent?: boolean | null;
					roles_selected?: string[] | null;
					start_date?: string | null;
					subscription_active?: boolean | null;
					subscription_tier?: string | null;
					target_cities?: string[];
					target_employment_start_date?: string | null;
					updated_at?: string | null;
					verification_token?: string | null;
					verification_token_expires?: string | null;
					visa_status?: string | null;
					work_environment?: string | null;
					// Legacy fields (still used)
					company_types?: string[] | null;
					professional_expertise?: string | null;
					// 🆕 NEW: Premium preference fields
					skills?: string[] | null;
					industries?: string[] | null;
					company_size_preference?: string | null;
					career_keywords?: string | null;
					// 🆕 NEW: Promo code fields
					promo_code_used?: string | null;
					promo_expires_at?: string | null;
				};
				Update: {
					active?: boolean | null;
					career_path?: string | null;
					created_at?: string | null;
					delivery_paused?: boolean | null;
					email?: string;
					email_count?: number | null;
					email_engagement_score?: number | null;
					email_phase?: string | null;
					email_verified?: boolean | null;
					entry_level_preference?: string | null;
					full_name?: string | null;
					id?: string;
					languages_spoken?: string[] | null;
					last_email_clicked?: string | null;
					last_email_opened?: string | null;
					last_email_sent?: string | null;
					last_engagement_date?: string | null;
					onboarding_complete?: boolean | null;
					re_engagement_sent?: boolean | null;
					roles_selected?: string[] | null;
					start_date?: string | null;
					subscription_active?: boolean | null;
					subscription_tier?: string | null;
					target_cities?: string[];
					target_employment_start_date?: string | null;
					updated_at?: string | null;
					verification_token?: string | null;
					verification_token_expires?: string | null;
					visa_status?: string | null;
					work_environment?: string | null;
					// Legacy fields (still used)
					company_types?: string[] | null;
					professional_expertise?: string | null;
					// 🆕 NEW: Premium preference fields
					skills?: string[] | null;
					industries?: string[] | null;
					company_size_preference?: string | null;
					career_keywords?: string | null;
					// 🆕 NEW: Promo code fields
					promo_code_used?: string | null;
					promo_expires_at?: string | null;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
	Database["public"]["Tables"][T]["Update"];
