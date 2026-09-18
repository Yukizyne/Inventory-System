<template>
  <div class="reports-page">
    <div class="page-header">
      <div>
        <h2>Reports</h2>
        <p>Inventory valuation and stock analysis</p>
      </div>

      <button class="refresh-button" @click="loadReports">
        Refresh
      </button>
    </div>

    <div v-if="loading" class="message">
      Loading reports...
    </div>

    <div v-else-if="error" class="message error">
      {{ error }}
    </div>

    <template v-else>
      <div class="stats">
        <div class="stat">
          <span>Inventory Cost Value</span>
          <strong>₱{{ formatMoney(summary.inventory_cost_value) }}</strong>
        </div>

        <div class="stat">
          <span>Retail Value</span>
          <strong>₱{{ formatMoney(summary.inventory_retail_value) }}</strong>
        </div>

        <div class="stat">
          <span>Potential Profit</span>
          <strong>₱{{ formatMoney(summary.potential_profit) }}</strong>
        </div>

        <div class="stat">
          <span>Profit Margin</span>
          <strong>{{ formatPercent(summary.potential_profit_margin) }}%</strong>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <span>Total Products</span>
          <strong>{{ summary.total_products }}</strong>
        </div>

        <div class="stat">
          <span>Low Stock</span>
          <strong>{{ summary.low_stock }}</strong>
        </div>

        <div class="stat">
          <span>Out of Stock</span>
          <strong>{{ summary.out_of_stock }}</strong>
        </div>

        <div class="stat">
          <span>Total Sales</span>
          <strong>₱{{ formatMoney(summary.total_sales) }}</strong>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Inventory Valuation</h3>
            <p>
              Current stock value using the current cost and selling prices.
            </p>
          </div>

          <div class="filters">
            <input
              v-model="search"
              type="text"
              placeholder="Search product or SKU..."
            >

            <select v-model="categoryFilter">
              <option value="">All categories</option>

              <option
                v-for="category in categories"
                :key="category"
                :value="category"
              >
                {{ category }}
              </option>
            </select>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Current Cost</th>
                <th>Selling Price</th>
                <th>Cost Value</th>
                <th>Retail Value</th>
                <th>Potential Profit</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="product in filteredProducts"
                :key="product.id"
              >
                <td>
                  <strong>{{ product.name }}</strong>
                </td>

                <td>{{ product.sku }}</td>

                <td>{{ product.category }}</td>

                <td>
                  <span
                    :class="[
                      'stock-badge',
                      getStockClass(product)
                    ]"
                  >
                    {{ product.stock }}
                  </span>
                </td>

                <td>
                  ₱{{ formatMoney(product.cost_price) }}
                </td>

                <td>
                  ₱{{ formatMoney(product.price) }}
                </td>

                <td>
                  ₱{{ formatMoney(product.cost_value) }}
                </td>

                <td>
                  ₱{{ formatMoney(product.retail_value) }}
                </td>

                <td>
                  <strong>
                    ₱{{ formatMoney(product.potential_profit) }}
                  </strong>
                </td>
              </tr>

              <tr v-if="filteredProducts.length === 0">
                <td colspan="9" class="empty">
                  No products found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          Showing {{ filteredProducts.length }} of
          {{ valuation.length }} products
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Category Valuation</h3>
            <p>
              Inventory value grouped by category.
            </p>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Products</th>
                <th>Units</th>
                <th>Cost Value</th>
                <th>Retail Value</th>
                <th>Potential Profit</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="category in categoryValuation"
                :key="category.category"
              >
                <td>
                  <strong>{{ category.category }}</strong>
                </td>

                <td>{{ category.product_count }}</td>

                <td>{{ category.total_units }}</td>

                <td>
                  ₱{{ formatMoney(category.cost_value) }}
                </td>

                <td>
                  ₱{{ formatMoney(category.retail_value) }}
                </td>

                <td>
                  <strong>
                    ₱{{ formatMoney(category.potential_profit) }}
                  </strong>
                </td>
              </tr>

              <tr v-if="categoryValuation.length === 0">
                <td colspan="6" class="empty">
                  No category data found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Low Stock Products</h3>
            <p>
              Products that are at or below their minimum stock level.
            </p>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Minimum Stock</th>
                <th>Cost Value</th>
                <th>Retail Value</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="product in lowStock"
                :key="product.id"
              >
                <td>
                  <strong>{{ product.name }}</strong>
                </td>

                <td>{{ product.sku }}</td>

                <td>{{ product.category }}</td>

                <td>
                  <span
                    :class="[
                      'stock-badge',
                      getStockClass(product)
                    ]"
                  >
                    {{ product.stock }}
                  </span>
                </td>

                <td>{{ product.minimum_stock }}</td>

                <td>
                  ₱{{
                    formatMoney(
                      Number(product.stock) *
                      Number(product.cost_price)
                    )
                  }}
                </td>

                <td>
                  ₱{{
                    formatMoney(
                      Number(product.stock) *
                      Number(product.price)
                    )
                  }}
                </td>
              </tr>

              <tr v-if="lowStock.length === 0">
                <td colspan="7" class="empty">
                  No low-stock products.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

const loading = ref(true)
const error = ref('')

const summary = ref({
  total_products: 0,
  inventory_cost_value: 0,
  inventory_retail_value: 0,
  potential_profit: 0,
  potential_profit_margin: 0,
  low_stock: 0,
  out_of_stock: 0,
  total_sales: 0,
  total_profit: 0,
  profit_margin: 0,
  today_sales: 0,
  today_profit: 0,
  today_cost: 0,
  stock_in: 0,
  stock_out: 0
})

const valuation = ref([])
const categoryValuation = ref([])
const lowStock = ref([])

const search = ref('')
const categoryFilter = ref('')

const categories = computed(() => {
  return [
    ...new Set(
      valuation.value
        .map(product => product.category)
        .filter(Boolean)
    )
  ].sort()
})

const filteredProducts = computed(() => {
  const searchText = search.value.trim().toLowerCase()

  return valuation.value.filter(product => {
    const matchesSearch =
      !searchText ||
      product.name.toLowerCase().includes(searchText) ||
      product.sku.toLowerCase().includes(searchText)

    const matchesCategory =
      !categoryFilter.value ||
      product.category === categoryFilter.value

    return matchesSearch && matchesCategory
  })
})

const formatMoney = value => {
  return Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatPercent = value => {
  return Number(value || 0).toFixed(2)
}

const getStockClass = product => {
  const stock = Number(product.stock)
  const minimum = Number(product.minimum_stock)

  if (stock === 0) {
    return 'out'
  }

  if (stock <= minimum) {
    return 'low'
  }

  return 'good'
}

const loadReports = async () => {
  loading.value = true
  error.value = ''

  try {
    const [
      summaryResponse,
      valuationResponse,
      categoryResponse,
      lowStockResponse
    ] = await Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/inventory-valuation'),
      api.get('/reports/category-valuation'),
      api.get('/reports/low-stock')
    ])

    summary.value = summaryResponse.data
    valuation.value = valuationResponse.data
    categoryValuation.value = categoryResponse.data
    lowStock.value = lowStockResponse.data
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to load reports.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
.reports-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
}

.page-header h2 {
  margin: 0;
}

.page-header p {
  margin: 5px 0 0;
  color: #777;
}

.refresh-button {
  border: 0;
  background: #17191c;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.refresh-button:hover {
  background: #292c31;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
}

.stat span {
  display: block;
  color: #777;
  font-size: 14px;
  margin-bottom: 10px;
}

.stat strong {
  font-size: 24px;
}

.panel {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
}

.panel-header p {
  color: #777;
  margin: 6px 0 0;
  font-size: 14px;
}

.filters {
  display: flex;
  gap: 10px;
}

.filters input,
.filters select {
  border: 1px solid #d8dade;
  border-radius: 6px;
  padding: 10px 12px;
  background: white;
  min-width: 190px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

th,
td {
  padding: 13px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}

th {
  font-size: 13px;
  color: #666;
  background: #fafafa;
}

td {
  font-size: 14px;
}

.stock-badge {
  display: inline-block;
  min-width: 40px;
  text-align: center;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: bold;
}

.stock-badge.good {
  background: #e8f5e9;
  color: #2e7d32;
}

.stock-badge.low {
  background: #fff3cd;
  color: #856404;
}

.stock-badge.out {
  background: #f8d7da;
  color: #842029;
}

.table-footer {
  margin-top: 15px;
  color: #777;
  font-size: 13px;
}

.empty {
  text-align: center;
  padding: 30px;
  color: #777;
}

.message {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
}

.message.error {
  color: #b42318;
  background: #fff5f5;
}

@media (max-width: 1000px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .panel-header {
    flex-direction: column;
  }

  .filters {
    width: 100%;
  }

  .filters input,
  .filters select {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 600px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .filters {
    flex-direction: column;
  }

  .filters input,
  .filters select {
    width: 100%;
  }

  .panel {
    padding: 15px;
  }
}
</style>