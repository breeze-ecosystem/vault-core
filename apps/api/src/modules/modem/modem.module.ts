import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModemController } from './modem.controller';
import { ModemService } from './modem.service';

@Module({
  imports: [ConfigModule],
  controllers: [ModemController],
  providers: [ModemService],
  exports: [ModemService],
})
export class ModemModule {}
