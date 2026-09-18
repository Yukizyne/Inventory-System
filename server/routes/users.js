const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../config/db')
const roleMiddleware = require('../middleware/role')
const createAuditLog = require('../utils/audit')

const router = express.Router()

router.get(
  '/',
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const [users] = await db.query(`
        SELECT
          id,
          name,
          email,
          role,
          status,
          created_at
        FROM users
        ORDER BY id DESC
      `)

      res.json(users)
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch users.'
      })
    }
  }
)

router.post(
  '/',
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role
      } = req.body

      if (!name || !email || !password) {
        return res.status(400).json({
          message: 'Name, email and password are required.'
        })
      }

      if (!['ADMIN', 'STAFF'].includes(role)) {
        return res.status(400).json({
          message: 'Invalid role.'
        })
      }

      if (password.length < 6) {
        return res.status(400).json({
          message: 'Password must be at least 6 characters.'
        })
      }

      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      )

      if (existing.length > 0) {
        return res.status(409).json({
          message: 'Email already exists.'
        })
      }

      const hashedPassword = await bcrypt.hash(
        password,
        12
      )

      const [result] = await db.query(
        `INSERT INTO users
        (name, email, password, role, status)
        VALUES (?, ?, ?, ?, 'ACTIVE')`,
        [
          name,
          email,
          hashedPassword,
          role
        ]
      )

      await createAuditLog(
        req.user.id,
        'CREATE_USER',
        `Created user: ${email} (${role})`
      )

      const [user] = await db.query(
        `SELECT
          id,
          name,
          email,
          role,
          status,
          created_at
         FROM users
         WHERE id = ?`,
        [result.insertId]
      )

      res.status(201).json(user[0])
    } catch (error) {
      res.status(500).json({
        message: 'Failed to create user.'
      })
    }
  }
)

router.put(
  '/:id',
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params

      const {
        name,
        email,
        password,
        role,
        status
      } = req.body

      if (!name || !email) {
        return res.status(400).json({
          message: 'Name and email are required.'
        })
      }

      if (!['ADMIN', 'STAFF'].includes(role)) {
        return res.status(400).json({
          message: 'Invalid role.'
        })
      }

      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({
          message: 'Invalid status.'
        })
      }

      const [users] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      )

      if (users.length === 0) {
        return res.status(404).json({
          message: 'User not found.'
        })
      }

      const existingUser = users[0]

      if (
        Number(id) === req.user.id &&
        status === 'INACTIVE'
      ) {
        return res.status(400).json({
          message: 'You cannot deactivate your own account.'
        })
      }

      if (
        Number(id) === req.user.id &&
        role !== 'ADMIN'
      ) {
        return res.status(400).json({
          message: 'You cannot remove your own ADMIN role.'
        })
      }

      const [emailUsers] = await db.query(
        `SELECT id
         FROM users
         WHERE email = ?
         AND id != ?`,
        [email, id]
      )

      if (emailUsers.length > 0) {
        return res.status(409).json({
          message: 'Email already exists.'
        })
      }

      let query
      let values

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            message: 'Password must be at least 6 characters.'
          })
        }

        const hashedPassword = await bcrypt.hash(
          password,
          12
        )

        query = `
          UPDATE users
          SET name = ?,
              email = ?,
              password = ?,
              role = ?,
              status = ?
          WHERE id = ?
        `

        values = [
          name,
          email,
          hashedPassword,
          role,
          status,
          id
        ]
      } else {
        query = `
          UPDATE users
          SET name = ?,
              email = ?,
              role = ?,
              status = ?
          WHERE id = ?
        `

        values = [
          name,
          email,
          role,
          status,
          id
        ]
      }

      await db.query(query, values)

      await createAuditLog(
        req.user.id,
        'UPDATE_USER',
        `Updated user: ${existingUser.email}`
      )

      const [updatedUser] = await db.query(
        `SELECT
          id,
          name,
          email,
          role,
          status,
          created_at
         FROM users
         WHERE id = ?`,
        [id]
      )

      res.json(updatedUser[0])
    } catch (error) {
      res.status(500).json({
        message: 'Failed to update user.'
      })
    }
  }
)

router.delete(
  '/:id',
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params

      if (Number(id) === req.user.id) {
        return res.status(400).json({
          message: 'You cannot delete your own account.'
        })
      }

      const [users] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      )

      if (users.length === 0) {
        return res.status(404).json({
          message: 'User not found.'
        })
      }

      const user = users[0]

      if (user.role === 'ADMIN') {
        return res.status(403).json({
          message: 'ADMIN accounts cannot be deleted here.'
        })
      }

      await db.query(
        'DELETE FROM users WHERE id = ?',
        [id]
      )

      await createAuditLog(
        req.user.id,
        'DELETE_USER',
        `Deleted user: ${user.email}`
      )

      res.json({
        message: 'User deleted successfully.'
      })
    } catch (error) {
      res.status(500).json({
        message: 'Failed to delete user.'
      })
    }
  }
)

module.exports = router