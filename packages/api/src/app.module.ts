import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { RedisModule } from './common/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { PredictionModule } from './prediction/prediction.module';
import { BookingModule } from './booking/booking.module';
import { FintechModule } from './fintech/fintech.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { B2BModule } from './b2b/b2b.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    SearchModule,
    PredictionModule,
    BookingModule,
    FintechModule,
    UserModule,
    NotificationModule,
    B2BModule,
  ],
})
export class AppModule {}
