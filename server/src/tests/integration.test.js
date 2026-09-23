import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

describe('Nudge End-to-End Compliance Integration Suite', () => {
  const mockToken = 'mock_jwt_12345_user999_org888';
  let createdInvoiceId = null;
  let createdVendorId = null;

  test('1. Health check returns status ok and service identity', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'nudge-compliance-api');
  });

  test('2. Can create a vendor via authenticated API', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        name: 'Apex Precision Tools Pvt Ltd',
        email: 'accounts@apexprecision.in',
        udyam_category: 'small',
        udyam_registration_number: 'UDYAM-MH-01-0099887'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.vendor.name, 'Apex Precision Tools Pvt Ltd');
    assert.equal(res.body.vendor.udyam_category, 'small');
    createdVendorId = res.body.vendor.id;
  });

  test('3. Ingests invoice with deterministic deadline calculation', async () => {
    const sampleInvoiceText = `
      TAX INVOICE
      Invoice Number: INV-2026-B89
      Supplier: Apex Precision Tools Pvt Ltd
      Invoice Date: 2026-04-01
      Total Amount: INR 350,000.00
      Payment Terms: Net 30 Days
    `;

    const res = await request(app)
      .post('/api/invoices/upload')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        document_text: sampleInvoiceText,
        vendor_id: createdVendorId,
        acceptance_date: '2026-04-01',
        agreement_basis: 'written_agreement',
        agreement_days: 30
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.invoice);
    assert.equal(res.body.invoice.acceptance_date, '2026-04-01');
    assert.equal(res.body.invoice.computed_deadline, '2026-05-01'); // 30 days
    assert.equal(res.body.statutory_compliance.applicable_window_days, 30);
    createdInvoiceId = res.body.invoice.id;
  });

  test('4. Ingests invoice with 60 days agreement capped at 45 days', async () => {
    const res = await request(app)
      .post('/api/invoices/upload')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        document_text: 'Invoice 60-day terms',
        vendor_id: createdVendorId,
        acceptance_date: '2026-04-01',
        agreement_basis: 'written_agreement',
        agreement_days: 60 // Exceeds 45-day statutory limit!
      });

    assert.equal(res.status, 201);
    // Must be capped strictly at 45 days -> 2026-05-16
    assert.equal(res.body.invoice.computed_deadline, '2026-05-16');
    assert.equal(res.body.statutory_compliance.applicable_window_days, 45);
  });

  test('5. Can draft AI Udyam declaration request for vendor', async () => {
    const res = await request(app)
      .post(`/api/vendors/${createdVendorId}/request-declaration`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send({});

    assert.equal(res.status, 201);
    assert.ok(res.body.declaration);
    assert.ok(res.body.declaration.subject);
    assert.ok(res.body.declaration.body);
  });

  test('6. Can query Form 3CD Clause 22 disclosure data', async () => {
    const res = await request(app)
      .get('/api/reports/form-3cd')
      .set('Authorization', `Bearer ${mockToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.clause_22_disclosures);
    assert.ok(Array.isArray(res.body.line_items));
  });

  test('7. Can query natural language compliance assistant', async () => {
    const res = await request(app)
      .post('/api/assistant/query')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        query: 'What is our total Section 43B(h) exposure?'
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.answer);
    assert.ok(res.body.confidence >= 0 && res.body.confidence <= 1);
  });

  test('8. Audit trail is recorded and queryable', async () => {
    const res = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${mockToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.pagination);
  });
});
