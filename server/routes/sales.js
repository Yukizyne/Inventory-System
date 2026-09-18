const express = require('express')
const db = require('../config/db')
const createAuditLog = require('../utils/audit')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const [sales] = await db.query(`
      SELECT
        sales.id,
        sales.total,
        sales.payment_method,
        sales.cash_received,
        sales.change_amount,
        sales.created_at,
        COALESCE(
          SUM(sale_items.quantity * sale_items.cost_price),
          0
        ) AS total_cost,
        COALESCE(
          SUM(
            sale_items.subtotal -
            (sale_items.quantity * sale_items.cost_price)
          ),
          0
        ) AS profit
      FROM sales
      LEFT JOIN sale_items
        ON sales.id = sale_items.sale_id
      GROUP BY
        sales.id,
        sales.total,
        sales.payment_method,
        sales.cash_received,
        sales.change_amount,
        sales.created_at
      ORDER BY sales.id DESC
      LIMIT 100
    `)

    res.json(sales)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load sales.'
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [sales] = await db.query(
      `
      SELECT
        sales.id,
        sales.total,
        sales.payment_method,
        sales.cash_received,
        sales.change_amount,
        sales.created_at,
        COALESCE(
          SUM(
            sale_items.quantity * sale_items.cost_price
          ),
          0
        ) AS total_cost,
        COALESCE(
          SUM(
            sale_items.subtotal -
            (
              sale_items.quantity *
              sale_items.cost_price
            )
          ),
          0
        ) AS profit
      FROM sales
      LEFT JOIN sale_items
        ON sales.id = sale_items.sale_id
      WHERE sales.id = ?
      GROUP BY
        sales.id,
        sales.total,
        sales.payment_method,
        sales.cash_received,
        sales.change_amount,
        sales.created_at
      `,
      [id]
    )

    if (!sales.length) {
      return res.status(404).json({
        message: 'Sale not found.'
      })
    }

    const [items] = await db.query(
      `
      SELECT
        sale_items.id,
        sale_items.product_id,
        products.name,
        products.sku,
        sale_items.quantity,
        sale_items.price,
        sale_items.cost_price,
        sale_items.subtotal,
        (
          sale_items.subtotal -
          (
            sale_items.quantity *
            sale_items.cost_price
          )
        ) AS profit
      FROM sale_items
      INNER JOIN products
        ON sale_items.product_id = products.id
      WHERE sale_items.sale_id = ?
      ORDER BY sale_items.id ASC
      `,
      [id]
    )

    res.json({
      sale: sales[0],
      items
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load sale.'
    })
  }
})

router.post('/', async (req, res) => {
  let connection

  try {
    const {
      items,
      payment_method,
      cash_received
    } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Sale must contain at least one product.'
      })
    }

    for (const item of items) {
      const productId = Number(item.product_id)
      const quantity = Number(item.quantity)

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          message: 'Invalid product or quantity.'
        })
      }
    }

    const method = payment_method || 'CASH'

    if (method !== 'CASH') {
      return res.status(400).json({
        message: 'Invalid payment method.'
      })
    }

    const cashReceived = Number(cash_received)

    if (
      !Number.isFinite(cashReceived) ||
      cashReceived < 0
    ) {
      return res.status(400).json({
        message: 'Invalid cash amount.'
      })
    }

    connection = await db.getConnection()

    await connection.beginTransaction()

    let total = 0
    let totalCost = 0

    const processedItems = []

    for (const item of items) {
      const productId = Number(item.product_id)
      const quantity = Number(item.quantity)

      const [products] = await connection.query(
        `
        SELECT
          id,
          name,
          stock,
          price,
          cost_price
        FROM products
        WHERE id = ?
        FOR UPDATE
        `,
        [productId]
      )

      if (!products.length) {
        throw new Error(
          `Product ${productId} was not found.`
        )
      }

      const product = products[0]

      if (product.stock < quantity) {
        throw new Error(
          `${product.name} does not have enough stock.`
        )
      }

      const price = Number(product.price)
      const costPrice = Number(product.cost_price || 0)

      const subtotal =
        price * quantity

      const itemCost =
        costPrice * quantity

      total += subtotal
      totalCost += itemCost

      processedItems.push({
        productId,
        quantity,
        price,
        costPrice,
        subtotal
      })
    }

    if (cashReceived < total) {
      throw new Error(
        `Insufficient cash. Total is ${total.toFixed(2)}.`
      )
    }

    const changeAmount =
      cashReceived - total

    const [saleResult] = await connection.query(
      `
      INSERT INTO sales
      (
        total,
        payment_method,
        cash_received,
        change_amount
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        total,
        method,
        cashReceived,
        changeAmount
      ]
    )

    const saleId = saleResult.insertId

    for (const item of processedItems) {
      await connection.query(
        `
        INSERT INTO sale_items
        (
          sale_id,
          product_id,
          quantity,
          price,
          cost_price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          saleId,
          item.productId,
          item.quantity,
          item.price,
          item.costPrice,
          item.subtotal
        ]
      )

      await connection.query(
        `
        UPDATE products
        SET stock = stock - ?
        WHERE id = ?
        `,
        [
          item.quantity,
          item.productId
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
          item.productId,
          item.quantity,
          `Sale #${saleId}`
        ]
      )
    }

    await connection.commit()

    const profit =
      total - totalCost

    await createAuditLog(
      req.user.id,
      'CREATE',
      `Created sale #${saleId} with total ${total.toFixed(2)}, cash ${cashReceived.toFixed(2)}, change ${changeAmount.toFixed(2)} and profit ${profit.toFixed(2)}.`
    )

    res.status(201).json({
      message: 'Sale completed successfully.',
      saleId,
      total,
      totalCost,
      profit,
      paymentMethod: method,
      cashReceived,
      changeAmount
    })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch (rollbackError) {
        console.error(rollbackError)
      }
    }

    console.error(error)

    res.status(400).json({
      message:
        error.message ||
        'Failed to complete sale.'
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

module.exports = router