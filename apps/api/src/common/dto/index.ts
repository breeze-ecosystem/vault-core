import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  IsBoolean,
} from 'class-validator';

// ── Auth DTOs ──

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ enum: ['VIEWER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'] })
  @IsOptional()
  @IsEnum(['VIEWER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'])
  role?: string;

  @ApiPropertyOptional({ example: 'uuid-site-id' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ss123' })
  @IsString()
  password: string;
}

export class RefreshDto {
  @ApiPropertyOptional({ example: 'uuid-refresh-token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ example: 'uuid-refresh-token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

// ── Auth Response DTOs ──

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ enum: ['VIEWER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'] }) role: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
}

// ── Site DTOs ──

export class CreateSiteDto {
  @ApiProperty({ example: 'Main Office' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '123 Main St, Dakar' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Dakar' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SN' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 14.6937 })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -17.4441 })
  @IsOptional()
  longitude?: number;
}

export class UpdateSiteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() latitude?: number;
  @ApiPropertyOptional() @IsOptional() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Camera DTOs ──

export class CreateCameraDto {
  @ApiProperty({ example: 'Front Gate Camera' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'rtsp://admin:pass@192.168.1.100:554/stream1' })
  @IsString()
  rtspUrl: string;

  @ApiProperty({ example: 'uuid-site-id' })
  @IsString()
  organizationId: string;

  @ApiPropertyOptional({ example: '1920x1080' })
  @IsOptional() @IsString() resolution?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional() fps?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional() captureInterval?: number;
}

export class UpdateCameraDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rtspUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() organizationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional() @IsOptional() fps?: number;
  @ApiPropertyOptional() @IsOptional() captureInterval?: number;
  @ApiPropertyOptional({ enum: ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'DEGRADED'] })
  @IsOptional() @IsEnum(['ONLINE', 'OFFLINE', 'MAINTENANCE', 'DEGRADED']) status?: string;
}

// ── Alert DTOs ──

export class CreateAlertDto {
  @ApiProperty({ example: 'Intrusion Detected' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Movement detected in restricted area' })
  @IsOptional() @IsString() description?: string;

  @ApiProperty({ enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] })
  @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  severity: string;

  @ApiProperty({ example: 'uuid-camera-id' })
  @IsString()
  cameraId: string;

  @ApiPropertyOptional() @IsOptional() @IsString() snapshotUrl?: string;
}

// ── Prompt DTOs ──

export class AddPromptDto {
  @ApiProperty({ example: 'Detect unauthorized personnel in restricted zone' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] })
  @IsOptional()
  @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  severity?: string;
}

export class UpdatePromptDto {
  @ApiPropertyOptional() @IsOptional() @IsString() text?: string;
  @ApiPropertyOptional({ enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] })
  @IsOptional() @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']) severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── User Update DTO ──

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional({ enum: ['VIEWER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'] })
  @IsOptional() @IsEnum(['VIEWER', 'OPERATOR', 'SUPERVISOR', 'ADMIN', 'SUPER_ADMIN']) role?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() organizationId?: string;
}

// ── Pagination ──

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: number;
}
