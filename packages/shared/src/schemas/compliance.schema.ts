import { z } from "zod";

export const generateComplianceReportSchema = z.object({
  reportType: z.enum(["soc2", "iso27001", "access-review"]),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
});

export type GenerateComplianceReportInput = z.infer<typeof generateComplianceReportSchema>;
