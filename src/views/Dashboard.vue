<template>
  <div class="dashboard">
    <div class="page-title">
      <h2>Dashboard</h2>
      <p>Overview of your grocery inventory</p>
    </div>

    <div v-if="loading" class="message">
      Loading dashboard...
    </div>

    <div v-else-if="error" class="message error">
      {{ error }}
    </div>

    <template v-else>
      <div class="stats">
        <div class="stat">
          <span>Total Products</span>
          <strong>{{ summary.total_products }}</strong>
        </div>

        <div class="stat">
          <span>Inventory Cost Value</span>
          <strong>₱{{ money(summary.inventory_cost_value) }}</strong>
        </div>

        <div class="stat">
          <span>Retail Value</span>
          <strong>₱{{ money(summary.inventory_retail_value) }}</strong>
        </div>

        <div class="stat">
          <span>Potential Profit</span>
          <strong>₱{{ money(summary.potential_profit) }}</strong>
        </div>

        <div class="stat">
          <span>Total Sales</span>
          <strong>₱{{ money(summary.total_sales) }}</strong>
        </div>

        <div class="stat">
          <span>Total Profit</span>
          <strong>₱{{ money(summary.total_profit) }}</strong>
        </div>

        <div class="stat">
          <span>Low Stock</span>
          <strong>{{ summary.low_stock }}</strong>
        </div>

        <div class="stat">
          <span>Out of Stock</span>
          <strong>{{ summary.out_of_stock }}</strong>
        </div>
      </div>

      <LowStockAlerts />

      <div class="dashboard-grid">
        <div class="panel">
          <h3>Today's Sales</h3>

          <div class="large-value">
            ₱{{ money(summary.today_sales) }}
          </div>

          <div class="detail-row">
            <span>Today's Cost</span>
            <strong>
              ₱{{ money(summary.today_cost) }}
            </strong>
          </div>

          <div class="detail-row">
            <span>Today's Profit</span>
            <strong>
              ₱{{ money(summary.today_profit) }}
            </strong>
          </div>
        </div>

        <div class="panel">
          <h3>Stock Activity</h3>

          <div class="large-value">
            {{ Number(summary.stock_in) + Number(summary.stock_out) }}
          </div>

          <div class="detail-row">
            <span>Stock In</span>
            <strong>{{ summary.stock_in }}</strong>
          </div>

          <div class="detail-row">
            <span>Stock Out</span>
            <strong>{{ summary.stock_out }}</strong>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>7-Day Sales</h3>
            <p>Revenue and profit for the last 7 days</p>
          </div>
        </div>

        <div class="chart">
          <div
            v-for="day in dailySales"
            :key="day.sale_date"
            class="chart-column"
          >
            <div class="bars">
              <div
                class="bar revenue"
                :style="{
                  height: `${getBarHeight(day.revenue)}%`
                }"
                :title="`Revenue: ₱${money(day.revenue)}`"
              ></div>

              <div
                class="bar profit"
                :style="{
                  height: `${getBarHeight(day.profit)}%`
                }"
                :title="`Profit: ₱${money(day.profit)}`"
              ></div>
            </div>

            <span>
              {{ formatDate(day.sale_date) }}
            </span>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Top Products</h3>
              <p>Products with the highest sales quantity</p>
            </div>
          </div>

          <div
            v-for="product in topProducts"
            :key="product.id"
            class="product-row"
          >
            <div>
              <strong>{{ product.name }}</strong>
              <span>{{ product.sku }}</span>
            </div>

            <div class="product-numbers">
              <strong>{{ product.quantity_sold }}</strong>
              <span>sold</span>
            </div>
          </div>

          <div
            v-if="topProducts.length === 0"
            class="empty"
          >
            No sales data yet.
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <div>
              <h3>Low Stock</h3>
              <p>Products needing restocking</p>
            </div>
          </div>

          <div
            v-for="product in lowStock"
            :key="product.id"
            class="product-row"
          >
            <div>
              <strong>{{ product.name }}</strong>
              <span>{{ product.sku }}</span>
            </div>

            <div class="stock-info">
              <strong>{{ product.stock }}</strong>
              <span>
                min {{ product.minimum_stock }}
              </span>
            </div>
          </div>

          <div
            v-if="lowStock.length === 0"
            class="empty"
          >
            No low-stock products.
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Recent Stock Activity</h3>
            <p>Latest inventory movements</p>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="movement in recentMovements"
                :key="movement.id"
              >
                <td>
                  <strong>{{ movement.name }}</strong>
                  <span class="subtext">
                    {{ movement.sku }}
                  </span>
                </td>

                <td>
                  <span
                    :class="[
                      'movement',
                      movement.type === 'IN'
                        ? 'in'
                        : 'out'
                    ]"
                  >
                    {{ movement.type }}
                  </span>
                </td>

                <td>{{ movement.quantity }}</td>

                <td>{{ movement.reason || '-' }}</td>

                <td>
                  {{ formatDateTime(movement.created_at) }}
                </td>
              </tr>

              <tr v-if="recentMovements.length === 0">
                <td colspan="5" class="empty">
                  No stock activity yet.
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
import { onMounted, ref } from 'vue'
import api from '../services/api'
import LowStockAlerts from '../components/LowStockAlerts.vue'

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

const dailySales = ref([])
const topProducts = ref([])
const lowStock = ref([])
const recentMovements = ref([])

const money = value => {
  return Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatDate = value => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric'
  })
}

const formatDateTime = value => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const getBarHeight = value => {
  const values = dailySales.value.flatMap(day => [
    Number(day.revenue),
    Number(day.profit)
  ])

  const max = Math.max(...values, 1)

  if (Number(value) <= 0) {
    return 2
  }

  return Math.max(
    5,
    Math.round((Number(value) / max) * 100)
  )
}

const loadDashboard = async () => {
  loading.value = true
  error.value = ''

  try {
    const [
      summaryResponse,
      dailyResponse,
      topResponse,
      lowResponse,
      movementsResponse
    ] = await Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/daily-sales'),
      api.get('/reports/top-products'),
      api.get('/reports/low-stock'),
      api.get('/reports/recent-movements')
    ])

    summary.value = summaryResponse.data
    dailySales.value = dailyResponse.data
    topProducts.value = topResponse.data
    lowStock.value = lowResponse.data
    recentMovements.value = movementsResponse.data
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to load dashboard.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.dashboard {
  width: 100%;
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

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.panel {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.panel-header {
  margin-bottom: 20px;
}

.panel h3 {
  margin: 0;
}

.panel-header p {
  color: #777;
  margin: 5px 0 0;
  font-size: 14px;
}

.large-value {
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid #eee;
}

.detail-row span {
  color: #777;
}

.chart {
  height: 260px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  border-bottom: 1px solid #ddd;
  padding: 20px 10px 0;
}

.chart-column {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.chart-column > span {
  font-size: 11px;
  color: #777;
  height: 20px;
}

.bars {
  width: 100%;
  height: calc(100% - 28px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
}

.bar {
  width: 14px;
  min-height: 2px;
  border-radius: 3px 3px 0 0;
}

.bar.revenue {
  background: #17191c;
}

.bar.profit {
  background: #777;
}

.product-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 14px 0;
  border-bottom: 1px solid #eee;
}

.product-row:last-child {
  border-bottom: 0;
}

.product-row div:first-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.product-row span {
  color: #777;
  font-size: 12px;
}

.product-numbers,
.stock-info {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stock-info strong {
  color: #b42318;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

th {
  background: #fafafa;
  color: #666;
  font-size: 13px;
}

td {
  font-size: 14px;
}

.subtext {
  display: block;
  color: #777;
  font-size: 11px;
  margin-top: 3px;
}

.movement {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: bold;
}

.movement.in {
  background: #e8f5e9;
  color: #2e7d32;
}

.movement.out {
  background: #f8d7da;
  color: #842029;
}

.empty {
  text-align: center;
  padding: 25px;
  color: #777;
}

@media (max-width: 1000px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

@media (max-width: 600px) {
  .stats {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 15px;
  }

  .chart {
    gap: 5px;
  }

  .bar {
    width: 9px;
  }
}
</style>