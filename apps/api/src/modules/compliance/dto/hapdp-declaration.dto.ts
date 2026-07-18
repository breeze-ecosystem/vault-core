import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class HapdpDeclarationDto {
  @ApiProperty({ description: "Organization name", example: "Entreprise Niger SARL" })
  organizationName!: string;

  @ApiProperty({ description: "Organization address", example: "123 Rue de la République, Niamey" })
  address!: string;

  @ApiProperty({ description: "Data protection officer name", example: "Amadou Diallo" })
  dpoName!: string;

  @ApiProperty({ description: "DPO email", example: "dpo@entreprise.sarl" })
  dpoEmail!: string;

  @ApiPropertyOptional({ description: "Additional information for declaration" })
  additionalInfo?: string;
}

export class ConsentSignageDto {
  @ApiProperty({ description: "Camera ID" })
  cameraId!: string;

  @ApiProperty({ description: "Site name", example: "Siège Social - Niamey" })
  siteName!: string;
}

export class SubjectAccessOtpRequestDto {
  @ApiProperty({ description: "Email address of the data subject", example: "user@example.com" })
  email!: string;
}

export class SubjectAccessOtpVerifyDto {
  @ApiProperty({ description: "Email address" })
  email!: string;

  @ApiProperty({ description: "6-digit OTP code", example: "123456" })
  code!: string;
}

export class SubjectAccessRequestSubmitDto {
  @ApiProperty({ description: "Email address" })
  email!: string;

  @ApiProperty({ enum: ["rectify", "delete"], description: "Request type" })
  type!: "rectify" | "delete";

  @ApiPropertyOptional({ description: "Details of the request" })
  details?: string;
}

export class IntegrationGuideDto {
  @ApiProperty({ description: "Guide generation timestamp" })
  generatedAt!: string;
}
