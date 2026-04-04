export type ServerStatus = 'online' | 'degraded' | 'offline';

export interface Server {
  id: string;
  tenantId: string | null;
  hostname: string;
  ipAddress: string;
  region: string;
  status: ServerStatus;
  specs: {
    cpuCores?: number;
    memoryGb?: number;
    diskGb?: number;
    os?: string;
  };
  lastSeen: string | null;
  createdAt: string;
}
