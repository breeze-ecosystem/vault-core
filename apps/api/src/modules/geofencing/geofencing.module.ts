import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GeofencingController } from './geofencing.controller';
import { GeofencingService } from './geofencing.service';

@Module({
  imports: [ScheduleModule],
  controllers: [GeofencingController],
  providers: [GeofencingService],
  exports: [GeofencingService],
})
export class GeofencingModule {}
