import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { HotelSearchController } from './hotel-search.controller';
import { HotelSearchService } from './hotel-search.service';

@Module({
  controllers: [SearchController, HotelSearchController],
  providers: [SearchService, HotelSearchService],
  exports: [SearchService, HotelSearchService],
})
export class SearchModule {}
