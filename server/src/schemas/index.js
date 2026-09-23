import { z } from "zod";

// ====================================================================
// Nudge: Zod Validation Schemas
// Shared between API boundaries (request bodies) and AI response boundaries
// ====================================================================

// 1. AI Output & Verification Schemas
export const ExtractionSchema = z.object({
  vendor_name: z.string().nullable(),
  invoice_number: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable().default("INR"),
  acceptance_date: z.string().nullable(), // ISO 8601 YYYY-MM-DD
  po_number: z.string().nullable(),
  has_written_agreement: z.boolean().nullable().optional().transform(v => Boolean(v)),
  agreement_days: z.number().nullable(),
  missing_fields: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const UdyamClassificationSchema = z.object({
  udyam_registration_number: z.string().nullable(),
  category: z.enum(["micro", "small", "medium", "unknown"]),
  enterprise_name: z.string().nullable(),
  valid: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export const DeclarationDraftSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const ReplyParseSchema = z.object({
  contains_udyam_info: z.boolean(),
  udyam_registration_number: z.string().nullable(),
  category_stated: z.enum(["micro", "small", "medium", "not_registered"]).nullable(),
  requires_certificate_upload: z.boolean(),
});

export const AssistantQuerySchema = z.object({
  answer: z.string(),
  supporting_invoice_ids: z.array(z.string().uuid()),
  confidence: z.number().min(0).max(1),
});

// 2. Client Request Boundaries
export const RegisterRequestSchema = z.object({
  organization_name: z.string().min(2, "Organization name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().optional(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const UploadInvoiceRequestSchema = z.object({
  vendor_id: z.string().uuid().optional(),
  acceptance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  agreement_basis: z.enum(["no_agreement", "written_agreement"]).optional(),
  agreement_days: z.number().int().min(1).max(365).optional(),
});

export const UpdateInvoiceSchema = z.object({
  vendor_id: z.string().uuid().optional(),
  invoice_number: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().default("INR").optional(),
  acceptance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  po_number: z.string().nullable().optional(),
  agreement_basis: z.enum(["no_agreement", "written_agreement"]).optional(),
  agreement_days: z.number().int().min(1).max(365).nullable().optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").nullable().optional(),
});

export const RecordPaymentSchema = z.object({
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
});

export const CreateVendorSchema = z.object({
  name: z.string().min(2, "Vendor name must be at least 2 characters"),
  email: z.string().email("Valid vendor email required"),
  udyam_category: z.enum(["micro", "small", "medium", "not_registered", "unknown"]).default("unknown"),
  udyam_registration_number: z.string().optional().nullable(),
});

export const UpdateVendorSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  udyam_category: z.enum(["micro", "small", "medium", "not_registered", "unknown"]).optional(),
  udyam_registration_number: z.string().nullable().optional(),
});

export const ApproveDeclarationSchema = z.object({
  declaration_id: z.string().uuid().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  recipient_email: z.string().email().optional(),
});

export const SettingsUpdateSchema = z.object({
  alert_lead_time_days: z.number().int().min(1).max(30),
  rbi_bank_rate: z.number().min(0).max(20),
  default_agreement_basis: z.enum(["no_agreement", "written_agreement"]),
  auto_send_declarations: z.boolean(),
});

export const AssistantQueryRequestSchema = z.object({
  query: z.string().min(2, "Query must be at least 2 characters"),
});
