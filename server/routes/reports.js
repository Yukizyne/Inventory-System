const express = require('express')
const db = require('../config/db')

const router = express.Router()

router.get('/summary', async (req, res) => {
  try {
    const [[inventory]] = await db.query(`
      SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(stock * cost_price), 0) AS inventory_cost_value,
        COALESCE(SUM(stock * price), 0) AS inventory_retail_value,
        COALESCE(SUM(stock * (price - cost_price)), 0) AS potential_profit,
        COALESCE(
          (
            SUM(stock * (price - cost_price)) /
            NULLIF(SUM(stock * price), 0)
          ) * 100,
          0
        ) AS potential_profit_margin,
        SUM(CASE WHEN stock <= minimum_stock AND stock > 0 THEN 1 ELSE 0 END) AS low_stock,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock
      FROM products
    `)

    const [[sales]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM sales) AS sale_count,
        (SELECT COALESCE(SUM(total), 0) FROM sales) AS total_sales,
        (
          SELECT COALESCE(
            SUM(
              subtotal -
              (quantity * cost_price)
            ),
            0
          )
          FROM sale_items
        ) AS total_profit
    `)

    const [[today]] = await db.query(`
      SELECT
        (
          SELECT COALESCE(SUM(total), 0)
          FROM sales
          WHERE DATE(created_at) = CURDATE()
        ) AS today_sales,
        (
          SELECT COALESCE(
            SUM(
              sale_items.subtotal -
              (sale_items.quantity * sale_items.cost_price)
            ),
            0
          )
          FROM sale_items
          INNER JOIN sales
            ON sales.id = sale_items.sale_id
          WHERE DATE(sales.created_at) = CURDATE()
        ) AS today_profit,
        (
          SELECT COALESCE(
            SUM(sale_items.quantity * sale_items.cost_price),
            0
          )
          FROM sale_items
          INNER JOIN sales
            ON sales.id = sale_items.sale_id
          WHERE DATE(sales.created_at) = CURDATE()
        ) AS today_cost
    `)

    const [[movements]] = await db.query(`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN type = 'IN' THEN quantity
              ELSE 0
            END
          ),
          0
        ) AS stock_in,
        COALESCE(
          SUM(
            CASE
              WHEN type = 'OUT' THEN quantity
              ELSE 0
            END
          ),
          0
        ) AS stock_out
      FROM stock_movements
    `)

    const totalSales = Number(sales.total_sales)
    const totalProfit = Number(sales.total_profit)

    res.json({
      total_products: Number(inventory.total_products),
      inventory_cost_value: Number(inventory.inventory_cost_value),
      inventory_retail_value: Number(inventory.inventory_retail_value),
      potential_profit: Number(inventory.potential_profit),
      potential_profit_margin: Number(inventory.potential_profit_margin),
      low_stock: Number(inventory.low_stock),
      out_of_stock: Number(inventory.out_of_stock),
      sale_count: Number(sales.sale_count),
      total_sales: totalSales,
      total_profit: totalProfit,
      profit_margin:
        totalSales > 0
          ? (totalProfit / totalSales) * 100
          : 0,
      today_sales: Number(today.today_sales),
      today_profit: Number(today.today_profit),
      today_cost: Number(today.today_cost),
      stock_in: Number(movements.stock_in),
      stock_out: Number(movements.stock_out)
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load report summary.'
    })
  }
})

router.get('/low-stock', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT
        products.id,
        products.name,
        products.sku,
        products.stock,
        products.minimum_stock,
        products.cost_price,
        products.price,
        COALESCE(categories.name, products.category) AS category
      FROM products
      LEFT JOIN categories
        ON products.category_id = categories.id
      WHERE products.stock <= products.minimum_stock
      ORDER BY
        CASE
          WHEN products.stock = 0 THEN 0
          ELSE 1
        END,
        products.stock ASC,
        products.name ASC
    `)

    res.json(products)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load low-stock report.'
    })
  }
})

router.get('/notifications', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT
        products.id,
        products.name,
        products.sku,
        products.stock,
        products.minimum_stock,
        COALESCE(categories.name, products.category) AS category,
        CASE
          WHEN products.stock = 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END AS alert_type
      FROM products
      LEFT JOIN categories
        ON products.category_id = categories.id
      WHERE products.stock <= products.minimum_stock
      ORDER BY
        CASE
          WHEN products.stock = 0 THEN 0
          ELSE 1
        END,
        products.stock ASC,
        products.name ASC
    `)

    const outOfStock = products.filter(
      product => Number(product.stock) === 0
    )

    const lowStock = products.filter(
      product =>
        Number(product.stock) > 0 &&
        Number(product.stock) <= Number(product.minimum_stock)
    )

    res.json({
      total: products.length,
      out_of_stock: outOfStock.length,
      low_stock: lowStock.length,
      notifications: products
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load notifications.'
    })
  }
})

router.get('/top-products', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT
        products.id,
        products.name,
        products.sku,
        COALESCE(SUM(sale_items.quantity), 0) AS quantity_sold,
        COALESCE(SUM(sale_items.subtotal), 0) AS revenue,
        COALESCE(
          SUM(
            sale_items.subtotal -
            (sale_items.quantity * sale_items.cost_price)
          ),
          0
        ) AS profit
      FROM products
      LEFT JOIN sale_items
        ON products.id = sale_items.product_id
      GROUP BY
        products.id,
        products.name,
        products.sku
      ORDER BY quantity_sold DESC
      LIMIT 10
    `)

    res.json(products)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load top products report.'
    })
  }
})

router.get('/daily-sales', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        daily.sale_date,
        COALESCE(SUM(daily.revenue), 0) AS revenue,
        COALESCE(SUM(daily.profit), 0) AS profit
      FROM (
        SELECT
          DATE(sales.created_at) AS sale_date,
          sales.id,
          sales.total AS revenue,
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
        WHERE sales.created_at >= CURDATE() - INTERVAL 6 DAY
        GROUP BY
          sales.id,
          DATE(sales.created_at),
          sales.total
      ) AS daily
      GROUP BY daily.sale_date
      ORDER BY sale_date ASC
    `)

    res.json(rows)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load daily sales report.'
    })
  }
})

router.get('/recent-movements', async (req, res) => {
  try {
    const [movements] = await db.query(`
      SELECT
        stock_movements.id,
        stock_movements.type,
        stock_movements.quantity,
        stock_movements.reason,
        stock_movements.created_at,
        products.name,
        products.sku
      FROM stock_movements
      INNER JOIN products
        ON stock_movements.product_id = products.id
      ORDER BY stock_movements.id DESC
      LIMIT 20
    `)

    res.json(movements)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load recent stock movements.'
    })
  }
})

router.get('/inventory-valuation', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT
        products.id,
        products.name,
        products.sku,
        COALESCE(categories.name, products.category) AS category,
        products.stock,
        products.minimum_stock,
        products.cost_price,
        products.price,
        (products.stock * products.cost_price) AS cost_value,
        (products.stock * products.price) AS retail_value,
        (
          products.stock *
          (products.price - products.cost_price)
        ) AS potential_profit,
        CASE
          WHEN products.price > 0
          THEN (
            (products.price - products.cost_price) /
            products.price
          ) * 100
          ELSE 0
        END AS profit_margin
      FROM products
      LEFT JOIN categories
        ON products.category_id = categories.id
      ORDER BY cost_value DESC, products.name ASC
    `)

    res.json(products)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load inventory valuation.'
    })
  }
})

router.get('/category-valuation', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT
        COALESCE(categories.name, products.category, 'Uncategorized') AS category,
        COUNT(products.id) AS product_count,
        COALESCE(SUM(products.stock), 0) AS total_units,
        COALESCE(
          SUM(products.stock * products.cost_price),
          0
        ) AS cost_value,
        COALESCE(
          SUM(products.stock * products.price),
          0
        ) AS retail_value,
        COALESCE(
          SUM(
            products.stock *
            (products.price - products.cost_price)
          ),
          0
        ) AS potential_profit
      FROM products
      LEFT JOIN categories
        ON products.category_id = categories.id
      GROUP BY
        COALESCE(categories.name, products.category, 'Uncategorized')
      ORDER BY cost_value DESC
    `)

    res.json(categories)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load category valuation.'
    })
  }
})

router.get('/dashboard', async (req, res) => {
  try {
    const [summary] = await db.query(`
      SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(stock), 0) AS total_units,
        COALESCE(SUM(stock * cost_price), 0) AS inventory_cost_value,
        COALESCE(SUM(stock * price), 0) AS inventory_retail_value
      FROM products
    `)

    const [sales] = await db.query(`
      SELECT
        COALESCE(SUM(total), 0) AS total_sales
      FROM sales
    `)

    res.json({
      summary: summary[0],
      sales: sales[0]
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load dashboard report.'
    })
  }
})

module.exports = router