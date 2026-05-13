import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: '+79991234567',
    description: 'Номер телефона в формате +7XXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty({ message: 'Номер телефона обязателен' })
  @Matches(/^[\d\s\-+()]{10,15}$/, {
    message: 'Некорректный формат номера телефона',
  })
  phone!: string;

  @ApiProperty({
    example: 'Иван Иванов',
    description: 'Имя пользователя',
  })
  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно' })
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  @MaxLength(100, { message: 'Имя не может быть длиннее 100 символов' })
  name!: string;
}

export class VerifyCodeDto {
  @ApiProperty({
    example: '+79991234567',
    description: 'Номер телефона, на который был отправлен код',
  })
  @IsString()
  @IsNotEmpty({ message: 'Номер телефона обязателен' })
  phone!: string;

  @ApiProperty({
    example: '123456',
    description: '6-значный код подтверждения из SMS',
  })
  @IsString()
  @IsNotEmpty({ message: 'Код подтверждения обязателен' })
  @Matches(/^\d{6}$/, { message: 'Код должен состоять из 6 цифр' })
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'Refresh token для обновления пары токенов',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token обязателен' })
  refreshToken!: string;
}
