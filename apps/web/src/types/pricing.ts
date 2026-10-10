export type PricingPlanTone = 'WOOD' | 'JADE' | 'GOLD' | 'LACQUER';

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
  dataEntrySupport: boolean;
  printBook: boolean;
};

export type PricingPlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: string | null;
  icon: string;
  tone: PricingPlanTone;
  badge: string | null;
  isFeatured: boolean;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
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
};

export type ServiceRegistrationStatus = 'NEW' | 'CONTACTED' | 'COMPLETED' | 'CANCELLED';

export type ServiceRegistration = {
  id: string;
  planId: string | null;
  planName: string;
  fullName: string;
  email: string;
  phone: string;
  status: ServiceRegistrationStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceRegistrationInput = {
  planId: string;
  fullName: string;
  email: string;
  phone: string;
  agreed: boolean;
};
