import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ExtractionSchema,
  UdyamClassificationSchema,
  DeclarationDraftSchema,
  ReplyParseSchema,
  AssistantQuerySchema,
  SettingsUpdateSchema,
  CreateVendorSchema
} from '../schemas/index.js';

describe('Zod Schemas Boundary Validation', () => {
  test('ExtractionSchema accepts valid invoice extraction data', () => {
    const validData = {
      vendor_name: "Apex Engineering Works",
      invoice_number: "INV-2026-091",
      amount: 450000.50,
      currency: "INR",
      acceptance_date: "2026-04-10",
      po_number: "PO-8821",
      has_written_agreement: true,
      agreement_days: 30,
      missing_fields: [],
      confidence: 0.95
    };

    const parsed = ExtractionSchema.parse(validData);
    assert.equal(parsed.vendor_name, "Apex Engineering Works");
    assert.equal(parsed.amount, 450000.50);
    assert.equal(parsed.has_written_agreement, true);
  });

  test('ExtractionSchema rejects invalid confidence score outside [0, 1]', () => {
    const invalidData = {
      vendor_name: "Apex Engineering",
      invoice_number: "INV-1",
      amount: 1000,
      currency: "INR",
      acceptance_date: "2026-04-10",
      po_number: null,
      has_written_agreement: false,
      agreement_days: null,
      missing_fields: [],
      confidence: 1.5 // Invalid!
    };

    assert.throws(() => {
      ExtractionSchema.parse(invalidData);
    });
  });

  test('UdyamClassificationSchema validates MSME categories strictly', () => {
    const validMicro = {
      udyam_registration_number: "UDYAM-MH-01-0012345",
      category: "micro",
      enterprise_name: "Bharat Precision Tools",
      valid: true,
      confidence: 0.98
    };
    assert.equal(UdyamClassificationSchema.parse(validMicro).category, "micro");

    const invalidCategory = {
      udyam_registration_number: "UDYAM-MH-01-0012345",
      category: "large_enterprise", // Invalid under MSMED classification
      enterprise_name: "Bharat Precision Tools",
      valid: true,
      confidence: 0.98
    };
    assert.throws(() => {
      UdyamClassificationSchema.parse(invalidCategory);
    });
  });

  test('SettingsUpdateSchema enforces constraints on RBI rate and lead time', () => {
    const validSettings = {
      alert_lead_time_days: 7,
      rbi_bank_rate: 6.50,
      default_agreement_basis: "no_agreement",
      auto_send_declarations: false
    };
    assert.equal(SettingsUpdateSchema.parse(validSettings).alert_lead_time_days, 7);

    // Rejects lead time < 1 or > 30
    assert.throws(() => {
      SettingsUpdateSchema.parse({
        ...validSettings,
        alert_lead_time_days: 0
      });
    });
  });

  test('CreateVendorSchema requires valid email and vendor name', () => {
    const validVendor = {
      name: "Shree Ganesh Components",
      email: "billing@ganeshcomponents.in",
      udyam_category: "small"
    };
    assert.equal(CreateVendorSchema.parse(validVendor).name, "Shree Ganesh Components");

    assert.throws(() => {
      CreateVendorSchema.parse({
        name: "A", // too short (<2 chars)
        email: "invalid-email",
        udyam_category: "small"
      });
    });
  });
});
