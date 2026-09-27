export type SubscriptionPlanId = 'trial' | 'free' | 'plus' | 'pro' | 'campus';

export interface PlanConfig {
  id: 'trial' | 'free' | 'plus' | 'pro' | 'campus';
  name: string;
  badge: string;
  headline: string;
  description: string;
  durationDays: number | null; // 7 days for trial, null for recurring
  maxCourses: number;
  maxUploadMB: number;
  maxUploadBytes: number;
  whatsappFeatures: {
    enabled: boolean;
    limited: boolean;
    summary: string;
  };
  emailFeatures: {
    enabled: boolean;
    summary: string;
  };
  byokFeatures: {
    allowedOnboarding: boolean;
    multiModelSwitcher: boolean;
    hostedFallback: boolean;
    summary: string;
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
    name: 'StudySync Free',
    badge: 'Free (1 Course)',
    headline: 'Free Student Workspace',
    description: 'Autonomous student scheduling, 1 active course, 10MB slide uploads, and core AI chat.',
    durationDays: null,
    maxCourses: 1,
    maxUploadMB: 10,
    maxUploadBytes: 10 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: true,
      summary: 'WhatsApp Integration (Limited to 15 alerts/wk)',
    },
    emailFeatures: {
      enabled: true,
      summary: 'Full Email Integration (Daily agenda & summaries)',
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: false,
      hostedFallback: false,
      summary: 'Connect Your Own API Key (Gemini / Groq)',
    },
    pricing: {
      monthly: 0,
      yearlyPerMonth: 0,
      yearlyTotal: 0,
    },
  },

  trial: {
    id: 'trial',
    name: '7-Day Free Trial',
    badge: '7 Days Access',
    headline: '7-Day Test Drive',
    description: 'Experience autonomous student scheduling, 1 active course, and 10MB slide uploads.',
    durationDays: 7,
    maxCourses: 1,
    maxUploadMB: 10,
    maxUploadBytes: 10 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: true,
      summary: 'WhatsApp Integration (Limited to 15 alerts/wk)',
    },
    emailFeatures: {
      enabled: true,
      summary: 'Full Email Integration (Daily agenda & summaries)',
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: false,
      hostedFallback: false,
      summary: 'Connect Your Own API Key (Gemini / Groq) on onboarding',
    },
    pricing: {
      monthly: 0,
      yearlyPerMonth: 0,
      yearlyTotal: 0,
    },
  },

  plus: {
    id: 'plus',
    name: 'StudySync Plus',
    badge: '5 Courses',
    headline: 'Dedicated Semester',
    description: 'Ideal for students managing up to 5 courses, 50MB uploads, and full WhatsApp notifications.',
    durationDays: null,
    maxCourses: 5,
    maxUploadMB: 50,
    maxUploadBytes: 50 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: false,
      summary: 'Full WhatsApp Integration (Daily alerts & quiz warnings)',
    },
    emailFeatures: {
      enabled: true,
      summary: 'Full Email Integration (Instant alerts & digests)',
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: false,
      hostedFallback: false,
      summary: 'Connect Your Own API Key (BYOK) (Gemini, Groq, OpenAI)',
    },
    pricing: {
      monthly: 1000,
      yearlyPerMonth: 800,
      yearlyTotal: 9600,
    },
  },

  pro: {
    id: 'pro',
    name: 'StudySync Pro',
    badge: '10 Courses',
    headline: 'Power Scholar & FYP',
    description: 'Up to 10 courses, 150MB uploads, Unlimited WhatsApp Baileys, and Multi-Model BYOK Switcher.',
    durationDays: null,
    maxCourses: 10,
    maxUploadMB: 150,
    maxUploadBytes: 150 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: false,
      summary: 'Unlimited WhatsApp Baileys (Voice notes & instant alerts)',
    },
    emailFeatures: {
      enabled: true,
      summary: 'Full Email Integration (Priority agenda digests & group sync)',
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: true,
      hostedFallback: true,
      summary: 'Multi-Model BYOK Switcher (Gemini 1.5 Pro, GPT-4o, Claude with Hosted Fallback)',
    },
    pricing: {
      monthly: 2000,
      yearlyPerMonth: 1600,
      yearlyTotal: 19200,
    },
  },

  campus: {
    id: 'campus',
    name: 'Campus Enterprise',
    badge: '25 Courses',
    headline: 'University Department',
    description: 'Enterprise grade capacity for societies and departmental batches.',
    durationDays: null,
    maxCourses: 25,
    maxUploadMB: 200,
    maxUploadBytes: 200 * 1024 * 1024,
    whatsappFeatures: {
      enabled: true,
      limited: false,
      summary: 'Full WhatsApp Integration with dedicated custom bot instance',
    },
    emailFeatures: {
      enabled: true,
      summary: 'Full Email Integration with university domain whitelist',
    },
    byokFeatures: {
      allowedOnboarding: true,
      multiModelSwitcher: true,
      hostedFallback: true,
      summary: 'Multi-Model BYOK & Enterprise Shared Key Pooling',
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

export const WHATSAPP_SALES_NUMBER =
  (import.meta.env.VITE_WHATSAPP_SALES_NUMBER as string) || '923030111550';

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

export function getPlanConfig(plan?: string | null): PlanConfig {
  const norm = normalizePlanId(plan);
  return PLAN_CONFIGS[norm] || PLAN_CONFIGS.free;
}

/**
 * Builds the direct WhatsApp purchase URL with pre-filled message:
 * "1 want this plan: [Plan Name] ([Cycle] - [Price]). My registered email is: [Email]. Please upgrade my account."
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

  const emailPart =
    userEmail && userEmail.trim() ? ` My registered email is: ${userEmail.trim()}.` : '';

  const message = `1 want this plan: ${cfg.name} (${
    billingCycle === 'yearly' ? 'Yearly' : 'Monthly'
  } - ${priceStr}).${emailPart} Please upgrade my account.`;

  return `https://wa.me/${WHATSAPP_SALES_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Build WhatsApp link for buying extra courses at Rs. 100/course
 */
export function buildWhatsAppExtraCourseUrl(userEmail?: string): string {
  const emailPart =
    userEmail && userEmail.trim() ? ` My registered email is: ${userEmail.trim()}.` : '';
  const message = `1 want to add extra course(s) for Rs. 100 each on my StudySync account.${emailPart} Please increase my course limit.`;
  return `https://wa.me/${WHATSAPP_SALES_NUMBER}?text=${encodeURIComponent(message)}`;
}
