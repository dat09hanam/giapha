export type PricingPlanTone = 'WOOD' | 'JADE' | 'GOLD' | 'LACQUER';

export type PricingFeatureStyle = 'NORMAL' | 'BOLD' | 'STRIKETHROUGH';

export type PricingPlanFeature = {
  id: string;
  text: string;
  style: PricingFeatureStyle;
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
};

export type PricingPlanInput = Omit<PricingPlan, 'id' | 'features'> & {
  features: Array<Pick<PricingPlanFeature, 'text' | 'style'>>;
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
