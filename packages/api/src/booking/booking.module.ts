import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../common/redis.module';
import { BOOKING_PROVIDER } from './providers';
import { MockBookingProvider } from './providers/mock-booking.provider';
import { NemoBookingProvider } from './providers/nemo-booking.provider';

@Module({
  imports: [AuthModule, RedisModule],
  controllers: [BookingController],
  providers: [
    BookingService,
    MockBookingProvider,
    NemoBookingProvider,
    {
      provide: BOOKING_PROVIDER,
      useFactory: (config: ConfigService, mock: MockBookingProvider, nemo: NemoBookingProvider) => {
        const provider = config.get<string>('BOOKING_PROVIDER', 'mock');
        if (provider === 'nemo') {
          console.log('[BookingModule] Using Nemo.travel provider (REAL GDS)');
          return nemo;
        }
        console.log('[BookingModule] Using Mock provider (simulated booking)');
        return mock;
      },
      inject: [ConfigService, MockBookingProvider, NemoBookingProvider],
    },
  ],
  exports: [BookingService],
})
export class BookingModule {}
