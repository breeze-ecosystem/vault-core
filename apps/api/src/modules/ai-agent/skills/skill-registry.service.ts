import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import type { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { SKILL_METADATA, SkillDefinition } from "./skill.decorator";

interface RegisteredSkill {
  definition: SkillDefinition;
  instance: unknown;
}

@Injectable()
export class SkillRegistry implements OnModuleInit {
  private readonly logger = new Logger(SkillRegistry.name);
  private readonly skills = new Map<string, RegisteredSkill>();

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit(): void {
    const providers = this.discovery.getProviders();
    for (const wrapper of providers) {
      const { metatype, instance } = wrapper as InstanceWrapper & {
        metatype?: new (...args: unknown[]) => unknown;
        instance?: unknown;
      };

      if (!metatype || !instance) {
        continue;
      }

      const definition: SkillDefinition | undefined = Reflect.getMetadata(
        SKILL_METADATA,
        metatype,
      );

      if (definition) {
        this.skills.set(definition.name, { definition, instance });
        this.logger.log(`Registered skill: ${definition.name}`);
      }
    }
  }

  getSkill(name: string): RegisteredSkill | undefined {
    return this.skills.get(name);
  }

  listSkills(): SkillDefinition[] {
    return Array.from(this.skills.values()).map((s) => s.definition);
  }

  hasSkill(name: string): boolean {
    return this.skills.has(name);
  }
}
