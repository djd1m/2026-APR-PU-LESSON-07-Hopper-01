import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { TrainSearchController } from './train-search.controller';
import { TrainSearchService } from './train-search.service';

@Module({
  controllers: [SearchController, TrainSearchController],
  providers: [SearchService, TrainSearchService],
  exports: [SearchService, TrainSearchService],
})
export class SearchModule {}
