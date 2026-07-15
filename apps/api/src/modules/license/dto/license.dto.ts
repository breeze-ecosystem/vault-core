/**
 * Swagger DTOs for License endpoints.
 * The controller uses ZodValidationPipe with shared schemas for runtime validation.
 * These DTOs provide OpenAPI metadata for the Swagger docs.
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
} from "class-validator";

export class GenerateLicenseDto {
  @ApiProperty({ example: "00000000-0000-0000-0000-000000000000" })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  maxCameras: number;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(0)
  maxDoors: number;

  @ApiProperty({ example: "2027-01-01T00:00:00Z" })
  @IsString()
  expiresAt: string;

  @ApiPropertyOptional({ example: 7, default: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  gracePeriodDays?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  licenseVersion?: number;
}

export class ActivateLicenseDto {
  @ApiProperty({ example: "eyJhbGciOiJSUzI1NiIs..." })
  @IsString()
  licenseJwt: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: "Production License API Key" })
  @IsString()
  name: string;
}
