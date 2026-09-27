export type SubscriptionPlanId = 'trial' | 'free' | 'plus' | 'pro' | 'campus';

export interface PlanConfig {
  id: SubscriptionPlanId;
  normalizedId: 'trial' | 'free' | 'plus' | 'pro' | 'campus';
  name: string;
  headline: string;
  description: string;
  durationDays: number | null; // 7 days for trial, null for recurring
  maxCourses: number;
  maxUploadMB: number;
  maxUploadBytes: number;
  whatsappFeatures: {
    enabled: boolean;
    limited: boolean;
    maxAlertsPerWeek?: number;
    voiceNotes: boolean;
  };
  emailFeatures: {
    enabled: boolean;
    dailyAgenda: boolean;
    instantReminders: boolean;
  };
  byokFeatures: {
    allowedOnboarding: boolean;
    multiModelSwitcher: boolean;
    hostedFallback: boolean;
    allowedProviders: string[];
  };
  pricing: {
    monthly: number;
    yearlyPerMonth: number;
    yearlyTotal: number;
  };
}

export const PLAN_CONFIGS: Record<'trial' | 'free' | 'plus' | 'pro' | 'campus', PlanConfig> = {
  free: {
    id: 'free',
    normalizedId: 'free',
    name: 'StudySync Free',
    headline: 'Free Academic Workspace',
    description: 'Autonomous student scheduling, 1 active course, 10MB slide uploads, and core AI tools.',
    durationDays: null,
    maxCourses: 1,
    maxUploadMB: 10,
    maxUploadBytes: 10 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: true,
      maxAlertsPerWeek: 15,
      voiceNotes: false,
    },
    emailFeatures: {
      enabled: true,
      dailyAgenda: true,
      instantReminders: true,
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: false,
      hostedFallback: false,
      allowedProviders: ['gemini', 'groq'],
    },
    pricing: {
      monthly: 0,
      yearlyPerMonth: 0,
      yearlyTotal: 0,
    },
  },

  trial: {
    id: 'trial',
    normalizedId: 'trial',
    name: '7-Day Free Trial',
    headline: '7-Day Test Drive',
    description: 'Experience autonomous student scheduling, 1 active course, and 10MB slide uploads.',
    durationDays: 7,
    maxCourses: 1,
    maxUploadMB: 10,
    maxUploadBytes: 10 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: true,
      maxAlertsPerWeek: 15,
      voiceNotes: false,
    },
    emailFeatures: {
      enabled: true,
      dailyAgenda: true,
      instantReminders: true,
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: false,
      hostedFallback: false,
      allowedProviders: ['gemini', 'groq'],
    },
    pricing: {
      monthly: 0,
      yearlyPerMonth: 0,
      yearlyTotal: 0,
    },
  },

  plus: {
    id: 'plus',
    normalizedId: 'plus',
    name: 'StudySync Plus',
    headline: 'Dedicated Semester',
    description: 'Ideal for students managing up to 5 courses, 50MB uploads, and full WhatsApp notifications.',
    durationDays: null,
    maxCourses: 5,
    maxUploadMB: 50,
    maxUploadBytes: 50 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: false,
      voiceNotes: true,
    },
    emailFeatures: {
      enabled: true,
      dailyAgenda: true,
      instantReminders: true,
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: false,
      hostedFallback: false,
      allowedProviders: ['gemini', 'groq', 'openai'],
    },
    pricing: {
      monthly: 1000,
      yearlyPerMonth: 800,
      yearlyTotal: 9600,
    },
  },

  pro: {
    id: 'pro',
    normalizedId: 'pro',
    name: 'StudySync Pro',
    headline: 'Power Scholar & FYP',
    description: 'Up to 10 courses, 150MB uploads, Unlimited WhatsApp Baileys, and Multi-Model BYOK Switcher.',
    durationDays: null,
    maxCourses: 10,
    maxUploadMB: 150,
    maxUploadBytes: 150 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: false,
      voiceNotes: true,
    },
    emailFeatures: {
      enabled: true,
      dailyAgenda: true,
      instantReminders: true,
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: true,
      hostedFallback: true,
      allowedProviders: ['gemini', 'groq', 'openai', 'claude', 'anthropic'],
    },
    pricing: {
      monthly: 2000,
      yearlyPerMonth: 1600,
      yearlyTotal: 19200,
    },
  },

  campus: {
    id: 'campus',
    normalizedId: 'campus',
    name: 'Campus Enterprise',
    headline: 'University Department',
    description: 'Enterprise grade capacity for societies and departmental batches.',
    durationDays: null,
    maxCourses: 25,
    maxUploadMB: 200,
    maxUploadBytes: 200 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: false,
      voiceNotes: true,
    },
    emailFeatures: {
      enabled: true,
      dailyAgenda: true,
      instantReminders: true,
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: true,
      hostedFallback: true,
      allowedProviders: ['gemini', 'groq', 'openai', 'claude', 'anthropic'],
    },
    pricing: {
      monthly: 4500,
      yearlyPerMonth: 3600,
      yearlyTotal: 43200,
    },
  },
};

/**
 * Price for purchasing an individual extra course beyond top-tier plan (PKR)
 */
export const EXTRA_COURSE_PRICE_PKR = 100;

/**
 * Normalize any plan string (e.g. 'free' -> 'free', 'trial' -> 'trial')
 */
export function normalizePlanId(plan?: string | null): 'trial' | 'free' | 'plus' | 'pro' | 'campus' {
  if (!plan) return 'free';
  const p = plan.trim().toLowerCase();
  if (p === 'trial') return 'trial';
  if (p === 'free') return 'free';
  if (p === 'plus') return 'plus';
  if (p === 'pro') return 'pro';
  if (p === 'campus') return 'campus';
  return 'free';
}

/**
 * Get Plan Configuration
 */
export function getPlanConfig(plan?: string | null): PlanConfig {
  const norm = normalizePlanId(plan);
  return PLAN_CONFIGS[norm] || PLAN_CONFIGS.free;
}

/**
 * Calculate trial status and expiration details
 */
export function calculateTrialStatus(user: { createdAt?: Date | string; plan?: string | null }) {
  const normPlan = normalizePlanId(user.plan);
  // ONLY 'trial' is subjected to 7-day expiration! 'free', 'plus', 'pro', 'campus' are permanent subscription tiers
  if (normPlan !== 'trial') {
    return {
      isTrial: false,
      trialDaysRemaining: null,
      isTrialExpired: false,
      trialEndsAt: null,
    };
  }

  const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  const trialDurationMs = 7 * msPerDay;
  const trialEndsAt = new Date(createdAt + trialDurationMs);
  const now = Date.now();
  const elapsedMs = now - createdAt;
  const elapsedDays = elapsedMs / msPerDay;

  const isTrialExpired = elapsedDays > 7;
  const trialDaysRemaining = Math.max(0, Math.ceil(7 - elapsedDays));

  return {
    isTrial: true,
    trialDaysRemaining: isTrialExpired ? 0 : trialDaysRemaining,
    isTrialExpired,
    trialEndsAt: trialEndsAt.toISOString(),
  };
}

/**
 * Central WhatsApp Sales & Upgrade Number
 */
export const WHATSAPP_SALES_NUMBER = '923030111550';

/**
 * Build prefilled WhatsApp message link for plan purchases
 */
export function buildWhatsAppPurchaseUrl(
  plan: 'trial' | 'free' | 'plus' | 'pro' | 'campus',
  billingCycle: 'monthly' | 'yearly' = 'monthly',
  userEmail?: string
): string {
  const norm = normalizePlanId(plan);
  const cfg = PLAN_CONFIGS[norm] || PLAN_CONFIGS.plus;
  const priceStr =
    norm === 'trial' || norm === 'free'
      ? 'Free'
      : billingCycle === 'yearly'
      ? `Rs. ${cfg.pricing.yearlyPerMonth.toLocaleString()}/mo (Rs. ${cfg.pricing.yearlyTotal.toLocaleString()} billed yearly)`
      : `Rs. ${cfg.pricing.monthly.toLocaleString()}/mo`;

  const emailPart = userEmail && userEmail.trim() ? ` My registered email is: ${userEmail.trim()}.` : '';
  const message = `1 want this plan: ${cfg.name} (${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} - ${priceStr}).${emailPart} Please upgrade my account.`;

  return `https://wa.me/${WHATSAPP_SALES_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Build WhatsApp link for buying extra courses at Rs. 100/course
 */
export function buildWhatsAppExtraCourseUrl(userEmail?: string): string {
  const emailPart = userEmail && userEmail.trim() ? ` My registered email is: ${userEmail.trim()}.` : '';
  const message = `1 want to add extra course(s) for Rs. 100 each on my StudySync account.${emailPart} Please increase my course limit.`;
  return `https://wa.me/${WHATSAPP_SALES_NUMBER}?text=${encodeURIComponent(message)}`;
}
