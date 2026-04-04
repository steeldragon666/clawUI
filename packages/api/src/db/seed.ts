import { db } from './index';
import { tenants, servers, agents, tasks, contentItems } from './schema';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('Seeding Omniscient AMC database...');

  // Tenants
  const [acme] = await db.insert(tenants).values({
    companyName: 'Acme Corp',
    brandVoiceRules: { tone: 'professional', humor: 'light' },
    approvalWorkflow: 'hybrid',
    slaTier: 'professional',
    pricingTier: 'growth',
    platforms: ['twitter', 'linkedin', 'facebook'],
  }).returning();

  const [brandx] = await db.insert(tenants).values({
    companyName: 'BrandX',
    brandVoiceRules: { tone: 'casual', humor: 'heavy' },
    approvalWorkflow: 'auto',
    slaTier: 'basic',
    pricingTier: 'starter',
    platforms: ['twitter', 'instagram'],
  }).returning();

  const [greenhouse] = await db.insert(tenants).values({
    companyName: 'Internal — Greenhouse',
    brandVoiceRules: {},
    approvalWorkflow: 'auto',
    slaTier: 'enterprise',
    pricingTier: 'internal',
    platforms: [],
  }).returning();

  // Servers
  const [server1] = await db.insert(servers).values({
    tenantId: greenhouse.id,
    hostname: 'greenhouse-pi-01',
    ipAddress: '192.168.1.10',
    region: 'local',
    status: 'online',
    specs: { cpuCores: 4, memoryGb: 8, diskGb: 128, os: 'Ubuntu 24.04' },
  }).returning();

  const [server2] = await db.insert(servers).values({
    tenantId: acme.id,
    hostname: 'biz-auto-01',
    ipAddress: '192.168.1.20',
    region: 'local',
    status: 'online',
    specs: { cpuCores: 8, memoryGb: 16, diskGb: 256, os: 'Ubuntu 24.04' },
  }).returning();

  const [server3] = await db.insert(servers).values({
    tenantId: brandx.id,
    hostname: 'biz-auto-02',
    ipAddress: '192.168.1.30',
    region: 'local',
    status: 'online',
    specs: { cpuCores: 8, memoryGb: 16, diskGb: 256, os: 'Ubuntu 24.04' },
  }).returning();

  // Agents
  const agentDefs = [
    // Greenhouse agents
    { serverId: server1.id, tenantId: greenhouse.id, name: 'sensor-mon-01', role: 'sensor-monitor' as const, status: 'working' as const },
    { serverId: server1.id, tenantId: greenhouse.id, name: 'climate-ctrl-01', role: 'climate-control' as const, status: 'idle' as const },
    { serverId: server1.id, tenantId: greenhouse.id, name: 'irrigation-01', role: 'irrigation' as const, status: 'idle' as const },
    // Acme agents
    { serverId: server2.id, tenantId: acme.id, name: 'acme-email-01', role: 'email-filter' as const, status: 'working' as const },
    { serverId: server2.id, tenantId: acme.id, name: 'acme-social-01', role: 'social-post' as const, status: 'working' as const },
    { serverId: server2.id, tenantId: acme.id, name: 'acme-seo-01', role: 'seo-optimize' as const, status: 'error' as const },
    { serverId: server2.id, tenantId: acme.id, name: 'acme-content-01', role: 'content-gen' as const, status: 'idle' as const },
    { serverId: server2.id, tenantId: acme.id, name: 'acme-blog-01', role: 'blog-writer' as const, status: 'working' as const },
    // BrandX agents
    { serverId: server3.id, tenantId: brandx.id, name: 'brandx-social-01', role: 'social-post' as const, status: 'working' as const },
    { serverId: server3.id, tenantId: brandx.id, name: 'brandx-content-01', role: 'content-gen' as const, status: 'idle' as const },
    { serverId: server3.id, tenantId: brandx.id, name: 'brandx-engage-01', role: 'engagement-monitor' as const, status: 'working' as const },
  ];

  const insertedAgents = await db.insert(agents).values(agentDefs).returning();

  // Tasks — diverse statuses for pipeline demo
  const now = new Date();
  const taskDefs = [
    // Active
    { tenantId: acme.id, agentId: insertedAgents[3].id, type: 'email-batch' as const, status: 'active' as const, priority: 2 as const, title: 'Process morning inbox batch', description: 'Filter and respond to 50 incoming emails', startedAt: new Date(now.getTime() - 60000) },
    { tenantId: acme.id, agentId: insertedAgents[4].id, type: 'social-post' as const, status: 'active' as const, priority: 1 as const, title: 'Post Q2 update to LinkedIn', description: 'Publish Acme Corp quarterly update', startedAt: new Date(now.getTime() - 30000) },
    { tenantId: brandx.id, agentId: insertedAgents[8].id, type: 'social-post' as const, status: 'active' as const, priority: 2 as const, title: 'Instagram carousel: Summer collection', description: 'Create and post 5-image carousel', startedAt: new Date(now.getTime() - 20000) },
    { tenantId: greenhouse.id, agentId: insertedAgents[0].id, type: 'sensor-read' as const, status: 'active' as const, priority: 2 as const, title: 'Hourly sensor reading', description: 'Read humidity, temperature, soil moisture', startedAt: new Date(now.getTime() - 10000) },
    // Queued
    { tenantId: acme.id, agentId: null, type: 'blog-draft' as const, status: 'queued' as const, priority: 1 as const, title: 'Blog: AI Trends Q2 2026', description: 'Draft 1500-word blog post on AI trends', estimatedDuration: 300 },
    { tenantId: brandx.id, agentId: null, type: 'content-gen' as const, status: 'queued' as const, priority: 3 as const, title: 'Generate weekly content batch', description: 'Produce 10 posts for next week', estimatedDuration: 600 },
    { tenantId: acme.id, agentId: null, type: 'seo-audit' as const, status: 'queued' as const, priority: 2 as const, title: 'SEO audit: acmecorp.com', description: 'Full site audit with recommendations', estimatedDuration: 180 },
    // Approval
    { tenantId: acme.id, agentId: insertedAgents[4].id, type: 'social-post' as const, status: 'approval' as const, priority: 2 as const, title: 'Twitter thread: Product launch', description: '5-tweet thread for new product', startedAt: new Date(now.getTime() - 600000), actualDuration: 25 },
    { tenantId: brandx.id, agentId: insertedAgents[8].id, type: 'social-post' as const, status: 'approval' as const, priority: 1 as const, title: 'TikTok: Behind the scenes', description: 'Short-form video post', startedAt: new Date(now.getTime() - 300000), actualDuration: 40 },
    // Done
    { tenantId: greenhouse.id, agentId: insertedAgents[0].id, type: 'sensor-read' as const, status: 'done' as const, priority: 3 as const, title: 'Previous sensor reading', description: 'Completed sensor batch', startedAt: new Date(now.getTime() - 3600000), completedAt: new Date(now.getTime() - 3592000), actualDuration: 8 },
    { tenantId: acme.id, agentId: insertedAgents[3].id, type: 'email-batch' as const, status: 'done' as const, priority: 2 as const, title: 'Process afternoon inbox', description: '35 emails processed', startedAt: new Date(now.getTime() - 7200000), completedAt: new Date(now.getTime() - 7128000), actualDuration: 72 },
    // Failed
    { tenantId: acme.id, agentId: insertedAgents[5].id, type: 'seo-audit' as const, status: 'failed' as const, priority: 2 as const, title: 'SEO audit: blog section', description: 'Crawl failed — timeout', startedAt: new Date(now.getTime() - 5400000), completedAt: new Date(now.getTime() - 5280000), actualDuration: 120, retryCount: 3 },
  ];

  await db.insert(tasks).values(taskDefs);

  // Content items
  const contentDefs = [
    { tenantId: acme.id, platform: 'linkedin' as const, contentBody: 'Excited to share our Q2 results! Revenue up 23% YoY...', status: 'scheduled' as const, scheduledAt: new Date(now.getTime() + 3600000) },
    { tenantId: acme.id, platform: 'twitter' as const, contentBody: '🚀 Big product launch coming next week! Stay tuned for our announcement thread.', status: 'approved' as const },
    { tenantId: brandx.id, platform: 'instagram' as const, contentBody: 'Summer vibes only ☀️ Check out our new collection dropping Friday!', status: 'draft' as const, mediaUrls: ['https://placeholder.co/carousel-1.jpg'] },
    { tenantId: brandx.id, platform: 'twitter' as const, contentBody: 'What\'s your go-to summer outfit? Drop your picks below 👇', status: 'published' as const, publishedAt: new Date(now.getTime() - 86400000), engagement: { likes: 234, retweets: 45, replies: 18 } },
    { tenantId: acme.id, platform: 'facebook' as const, contentBody: 'We\'re hiring! Join our engineering team and help build the future of AI automation.', status: 'review' as const },
  ];

  await db.insert(contentItems).values(contentDefs);

  console.log(`Seeded: ${3} tenants, ${3} servers, ${agentDefs.length} agents, ${taskDefs.length} tasks, ${contentDefs.length} content items`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
