import { IsString, IsNotEmpty, ValidateNested, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class PushSubscriptionKeys {
  @ApiProperty({ description: 'p256dh public key for push encryption' })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty({ description: 'auth secret for push encryption' })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}

export class SubscribePushDto {
  @ApiProperty({
    description: 'Push subscription endpoint URL from the browser Push API',
    example: 'https://fcm.googleapis.com/fcm/send/...',
  })
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @ApiProperty({
    description: 'Encryption keys for push messages',
    type: PushSubscriptionKeys,
  })
  @ValidateNested()
  @Type(() => PushSubscriptionKeys)
  keys!: PushSubscriptionKeys;

  @ApiPropertyOptional({
    description: 'Optional user agent info for device tracking',
    example: 'Chrome/120 on Windows',
  })
  @IsOptional()
  @IsString()
  user_agent?: string;
}

export class UnsubscribePushDto {
  @ApiProperty({
    description: 'Push subscription endpoint URL to remove',
    example: 'https://fcm.googleapis.com/fcm/send/...',
  })
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}
