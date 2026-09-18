const express = require('express')
const db = require('../config/db')
const createAuditLog = require('../utils/audit')

const router = express.Router()

router.get('/movements', async (req, res) => {
  try {
    const [movements] = await db.query(`
      SELECT
        sm.id,
        sm.product_id,
        p.name AS product_name,
        p.sku,
        sm.type,
        sm.quantity,
        sm.reason,
        sm.created_at
      FROM stock_movements sm
      INNER JOIN products p
        ON p.id = sm.product_id
      ORDER BY sm.created_at DESC
      LIMIT 200
    `)

    res.json(movements)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load stock movements.'
    })
  }
})

router.post('/in', async (req, res) => {
  const {
    productId,
    quantity,
    reason
  } = req.body

  const parsedQuantity = Number(quantity)

  if (!productId) {
    return res.status(400).json({
      message: 'Product is required.'
    })
  }

  if (
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity <= 0
  ) {
    return res.status(400).json({
      message: 'Quantity must be a positive whole number.'
    })
  }

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [products] = await connection.query(
      `
      SELECT
        id,
        name,
        stock
      FROM products
      WHERE id = ?
      FOR UPDATE
      `,
      [productId]
    )

    if (!products.length) {
      throw new Error('Product not found.')
    }

    const product = products[0]

    await connection.query(
      `
      UPDATE products
      SET stock = stock + ?
      WHERE id = ?
      `,
      [
        parsedQuantity,
        productId
      ]
    )

    await connection.query(
      `
      INSERT INTO stock_movements
      (
        product_id,
        type,
        quantity,
        reason
      )
      VALUES (?, 'IN', ?, ?)
      `,
      [
        productId,
        parsedQuantity,
        reason?.trim() || 'Stock received'
      ]
    )

    await connection.commit()

    await createAuditLog(
      req.user.id,
      'STOCK_IN',
      `Added ${parsedQuantity} units of ${product.name}`
    )

    res.status(201).json({
      message: 'Stock added successfully.'
    })
  } catch (error) {
    await connection.rollback()

    res.status(400).json({
      message:
        error.message ||
        'Failed to add stock.'
    })
  } finally {
    connection.release()
  }
})

router.post('/out', async (req, res) => {
  const {
    productId,
    quantity,
    reason
  } = req.body

  const parsedQuantity = Number(quantity)

  if (!productId) {
    return res.status(400).json({
      message: 'Product is required.'
    })
  }

  if (
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity <= 0
  ) {
    return res.status(400).json({
      message: 'Quantity must be a positive whole number.'
    })
  }

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [products] = await connection.query(
      `
      SELECT
        id,
        name,
        stock
      FROM products
      WHERE id = ?
      FOR UPDATE
      `,
      [productId]
    )

    if (!products.length) {
      throw new Error('Product not found.')
    }

    const product = products[0]

    if (product.stock < parsedQuantity) {
      throw new Error(
        `Not enough stock. Current stock: ${product.stock}.`
      )
    }

    await connection.query(
      `
      UPDATE products
      SET stock = stock - ?
      WHERE id = ?
      `,
      [
        parsedQuantity,
        productId
      ]
    )

    await connection.query(
      `
      INSERT INTO stock_movements
      (
        product_id,
        type,
        quantity,
        reason
      )
      VALUES (?, 'OUT', ?, ?)
      `,
      [
        productId,
        parsedQuantity,
        reason?.trim() || 'Stock removed'
      ]
    )

    await connection.commit()

    await createAuditLog(
      req.user.id,
      'STOCK_OUT',
      `Removed ${parsedQuantity} units of ${product.name}`
    )

    res.status(201).json({
      message: 'Stock removed successfully.'
    })
  } catch (error) {
    await connection.rollback()

    res.status(400).json({
      message:
        error.message ||
        'Failed to remove stock.'
    })
  } finally {
    connection.release()
  }
})

module.exports = router