import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HermesController } from './hermes.controller';
import { HermesService } from './hermes.service';

@Module({
  imports: [ConfigModule],
  controllers: [HermesController],
  providers: [HermesService],
  exports: [HermesService],
})
export class HermesModule {}
