// ====================================================================
// Nudge: Alerts Controller
// Manages proactive statutory compliance alerts
// ====================================================================

export async function listAlerts(req, res) {
  try {
    const { acknowledged } = req.query;

    let query = req.supabase
      .from('alerts')
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          amount,
          computed_deadline,
          status,
          vendors ( id, name, udyam_category )
        )
      `)
      .order('created_at', { ascending: false });

    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }

    const { data: alerts, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Database Query Failed', message: error.message });
    }

    // Sort by severity: critical > warning > info
    const severityWeight = { critical: 3, warning: 2, info: 1 };
    const sorted = [...(alerts || [])].sort((a, b) => {
      if (a.acknowledged !== b.acknowledged) {
        return a.acknowledged ? 1 : -1;
      }
      return (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
    });

    return res.json({ data: sorted });
  } catch (err) {
    console.error('[LIST_ALERTS_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

export async function acknowledgeAlert(req, res) {
  try {
    const { id } = req.params;

    const { data: alert, error } = await req.supabase
      .from('alerts')
      .update({ acknowledged: true })
      .eq('id', id)
      .select()
      .single();

    if (error || !alert) {
      return res.status(404).json({ error: 'Not Found', message: 'Alert not found.' });
    }

    return res.json({ message: 'Alert acknowledged.', alert });
  } catch (err) {
    console.error('[ACK_ALERT_EXCEPTION]', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
