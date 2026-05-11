import { IsString, IsNumber, IsOptional } from 'class-validator';

export class RegisterClientDto {
  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsString()
  publicIp?: string;

  @IsOptional()
  @IsNumber()
  cameraCount?: number;
}
