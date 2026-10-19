export type AmbassadorStatus = 'ACTIVE' | 'SUSPENDED';

export type Ambassador = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  status: AmbassadorStatus;
  adminNote: string | null;
  createdAt: string;
  /** Families opened with this ambassador's code. */
  familyCount: number;
  pendingAmount: number;
  pendingCount: number;
  paidAmount: number;
  paidCount: number;
};

export type AmbassadorCommissionKind = 'NEW_FAMILY' | 'PLAN_CHANGE';

export type AmbassadorCommission = {
  id: string;
  ambassadorId: string;
  ambassadorName: string;
  ambassadorCode: string;
  familyName: string;
  /** Null once the family is deleted. */
  familySlug: string | null;
  planName: string;
  kind: AmbassadorCommissionKind;
  /** Percent of the plan price at the time; `amount` is what it came to. */
  percent: number;
  amount: number;
  createdAt: string;
  paidAt: string | null;
  paidByName: string | null;
  paidNote: string | null;
};

export type AmbassadorSignupInput = {
  fullName: string;
  phone: string;
  email: string;
  agreed: boolean;
};

export type AmbassadorSignupResult = {
  /** The email had signed up before; the existing code was emailed again. */
  alreadyRegistered: boolean;
};
