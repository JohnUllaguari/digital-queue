export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { nombre, cedula, motivo } = req.body ?? {}
  if (!nombre || !cedula || !motivo) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nWebhookUrl) {
    return res.status(500).json({ error: 'N8N_WEBHOOK_URL not configured' })
  }

  try {
    const n8nResp = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        cedula,
        motivo,
        timestamp: new Date().toISOString(),
      }),
    })

    const responseText = await n8nResp.text().catch(() => '')

    if (!n8nResp.ok) {
      return res.status(502).json({
        error: `n8n returned ${n8nResp.status}`,
        details: responseText,
      })
    }

    let data = null
    try { data = responseText ? JSON.parse(responseText) : null } catch { /* ignore */ }

    if (!data || typeof data !== 'object') {
      return res.status(502).json({
        error: 'Invalid response from n8n',
        details: responseText,
      })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
