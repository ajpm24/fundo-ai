const cron = require('node-cron')
const db = require('../db/database')

function checkDeadlines() {
  const grants = db.prepare(`
    SELECT g.*, COUNT(a.id) as has_application
    FROM grants g
    LEFT JOIN applications a ON g.id = a.grant_id AND a.status NOT IN ('rejeitada', 'submetida', 'aprovada')
    WHERE g.is_active = 1 AND g.deadline IS NOT NULL
    GROUP BY g.id
  `).all()

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  for (const grant of grants) {
    const deadline = new Date(grant.deadline)
    if (isNaN(deadline)) continue

    let type = null
    let message = null

    if (deadline < now) continue // already expired

    if (deadline <= in7Days) {
      // Check if we already sent this alert this week
      const existing = db.prepare(
        'SELECT id FROM alerts WHERE grant_id = ? AND type = ? AND created_at > datetime(\'now\', \'-7 days\')'
      ).get(grant.id, 'deadline_urgent')
      if (!existing) {
        type = 'deadline_urgent'
        message = `⚠️ Prazo em menos de 7 dias: "${grant.title}" — ${grant.deadline}`
      }
    } else if (deadline <= in30Days) {
      const existing = db.prepare(
        'SELECT id FROM alerts WHERE grant_id = ? AND type = ? AND created_at > datetime(\'now\', \'-30 days\')'
      ).get(grant.id, 'deadline_approaching')
      if (!existing) {
        type = 'deadline_approaching'
        message = `📅 Prazo a aproximar-se: "${grant.title}" — ${grant.deadline}`
      }
    }

    if (type && message) {
      db.prepare('INSERT INTO alerts (type, message, grant_id) VALUES (?, ?, ?)').run(type, message, grant.id)
    }
  }
}

function checkHighRelevanceGrants() {
  // Alert for newly added highly relevant grants (score >= 70) not yet in applications
  const highRelevance = db.prepare(`
    SELECT g.* FROM grants g
    LEFT JOIN applications a ON g.id = a.grant_id
    WHERE g.ai_relevance_score >= 70
    AND a.id IS NULL
    AND g.is_active = 1
  `).all()

  for (const grant of highRelevance) {
    const existing = db.prepare(
      'SELECT id FROM alerts WHERE grant_id = ? AND type = ? AND created_at > datetime(\'now\', \'-7 days\')'
    ).get(grant.id, 'high_relevance')
    if (!existing) {
      db.prepare('INSERT INTO alerts (type, message, grant_id) VALUES (?, ?, ?)').run(
        'high_relevance',
        `🎯 Fundo muito relevante sem candidatura: "${grant.title}" (score: ${Math.round(grant.ai_relevance_score)}/100)`,
        grant.id
      )
    }
  }
}

function startAlertJobs() {
  const { runCrawler } = require('./crawler')

  // Run once on startup
  setTimeout(() => {
    checkDeadlines()
    checkHighRelevanceGrants()
  }, 3000)

  // Daily at 09:00 — alerts + crawler
  cron.schedule('0 9 * * *', () => {
    console.log('[AlertChecker] Running daily checks...')
    checkDeadlines()
    checkHighRelevanceGrants()
  })

  // Crawler: EU portals every 6h, PT portals daily
  cron.schedule('0 */6 * * *', () => {
    console.log('[Crawler] Running 6h crawl...')
    runCrawler().catch(err => console.error('[Crawler] Error:', err.message))
  })

  console.log('[AlertChecker] Scheduled daily at 09:00')
  console.log('[Crawler] Scheduled every 6h')
}

module.exports = { startAlertJobs }
