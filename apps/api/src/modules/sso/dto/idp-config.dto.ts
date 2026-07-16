import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
} from "class-validator";

export class IdpConfigDto {
  @ApiProperty({ enum: ["saml", "oidc"] })
  @IsString()
  protocol!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metadataUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributeMappings?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ssoEnforced?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entryPoint?: string;
}
