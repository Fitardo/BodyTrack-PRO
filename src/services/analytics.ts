/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalyticsEvent } from '../types/auth';

const FORBIDDEN_WORDS = [
  'weight',
  'peso',
  'waist',
  'cintura',
  'fat',
  'grasa',
  'food',
  'alimento',
  'photo',
  'foto',
  'calorie',
  'token',
  'password',
  'secret',
  'email',
];

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: any = null;
  private currentUserId: string = 'anonymous';

  setUserId(id: string) {
    this.currentUserId = id;
  }

  sanitizeProperties(metadata?: Record<string, any>): Record<string, string | number | boolean> {
    const cleanMeta: Record<string, string | number | boolean> = {};

    if (metadata && typeof metadata === 'object') {
      for (const [key, val] of Object.entries(metadata)) {
        const lowerKey = key.toLowerCase();
        const isForbidden = FORBIDDEN_WORDS.some((w) => lowerKey.includes(w));
        if (!isForbidden) {
          if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            cleanMeta[key] = val;
          }
        }
      }
    }
    return cleanMeta;
  }

  track(eventType: string, moduleName?: string, metadata?: Record<string, any>) {
    this.trackEvent(eventType, moduleName, metadata);
  }

  trackEvent(eventType: string, moduleName?: string, metadata?: Record<string, any>) {
    // Sanitize metadata to guarantee zero private metrics or PII
    const cleanMeta = this.sanitizeProperties(metadata);

    const event: AnalyticsEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: this.currentUserId,
      event_type: eventType,
      module: moduleName,
      metadata: Object.keys(cleanMeta).length > 0 ? cleanMeta : undefined,
      timestamp: new Date().toISOString(),
    };

    this.queue.push(event);

    if (this.queue.length >= 5) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 4000);
    }
  }

  trackModuleView(moduleName: string) {
    this.trackEvent('module_viewed', moduleName, { action: 'view' });
  }

  trackAction(moduleName: string, actionName: string) {
    this.trackEvent('action_performed', moduleName, { action: actionName });
  }

  trackError(moduleName: string, errorSummary: string) {
    this.trackEvent('error_logged', moduleName, { error: errorSummary });
  }

  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });
    } catch (e) {
      // Re-queue silently if network failure
      this.queue.unshift(...batch);
    }
  }
}

export const analytics = new AnalyticsService();
