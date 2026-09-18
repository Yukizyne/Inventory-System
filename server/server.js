require('dotenv').config()

const express = require('express')
const cors = require('cors')

const auth = require('./middleware/auth')

const authRoutes = require('./routes/auth')
const productsRoutes = require('./routes/products')
const stockRoutes = require('./routes/stock')
const salesRoutes = require('./routes/sales')
const suppliersRoutes = require('./routes/suppliers')
const categoriesRoutes = require('./routes/categories')
const reportsRoutes = require('./routes/reports')
const auditRoutes = require('./routes/audit')
const usersRoutes = require('./routes/users')
const purchaseOrdersRoutes = require('./routes/purchaseOrders')
const settingsRoutes = require('./routes/settings')

const app = express()

const allowedOrigin =
  process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

app.use(express.json())

app.use('/uploads', express.static('uploads'))

app.use('/api/auth', authRoutes)

app.use('/api/products', auth, productsRoutes)
app.use('/api/stock', auth, stockRoutes)
app.use('/api/sales', auth, salesRoutes)
app.use('/api/suppliers', auth, suppliersRoutes)
app.use('/api/categories', auth, categoriesRoutes)
app.use('/api/reports', auth, reportsRoutes)
app.use('/api/audit', auth, auditRoutes)
app.use('/api/users', auth, usersRoutes)
app.use('/api/purchase-orders', auth, purchaseOrdersRoutes)
app.use('/api/settings', auth, settingsRoutes)

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Grocery Inventory API is running.'
  })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})