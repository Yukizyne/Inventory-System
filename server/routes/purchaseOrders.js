const express = require('express')
const db = require('../config/db')
const createAuditLog = require('../utils/audit')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT
        purchase_orders.id,
        purchase_orders.supplier_id,
        suppliers.name AS supplier_name,
        purchase_orders.status,
        purchase_orders.total,
        purchase_orders.created_at,
        purchase_orders.received_at,
        COUNT(purchase_order_items.id) AS item_count
      FROM purchase_orders
      INNER JOIN suppliers
        ON purchase_orders.supplier_id = suppliers.id
      LEFT JOIN purchase_order_items
        ON purchase_orders.id =
           purchase_order_items.purchase_order_id
      GROUP BY
        purchase_orders.id,
        purchase_orders.supplier_id,
        suppliers.name,
        purchase_orders.status,
        purchase_orders.total,
        purchase_orders.created_at,
        purchase_orders.received_at
      ORDER BY purchase_orders.id DESC
      LIMIT 100
    `)

    res.json(orders)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load purchase orders.'
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [orders] = await db.query(
      `
      SELECT
        purchase_orders.id,
        purchase_orders.supplier_id,
        suppliers.name AS supplier_name,
        purchase_orders.status,
        purchase_orders.total,
        purchase_orders.created_at,
        purchase_orders.received_at
      FROM purchase_orders
      INNER JOIN suppliers
        ON purchase_orders.supplier_id = suppliers.id
      WHERE purchase_orders.id = ?
      `,
      [id]
    )

    if (!orders.length) {
      return res.status(404).json({
        message: 'Purchase order not found.'
      })
    }

    const [items] = await db.query(
      `
      SELECT
        purchase_order_items.id,
        purchase_order_items.product_id,
        products.name AS product_name,
        products.sku,
        purchase_order_items.quantity,
        purchase_order_items.cost,
        purchase_order_items.subtotal
      FROM purchase_order_items
      INNER JOIN products
        ON purchase_order_items.product_id = products.id
      WHERE purchase_order_items.purchase_order_id = ?
      ORDER BY purchase_order_items.id ASC
      `,
      [id]
    )

    res.json({
      order: orders[0],
      items
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load purchase order.'
    })
  }
})

router.post('/', async (req, res) => {
  let connection

  try {
    const {
      supplier_id,
      items
    } = req.body

    const supplierId = Number(supplier_id)

    if (
      !Number.isInteger(supplierId) ||
      supplierId <= 0
    ) {
      return res.status(400).json({
        message: 'A valid supplier is required.'
      })
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          'Purchase order must contain at least one product.'
      })
    }

    const productIds = new Set()

    for (const item of items) {
      const productId =
        Number(item.product_id)

      const quantity =
        Number(item.quantity)

      const cost =
        Number(item.cost)

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        !Number.isFinite(cost) ||
        cost < 0
      ) {
        return res.status(400).json({
          message:
            'Each product must have a valid quantity and cost.'
        })
      }

      if (productIds.has(productId)) {
        return res.status(400).json({
          message:
            'A product can only appear once in a purchase order.'
        })
      }

      productIds.add(productId)
    }

    connection = await db.getConnection()

    await connection.beginTransaction()

    const [suppliers] = await connection.query(
      `
      SELECT id
      FROM suppliers
      WHERE id = ?
      `,
      [supplierId]
    )

    if (!suppliers.length) {
      throw new Error(
        'Selected supplier was not found.'
      )
    }

    let total = 0
    const processedItems = []

    for (const item of items) {
      const productId =
        Number(item.product_id)

      const quantity =
        Number(item.quantity)

      const cost =
        Number(item.cost)

      const [products] = await connection.query(
        `
        SELECT
          id,
          name,
          sku
        FROM products
        WHERE id = ?
        `,
        [productId]
      )

      if (!products.length) {
        throw new Error(
          `Product ${productId} was not found.`
        )
      }

      const subtotal =
        quantity * cost

      total += subtotal

      processedItems.push({
        productId,
        quantity,
        cost,
        subtotal
      })
    }

    const [orderResult] =
      await connection.query(
        `
        INSERT INTO purchase_orders
        (
          supplier_id,
          status,
          total
        )
        VALUES (?, 'PENDING', ?)
        `,
        [
          supplierId,
          total
        ]
      )

    const purchaseOrderId =
      orderResult.insertId

    for (const item of processedItems) {
      await connection.query(
        `
        INSERT INTO purchase_order_items
        (
          purchase_order_id,
          product_id,
          quantity,
          cost,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          purchaseOrderId,
          item.productId,
          item.quantity,
          item.cost,
          item.subtotal
        ]
      )
    }

    await connection.commit()

    await createAuditLog(
      req.user.id,
      'CREATE',
      `Created purchase order #${purchaseOrderId} with total ${total.toFixed(2)}.`
    )

    res.status(201).json({
      message:
        'Purchase order created successfully.',
      purchaseOrderId,
      total
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
        'Failed to create purchase order.'
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.post('/:id/receive', async (req, res) => {
  let connection

  try {
    const { id } = req.params

    connection = await db.getConnection()

    await connection.beginTransaction()

    const [orders] = await connection.query(
      `
      SELECT
        id,
        status,
        supplier_id
      FROM purchase_orders
      WHERE id = ?
      FOR UPDATE
      `,
      [id]
    )

    if (!orders.length) {
      throw new Error(
        'Purchase order not found.'
      )
    }

    const order = orders[0]

    if (order.status !== 'PENDING') {
      throw new Error(
        'Only pending purchase orders can be received.'
      )
    }

    const [items] = await connection.query(
      `
      SELECT
        id,
        product_id,
        quantity,
        cost
      FROM purchase_order_items
      WHERE purchase_order_id = ?
      ORDER BY id ASC
      `,
      [id]
    )

    if (!items.length) {
      throw new Error(
        'Purchase order has no products.'
      )
    }

    for (const item of items) {
      const [products] =
        await connection.query(
          `
          SELECT
            id,
            name,
            stock,
            cost_price
          FROM products
          WHERE id = ?
          FOR UPDATE
          `,
          [item.product_id]
        )

      if (!products.length) {
        throw new Error(
          `Product ${item.product_id} was not found.`
        )
      }

      const product = products[0]

      const purchaseCost =
        Number(item.cost)

      await connection.query(
        `
        UPDATE products
        SET
          stock = stock + ?,
          cost_price = ?
        WHERE id = ?
        `,
        [
          item.quantity,
          purchaseCost,
          item.product_id
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
          item.product_id,
          item.quantity,
          `Purchase Order #${id}`
        ]
      )
    }

    await connection.query(
      `
      UPDATE purchase_orders
      SET
        status = 'RECEIVED',
        received_at = NOW()
      WHERE id = ?
      `,
      [id]
    )

    await connection.commit()

    await createAuditLog(
      req.user.id,
      'RECEIVE',
      `Received purchase order #${id}. Product stock and cost prices were updated.`
    )

    res.json({
      message:
        'Purchase order received successfully.'
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
        'Failed to receive purchase order.'
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

router.put('/:id/cancel', async (req, res) => {
  let connection

  try {
    const { id } = req.params

    connection = await db.getConnection()

    await connection.beginTransaction()

    const [orders] = await connection.query(
      `
      SELECT
        id,
        status
      FROM purchase_orders
      WHERE id = ?
      FOR UPDATE
      `,
      [id]
    )

    if (!orders.length) {
      throw new Error(
        'Purchase order not found.'
      )
    }

    if (orders[0].status !== 'PENDING') {
      throw new Error(
        'Only pending purchase orders can be cancelled.'
      )
    }

    await connection.query(
      `
      UPDATE purchase_orders
      SET status = 'CANCELLED'
      WHERE id = ?
      `,
      [id]
    )

    await connection.commit()

    await createAuditLog(
      req.user.id,
      'UPDATE',
      `Cancelled purchase order #${id}.`
    )

    res.json({
      message:
        'Purchase order cancelled successfully.'
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
        'Failed to cancel purchase order.'
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

module.exports = router