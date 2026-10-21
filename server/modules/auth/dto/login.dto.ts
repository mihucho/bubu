import { IsString, Length, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(4, 20)
  account!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password!: string;
}
