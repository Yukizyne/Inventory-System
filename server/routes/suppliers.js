const express = require('express')
const db = require('../config/db')
const roleMiddleware = require('../middleware/role')
const createAuditLog = require('../utils/audit')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const [suppliers] = await db.query(`
      SELECT
        suppliers.id,
        suppliers.name,
        suppliers.contact_person,
        suppliers.phone,
        suppliers.email,
        suppliers.address,
        suppliers.created_at,
        COUNT(DISTINCT purchase_orders.id) AS order_count,
        COUNT(
          DISTINCT CASE
            WHEN purchase_orders.status = 'PENDING'
            THEN purchase_orders.id
          END
        ) AS pending_orders,
        COUNT(
          DISTINCT CASE
            WHEN purchase_orders.status = 'RECEIVED'
            THEN purchase_orders.id
          END
        ) AS received_orders,
        COALESCE(
          SUM(
            CASE
              WHEN purchase_orders.status != 'CANCELLED'
              THEN purchase_orders.total
              ELSE 0
            END
          ),
          0
        ) AS total_purchases
      FROM suppliers
      LEFT JOIN purchase_orders
        ON suppliers.id = purchase_orders.supplier_id
      GROUP BY
        suppliers.id,
        suppliers.name,
        suppliers.contact_person,
        suppliers.phone,
        suppliers.email,
        suppliers.address,
        suppliers.created_at
      ORDER BY suppliers.id DESC
    `)

    res.json(suppliers)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load suppliers.'
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const [suppliers] = await db.query(
      `
      SELECT
        suppliers.id,
        suppliers.name,
        suppliers.contact_person,
        suppliers.phone,
        suppliers.email,
        suppliers.address,
        suppliers.created_at,
        COUNT(DISTINCT purchase_orders.id) AS order_count,
        COUNT(
          DISTINCT CASE
            WHEN purchase_orders.status = 'PENDING'
            THEN purchase_orders.id
          END
        ) AS pending_orders,
        COUNT(
          DISTINCT CASE
            WHEN purchase_orders.status = 'RECEIVED'
            THEN purchase_orders.id
          END
        ) AS received_orders,
        COALESCE(
          SUM(
            CASE
              WHEN purchase_orders.status != 'CANCELLED'
              THEN purchase_orders.total
              ELSE 0
            END
          ),
          0
        ) AS total_purchases
      FROM suppliers
      LEFT JOIN purchase_orders
        ON suppliers.id = purchase_orders.supplier_id
      WHERE suppliers.id = ?
      GROUP BY
        suppliers.id,
        suppliers.name,
        suppliers.contact_person,
        suppliers.phone,
        suppliers.email,
        suppliers.address,
        suppliers.created_at
      `,
      [id]
    )

    if (!suppliers.length) {
      return res.status(404).json({
        message: 'Supplier not found.'
      })
    }

    const [orders] = await db.query(
      `
      SELECT
        purchase_orders.id,
        purchase_orders.status,
        purchase_orders.total,
        purchase_orders.created_at,
        purchase_orders.received_at,
        COUNT(purchase_order_items.id) AS item_count
      FROM purchase_orders
      LEFT JOIN purchase_order_items
        ON purchase_orders.id =
           purchase_order_items.purchase_order_id
      WHERE purchase_orders.supplier_id = ?
      GROUP BY
        purchase_orders.id,
        purchase_orders.status,
        purchase_orders.total,
        purchase_orders.created_at,
        purchase_orders.received_at
      ORDER BY purchase_orders.id DESC
      LIMIT 20
      `,
      [id]
    )

    const [products] = await db.query(
      `
      SELECT
        products.id,
        products.name,
        products.sku,
        products.stock,
        products.cost_price,
        products.price,
        categories.name AS category_name
      FROM products
      LEFT JOIN categories
        ON products.category_id = categories.id
      WHERE products.supplier_id = ?
      ORDER BY products.name ASC
      `,
      [id]
    )

    res.json({
      supplier: suppliers[0],
      orders,
      products
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load supplier details.'
    })
  }
})

router.post(
  '/',
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const {
        name,
        contact_person,
        phone,
        email,
        address
      } = req.body

      if (!name || !name.trim()) {
        return res.status(400).json({
          message: 'Supplier name is required.'
        })
      }

      const [result] = await db.query(
        `
        INSERT INTO suppliers
        (
          name,
          contact_person,
          phone,
          email,
          address
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          name.trim(),
          contact_person?.trim() || null,
          phone?.trim() || null,
          email?.trim() || null,
          address?.trim() || null
        ]
      )

      await createAuditLog(
        req.user.id,
        'CREATE',
        `Created supplier "${name.trim()}".`
      )

      res.status(201).json({
        message:
          'Supplier created successfully.',
        id: result.insertId
      })
    } catch (error) {
      console.error(error)

      res.status(500).json({
        message: 'Failed to create supplier.'
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
        contact_person,
        phone,
        email,
        address
      } = req.body

      if (!name || !name.trim()) {
        return res.status(400).json({
          message: 'Supplier name is required.'
        })
      }

      const [result] = await db.query(
        `
        UPDATE suppliers
        SET
          name = ?,
          contact_person = ?,
          phone = ?,
          email = ?,
          address = ?
        WHERE id = ?
        `,
        [
          name.trim(),
          contact_person?.trim() || null,
          phone?.trim() || null,
          email?.trim() || null,
          address?.trim() || null,
          id
        ]
      )

      if (!result.affectedRows) {
        return res.status(404).json({
          message: 'Supplier not found.'
        })
      }

      await createAuditLog(
        req.user.id,
        'UPDATE',
        `Updated supplier #${id}.`
      )

      res.json({
        message:
          'Supplier updated successfully.'
      })
    } catch (error) {
      console.error(error)

      res.status(500).json({
        message: 'Failed to update supplier.'
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

      const [products] = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM products
        WHERE supplier_id = ?
        `,
        [id]
      )

      if (Number(products[0].count) > 0) {
        return res.status(400).json({
          message:
            'Cannot delete supplier while products are assigned to it.'
        })
      }

      const [orders] = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM purchase_orders
        WHERE supplier_id = ?
        `,
        [id]
      )

      if (Number(orders[0].count) > 0) {
        return res.status(400).json({
          message:
            'Cannot delete supplier because it has purchase order history.'
        })
      }

      const [result] = await db.query(
        `
        DELETE FROM suppliers
        WHERE id = ?
        `,
        [id]
      )

      if (!result.affectedRows) {
        return res.status(404).json({
          message: 'Supplier not found.'
        })
      }

      await createAuditLog(
        req.user.id,
        'DELETE',
        `Deleted supplier #${id}.`
      )

      res.json({
        message:
          'Supplier deleted successfully.'
      })
    } catch (error) {
      console.error(error)

      res.status(500).json({
        message: 'Failed to delete supplier.'
      })
    }
  }
)

module.exports = router