// ====================================================================
// Nudge: Immutable Audit Trail Service
// Records every AI action, compliance calculation, alert generation,
// and state-changing operation into audit_log table.
// ====================================================================

/**
 * Appends an entry to the organization's immutable audit log.
 * 
 * @param {Object} params
 * @param {import('@supabase/supabase-js').SupabaseClient} params.supabase - Supabase client (user or admin)
 * @param {string} params.org_id - Organization UUID
 * @param {string} params.actor - 'ai' | 'system' | user_id
 * @param {string} params.action - Action identifier
 * @param {string} [params.target_table] - Name of related table
 * @param {string} [params.target_id] - UUID of modified entity
 * @param {Object} [params.metadata] - JSON metadata (NO PII/financial bodies in production logs!)
 */
export async function logAuditEvent({
  supabase,
  org_id,
  actor,
  action,
  target_table = null,
  target_id = null,
  metadata = {}
}) {
  try {
    // Sanitization: Ensure no sensitive raw credentials exist in metadata
    const sanitizedMetadata = { ...metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.apiKey;

    const { error } = await supabase
      .from('audit_log')
      .insert({
        org_id,
        actor,
        action,
        target_table,
        target_id,
        metadata: sanitizedMetadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[AUDIT_LOG_ERROR] Failed to insert audit log entry:', error.message);
    }
  } catch (err) {
    console.error('[AUDIT_LOG_EXCEPTION] Unexpected error recording audit event:', err.message);
  }
}
