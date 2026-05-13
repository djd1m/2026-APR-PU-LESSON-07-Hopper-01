import { Injectable, Logger, BadRequestException } from '@nestjs/common';

/** Partner types supported by the B2B platform */
type PartnerType = 'bank' | 'airline' | 'travel_agency' | 'insurance' | 'other';

/** Partner tier determines revenue share and API limits */
type PartnerTier = 'starter' | 'growth' | 'enterprise';

interface PartnerRegistration {
  company_name: string;
  contact_email: string;
  contact_name: string;
  partner_type: PartnerType;
  website?: string;
  description?: string;
}

interface Partner {
  id: string;
  company_name: string;
  contact_email: string;
  contact_name: string;
  partner_type: PartnerType;
  tier: PartnerTier;
  api_key: string;
  sandbox_url: string;
  status: 'pending' | 'active' | 'suspended';
  revenue_share_pct: number;
  created_at: string;
}

interface PartnerAnalytics {
  partner_id: string;
  period: string;
  bookings: {
    total: number;
    confirmed: number;
    cancelled: number;
    revenue: { amount: number; currency: string };
  };
  protections: {
    attach_rate_pct: number;
    total_sold: number;
    revenue: { amount: number; currency: string };
  };
  users: {
    total: number;
    active: number;
    new_this_period: number;
  };
  revenue_share: {
    earned: { amount: number; currency: string };
    paid: { amount: number; currency: string };
    pending: { amount: number; currency: string };
  };
}

@Injectable()
export class B2BService {
  private readonly logger = new Logger(B2BService.name);

  /** Revenue share percentages by tier */
  private readonly REVENUE_SHARE: Record<PartnerTier, number> = {
    starter: 15,
    growth: 20,
    enterprise: 25,
  };

  /**
   * Register a new B2B partner.
   * Creates partner account with API key and sandbox environment.
   */
  async registerPartner(data: PartnerRegistration): Promise<{ partner: Partner }> {
    this.logger.log(
      `Registering B2B partner: ${data.company_name} (${data.partner_type})`,
    );

    // Validate
    if (!data.company_name || !data.contact_email) {
      throw new BadRequestException('company_name and contact_email are required');
    }

    // Generate API key and sandbox URL
    const partnerId = `partner-${Date.now().toString(36)}`;
    const apiKey = `hru_b2b_${this.generateApiKey()}`;
    const sandboxUrl = `https://sandbox.hopperru.ru/${partnerId}`;

    const partner: Partner = {
      id: partnerId,
      company_name: data.company_name,
      contact_email: data.contact_email,
      contact_name: data.contact_name,
      partner_type: data.partner_type,
      tier: 'starter',
      api_key: apiKey,
      sandbox_url: sandboxUrl,
      status: 'pending',
      revenue_share_pct: this.REVENUE_SHARE.starter,
      created_at: new Date().toISOString(),
    };

    // TODO: Save to database
    // TODO: Send welcome email with API docs
    // TODO: Create sandbox environment

    return { partner };
  }

  /**
   * Get partner analytics dashboard data.
   * Returns bookings, revenue, protection attach rate, and revenue share.
   */
  async getDashboard(partnerId: string): Promise<{ analytics: PartnerAnalytics }> {
    this.logger.log(`Fetching dashboard for partner ${partnerId}`);

    // TODO: Query real analytics from ClickHouse
    // Mock analytics data
    const analytics: PartnerAnalytics = {
      partner_id: partnerId,
      period: 'last_30_days',
      bookings: {
        total: 1247,
        confirmed: 1089,
        cancelled: 158,
        revenue: { amount: 15_680_000, currency: 'RUB' },
      },
      protections: {
        attach_rate_pct: 34.2,
        total_sold: 427,
        revenue: { amount: 1_854_000, currency: 'RUB' },
      },
      users: {
        total: 8543,
        active: 2341,
        new_this_period: 876,
      },
      revenue_share: {
        earned: { amount: 2_630_100, currency: 'RUB' },
        paid: { amount: 1_890_000, currency: 'RUB' },
        pending: { amount: 740_100, currency: 'RUB' },
      },
    };

    return { analytics };
  }

  /**
   * Generate a branded sandbox demo for a partner.
   * Creates a white-labeled version of HopperRU with partner branding.
   */
  async generateSandbox(
    partnerId: string,
    config: {
      brand_name?: string;
      primary_color?: string;
      logo_url?: string;
      features?: string[];
    },
  ) {
    this.logger.log(
      `Generating sandbox for partner ${partnerId}: ${JSON.stringify(config)}`,
    );

    // TODO: Create isolated sandbox environment
    // TODO: Apply branding configuration
    // TODO: Generate demo data

    const sandboxId = `sandbox-${Date.now().toString(36)}`;

    return {
      sandbox: {
        id: sandboxId,
        partner_id: partnerId,
        url: `https://sandbox.hopperru.ru/${sandboxId}`,
        api_base_url: `https://api.sandbox.hopperru.ru/${sandboxId}`,
        config: {
          brand_name: config.brand_name || 'HopperRU Partner',
          primary_color: config.primary_color || '#2563eb',
          logo_url: config.logo_url || null,
          features: config.features || [
            'flight_search',
            'price_prediction',
            'price_freeze',
            'cfar',
            'price_drop',
          ],
        },
        demo_credentials: {
          email: 'demo@partner.test',
          password: 'demo123',
        },
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        status: 'active',
        created_at: new Date().toISOString(),
      },
    };
  }

  private generateApiKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }
}
