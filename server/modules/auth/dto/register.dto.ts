import {
  IsString,
  Length,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(4, 20)
  account!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  confirmPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  childNickname?: string;
}
