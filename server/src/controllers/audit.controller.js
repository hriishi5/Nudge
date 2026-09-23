// ====================================================================
// Nudge: Audit Log Controller
// Provides paginated read-only view of the organization's immutable audit trail
// ====================================================================

export async function listAuditLog(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10)));
    const offset = (page - 1) * limit;
    const { action, actor } = req.query;

    let query = req.supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (actor) {
      query = query.eq('actor', actor);
    }

    const { data: logs, count, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Database Query Failed', message: error.message });
    }

    return res.json({
      data: logs || [],
      pagination: {
        page,
        limit,
        total_items: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    console.error('[LIST_AUDIT_LOG_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
