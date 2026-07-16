import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateApiKeyDto {
  @ApiProperty({ description: "Human-readable name for the API key" })
  name!: string;

  @ApiPropertyOptional({
    description: "Permission scopes (default: read-only to cameras, doors, alerts, incidents, events, audit)",
    example: ["read:cameras", "read:doors", "write:doors", "read:alerts"],
  })
  scopes?: string[];

  @ApiPropertyOptional({ description: "Rate limit in requests per minute", default: 300 })
  rateLimit?: number;

  @ApiPropertyOptional({ description: "ISO expiration date (null = never expires)" })
  expiresAt?: string;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({ description: "New name" })
  name?: string;

  @ApiPropertyOptional({ description: "New scopes" })
  scopes?: string[];

  @ApiPropertyOptional({ description: "New rate limit" })
  rateLimit?: number;

  @ApiPropertyOptional({ description: "ISO expiration date" })
  expiresAt?: string;
}

export class ApiKeyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: "Key prefix for display (e.g., osk_...)" })
  keyPrefix!: string;

  @ApiProperty({ description: "Permission scopes" })
  scopes!: string[];

  @ApiProperty()
  rateLimit!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  lastUsedAt?: string;

  @ApiPropertyOptional()
  expiresAt?: string;

  @ApiProperty()
  createdAt!: string;
}

export class ApiKeyCreatedResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: "Key prefix for display" })
  keyPrefix!: string;

  @ApiProperty({ description: "Full API key — shown once on creation" })
  rawKey!: string;

  @ApiProperty()
  scopes!: string[];

  @ApiProperty()
  rateLimit!: number;
}
