const express = require('express')
const db = require('../config/db')
const upload = require('../middleware/upload')
const roleMiddleware = require('../middleware/role')
const createAuditLog = require('../utils/audit')
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT
        products.*,
        categories.name AS category_name,
        suppliers.name AS supplier_name
      FROM products
      LEFT JOIN categories
        ON products.category_id = categories.id
      LEFT JOIN suppliers
        ON products.supplier_id = suppliers.id
      ORDER BY products.id DESC
    `)

    res.json(products)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: 'Failed to load products.'
    })
  }
})

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      categoryId,
      supplierId,
      unit,
      price,
      costPrice,
      stock,
      minimumStock
    } = req.body

    if (!name || !sku || !categoryId || !unit) {
      return res.status(400).json({
        message: 'Name, SKU, category and unit are required.'
      })
    }

    const sellingPrice = Number(price || 0)
    const productCostPrice = Number(costPrice || 0)
    const productStock = Number(stock || 0)
    const productMinimumStock = Number(minimumStock || 0)

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0 ||
      !Number.isFinite(productCostPrice) ||
      productCostPrice < 0 ||
      !Number.isInteger(productStock) ||
      productStock < 0 ||
      !Number.isInteger(productMinimumStock) ||
      productMinimumStock < 0
    ) {
      return res.status(400).json({
        message: 'Invalid price, cost price, stock or minimum stock.'
      })
    }

    const [categoryRows] = await db.query(
      'SELECT id, name FROM categories WHERE id = ?',
      [categoryId]
    )

    if (!categoryRows.length) {
      return res.status(400).json({
        message: 'Selected category does not exist.'
      })
    }

    if (supplierId) {
      const [supplierRows] = await db.query(
        'SELECT id FROM suppliers WHERE id = ?',
        [supplierId]
      )

      if (!supplierRows.length) {
        return res.status(400).json({
          message: 'Selected supplier does not exist.'
        })
      }
    }

    const [skuRows] = await db.query(
      'SELECT id FROM products WHERE sku = ?',
      [sku]
    )

    if (skuRows.length) {
      return res.status(400).json({
        message: 'SKU already exists.'
      })
    }

    if (barcode) {
      const [barcodeRows] = await db.query(
        'SELECT id FROM products WHERE barcode = ?',
        [barcode]
      )

      if (barcodeRows.length) {
        return res.status(400).json({
          message: 'Barcode already exists.'
        })
      }
    }

    const image = req.file ? req.file.filename : null

    const [result] = await db.query(
      `
      INSERT INTO products
      (
        name,
        sku,
        barcode,
        image,
        category,
        category_id,
        supplier_id,
        unit,
        price,
        cost_price,
        stock,
        minimum_stock
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        sku,
        barcode || null,
        image,
        categoryRows[0].name,
        categoryId,
        supplierId || null,
        unit,
        sellingPrice,
        productCostPrice,
        productStock,
        productMinimumStock
      ]
    )

    await createAuditLog(
      req.user.id,
      'CREATE',
      `Created product "${name}" with SKU ${sku}.`
    )

    res.status(201).json({
      message: 'Product created successfully.',
      id: result.insertId
    })
  } catch (error) {
    console.error(error)

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        message: 'SKU or barcode already exists.'
      })
    }

    res.status(500).json({
      message: 'Failed to create product.'
    })
  }
})

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params

    const {
      name,
      sku,
      barcode,
      categoryId,
      supplierId,
      unit,
      price,
      costPrice,
      stock,
      minimumStock
    } = req.body

    if (!name || !sku || !categoryId || !unit) {
      return res.status(400).json({
        message: 'Name, SKU, category and unit are required.'
      })
    }

    const sellingPrice = Number(price || 0)
    const productCostPrice = Number(costPrice || 0)
    const productStock = Number(stock || 0)
    const productMinimumStock = Number(minimumStock || 0)

    if (
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0 ||
      !Number.isFinite(productCostPrice) ||
      productCostPrice < 0 ||
      !Number.isInteger(productStock) ||
      productStock < 0 ||
      !Number.isInteger(productMinimumStock) ||
      productMinimumStock < 0
    ) {
      return res.status(400).json({
        message: 'Invalid price, cost price, stock or minimum stock.'
      })
    }

    const [existingRows] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    )

    if (!existingRows.length) {
      return res.status(404).json({
        message: 'Product not found.'
      })
    }

    const [categoryRows] = await db.query(
      'SELECT id, name FROM categories WHERE id = ?',
      [categoryId]
    )

    if (!categoryRows.length) {
      return res.status(400).json({
        message: 'Selected category does not exist.'
      })
    }

    if (supplierId) {
      const [supplierRows] = await db.query(
        'SELECT id FROM suppliers WHERE id = ?',
        [supplierId]
      )

      if (!supplierRows.length) {
        return res.status(400).json({
          message: 'Selected supplier does not exist.'
        })
      }
    }

    const [skuRows] = await db.query(
      'SELECT id FROM products WHERE sku = ? AND id <> ?',
      [sku, id]
    )

    if (skuRows.length) {
      return res.status(400).json({
        message: 'SKU already exists.'
      })
    }

    if (barcode) {
      const [barcodeRows] = await db.query(
        'SELECT id FROM products WHERE barcode = ? AND id <> ?',
        [barcode, id]
      )

      if (barcodeRows.length) {
        return res.status(400).json({
          message: 'Barcode already exists.'
        })
      }
    }

    let image = existingRows[0].image

    if (req.file) {
      image = req.file.filename
    }

    await db.query(
      `
      UPDATE products
      SET
        name = ?,
        sku = ?,
        barcode = ?,
        image = ?,
        category = ?,
        category_id = ?,
        supplier_id = ?,
        unit = ?,
        price = ?,
        cost_price = ?,
        stock = ?,
        minimum_stock = ?
      WHERE id = ?
      `,
      [
        name,
        sku,
        barcode || null,
        image,
        categoryRows[0].name,
        categoryId,
        supplierId || null,
        unit,
        sellingPrice,
        productCostPrice,
        productStock,
        productMinimumStock,
        id
      ]
    )

    await createAuditLog(
      req.user.id,
      'UPDATE',
      `Updated product "${name}" with SKU ${sku}.`
    )

    res.json({
      message: 'Product updated successfully.'
    })
  } catch (error) {
    console.error(error)

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        message: 'SKU or barcode already exists.'
      })
    }

    res.status(500).json({
      message: 'Failed to update product.'
    })
  }
})

router.delete(
  '/:id',
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params

      const [products] = await db.query(
        'SELECT name, sku FROM products WHERE id = ?',
        [id]
      )

      if (!products.length) {
        return res.status(404).json({
          message: 'Product not found.'
        })
      }

      const [sales] = await db.query(
        'SELECT id FROM sale_items WHERE product_id = ? LIMIT 1',
        [id]
      )

      if (sales.length) {
        return res.status(400).json({
          message: 'Cannot delete a product that has sales history.'
        })
      }

      const [purchaseOrders] = await db.query(
        'SELECT id FROM purchase_order_items WHERE product_id = ? LIMIT 1',
        [id]
      )

      if (purchaseOrders.length) {
        return res.status(400).json({
          message: 'Cannot delete a product used in purchase orders.'
        })
      }

      await db.query(
        'DELETE FROM products WHERE id = ?',
        [id]
      )

      await createAuditLog(
        req.user.id,
        'DELETE',
        `Deleted product "${products[0].name}" with SKU ${products[0].sku}.`
      )

      res.json({
        message: 'Product deleted successfully.'
      })
    } catch (error) {
      console.error(error)

      res.status(500).json({
        message: 'Failed to delete product.'
      })
    }
  }
)

module.exports = router