import { SetMetadata } from "@nestjs/common";
import type { ZodTypeAny } from "zod";

export interface SkillDefinition {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
}

export const SKILL_METADATA = "ai-agent:skill";

export const Skill = (def: SkillDefinition) => SetMetadata(SKILL_METADATA, def);
