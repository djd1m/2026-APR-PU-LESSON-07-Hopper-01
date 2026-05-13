import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { B2BService } from './b2b.service';

@ApiTags('b2b')
@Controller('api/b2b')
export class B2BController {
  constructor(private readonly b2bService: B2BService) {}

  @Post('partners')
  @ApiOperation({
    summary: 'Register a new B2B partner',
    description:
      'Creates a new partner account for banks, airlines, travel agencies, or insurance companies. ' +
      'Returns API key and sandbox URL for integration testing.',
  })
  @ApiCreatedResponse({ description: 'Partner registered successfully' })
  async registerPartner(
    @Body()
    data: {
      company_name: string;
      contact_email: string;
      contact_name: string;
      partner_type: 'bank' | 'airline' | 'travel_agency' | 'insurance' | 'other';
      website?: string;
      description?: string;
    },
  ) {
    return this.b2bService.registerPartner(data);
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get partner analytics dashboard',
    description:
      'Returns bookings, revenue, protection attach rate, user stats, ' +
      'and revenue share for the authenticated partner.',
  })
  @ApiQuery({ name: 'partner_id', example: 'partner-abc123', description: 'Partner ID' })
  @ApiOkResponse({ description: 'Partner analytics data' })
  async getDashboard(@Query('partner_id') partnerId: string) {
    return this.b2bService.getDashboard(partnerId);
  }

  @Post('sandbox')
  @ApiOperation({
    summary: 'Generate a branded sandbox demo',
    description:
      'Creates a white-labeled sandbox environment with partner branding. ' +
      'Valid for 30 days. Includes demo credentials for testing.',
  })
  @ApiCreatedResponse({ description: 'Sandbox created' })
  async generateSandbox(
    @Body()
    data: {
      partner_id: string;
      brand_name?: string;
      primary_color?: string;
      logo_url?: string;
      features?: string[];
    },
  ) {
    return this.b2bService.generateSandbox(data.partner_id, {
      brand_name: data.brand_name,
      primary_color: data.primary_color,
      logo_url: data.logo_url,
      features: data.features,
    });
  }
}
