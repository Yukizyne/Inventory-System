const express = require('express')
const db = require('../config/db')
const roleMiddleware = require('../middleware/role')
const createAuditLog = require('../utils/audit')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const [settings] = await db.query(`
      SELECT
        id,
        store_name,
        address,
        phone,
        email,
        receipt_footer,
        updated_at
      FROM system_settings
      ORDER BY id ASC
      LIMIT 1
    `)

    if (!settings.length) {
      return res.status(404).json({
        message: 'System settings not found.'
      })
    }

    res.json(settings[0])
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load system settings.'
    })
  }
})

router.put('/', roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const {
      store_name,
      address,
      phone,
      email,
      receipt_footer
    } = req.body

    if (!store_name || !store_name.trim()) {
      return res.status(400).json({
        message: 'Store name is required.'
      })
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Invalid email address.'
      })
    }

    const [settings] = await db.query(`
      SELECT id
      FROM system_settings
      ORDER BY id ASC
      LIMIT 1
    `)

    if (!settings.length) {
      const [result] = await db.query(
        `
        INSERT INTO system_settings
        (
          store_name,
          address,
          phone,
          email,
          receipt_footer
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          store_name.trim(),
          address?.trim() || '',
          phone?.trim() || '',
          email?.trim() || '',
          receipt_footer?.trim() || ''
        ]
      )

      await createAuditLog(
        req.user.id,
        'CREATE',
        'Created system store settings.'
      )

      return res.json({
        message: 'Settings saved successfully.',
        id: result.insertId
      })
    }

    await db.query(
      `
      UPDATE system_settings
      SET
        store_name = ?,
        address = ?,
        phone = ?,
        email = ?,
        receipt_footer = ?
      WHERE id = ?
      `,
      [
        store_name.trim(),
        address?.trim() || '',
        phone?.trim() || '',
        email?.trim() || '',
        receipt_footer?.trim() || '',
        settings[0].id
      ]
    )

    await createAuditLog(
      req.user.id,
      'UPDATE',
      'Updated system store settings.'
    )

    res.json({
      message: 'Settings saved successfully.'
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to save system settings.'
    })
  }
})

module.exports = router