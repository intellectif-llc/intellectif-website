# Intellectif Booking System - Database Public Schema

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE auth.audit_log_entries (
instance_id uuid,
id uuid NOT NULL,
payload json,
created_at timestamp with time zone,
ip_address character varying NOT NULL DEFAULT ''::character varying,
CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.flow_state (
id uuid NOT NULL,
user_id uuid,
auth_code text NOT NULL,
code_challenge_method USER-DEFINED NOT NULL,
code_challenge text NOT NULL,
provider_type text NOT NULL,
provider_access_token text,
provider_refresh_token text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
authentication_method text NOT NULL,
auth_code_issued_at timestamp with time zone,
CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.identities (
provider_id text NOT NULL,
user_id uuid NOT NULL,
identity_data jsonb NOT NULL,
provider text NOT NULL,
last_sign_in_at timestamp with time zone,
created_at timestamp with time zone,
updated_at timestamp with time zone,
email text DEFAULT lower((identity_data ->> 'email'::text)),
id uuid NOT NULL DEFAULT gen_random_uuid(),
CONSTRAINT identities_pkey PRIMARY KEY (id),
CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.instances (
id uuid NOT NULL,
uuid uuid,
raw_base_config text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT instances_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.mfa_amr_claims (
session_id uuid NOT NULL,
created_at timestamp with time zone NOT NULL,
updated_at timestamp with time zone NOT NULL,
authentication_method text NOT NULL,
id uuid NOT NULL,
CONSTRAINT mfa_amr_claims_pkey PRIMARY KEY (id),
CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.mfa_challenges (
id uuid NOT NULL,
factor_id uuid NOT NULL,
created_at timestamp with time zone NOT NULL,
verified_at timestamp with time zone,
ip_address inet NOT NULL,
otp_code text,
web_authn_session_data jsonb,
CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id),
CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id)
);
CREATE TABLE auth.mfa_factors (
id uuid NOT NULL,
user_id uuid NOT NULL,
friendly_name text,
factor_type USER-DEFINED NOT NULL,
status USER-DEFINED NOT NULL,
created_at timestamp with time zone NOT NULL,
updated_at timestamp with time zone NOT NULL,
secret text,
phone text,
last_challenged_at timestamp with time zone UNIQUE,
web_authn_credential jsonb,
web_authn_aaguid uuid,
CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.one_time_tokens (
id uuid NOT NULL,
user_id uuid NOT NULL,
token_type USER-DEFINED NOT NULL,
token_hash text NOT NULL CHECK (char_length(token_hash) > 0),
relates_to text NOT NULL,
created_at timestamp without time zone NOT NULL DEFAULT now(),
updated_at timestamp without time zone NOT NULL DEFAULT now(),
CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.refresh_tokens (
instance_id uuid,
id bigint NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
token character varying UNIQUE,
user_id character varying,
revoked boolean,
created_at timestamp with time zone,
updated_at timestamp with time zone,
parent character varying,
session_id uuid,
CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.saml_providers (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
entity_id text NOT NULL UNIQUE CHECK (char_length(entity_id) > 0),
metadata_xml text NOT NULL CHECK (char_length(metadata_xml) > 0),
metadata_url text CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0),
attribute_mapping jsonb,
created_at timestamp with time zone,
updated_at timestamp with time zone,
name_id_format text,
CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.saml_relay_states (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
request_id text NOT NULL CHECK (char_length(request_id) > 0),
for_email text,
redirect_to text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
flow_state_id uuid,
CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id),
CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id)
);
CREATE TABLE auth.schema_migrations (
version character varying NOT NULL,
CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE auth.sessions (
id uuid NOT NULL,
user_id uuid NOT NULL,
created_at timestamp with time zone,
updated_at timestamp with time zone,
factor_id uuid,
aal USER-DEFINED,
not_after timestamp with time zone,
refreshed_at timestamp without time zone,
user_agent text,
ip inet,
tag text,
CONSTRAINT sessions_pkey PRIMARY KEY (id),
CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.sso_domains (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
domain text NOT NULL CHECK (char_length(domain) > 0),
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.sso_providers (
id uuid NOT NULL,
resource_id text CHECK (resource_id = NULL::text OR char_length(resource_id) > 0),
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.users (
instance_id uuid,
id uuid NOT NULL,
aud character varying,
role character varying,
email character varying,
encrypted_password character varying,
email_confirmed_at timestamp with time zone,
invited_at timestamp with time zone,
confirmation_token character varying,
confirmation_sent_at timestamp with time zone,
recovery_token character varying,
recovery_sent_at timestamp with time zone,
email_change_token_new character varying,
email_change character varying,
email_change_sent_at timestamp with time zone,
last_sign_in_at timestamp with time zone,
raw_app_meta_data jsonb,
raw_user_meta_data jsonb,
is_super_admin boolean,
created_at timestamp with time zone,
updated_at timestamp with time zone,
phone text DEFAULT NULL::character varying UNIQUE,
phone_confirmed_at timestamp with time zone,
phone_change text DEFAULT ''::character varying,
phone_change_token character varying DEFAULT ''::character varying,
phone_change_sent_at timestamp with time zone,
confirmed_at timestamp with time zone DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
email_change_token_current character varying DEFAULT ''::character varying,
email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2),
banned_until timestamp with time zone,
reauthentication_token character varying DEFAULT ''::character varying,
reauthentication_sent_at timestamp with time zone,
is_sso_user boolean NOT NULL DEFAULT false,
deleted_at timestamp with time zone,
is_anonymous boolean NOT NULL DEFAULT false,
CONSTRAINT users_pkey PRIMARY KEY (id)
);

## Enums

| enum_name            | enum_value             |
| -------------------- | ---------------------- |
| audit_operation      | INSERT                 |
| audit_operation      | UPDATE                 |
| audit_operation      | DELETE                 |
| booking_status       | pending                |
| booking_status       | confirmed              |
| booking_status       | in_progress            |
| booking_status       | completed              |
| booking_status       | cancelled              |
| booking_status       | no_show                |
| booking_status       | rescheduled            |
| break_type_enum      | break                  |
| break_type_enum      | lunch                  |
| break_type_enum      | meeting                |
| break_type_enum      | buffer                 |
| break_type_enum      | personal               |
| contact_method       | email                  |
| contact_method       | phone                  |
| contact_method       | both                   |
| conversion_potential | unknown                |
| conversion_potential | low                    |
| conversion_potential | medium                 |
| conversion_potential | high                   |
| conversion_potential | converted              |
| customer_status      | prospect               |
| customer_status      | active                 |
| customer_status      | inactive               |
| customer_status      | churned                |
| customer_status      | vip                    |
| follow_up_status     | pending                |
| follow_up_status     | in_progress            |
| follow_up_status     | completed              |
| follow_up_status     | cancelled              |
| follow_up_status     | failed                 |
| follow_up_status     | overdue                |
| follow_up_type       | email                  |
| follow_up_type       | phone_call             |
| follow_up_type       | proposal_send          |
| follow_up_type       | contract_discussion    |
| follow_up_type       | project_kickoff        |
| follow_up_type       | check_in               |
| follow_up_type       | upsell                 |
| follow_up_type       | feedback_request       |
| interaction_type     | booking_created        |
| interaction_type     | consultation_completed |
| interaction_type     | proposal_sent          |
| interaction_type     | contract_signed        |
| interaction_type     | project_started        |
| interaction_type     | project_completed      |
| interaction_type     | referral_made          |
| interaction_type     | review_left            |
| interaction_type     | complaint_filed        |
| lead_quality_enum    | unqualified            |
| lead_quality_enum    | qualified              |
| lead_quality_enum    | hot                    |
| lead_quality_enum    | converted              |
| lead_quality_enum    | churned                |
| lead_source_enum     | website_booking        |
| lead_source_enum     | referral               |
| lead_source_enum     | social_media           |
| lead_source_enum     | google_ads             |
| lead_source_enum     | linkedin               |
| lead_source_enum     | email_campaign         |
| lead_source_enum     | cold_outreach          |
| lead_source_enum     | partnership            |
| payment_status       | pending                |
| payment_status       | processing             |
| payment_status       | paid                   |
| payment_status       | failed                 |
| payment_status       | refunded               |
| payment_status       | waived                 |
| priority_level       | low                    |
| priority_level       | medium                 |
| priority_level       | high                   |
| priority_level       | urgent                 |
| project_status       | lead                   |
| project_status       | qualified              |
| project_status       | proposal_sent          |
| project_status       | negotiation            |
| project_status       | signed                 |
| project_status       | in_progress            |
| project_status       | completed              |
| project_status       | cancelled              |
| service_booking_type | scheduled              |
| service_booking_type | immediate              |
| timeoff_type_enum    | vacation               |
| timeoff_type_enum    | sick                   |
| timeoff_type_enum    | personal               |
| timeoff_type_enum    | conference             |
| timeoff_type_enum    | training               |
| timeoff_type_enum    | holiday                |
| user_role            | customer               |
| user_role            | admin                  |
| user_role            | consultant             |
| user_role            | sales                  |

## Database indexes in public schema

| index_name                      | is_unique | is_primary | column_name       |
| ------------------------------- | --------- | ---------- | ----------------- |
| audit_log                       | true      | true       | id                |
| availability_breaks             | false     | false      | consultant_id     |
| availability_breaks             | true      | false      | consultant_id     |
| availability_breaks             | false     | false      | day_of_week       |
| availability_breaks             | true      | false      | day_of_week       |
| availability_breaks             | true      | false      | end_time          |
| availability_breaks             | true      | true       | id                |
| availability_breaks             | true      | false      | start_time        |
| availability_overrides          | true      | false      | consultant_id     |
| availability_overrides          | true      | false      | end_time          |
| availability_overrides          | true      | true       | id                |
| availability_overrides          | true      | false      | specific_date     |
| availability_overrides          | true      | false      | start_time        |
| availability_template_set_items | true      | true       | id                |
| availability_template_sets      | true      | false      | consultant_id     |
| availability_template_sets      | true      | true       | id                |
| availability_template_sets      | true      | false      | set_name          |
| availability_templates          | true      | false      | consultant_id     |
| availability_templates          | false     | false      | consultant_id     |
| availability_templates          | true      | false      | day_of_week       |
| availability_templates          | false     | false      | day_of_week       |
| availability_templates          | true      | false      | end_time          |
| availability_templates          | true      | true       | id                |
| availability_templates          | true      | false      | start_time        |
| availability_timeoff            | false     | false      | consultant_id     |
| availability_timeoff            | false     | false      | end_date          |
| availability_timeoff            | false     | false      | end_date          |
| availability_timeoff            | true      | true       | id                |
| availability_timeoff            | false     | false      | start_date        |
| availability_timeoff            | false     | false      | start_date        |
| bookings                        | true      | false      | booking_reference |
| bookings                        | true      | true       | id                |
| consultant_buffer_preferences   | true      | false      | consultant_id     |
| consultant_buffer_preferences   | false     | false      | consultant_id     |
| consultant_buffer_preferences   | true      | true       | id                |
| consultant_buffer_preferences   | true      | false      | service_id        |
| consultant_buffer_preferences   | false     | false      | service_id        |
| customer_interactions           | true      | true       | id                |
| customer_metrics                | true      | true       | id                |
| follow_ups                      | true      | true       | id                |
| profiles                        | true      | true       | id                |
| projects                        | true      | true       | id                |
| services                        | true      | true       | id                |
| services                        | true      | false      | slug              |
| voice_consultations             | true      | true       | id                |

# Auth schema

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE auth.audit_log_entries (
instance_id uuid,
id uuid NOT NULL,
payload json,
created_at timestamp with time zone,
ip_address character varying NOT NULL DEFAULT ''::character varying,
CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.flow_state (
id uuid NOT NULL,
user_id uuid,
auth_code text NOT NULL,
code_challenge_method USER-DEFINED NOT NULL,
code_challenge text NOT NULL,
provider_type text NOT NULL,
provider_access_token text,
provider_refresh_token text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
authentication_method text NOT NULL,
auth_code_issued_at timestamp with time zone,
CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.identities (
provider_id text NOT NULL,
user_id uuid NOT NULL,
identity_data jsonb NOT NULL,
provider text NOT NULL,
last_sign_in_at timestamp with time zone,
created_at timestamp with time zone,
updated_at timestamp with time zone,
email text DEFAULT lower((identity_data ->> 'email'::text)),
id uuid NOT NULL DEFAULT gen_random_uuid(),
CONSTRAINT identities_pkey PRIMARY KEY (id),
CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.instances (
id uuid NOT NULL,
uuid uuid,
raw_base_config text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT instances_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.mfa_amr_claims (
session_id uuid NOT NULL,
created_at timestamp with time zone NOT NULL,
updated_at timestamp with time zone NOT NULL,
authentication_method text NOT NULL,
id uuid NOT NULL,
CONSTRAINT mfa_amr_claims_pkey PRIMARY KEY (id),
CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.mfa_challenges (
id uuid NOT NULL,
factor_id uuid NOT NULL,
created_at timestamp with time zone NOT NULL,
verified_at timestamp with time zone,
ip_address inet NOT NULL,
otp_code text,
web_authn_session_data jsonb,
CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id),
CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id)
);
CREATE TABLE auth.mfa_factors (
id uuid NOT NULL,
user_id uuid NOT NULL,
friendly_name text,
factor_type USER-DEFINED NOT NULL,
status USER-DEFINED NOT NULL,
created_at timestamp with time zone NOT NULL,
updated_at timestamp with time zone NOT NULL,
secret text,
phone text,
last_challenged_at timestamp with time zone UNIQUE,
web_authn_credential jsonb,
web_authn_aaguid uuid,
CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.one_time_tokens (
id uuid NOT NULL,
user_id uuid NOT NULL,
token_type USER-DEFINED NOT NULL,
token_hash text NOT NULL CHECK (char_length(token_hash) > 0),
relates_to text NOT NULL,
created_at timestamp without time zone NOT NULL DEFAULT now(),
updated_at timestamp without time zone NOT NULL DEFAULT now(),
CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.refresh_tokens (
instance_id uuid,
id bigint NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
token character varying UNIQUE,
user_id character varying,
revoked boolean,
created_at timestamp with time zone,
updated_at timestamp with time zone,
parent character varying,
session_id uuid,
CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id)
);
CREATE TABLE auth.saml_providers (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
entity_id text NOT NULL UNIQUE CHECK (char_length(entity_id) > 0),
metadata_xml text NOT NULL CHECK (char_length(metadata_xml) > 0),
metadata_url text CHECK (metadata_url = NULL::text OR char_length(metadata_url) > 0),
attribute_mapping jsonb,
created_at timestamp with time zone,
updated_at timestamp with time zone,
name_id_format text,
CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.saml_relay_states (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
request_id text NOT NULL CHECK (char_length(request_id) > 0),
for_email text,
redirect_to text,
created_at timestamp with time zone,
updated_at timestamp with time zone,
flow_state_id uuid,
CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id),
CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id)
);
CREATE TABLE auth.schema_migrations (
version character varying NOT NULL,
CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE auth.sessions (
id uuid NOT NULL,
user_id uuid NOT NULL,
created_at timestamp with time zone,
updated_at timestamp with time zone,
factor_id uuid,
aal USER-DEFINED,
not_after timestamp with time zone,
refreshed_at timestamp without time zone,
user_agent text,
ip inet,
tag text,
CONSTRAINT sessions_pkey PRIMARY KEY (id),
CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE auth.sso_domains (
id uuid NOT NULL,
sso_provider_id uuid NOT NULL,
domain text NOT NULL CHECK (char_length(domain) > 0),
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id)
);
CREATE TABLE auth.sso_providers (
id uuid NOT NULL,
resource_id text CHECK (resource_id = NULL::text OR char_length(resource_id) > 0),
created_at timestamp with time zone,
updated_at timestamp with time zone,
CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);
CREATE TABLE auth.users (
instance_id uuid,
id uuid NOT NULL,
aud character varying,
role character varying,
email character varying,
encrypted_password character varying,
email_confirmed_at timestamp with time zone,
invited_at timestamp with time zone,
confirmation_token character varying,
confirmation_sent_at timestamp with time zone,
recovery_token character varying,
recovery_sent_at timestamp with time zone,
email_change_token_new character varying,
email_change character varying,
email_change_sent_at timestamp with time zone,
last_sign_in_at timestamp with time zone,
raw_app_meta_data jsonb,
raw_user_meta_data jsonb,
is_super_admin boolean,
created_at timestamp with time zone,
updated_at timestamp with time zone,
phone text DEFAULT NULL::character varying UNIQUE,
phone_confirmed_at timestamp with time zone,
phone_change text DEFAULT ''::character varying,
phone_change_token character varying DEFAULT ''::character varying,
phone_change_sent_at timestamp with time zone,
confirmed_at timestamp with time zone DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
email_change_token_current character varying DEFAULT ''::character varying,
email_change_confirm_status smallint DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2),
banned_until timestamp with time zone,
reauthentication_token character varying DEFAULT ''::character varying,
reauthentication_sent_at timestamp with time zone,
is_sso_user boolean NOT NULL DEFAULT false,
deleted_at timestamp with time zone,
is_anonymous boolean NOT NULL DEFAULT false,
CONSTRAINT users_pkey PRIMARY KEY (id)
);

## Public schema

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit*log (
id uuid NOT NULL DEFAULT gen_random_uuid(),
table_name character varying NOT NULL,
record_id uuid NOT NULL,
operation USER-DEFINED NOT NULL,
old_values jsonb,
new_values jsonb,
changed_by uuid,
changed_at timestamp with time zone NOT NULL DEFAULT now(),
ip_address inet,
user_agent text,
CONSTRAINT audit_log_pkey PRIMARY KEY (id),
CONSTRAINT audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);
CREATE TABLE public.availability_breaks (
id uuid NOT NULL DEFAULT gen_random_uuid(),
consultant_id uuid NOT NULL,
day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
start_time time without time zone NOT NULL,
end_time time without time zone NOT NULL,
break_type USER-DEFINED NOT NULL DEFAULT 'break'::break_type_enum,
title character varying NOT NULL DEFAULT 'Break'::character varying,
is_recurring boolean NOT NULL DEFAULT true,
is_active boolean NOT NULL DEFAULT true,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT availability_breaks_pkey PRIMARY KEY (id),
CONSTRAINT availability_breaks_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES auth.users(id)
);
CREATE TABLE public.availability_overrides (
id uuid NOT NULL DEFAULT gen_random_uuid(),
consultant_id uuid NOT NULL,
specific_date date NOT NULL,
start_time time without time zone,
end_time time without time zone,
is_available boolean NOT NULL DEFAULT false,
max_bookings smallint CHECK (max_bookings IS NULL OR max_bookings > 0),
reason character varying,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT availability_overrides_pkey PRIMARY KEY (id),
CONSTRAINT availability_overrides_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES auth.users(id)
);
CREATE TABLE public.availability_template_set_items (
id uuid NOT NULL DEFAULT gen_random_uuid(),
template_set_id uuid NOT NULL,
day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
start_time time without time zone NOT NULL,
end_time time without time zone NOT NULL,
max_bookings smallint NOT NULL DEFAULT 1,
CONSTRAINT availability_template_set_items_pkey PRIMARY KEY (id),
CONSTRAINT availability_template_set_items_template_set_id_fkey FOREIGN KEY (template_set_id) REFERENCES public.availability_template_sets(id)
);
CREATE TABLE public.availability_template_sets (
id uuid NOT NULL DEFAULT gen_random_uuid(),
consultant_id uuid NOT NULL,
set_name character varying NOT NULL,
description text,
is_default boolean NOT NULL DEFAULT false,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT availability_template_sets_pkey PRIMARY KEY (id),
CONSTRAINT availability_template_sets_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES auth.users(id)
);
CREATE TABLE public.availability_templates (
id uuid NOT NULL DEFAULT gen_random_uuid(),
consultant_id uuid NOT NULL,
day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
start_time time without time zone NOT NULL,
end_time time without time zone NOT NULL,
max_bookings smallint NOT NULL DEFAULT 1 CHECK (max_bookings > 0),
is_active boolean NOT NULL DEFAULT true,
created_at timestamp with time zone NOT NULL DEFAULT now(),
timezone character varying NOT NULL DEFAULT 'UTC'::character varying,
template_name character varying,
notes text,
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT availability_templates_pkey PRIMARY KEY (id),
CONSTRAINT availability_templates_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES auth.users(id)
);
CREATE TABLE public.availability_timeoff (
id uuid NOT NULL DEFAULT gen_random_uuid(),
consultant_id uuid NOT NULL,
start_date date NOT NULL,
end_date date NOT NULL,
start_time time without time zone,
end_time time without time zone,
timeoff_type USER-DEFINED NOT NULL DEFAULT 'vacation'::timeoff_type_enum,
title character varying NOT NULL,
description text,
is_approved boolean NOT NULL DEFAULT true,
approved_by uuid,
approved_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT availability_timeoff_pkey PRIMARY KEY (id),
CONSTRAINT availability_timeoff_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id),
CONSTRAINT availability_timeoff_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES auth.users(id)
);
CREATE TABLE public.bookings (
id uuid NOT NULL DEFAULT gen_random_uuid(),
booking_reference character varying NOT NULL UNIQUE,
user_id uuid,
customer_metrics_id uuid CHECK (customer_metrics_id IS NOT NULL),
customer_data jsonb NOT NULL CHECK (customer_data ? 'email'::text AND customer_data ? 'first_name'::text AND customer_data ? 'last_name'::text),
project_description text NOT NULL,
service_id uuid NOT NULL,
scheduled_date date,
scheduled_time time without time zone,
scheduled_datetime timestamp with time zone,
actual_start_time timestamp with time zone,
actual_end_time timestamp with time zone,
status USER-DEFINED NOT NULL DEFAULT 'pending'::booking_status,
booking_source USER-DEFINED NOT NULL DEFAULT 'website_booking'::lead_source_enum,
payment_status USER-DEFINED NOT NULL DEFAULT 'pending'::payment_status,
payment_amount numeric CHECK (payment_amount IS NULL OR payment_amount >= 0::numeric),
payment_method character varying,
payment_reference character varying,
meeting_platform character varying,
meeting_url text,
meeting_id character varying,
meeting_password character varying,
consultant_id uuid,
lead_score smallint DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
estimated_project_value numeric,
follow_up_required boolean NOT NULL DEFAULT true,
follow_up_date timestamp with time zone,
follow_up_notes text,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
confirmed_at timestamp with time zone,
completed_at timestamp with time zone,
cancelled_at timestamp with time zone,
meeting_recording_url text,
meeting_transcript text,
ai_insights jsonb,
google_meet_space_name text UNIQUE,
google_meet_config jsonb,
CONSTRAINT bookings_pkey PRIMARY KEY (id),
CONSTRAINT bookings_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES auth.users(id),
CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
CONSTRAINT bookings_customer_metrics_id_fkey FOREIGN KEY (customer_metrics_id) REFERENCES public.customer_metrics(id),
CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.consultant_buffer_preferences (
id uuid NOT NULL DEFAULT gen_random_uuid(),
consultant_id uuid NOT NULL,
service_id uuid NOT NULL,
buffer_before_minutes smallint NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
buffer_after_minutes smallint NOT NULL DEFAULT 5 CHECK (buffer_after_minutes >= 0),
notes text,
is_active boolean NOT NULL DEFAULT true,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT consultant_buffer_preferences_pkey PRIMARY KEY (id),
CONSTRAINT consultant_buffer_preferences_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
CONSTRAINT consultant_buffer_preferences_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES auth.users(id)
);
CREATE TABLE public.customer_interactions (
id uuid NOT NULL DEFAULT gen_random_uuid(),
customer_metrics_id uuid,
booking_id uuid,
interaction_type USER-DEFINED NOT NULL,
interaction_date timestamp with time zone NOT NULL DEFAULT now(),
details jsonb,
staff_member uuid,
value_score smallint DEFAULT 0 CHECK (value_score >= 0 AND value_score <= 100),
conversion_potential USER-DEFINED NOT NULL DEFAULT 'unknown'::conversion_potential,
CONSTRAINT customer_interactions_pkey PRIMARY KEY (id),
CONSTRAINT customer_interactions_staff_member_fkey FOREIGN KEY (staff_member) REFERENCES public.profiles(id),
CONSTRAINT customer_interactions_customer_metrics_id_fkey FOREIGN KEY (customer_metrics_id) REFERENCES public.customer_metrics(id),
CONSTRAINT customer_interactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.customer_metrics (
id uuid NOT NULL DEFAULT gen_random_uuid(),
user_id uuid,
email character varying NOT NULL CHECK (email::text ~\* '^[A-Za-z0-9.*%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
  lead_source USER-DEFINED NOT NULL DEFAULT 'website_booking'::lead_source_enum,
  lead_quality USER-DEFINED NOT NULL DEFAULT 'unqualified'::lead_quality_enum,
  total_bookings integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0.00,
  last_booking_date timestamp with time zone,
  first_booking_date timestamp with time zone,
  status USER-DEFINED NOT NULL DEFAULT 'prospect'::customer_status,
  last_interaction_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT customer_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.follow_ups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  customer_metrics_id uuid,
  assigned_to uuid NOT NULL,
  follow_up_type USER-DEFINED NOT NULL,
  priority USER-DEFINED NOT NULL DEFAULT 'medium'::priority_level,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::follow_up_status,
  scheduled_date timestamp with time zone,
  completed_date timestamp with time zone,
  due_date timestamp with time zone,
  title character varying NOT NULL,
  notes text,
  outcome text,
  next_action character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT follow_ups_pkey PRIMARY KEY (id),
  CONSTRAINT follow_ups_customer_metrics_id_fkey FOREIGN KEY (customer_metrics_id) REFERENCES public.customer_metrics(id),
  CONSTRAINT follow_ups_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT follow_ups_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  company character varying,
  role USER-DEFINED NOT NULL DEFAULT 'customer'::user_role,
  is_staff boolean NOT NULL DEFAULT false,
  timezone character varying DEFAULT 'UTC'::character varying,
  avatar_url text,
  bio text,
  preferred_contact_method USER-DEFINED DEFAULT 'email'::contact_method,
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_metrics_id uuid NOT NULL,
  original_booking_id uuid,
  project_name character varying NOT NULL,
  project_type ARRAY,
  estimated_value numeric,
  actual_value numeric,
  status USER-DEFINED NOT NULL DEFAULT 'lead'::project_status,
  start_date date,
  estimated_completion date,
  actual_completion date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_customer_metrics_id_fkey FOREIGN KEY (customer_metrics_id) REFERENCES public.customer_metrics(id),
  CONSTRAINT projects_original_booking_id_fkey FOREIGN KEY (original_booking_id) REFERENCES public.bookings(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug character varying NOT NULL UNIQUE CHECK (slug::text ~ '^[a-z0-9-]+$'::text),
name character varying NOT NULL,
description text NOT NULL,
short_description character varying,
price numeric NOT NULL DEFAULT 0.00 CHECK (price >= 0::numeric),
currency character NOT NULL DEFAULT 'USD'::bpchar,
duration_minutes smallint NOT NULL CHECK (duration_minutes > 0),
booking_type USER-DEFINED NOT NULL DEFAULT 'scheduled'::service_booking_type,
max_daily_bookings smallint CHECK (max_daily_bookings IS NULL OR max_daily_bookings > 0),
max_concurrent_bookings smallint DEFAULT 1,
features jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(features) = 'array'::text),
prerequisites jsonb DEFAULT '[]'::jsonb,
is_active boolean NOT NULL DEFAULT true,
is_popular boolean NOT NULL DEFAULT false,
requires_payment boolean NOT NULL DEFAULT false,
auto_confirm boolean NOT NULL DEFAULT false,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
buffer_before_minutes smallint DEFAULT 0 CHECK (buffer_before_minutes >= 0),
buffer_after_minutes smallint DEFAULT 5 CHECK (buffer_after_minutes >= 0),
allow_custom_buffer boolean DEFAULT true,
minimum_advance_hours SMALLINT DEFAULT 24 CHECK (minimum_advance_hours >= 0);
CONSTRAINT services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.trigger_debug_log (
id uuid NOT NULL DEFAULT gen_random_uuid(),
user_id uuid,
function_name text,
step_name text,
step_result text,
error_message text,
created_at timestamp with time zone DEFAULT now(),
CONSTRAINT trigger_debug_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_tokens (
user_id uuid NOT NULL,
encrypted_google_refresh_token bytea NOT NULL,
google_calendar_id text,
token_created_at timestamp with time zone NOT NULL DEFAULT now(),
token_expires_at timestamp with time zone,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT user_tokens_pkey PRIMARY KEY (user_id),
CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.voice_consultations (
id uuid NOT NULL DEFAULT gen_random_uuid(),
customer_email character varying NOT NULL,
customer_phone character varying,
voice_session_id character varying,
conversation_transcript text,
conversation_summary text,
sentiment_score numeric CHECK (sentiment_score >= '-1'::integer::numeric AND sentiment_score <= 1::numeric),
duration_seconds integer,
lead_qualified boolean NOT NULL DEFAULT false,
follow_up_booking_id uuid,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT voice_consultations_pkey PRIMARY KEY (id),
CONSTRAINT voice_consultations_follow_up_booking_id_fkey FOREIGN KEY (follow_up_booking_id) REFERENCES public.bookings(id)
);
