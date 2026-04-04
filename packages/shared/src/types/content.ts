export type Platform = 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok';
export type ContentStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'rejected';

export interface ContentItem {
  id: string;
  tenantId: string;
  taskId: string | null;
  platform: Platform;
  contentBody: string;
  mediaUrls: string[];
  hashtags: string[];
  mentions: string[];
  version: number;
  status: ContentStatus;
  approvedBy: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  engagement: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAccount {
  id: string;
  tenantId: string;
  platform: Platform;
  accountName: string;
  rateLimitState: Record<string, unknown>;
  postingSchedule: Record<string, unknown>;
  lastRefresh: string | null;
  createdAt: string;
}
