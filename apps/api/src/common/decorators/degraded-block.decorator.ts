import { SetMetadata } from "@nestjs/common";

export const DEGRADED_BLOCK_KEY = "degradedBlock";
export const DegradedBlock = () => SetMetadata(DEGRADED_BLOCK_KEY, true);
