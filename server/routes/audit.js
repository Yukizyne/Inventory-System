const express = require('express')
const db = require('../config/db')
const auth = require('../middleware/auth')

const router = express.Router()

router.get('/', auth, async (req, res) => {
  try {
    const {
      action,
      user_id,
      from,
      to
    } = req.query

    const conditions = []
    const values = []

    if (action) {
      conditions.push('audit_logs.action = ?')
      values.push(action)
    }

    if (user_id) {
      conditions.push('audit_logs.user_id = ?')
      values.push(Number(user_id))
    }

    if (from) {
      conditions.push('DATE(audit_logs.created_at) >= ?')
      values.push(from)
    }

    if (to) {
      conditions.push('DATE(audit_logs.created_at) <= ?')
      values.push(to)
    }

    let whereClause = ''

    if (conditions.length) {
      whereClause = `WHERE ${conditions.join(' AND ')}`
    }

    const [logs] = await db.query(
      `
      SELECT
        audit_logs.id,
        audit_logs.user_id,
        users.name AS user_name,
        users.email AS user_email,
        users.role AS user_role,
        audit_logs.action,
        audit_logs.description,
        audit_logs.created_at
      FROM audit_logs
      LEFT JOIN users
        ON audit_logs.user_id = users.id
      ${whereClause}
      ORDER BY audit_logs.id DESC
      LIMIT 200
      `,
      values
    )

    res.json(logs)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load audit logs.'
    })
  }
})

module.exports = router