import { Module, Global } from '@nestjs/common';
import { YooKassaService } from './yookassa.service';
import { PaymentController } from './payment.controller';

@Global()
@Module({
  providers: [YooKassaService],
  controllers: [PaymentController],
  exports: [YooKassaService],
})
export class PaymentModule {}
