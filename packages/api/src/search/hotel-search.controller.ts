import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { HotelSearchService } from './hotel-search.service';

@ApiTags('search')
@Controller('api/search')
export class HotelSearchController {
  constructor(private readonly hotelSearchService: HotelSearchService) {}

  @Get('hotels')
  @ApiOperation({
    summary: 'Search hotels by city, dates, and guests',
    description:
      'Returns available hotels for Russian cities with pricing, amenities, and ratings. ' +
      'Supports filtering by stars, price range, and amenities.',
  })
  @ApiQuery({ name: 'city', example: 'Москва', description: 'City name or IATA airport code' })
  @ApiQuery({ name: 'checkin', example: '2026-07-15', description: 'Check-in date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'checkout', example: '2026-07-20', description: 'Check-out date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'guests', required: false, example: 2, description: 'Number of guests (default: 2)' })
  @ApiQuery({ name: 'min_stars', required: false, example: 3, description: 'Minimum star rating' })
  @ApiQuery({ name: 'max_stars', required: false, example: 5, description: 'Maximum star rating' })
  @ApiQuery({ name: 'min_price', required: false, example: 2000, description: 'Minimum price per night (RUB)' })
  @ApiQuery({ name: 'max_price', required: false, example: 15000, description: 'Maximum price per night (RUB)' })
  @ApiQuery({ name: 'amenities', required: false, example: 'wifi,pool', description: 'Required amenities (comma-separated)' })
  @ApiOkResponse({ description: 'List of available hotels sorted by price' })
  async searchHotels(
    @Query('city') city: string,
    @Query('checkin') checkin: string,
    @Query('checkout') checkout: string,
    @Query('guests') guests?: string,
    @Query('min_stars') minStars?: string,
    @Query('max_stars') maxStars?: string,
    @Query('min_price') minPrice?: string,
    @Query('max_price') maxPrice?: string,
    @Query('amenities') amenities?: string,
  ) {
    return this.hotelSearchService.searchHotels(
      city,
      checkin,
      checkout,
      guests ? parseInt(guests, 10) : 2,
      {
        min_stars: minStars ? parseInt(minStars, 10) : undefined,
        max_stars: maxStars ? parseInt(maxStars, 10) : undefined,
        min_price: minPrice ? parseInt(minPrice, 10) : undefined,
        max_price: maxPrice ? parseInt(maxPrice, 10) : undefined,
        amenities: amenities ? amenities.split(',').map((a) => a.trim()) : undefined,
      },
    );
  }
}
