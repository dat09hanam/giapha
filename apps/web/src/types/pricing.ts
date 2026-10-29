export type PricingPlanTone =
  'GOLD' | 'ASH' | 'SPROUT' | 'TURQUOISE' | 'AMETHYST' | 'BRONZE' | 'ONYX';

export type PricingFeatureStyle = 'NORMAL' | 'BOLD' | 'STRIKETHROUGH';

/** One entry of the API's plan catalog: a limit with a number, or an option a plan includes or not. */
export type PlanCatalogEntry =
  | {
      key: string;
      kind: 'LIMIT';
      label: string;
      description: string;
      template: string;
      unlimitedText: string;
      min: number;
      max: number;
      /** 'MB': the value is a size in megabytes, shown as MB or GB. */
      unit?: 'MB';
    }
  | { key: string; kind: 'OPTION'; label: string; description: string; text: string };

export type PricingPlanFeature = {
  id: string;
  /** A catalog key. */
  key: string;
  /** A limit's number; null means unlimited, and always null for a module. */
  value: number | null;
  style: PricingFeatureStyle;
  /** Rendered by the API from the catalog. */
  text: string;
};

/** What a plan's lines enforce for a family, resolved by the API. */
export type PlanRights = {
  maxMembers: number | null;
  durationMonths: number | null;
  maxManagers: number | null;
  maxStorageMb: number | null;
  dataEntrySupport: boolean;
  printBook: boolean;
};

export type PricingPlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  /** Display-only "was" price shown struck through on the card; null = none. Never charged. */
  originalPrice: number | null;
  /** Percent of `price` an ambassador earns; 0 means the plan earns none. */
  commissionPercent: number;
  billingPeriod: string | null;
  icon: string;
  tone: PricingPlanTone;
  badge: string | null;
  isFeatured: boolean;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
  /** Google self-service sign-up opens families on this plan; at most one plan. Admin-only. */
  googleSignup: boolean;
  sortOrder: number;
  features: PricingPlanFeature[];
  rights: PlanRights;
};

export type PricingPlanFeatureInput = Pick<PricingPlanFeature, 'key' | 'value' | 'style'>;

/** A plan's card details. Features and display order are saved from the feature table. */
export type PricingPlanInput = Omit<PricingPlan, 'id' | 'features' | 'rights' | 'sortOrder'>;

/** What a pricing card needs: display lines only. */
export type PricingCardPlan = PricingPlanInput & {
  features: Array<Pick<PricingPlanFeature, 'text' | 'style'>>;
};

/** A family's plan limits, for warning before the API refuses an addition. */
export type FamilyPlanLimits = {
  planName: string;
  maxMembers: number | null;
  maxManagers: number | null;
  maxStorageMb: number | null;
  /** Megabytes the family's uploads take, rounded up. */
  storageUsedMb: number;
};

export type ServiceRegistrationStatus = 'NEW' | 'CONTACTED' | 'COMPLETED' | 'CANCELLED';

export type ServiceRegistration = {
  id: string;
  planId: string | null;
  planName: string;
  fullName: string;
  email: string | null;
  phone: string;
  /** Ambassador code the visitor entered, to carry over when opening the family. */
  ambassadorCode: string | null;
  status: ServiceRegistrationStatus;
  adminNote: string | null;
  /** Null until an admin opened the list after this registration arrived. */
  seenAt: string | null;
  /** The family asking to change plan; null for a new family's sign-up. */
  family: { name: string; slug: string; currentPlanName: string } | null;
  /** The family's plan when it sent the request; null for a sign-up or an older request. */
  fromPlanName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRegistrationInput = {
  planId: string;
  fullName: string;
  email?: string;
  phone: string;
  ambassadorCode?: string;
  agreed: boolean;
};
