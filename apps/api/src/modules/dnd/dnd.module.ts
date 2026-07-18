import { Module } from '@nestjs/common';
import { DndController } from './dnd.controller';
import { DndService } from './dnd.service';

@Module({
  controllers: [DndController],
  providers: [DndService],
  exports: [DndService],
})
export class DndModule {}
