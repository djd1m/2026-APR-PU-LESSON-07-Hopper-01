import { Module } from '@nestjs/common';
import { FintechController } from './fintech.controller';
import { FintechService } from './fintech.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FintechController],
  providers: [FintechService],
  exports: [FintechService],
})
export class FintechModule {}
