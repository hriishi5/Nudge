import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';

describe('Multi-Tenant Data Isolation & RLS Test Suite', () => {
  const orgAToken = 'mock_jwt_1111_userA_orgAlpha';
  const orgBToken = 'mock_jwt_2222_userB_orgBeta';

  let orgAInvoiceId = null;

  test('Tenant A creates an invoice in Org Alpha', async () => {
    const res = await request(app)
      .post('/api/invoices/upload')
      .set('Authorization', `Bearer ${orgAToken}`)
      .send({
        document_text: 'Invoice from Org Alpha Vendor for INR 1,20,000',
        acceptance_date: '2026-04-05',
        agreement_basis: 'no_agreement'
      });

    assert.equal(res.status, 201);
    orgAInvoiceId = res.body.invoice.id;
    assert.ok(orgAInvoiceId);
  });

  test('Tenant B listing invoices receives 0 rows from Tenant A', async () => {
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${orgBToken}`);

    assert.equal(res.status, 200);
    const invoices = res.body.data || [];
    const leakedInvoice = invoices.find(inv => inv.id === orgAInvoiceId);
    assert.equal(leakedInvoice, undefined, 'Tenant B must never see Tenant A invoices');
  });

  test('Tenant B attempting to fetch Tenant A invoice by ID is rejected (404 / empty)', async () => {
    const res = await request(app)
      .get(`/api/invoices/${orgAInvoiceId}`)
      .set('Authorization', `Bearer ${orgBToken}`);

    // Under strict tenant scoping, an invoice belonging to another org is invisible (404)
    assert.equal(res.status, 404);
  });

  test('Tenant B attempting to update Tenant A invoice is rejected (404 / forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/invoices/${orgAInvoiceId}`)
      .set('Authorization', `Bearer ${orgBToken}`)
      .send({ amount: 999999 });

    assert.equal(res.status, 404);
  });
});
