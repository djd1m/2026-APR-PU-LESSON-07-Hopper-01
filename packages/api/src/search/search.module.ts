import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { TravelpayoutsService } from './travelpayouts.service';
import { AmadeusService } from './amadeus.service';
import { RedisModule } from '../common/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [SearchController],
  providers: [SearchService, TravelpayoutsService, AmadeusService],
  exports: [SearchService],
})
export class SearchModule {}
