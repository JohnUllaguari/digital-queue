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

  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL ? process.env.N8N_WEBHOOK_URL.trim() : null
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

    let data = null
    try { data = responseText ? JSON.parse(responseText) : null } catch { /* ignore */ }

    // Si n8n devuelve un array (común en n8n), extraemos el primer elemento
    if (Array.isArray(data) && data.length > 0) {
      data = data[0]
    }

    if (!n8nResp.ok) {
      // Si n8n falló pero nos mandó datos en JSON, intentamos mandarlos al frontend
      if (data && typeof data === 'object') {
         return res.status(n8nResp.status).json(data)
      }
      return res.status(502).json({
        error: `n8n returned ${n8nResp.status}`,
        details: responseText,
      })
    }

    if (!data || typeof data !== 'object') {
      return res.status(502).json({
        error: 'Invalid response from n8n',
        details: responseText,
      })
    }

    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ 
      error: 'Fetch failed', 
      details: String(err),
      urlTried: n8nWebhookUrl
    })
  }
}
