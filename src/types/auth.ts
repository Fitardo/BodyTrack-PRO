/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'user';

export type UserStatus = 'active' | 'suspended';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  invite_code_used?: string;
  onboarding_completed: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expires_at: string;
}

export interface InviteCode {
  code: string;
  created_by: string;
  max_uses: number;
  uses_count: number;
  expires_at?: string;
  status: 'active' | 'revoked';
  created_at: string;
  notes?: string;
}

export type FeedbackType = 'bug' | 'suggestion' | 'ux' | 'feature';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStatus = 'new' | 'investigating' | 'resolved' | 'dismissed';

export interface BetaFeedbackItem {
  id: string;
  user_id: string;
  user_email?: string;
  type: FeedbackType;
  module: string;
  title: string;
  description: string;
  priority: FeedbackPriority;
  satisfaction_score?: number; // 1-5
  can_contact: boolean;
  diagnostics?: {
    browser?: string;
    screen?: string;
    app_version?: string;
  };
  status: FeedbackStatus;
  admin_notes?: string;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: string;
  module?: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp: string;
}

export interface AdminAnalyticsSummary {
  total_invited: number;
  total_activated: number;
  activation_rate_pct: number;
  weekly_active_users: number;
  retention_d7_pct: number;
  retention_d28_pct: number;
  total_feedback_count: number;
  open_bugs_count: number;
  average_csat: number;
  module_adoption: Record<string, number>;
  events_by_day: Array<{ date: string; count: number; active_users: number }>;
}
