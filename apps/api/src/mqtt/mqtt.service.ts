import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as mqtt from "mqtt";

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;
  private lastSequencePerDevice = new Map<string, number>();

  constructor(
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    const brokerUrl = this.config.get<string>("mqtt.brokerUrl", "mqtt://localhost:1883");
    const username = this.config.get<string>("mqtt.username", "");
    const password = this.config.get<string>("mqtt.password", "");

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `oversight-api-${process.pid}`,
        clean: false,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        username: username || undefined,
        password: password || undefined,
        will: {
          topic: "oversight/api/status",
          payload: "offline",
          qos: 1,
          retain: true,
        },
      });
    } catch (err: any) {
      this.logger.error(`MQTT connection setup failed: ${err.message}`);
      this.logger.warn("MQTT transport unavailable — door controller communication is disabled");
      return;
    }

    this.client.on("connect", () => {
      this.logger.log(`MQTT connected to ${brokerUrl}`);
      this.client!.publish("oversight/api/status", "online", { qos: 1, retain: true });

      this.client!.subscribe(
        {
          "site/+/door/+/state": { qos: 1 },
          "site/+/reader/+/badge": { qos: 1 },
          "site/+/controller/+/health": { qos: 1 },
        },
        (err) => {
          if (err) {
            this.logger.error(`MQTT subscribe error: ${err.message}`);
          }
        },
      );
    });

    this.client.on("message", (topic, payload) => {
      this.handleMessage(topic, payload);
    });

    this.client.on("error", (err) => {
      this.logger.error(`MQTT error: ${err.message}`, err.stack);
    });

    this.client.on("reconnect", () => {
      this.logger.warn("MQTT reconnecting...");
    });

    this.client.on("close", () => {
      this.logger.warn("MQTT connection closed");
    });
  }

  private handleMessage(topic: string, payload: Buffer) {
    try {
      const message = JSON.parse(payload.toString());

      // D-05: Sequence number validation
      const deviceId = message.deviceId || message.controller_id;
      if (deviceId && message.sequence !== undefined) {
        const lastSeq = this.lastSequencePerDevice.get(deviceId) ?? -1;
        if (message.sequence <= lastSeq) {
          this.logger.warn(
            `Out-of-sequence message discarded: ${deviceId} seq=${message.sequence}, last=${lastSeq}`,
          );
          return;
        }
        this.lastSequencePerDevice.set(deviceId, message.sequence);
      }

      // Route to event bus based on topic pattern
      if (topic.includes("/door/") && topic.endsWith("/state")) {
        this.eventEmitter.emit("mqtt.door.state", {
          topic,
          message,
        });
      } else if (topic.includes("/reader/") && topic.endsWith("/badge")) {
        this.eventEmitter.emit("mqtt.reader.badge", {
          topic,
          message,
        });
      } else if (topic.includes("/controller/") && topic.endsWith("/health")) {
        this.eventEmitter.emit("mqtt.controller.health", {
          topic,
          message,
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to parse MQTT message on ${topic}: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.endAsync();
        this.logger.log("MQTT disconnected");
      } catch (err: any) {
        this.logger.error(`MQTT disconnect error: ${err.message}`);
      }
    }
  }
}
