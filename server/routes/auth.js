const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../config/db')

const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.'
      })
    }

    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    const user = users[0]

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        message: 'This account is inactive.'
      })
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    )

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h'
      }
    )

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('LOGIN ERROR:', error)

    res.status(500).json({
      message: 'Login failed.'
    })
  }
})

module.exports = router

