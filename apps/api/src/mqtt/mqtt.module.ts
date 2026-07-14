import { Global, Module } from "@nestjs/common";
import { MqttService } from "./mqtt.service";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Global()
@Module({
  imports: [EventEmitterModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
