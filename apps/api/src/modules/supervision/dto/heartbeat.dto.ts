import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class HeartbeatDto {
  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsNumber()
  uptime?: number;

  /** Free-form system stats object */
  @IsOptional()
  system?: Record<string, number>;

  /** Free-form service statuses (key=service, value=status) */
  @IsOptional()
  services?: Record<string, boolean | string>;

  /** Free-form camera stats */
  @IsOptional()
  cameraStats?: Record<string, number>;

  /** Free-form alert stats */
  @IsOptional()
  alertStats?: Record<string, number>;
}
