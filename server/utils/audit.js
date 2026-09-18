const db = require('../config/db')

const createAuditLog = async (
  userId,
  action,
  description
) => {
  await db.query(
    `INSERT INTO audit_logs
    (user_id, action, description)
    VALUES (?, ?, ?)`,
    [
      userId || null,
      action,
      description
    ]
  )
}

module.exports = createAuditLog