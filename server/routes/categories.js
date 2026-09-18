const express = require('express')
const db = require('../config/db')
const authMiddleware = require('../middleware/auth')
const roleMiddleware = require('../middleware/role')
const createAuditLog = require('../utils/audit')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT
        c.id,
        c.name,
        c.created_at,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p
        ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `)

    res.json(categories)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load categories.'
    })
  }
})

router.post('/', roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const { name } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Category name is required.'
      })
    }

    const categoryName = name.trim()

    const [existing] = await db.query(
      'SELECT id FROM categories WHERE name = ?',
      [categoryName]
    )

    if (existing.length) {
      return res.status(409).json({
        message: 'Category already exists.'
      })
    }

    const [result] = await db.query(
      'INSERT INTO categories (name) VALUES (?)',
      [categoryName]
    )

    await createAuditLog(
      req.user.id,
      'CREATE_CATEGORY',
      `Created category: ${categoryName}`
    )

    res.status(201).json({
      id: result.insertId,
      name: categoryName
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create category.'
    })
  }
})

router.put('/:id', roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const { name } = req.body
    const { id } = req.params

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Category name is required.'
      })
    }

    const categoryName = name.trim()

    const [existing] = await db.query(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [categoryName, id]
    )

    if (existing.length) {
      return res.status(409).json({
        message: 'Category already exists.'
      })
    }

    const [result] = await db.query(
      'UPDATE categories SET name = ? WHERE id = ?',
      [categoryName, id]
    )

    if (!result.affectedRows) {
      return res.status(404).json({
        message: 'Category not found.'
      })
    }

    await createAuditLog(
      req.user.id,
      'UPDATE_CATEGORY',
      `Updated category ${id} to: ${categoryName}`
    )

    res.json({
      message: 'Category updated successfully.'
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update category.'
    })
  }
})

router.delete('/:id', roleMiddleware('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params

    const [used] = await db.query(
      'SELECT COUNT(*) AS count FROM products WHERE category_id = ?',
      [id]
    )

    if (used[0].count > 0) {
      return res.status(400).json({
        message: 'Cannot delete a category that is assigned to products.'
      })
    }

    const [category] = await db.query(
      'SELECT name FROM categories WHERE id = ?',
      [id]
    )

    if (!category.length) {
      return res.status(404).json({
        message: 'Category not found.'
      })
    }

    await db.query(
      'DELETE FROM categories WHERE id = ?',
      [id]
    )

    await createAuditLog(
      req.user.id,
      'DELETE_CATEGORY',
      `Deleted category: ${category[0].name}`
    )

    res.json({
      message: 'Category deleted successfully.'
    })
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete category.'
    })
  }
})

module.exports = router