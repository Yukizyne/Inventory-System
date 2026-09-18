<template>
  <div>
    <div class="page-header">
      <div>
        <h2>Audit Log</h2>
        <p>Track important system activity</p>
      </div>

      <button
        class="refresh-button"
        @click="loadLogs"
      >
        Refresh
      </button>
    </div>

    <div class="panel filters-panel">
      <div class="filter-grid">
        <div class="field">
          <label>Action</label>

          <select v-model="filters.action">
            <option value="">All actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="STOCK_IN">Stock In</option>
            <option value="STOCK_OUT">Stock Out</option>
          </select>
        </div>

        <div class="field">
          <label>User</label>

          <select v-model="filters.user_id">
            <option value="">All users</option>

            <option
              v-for="user in users"
              :key="user.id"
              :value="user.id"
            >
              {{ user.name }} — {{ user.role }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>From</label>

          <input
            v-model="filters.from"
            type="date"
          >
        </div>

        <div class="field">
          <label>To</label>

          <input
            v-model="filters.to"
            type="date"
          >
        </div>

        <div class="filter-actions">
          <button
            class="apply-button"
            @click="loadLogs"
          >
            Apply Filters
          </button>

          <button
            class="clear-button"
            @click="clearFilters"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Activity History</h3>
          <p>{{ logs.length }} record(s) shown</p>
        </div>
      </div>

      <div
        v-if="loading"
        class="message"
      >
        Loading activity...
      </div>

      <div
        v-else-if="!logs.length"
        class="message"
      >
        No activity found.
      </div>

      <div
        v-else
        class="table-wrapper"
      >
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Description</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="log in logs"
              :key="log.id"
            >
              <td>
                {{ formatDate(log.created_at) }}
              </td>

              <td>
                <div class="user-cell">
                  <strong>
                    {{ log.user_name || 'System' }}
                  </strong>

                  <span v-if="log.user_email">
                    {{ log.user_email }}
                  </span>
                </div>
              </td>

              <td>
                <span
                  v-if="log.user_role"
                  class="role-badge"
                  :class="log.user_role.toLowerCase()"
                >
                  {{ log.user_role }}
                </span>

                <span v-else>
                  —
                </span>
              </td>

              <td>
                <span
                  class="action-badge"
                  :class="getActionClass(log.action)"
                >
                  {{ log.action }}
                </span>
              </td>

              <td class="description">
                {{ log.description }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const logs = ref([])
const users = ref([])
const loading = ref(false)

const filters = reactive({
  action: '',
  user_id: '',
  from: '',
  to: ''
})

async function loadLogs() {
  loading.value = true

  try {
    const params = {}

    if (filters.action) {
      params.action = filters.action
    }

    if (filters.user_id) {
      params.user_id = filters.user_id
    }

    if (filters.from) {
      params.from = filters.from
    }

    if (filters.to) {
      params.to = filters.to
    }

    const response = await api.get('/audit', {
      params
    })

    logs.value = Array.isArray(response.data)
      ? response.data
      : response.data.logs || []
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  try {
    const response = await api.get('/users')

    users.value = Array.isArray(response.data)
      ? response.data
      : response.data.users || []
  } catch (error) {
    console.error(error)
  }
}

function clearFilters() {
  filters.action = ''
  filters.user_id = ''
  filters.from = ''
  filters.to = ''

  loadLogs()
}

function formatDate(date) {
  if (!date) {
    return ''
  }

  return new Date(date).toLocaleString()
}

function getActionClass(action) {
  const value = String(action || '').toLowerCase()

  if (
    value.includes('delete') ||
    value.includes('cancel')
  ) {
    return 'danger'
  }

  if (
    value.includes('create') ||
    value.includes('stock_in')
  ) {
    return 'success'
  }

  if (
    value.includes('update') ||
    value.includes('stock_out')
  ) {
    return 'warning'
  }

  if (value.includes('login')) {
    return 'info'
  }

  return 'default'
}

onMounted(async () => {
  await Promise.all([
    loadLogs(),
    loadUsers()
  ])
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.page-header h2 {
  margin: 0;
}

.page-header p {
  margin: 5px 0 0;
  color: #777;
}

.panel {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.filters-panel {
  margin-bottom: 20px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
  gap: 15px;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field label {
  font-size: 13px;
  color: #555;
}

.field input,
.field select {
  width: 100%;
  padding: 10px 11px;
  border: 1px solid #d8dade;
  border-radius: 6px;
  background: white;
  outline: none;
}

.field input:focus,
.field select:focus {
  border-color: #888;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.apply-button,
.clear-button,
.refresh-button {
  padding: 10px 13px;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.apply-button,
.refresh-button {
  background: #17191c;
  color: white;
}

.clear-button {
  background: #e9eaec;
  color: #333;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.panel-header h3 {
  margin: 0;
}

.panel-header p {
  margin: 5px 0 0;
  color: #777;
  font-size: 13px;
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
  padding: 13px 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}

th {
  color: #666;
  font-size: 13px;
  font-weight: 600;
}

td {
  font-size: 14px;
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.user-cell span {
  color: #777;
  font-size: 12px;
}

.role-badge,
.action-badge {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: bold;
}

.role-badge.admin {
  background: #eee;
  color: #222;
}

.role-badge.staff {
  background: #f2f2f2;
  color: #555;
}

.action-badge {
  background: #eee;
  color: #444;
}

.action-badge.success {
  background: #e8f5e9;
  color: #287d3c;
}

.action-badge.warning {
  background: #fff4db;
  color: #8a5a00;
}

.action-badge.danger {
  background: #ffe8e8;
  color: #b42318;
}

.action-badge.info {
  background: #e8f1ff;
  color: #245ea8;
}

.description {
  max-width: 450px;
  white-space: normal;
  line-height: 1.4;
}

.message {
  color: #777;
  padding: 30px;
  text-align: center;
}

@media (max-width: 1100px) {
  .filter-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-actions {
    grid-column: span 2;
  }
}

@media (max-width: 600px) {
  .page-header {
    align-items: flex-start;
  }

  .panel {
    padding: 15px;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    grid-column: auto;
  }

  .filter-actions button {
    flex: 1;
  }
}
</style>