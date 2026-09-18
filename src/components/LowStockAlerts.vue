<template>
  <div class="alerts-panel">
    <div class="alerts-header">
      <div>
        <h3>Inventory Alerts</h3>
        <p>Products that need attention</p>
      </div>

      <button @click="loadAlerts">
        Refresh
      </button>
    </div>

    <div v-if="loading" class="loading">
      Loading alerts...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else>
      <div class="alert-summary">
        <div class="summary-item">
          <span>Total Alerts</span>
          <strong>{{ alerts.total }}</strong>
        </div>

        <div class="summary-item out">
          <span>Out of Stock</span>
          <strong>{{ alerts.out_of_stock }}</strong>
        </div>

        <div class="summary-item low">
          <span>Low Stock</span>
          <strong>{{ alerts.low_stock }}</strong>
        </div>
      </div>

      <div
        v-if="alerts.notifications.length === 0"
        class="no-alerts"
      >
        <strong>All stock levels are okay.</strong>
        <span>No inventory alerts right now.</span>
      </div>

      <div
        v-for="item in alerts.notifications"
        :key="item.id"
        class="alert-item"
      >
        <div class="alert-icon">
          {{ Number(item.stock) === 0 ? '!' : '!' }}
        </div>

        <div class="alert-content">
          <strong>{{ item.name }}</strong>

          <span>
            SKU: {{ item.sku }}
          </span>

          <span>
            Stock: {{ item.stock }}
            / Minimum: {{ item.minimum_stock }}
          </span>
        </div>

        <div
          :class="[
            'alert-status',
            Number(item.stock) === 0
              ? 'out'
              : 'low'
          ]"
        >
          {{
            Number(item.stock) === 0
              ? 'OUT OF STOCK'
              : 'LOW STOCK'
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'

const loading = ref(true)
const error = ref('')

const alerts = ref({
  total: 0,
  out_of_stock: 0,
  low_stock: 0,
  notifications: []
})

const loadAlerts = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await api.get('/reports/notifications')

    alerts.value = response.data
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to load inventory alerts.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAlerts()
})

defineExpose({
  loadAlerts
})
</script>

<style scoped>
.alerts-panel {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.alerts-header h3 {
  margin: 0;
}

.alerts-header p {
  color: #777;
  margin: 5px 0 0;
  font-size: 14px;
}

.alerts-header button {
  border: 0;
  background: #17191c;
  color: white;
  padding: 9px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.alert-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 15px;
}

.summary-item {
  border: 1px solid #e4e5e7;
  border-radius: 6px;
  padding: 14px;
}

.summary-item span {
  display: block;
  color: #777;
  font-size: 13px;
  margin-bottom: 5px;
}

.summary-item strong {
  font-size: 22px;
}

.summary-item.out {
  border-left: 4px solid #c62828;
}

.summary-item.low {
  border-left: 4px solid #f9a825;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid #eee;
}

.alert-item:last-child {
  border-bottom: 0;
}

.alert-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff3cd;
  color: #856404;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.alert-content strong {
  font-size: 14px;
}

.alert-content span {
  color: #777;
  font-size: 12px;
}

.alert-status {
  font-size: 11px;
  font-weight: bold;
  padding: 6px 8px;
  border-radius: 5px;
  white-space: nowrap;
}

.alert-status.out {
  background: #f8d7da;
  color: #842029;
}

.alert-status.low {
  background: #fff3cd;
  color: #856404;
}

.no-alerts {
  border: 1px solid #e4e5e7;
  border-radius: 6px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.no-alerts span {
  color: #777;
  font-size: 13px;
}

.loading,
.error {
  padding: 15px;
}

.error {
  color: #b42318;
}

@media (max-width: 700px) {
  .alert-summary {
    grid-template-columns: 1fr;
  }

  .alert-item {
    align-items: flex-start;
  }

  .alert-status {
    margin-left: auto;
  }
}
</style>