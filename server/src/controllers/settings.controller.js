// ====================================================================
// Nudge: Organization Settings Controller
// ====================================================================

import { logAuditEvent } from '../services/audit.service.js';

export async function getSettings(req, res) {
  try {
    const { data: settings, error } = await req.supabase
      .from('org_settings')
      .select('*')
      .eq('org_id', req.org_id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Database Query Failed', message: error.message });
    }

    // Default configuration fallback if row doesn't exist yet
    const fallbackSettings = settings || {
      org_id: req.org_id,
      alert_lead_time_days: 5,
      rbi_bank_rate: 6.50,
      default_agreement_basis: 'no_agreement',
      auto_send_declarations: false
    };

    return res.json({ settings: fallbackSettings });
  } catch (err) {
    console.error('[GET_SETTINGS_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function updateSettings(req, res) {
  try {
    const updates = req.body;

    const { data: updated, error } = await req.supabase
      .from('org_settings')
      .upsert({
        org_id: req.org_id,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Update Failed', message: error.message });
    }

    await logAuditEvent({
      supabase: req.supabase,
      org_id: req.org_id,
      actor: req.user.id,
      action: 'settings_updated',
      target_table: 'org_settings',
      target_id: req.org_id,
      metadata: updates
    });

    return res.json({ message: 'Organization compliance settings updated successfully.', settings: updated });
  } catch (err) {
    console.error('[UPDATE_SETTINGS_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
