import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://demo-placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'demo-anon-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-role-key';

const isMockMode = supabaseUrl.includes('demo-placeholder') || process.env.NODE_ENV === 'test';

// ====================================================================
// In-Memory Database Store for Testing and Local Demonstration
// ====================================================================
export const inMemoryStore = {
  organizations: [
    { id: 'org888', name: 'Bharat Tech Solutions Pvt Ltd', created_at: new Date().toISOString() },
    { id: 'demo-org-101', name: 'Bharat Heavy Dynamics Ltd', created_at: new Date().toISOString() }
  ],
  org_members: [
    { id: 'mem1', org_id: 'org888', user_id: 'user999', role: 'admin' },
    { id: 'mem2', org_id: 'demo-org-101', user_id: 'demo-user-101', role: 'admin' }
  ],
  vendors: [],
  invoices: [],
  interest_calculations: [],
  declaration_requests: [],
  alerts: [],
  audit_log: [],
  org_settings: [
    { org_id: 'org888', alert_lead_time_days: 5, rbi_bank_rate: 6.50, default_agreement_basis: 'no_agreement', auto_send_declarations: false },
    { org_id: 'demo-org-101', alert_lead_time_days: 5, rbi_bank_rate: 6.50, default_agreement_basis: 'no_agreement', auto_send_declarations: false }
  ]
};

class MockQueryBuilder {
  constructor(table, scopedOrgId = null) {
    this.table = table;
    this.scopedOrgId = scopedOrgId;
    this.predicates = [];
    this.sortCol = null;
    this.sortAscending = true;
    this.limitCount = null;
    this.rangeFrom = null;
    this.rangeTo = null;
    this.opType = 'select';
    this.opPayload = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.includeCount = false;

    if (!inMemoryStore[this.table]) {
      inMemoryStore[this.table] = [];
    }
  }

  select(columns, options = {}) {
    if (options.count) this.includeCount = true;
    return this;
  }

  insert(data) {
    this.opType = 'insert';
    this.opPayload = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this.opType = 'update';
    this.opPayload = data;
    return this;
  }

  upsert(data) {
    this.opType = 'upsert';
    this.opPayload = data;
    return this;
  }

  delete() {
    this.opType = 'delete';
    return this;
  }

  eq(col, val) {
    this.predicates.push(row => row[col] === val);
    return this;
  }

  ilike(col, pattern) {
    const clean = String(pattern || '').replace(/%/g, '').toLowerCase();
    this.predicates.push(row => String(row[col] || '').toLowerCase().includes(clean));
    return this;
  }

  or(conditions) {
    // Format: "col1.ilike.%val%,col2.ilike.%val%"
    const parts = conditions.split(',');
    this.predicates.push(row => {
      return parts.some(part => {
        const [col, op, val] = part.split('.');
        const clean = (val || '').replace(/%/g, '').toLowerCase();
        return String(row[col] || '').toLowerCase().includes(clean);
      });
    });
    return this;
  }

  is(col, val) {
    this.predicates.push(row => {
      if (val === null) return row[col] === null || row[col] === undefined;
      return row[col] === val;
    });
    return this;
  }

  order(col, { ascending = true } = {}) {
    this.sortCol = col;
    this.sortAscending = ascending;
    return this;
  }

  range(from, to) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async execute() {
    const list = inMemoryStore[this.table];

    if (this.opType === 'insert') {
      const insertedRows = this.opPayload.map(item => {
        const row = {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || new Date().toISOString(),
          ...item
        };
        list.push(row);
        return row;
      });

      const resData = this.isSingle ? insertedRows[0] : insertedRows;
      return { data: resData, error: null };
    }

    if (this.opType === 'upsert') {
      const item = this.opPayload;
      const matchIdx = list.findIndex(r => (item.id && r.id === item.id) || (item.org_id && r.org_id === item.org_id));
      let savedRow;
      if (matchIdx >= 0) {
        list[matchIdx] = { ...list[matchIdx], ...item, updated_at: new Date().toISOString() };
        savedRow = list[matchIdx];
      } else {
        savedRow = { id: item.id || crypto.randomUUID(), created_at: new Date().toISOString(), ...item };
        list.push(savedRow);
      }
      return { data: savedRow, error: null };
    }

    if (this.opType === 'update') {
      const updatedRows = [];
      for (let i = 0; i < list.length; i++) {
        const matchesOrg = !this.scopedOrgId || !list[i].org_id || list[i].org_id === this.scopedOrgId;
        if (matchesOrg && this.predicates.every(p => p(list[i]))) {
          list[i] = { ...list[i], ...this.opPayload, updated_at: new Date().toISOString() };
          updatedRows.push(list[i]);
        }
      }
      const resData = this.isSingle ? (updatedRows[0] || null) : updatedRows;
      return { data: resData, error: null };
    }

    if (this.opType === 'delete') {
      const remaining = [];
      const deleted = [];
      for (const row of list) {
        const matchesOrg = !this.scopedOrgId || !row.org_id || row.org_id === this.scopedOrgId;
        if (matchesOrg && this.predicates.every(p => p(row))) {
          deleted.push(row);
        } else {
          remaining.push(row);
        }
      }
      inMemoryStore[this.table] = remaining;
      return { data: deleted, error: null };
    }

    // SELECT - Enforce tenant isolation RLS
    let matching = list.filter(row => {
      const matchesOrg = !this.scopedOrgId || !row.org_id || row.org_id === this.scopedOrgId;
      return matchesOrg && this.predicates.every(p => p(row));
    });

    // Auto-Join for common relations
    if (this.table === 'invoices') {
      matching = matching.map(inv => {
        const vendor = inMemoryStore.vendors.find(v => v.id === inv.vendor_id);
        const interest = inMemoryStore.interest_calculations.filter(ic => ic.invoice_id === inv.id);
        return {
          ...inv,
          vendors: vendor || null,
          interest_calculations: interest || []
        };
      });
    } else if (this.table === 'vendors') {
      matching = matching.map(v => {
        const vendorInvoices = inMemoryStore.invoices.filter(i => i.vendor_id === v.id);
        const reqs = inMemoryStore.declaration_requests.filter(dr => dr.vendor_id === v.id);
        return {
          ...v,
          invoices: vendorInvoices || [],
          declaration_requests: reqs || []
        };
      });
    } else if (this.table === 'alerts') {
      matching = matching.map(alert => {
        const inv = inMemoryStore.invoices.find(i => i.id === alert.invoice_id);
        const vendor = inv ? inMemoryStore.vendors.find(v => v.id === inv.vendor_id) : null;
        return {
          ...alert,
          invoices: inv ? { ...inv, vendors: vendor || null } : null
        };
      });
    } else if (this.table === 'org_members') {
      matching = matching.map(m => {
        const org = inMemoryStore.organizations.find(o => o.id === m.org_id);
        return {
          ...m,
          organizations: org || null
        };
      });
    } else if (this.table === 'organizations') {
      matching = matching.map(org => {
        const settings = inMemoryStore.org_settings.filter(s => s.org_id === org.id);
        return {
          ...org,
          org_settings: settings
        };
      });
    }

    if (this.sortCol) {
      matching.sort((a, b) => {
        const valA = a[this.sortCol];
        const valB = b[this.sortCol];
        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    const totalCount = matching.length;

    if (this.rangeFrom !== null && this.rangeTo !== null) {
      matching = matching.slice(this.rangeFrom, this.rangeTo + 1);
    } else if (this.limitCount !== null) {
      matching = matching.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      const row = matching[0] || null;
      return { data: row, error: row ? null : { message: 'Row not found' }, count: totalCount };
    }

    if (this.isMaybeSingle) {
      return { data: matching[0] || null, error: null, count: totalCount };
    }

    return { data: matching, count: totalCount, error: null };
  }

  then(resolve, reject) {
    this.execute().then(resolve, reject);
  }
}

function createMockSupabaseClient(scopedOrgId = null) {
  return {
    from: (table) => new MockQueryBuilder(table, scopedOrgId),
    storage: {
      from: (bucket) => ({
        upload: async (path, buffer) => ({ data: { path }, error: null }),
        createSignedUrl: async (path, expiresIn) => ({ data: { signedUrl: `https://mock.storage/${path}` }, error: null })
      })
    },
    auth: {
      getUser: async (token) => {
        if (token.startsWith('mock_jwt_')) {
          const parts = token.split('_');
          return { data: { user: { id: parts[2] || 'user999', email: 'compliance@bharat.in' } }, error: null };
        }
        return { data: { user: null }, error: { message: 'Invalid token' } };
      },
      signUp: async ({ email, password, options }) => {
        const id = crypto.randomUUID();
        const user = { id, email, user_metadata: options?.data || {} };
        return { data: { user, session: { access_token: `mock_jwt_${Date.now()}_${id}_org888` } }, error: null };
      }
    }
  };
}

export function createUserSupabaseClient(token) {
  if (token && token.startsWith('mock_jwt_')) {
    const parts = token.split('_');
    const orgId = parts[4] || parts[3] || 'org888';
    return createMockSupabaseClient(orgId);
  }
  if (isMockMode) {
    return createMockSupabaseClient('org888');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

export function createAdminSupabaseClient() {
  if (isMockMode) {
    return createMockSupabaseClient(null);
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export const supabaseAnon = isMockMode ? createMockSupabaseClient(null) : createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
