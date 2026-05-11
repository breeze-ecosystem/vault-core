import {
  IsString,
  IsNumber,
  IsObject,
  IsDateString,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SystemStatsDto {
  @IsNumber()
  cpu: number;

  @IsNumber()
  ram: number;

  @IsNumber()
  ramTotal: number;

  @IsNumber()
  ramUsed: number;

  @IsNumber()
  disk: number;
}

export class ServiceStatusDto {
  @IsBooleanOrString()
  api: boolean | string;

  @IsBooleanOrString()
  dashboard: boolean | string;

  @IsBooleanOrString()
  ollama: boolean | string;

  @IsBooleanOrString()
  go2rtc: boolean | string;

  @IsBooleanOrString()
  postgres: boolean | string;

  @IsBooleanOrString()
  redis: boolean | string;
}

export class CameraStatsDto {
  @IsNumber()
  total: number;

  @IsNumber()
  online: number;

  @IsNumber()
  offline: number;
}

export class AlertStatsDto {
  @IsNumber()
  last24h: number;
}

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

  @IsOptional()
  @ValidateNested()
  @Type(() => SystemStatsDto)
  system?: SystemStatsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceStatusDto)
  services?: ServiceStatusDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CameraStatsDto)
  cameraStats?: CameraStatsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AlertStatsDto)
  alertStats?: AlertStatsDto;
}

/**
 * Custom decorator helper — accepts boolean or string for service status fields.
 */
import { registerDecorator, ValidationOptions } from 'class-validator';

function IsBooleanOrString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBooleanOrString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'boolean' || typeof value === 'string';
        },
        defaultMessage() {
          return '$property must be a boolean or string';
        },
      },
    });
  };
}
