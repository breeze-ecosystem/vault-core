import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateSubscriptionDto {
  @ApiProperty({
    description: "Event type to subscribe to",
    example: "alert.created",
  })
  eventType!: string;

  @ApiProperty({
    description: "Target URL for webhook delivery (HTTPS required)",
    example: "https://hooks.example.com/oversight-events",
  })
  targetUrl!: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: "New target URL" })
  targetUrl?: string;

  @ApiPropertyOptional({ description: "Whether the subscription is active" })
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Rotate the signing secret" })
  rotateSecret?: boolean;
}

export class SubscriptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  targetUrl!: string;

  @ApiProperty({ description: "Masked signing secret (first 8 + ... + last 4)" })
  signingSecret!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class DeliveryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  subscriptionId!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  statusCode?: number;

  @ApiProperty()
  responseBody?: string;

  @ApiProperty()
  attemptNumber!: number;

  @ApiPropertyOptional()
  nextRetryAt?: string;

  @ApiProperty()
  createdAt!: string;
}
