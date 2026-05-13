import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env.local'),
        resolve(process.cwd(), '.env'),
        resolve(__dirname, '../../../.env'),
      ],
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
  ],
})
export class AppModule {}
