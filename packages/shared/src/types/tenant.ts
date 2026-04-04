export type SlaTier = 'basic' | 'professional' | 'enterprise';

export interface Tenant {
  id: string;
  companyName: string;
  brandVoiceRules: Record<string, unknown>;
  approvalWorkflow: 'auto' | 'manual' | 'hybrid';
  slaTier: SlaTier;
  pricingTier: string;
  platforms: string[];
  createdAt: string;
  updatedAt: string;
}
