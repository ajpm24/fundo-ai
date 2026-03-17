require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true })
const express = require('express')
const cors = require('cors')
const path = require('path')
const { seedGrants } = require('./db/seed')
const { startAlertJobs } = require('./jobs/alertChecker')

const app = express()
const PORT = process.env.PORT || 3333

app.use(cors())
app.use(express.json())

// API routes
app.use('/api/profile', require('./routes/profile'))
app.use('/api/grants', require('./routes/grants'))
app.use('/api/applications', require('./routes/applications'))
app.use('/api/alerts', require('./routes/alerts'))
app.use('/api/ai', require('./routes/ai'))
app.use('/api/projects', require('./routes/projects'))

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }))

// Manual crawler trigger
app.post('/api/crawler/run', async (req, res) => {
  try {
    const { runCrawler } = require('./jobs/crawler')
    const result = await runCrawler()
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Serve built React app
const publicDir = path.join(__dirname, '../public')
app.use(express.static(publicDir))
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

// Seed DB and start jobs
seedGrants()
startAlertJobs()

app.listen(PORT, () => {
  console.log(`FundoAI running on http://localhost:${PORT}`)
})
