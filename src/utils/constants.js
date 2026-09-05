/**
 * Application-wide constants and enumerations.
 * Single source of truth for all magic strings used across models, services, and controllers.
 */

// ── User Roles ────────────────────────────────────
const UserRole = Object.freeze({
  JOB_SEEKER: 'jobseeker',
  EMPLOYER: 'employer',
  ADMIN: 'admin',
});

// ── Auth Providers ────────────────────────────────
const AuthProvider = Object.freeze({
  LOCAL: 'local',
  GOOGLE: 'google',
  LINKEDIN: 'linkedin',
});

// ── User Status ───────────────────────────────────
const UserStatus = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
});

// ── Profile Visibility ────────────────────────────
const ProfileVisibility = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
});

// ── Job Status ────────────────────────────────────
const JobStatus = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
  EXPIRED: 'expired',
});

// ── Employment Type ───────────────────────────────
const EmploymentType = Object.freeze({
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
});

// ── Workplace Type ────────────────────────────────
const WorkplaceType = Object.freeze({
  REMOTE: 'remote',
  HYBRID: 'hybrid',
  ONSITE: 'onsite',
});

// ── Application Status ────────────────────────────
const ApplicationStatus = Object.freeze({
  SUBMITTED: 'submitted',
  VIEWED: 'viewed',
  SCREENING: 'screening',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
});

// ── Company Verification Status ───────────────────
const VerificationStatus = Object.freeze({
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  INFORMATION_REQUIRED: 'information_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

// ── Subscription Plans ────────────────────────────
const SubscriptionPlan = Object.freeze({
  PAY_PER_JOB: 'pay-per-job',
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
  ENTERPRISE: 'enterprise',
});

// ── Subscription Status ───────────────────────────
const SubscriptionStatus = Object.freeze({
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  PAST_DUE: 'past_due',
});

// ── Transaction Type ──────────────────────────────
const TransactionType = Object.freeze({
  SUBSCRIPTION: 'subscription',
  JOB_PROMOTION: 'job_promotion',
  REFUND: 'refund',
});

// ── Transaction Status ────────────────────────────
const TransactionStatus = Object.freeze({
  SUCCEEDED: 'succeeded',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

// ── Payment Providers ─────────────────────────────
const PaymentProvider = Object.freeze({
  STRIPE: 'stripe',
  RAZORPAY: 'razorpay',
});

// ── Saved Search Alert Frequency ──────────────────
const AlertFrequency = Object.freeze({
  INSTANT: 'instant',
  DAILY: 'daily',
  WEEKLY: 'weekly',
});

// ── Flag Status ───────────────────────────────────
const FlagStatus = Object.freeze({
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
});

// ── Flag Reason ───────────────────────────────────
const FlagReason = Object.freeze({
  SPAM: 'spam',
  MISLEADING: 'misleading',
  DUPLICATE: 'duplicate',
  INAPPROPRIATE: 'inappropriate',
  SCAM: 'scam',
  OTHER: 'other',
});

// ── Notification Type ─────────────────────────────
const NotificationType = Object.freeze({
  APPLICATION_RECEIVED: 'application_received',
  APPLICATION_STATUS_UPDATE: 'application_status_update',
  NEW_JOB_MATCH: 'new_job_match',
  INTERVIEW_INVITATION: 'interview_invitation',
  COMPANY_VERIFIED: 'company_verified',
  COMPANY_PENDING_REVIEW: 'company_pending_review',
  COMPANY_VERIFICATION_UPDATE: 'company_verification_update',
  JOB_STATUS_CHANGE: 'job_status_change',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
});

// ── Screening Question Types ──────────────────────
const ScreeningQuestionType = Object.freeze({
  YES_NO: 'yes_no',
  MULTIPLE_CHOICE: 'multiple_choice',
  TEXT: 'text',
  NUMERIC: 'numeric',
});

// ── Team Member Permissions ───────────────────────
const TeamPermission = Object.freeze({
  MANAGE_JOBS: 'manage_jobs',
  VIEW_APPLICATIONS: 'view_applications',
  MANAGE_APPLICATIONS: 'manage_applications',
  MANAGE_TEAM: 'manage_team',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_BILLING: 'manage_billing',
});

// ── Default Pipeline Stages ───────────────────────
const DefaultPipelineStages = Object.freeze([
  { name: 'New', order: 1 },
  { name: 'Screening', order: 2 },
  { name: 'Interview', order: 3 },
  { name: 'Offer', order: 4 },
  { name: 'Hired', order: 5 },
]);

// ── Resume File Types ─────────────────────────────
const ResumeFileType = Object.freeze({
  PDF: 'pdf',
  WORD: 'docx',
  TEXT: 'txt',
});

// ── Allowed Resume MIME types ─────────────────────
const ALLOWED_RESUME_MIMES = Object.freeze([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

module.exports = {
  UserRole,
  AuthProvider,
  UserStatus,
  ProfileVisibility,
  JobStatus,
  EmploymentType,
  WorkplaceType,
  ApplicationStatus,
  VerificationStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  TransactionType,
  TransactionStatus,
  PaymentProvider,
  AlertFrequency,
  FlagStatus,
  FlagReason,
  NotificationType,
  ScreeningQuestionType,
  TeamPermission,
  DefaultPipelineStages,
  ResumeFileType,
  ALLOWED_RESUME_MIMES,
  MAX_RESUME_SIZE_BYTES,
};
