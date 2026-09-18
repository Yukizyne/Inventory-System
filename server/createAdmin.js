require('dotenv').config()

const bcrypt = require('bcryptjs')
const db = require('./config/db')

const createAdmin = async () => {
  try {
    const name = 'Admin'
    const email = 'admin@example.com'
    const password = 'admin123'

    const hashedPassword = await bcrypt.hash(password, 12)

    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existing.length > 0) {
      console.log('Admin account already exists.')
      process.exit()
    }

    await db.query(
      `INSERT INTO users
      (name, email, password, role)
      VALUES (?, ?, ?, 'ADMIN')`,
      [
        name,
        email,
        hashedPassword
      ]
    )

    console.log('Admin account created.')
    console.log('Email: admin@example.com')
    console.log('Password: admin123')

    process.exit()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

createAdmin()