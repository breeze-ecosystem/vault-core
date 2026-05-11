import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupervisionController } from './supervision.controller';
import { SupervisionService } from './supervision.service';

@Module({
  imports: [ConfigModule],
  controllers: [SupervisionController],
  providers: [SupervisionService],
  exports: [SupervisionService],
})
export class SupervisionModule {}
