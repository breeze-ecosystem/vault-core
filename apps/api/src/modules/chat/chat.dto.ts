import { IsString, IsOptional, IsArray } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  cameraId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  history?: string[]; // previous Q&A pairs for context
}
