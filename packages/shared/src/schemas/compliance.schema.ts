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

// ─── Phase 4: HAPDP Schemas ───

export const hapdpDeclarationSchema = z.object({
  processingTypes: z.array(z.string().min(1)).min(1, "At least one processing type is required"),
  organizationName: z.string().min(1, "Organization name is required"),
  address: z.string().min(1, "Address is required"),
  siret: z.string().min(1, "SIRET number is required"),
  representative: z.string().min(1, "Representative name is required"),
  declarationDate: z.string().datetime(),
  signature: z.string().min(1, "Signature is required"),
});

export type HapdpDeclarationInput = z.infer<typeof hapdpDeclarationSchema>;

export const consentSignageSchema = z.object({
  cameraId: z.string().uuid(),
  siteName: z.string().min(1, "Site name is required"),
});

export type ConsentSignageInput = z.infer<typeof consentSignageSchema>;

export const subjectAccessOtpSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export type SubjectAccessOtpInput = z.infer<typeof subjectAccessOtpSchema>;

export const subjectAccessVerifySchema = z.object({
  email: z.string().email("Valid email is required"),
  code: z.string().length(6, "OTP must be exactly 6 characters"),
});

export type SubjectAccessVerifyInput = z.infer<typeof subjectAccessVerifySchema>;

export const subjectAccessRequestSchema = z.object({
  email: z.string().email("Valid email is required"),
  type: z.enum(["rectify", "delete"]),
  details: z.string().optional(),
});

export type SubjectAccessRequestInput = z.infer<typeof subjectAccessRequestSchema>;
