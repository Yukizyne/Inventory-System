<template>
  <div class="stock-page">
    <div class="page-header">
      <div>
        <h2>Stock Management</h2>
        <p>Manage stock-in, stock-out and inventory movements</p>
      </div>

      <button
        class="refresh-button"
        @click="refreshAll"
      >
        Refresh
      </button>
    </div>

    <div class="stock-actions">
      <button
        class="action-button stock-in-button"
        @click="openStockIn"
      >
        + Stock In
      </button>

      <button
        class="action-button stock-out-button"
        @click="openStockOut"
      >
        − Stock Out
      </button>
    </div>

    <div class="stats">
      <div class="stat">
        <span>Total Products</span>
        <strong>{{ products.length }}</strong>
      </div>

      <div class="stat">
        <span>Total Units</span>
        <strong>{{ totalStock }}</strong>
      </div>

      <div class="stat warning">
        <span>Low Stock</span>
        <strong>{{ lowStockCount }}</strong>
      </div>

      <div class="stat danger">
        <span>Out of Stock</span>
        <strong>{{ outOfStockCount }}</strong>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Current Inventory</h3>
          <p>Current stock levels for all products</p>
        </div>

        <input
          v-model="search"
          type="text"
          placeholder="Search product or SKU..."
        >
      </div>

      <div v-if="loadingProducts" class="message">
        Loading products...
      </div>

      <div
        v-else-if="filteredProducts.length === 0"
        class="message"
      >
        No products found.
      </div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Minimum</th>
              <th>Status</th>
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

              <td>
                {{ product.sku }}
              </td>

              <td>
                {{ product.category_name || product.category || '—' }}
              </td>

              <td>
                <strong>{{ product.stock }}</strong>
              </td>

              <td>
                {{ product.minimum_stock }}
              </td>

              <td>
                <span
                  class="status"
                  :class="getStockStatusClass(product)"
                >
                  {{ getStockStatus(product) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h3>Stock Movement History</h3>
          <p>Latest inventory movements</p>
        </div>
      </div>

      <div v-if="loadingMovements" class="message">
        Loading movements...
      </div>

      <div
        v-else-if="movements.length === 0"
        class="message"
      >
        No stock movements recorded.
      </div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Reason</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="movement in movements"
              :key="movement.id"
            >
              <td>
                {{ formatDate(movement.created_at) }}
              </td>

              <td>
                {{ movement.product_name }}
              </td>

              <td>
                {{ movement.sku }}
              </td>

              <td>
                <span
                  class="movement-type"
                  :class="movement.type === 'IN' ? 'in' : 'out'"
                >
                  {{ movement.type }}
                </span>
              </td>

              <td>
                {{ movement.quantity }}
              </td>

              <td>
                {{ movement.reason || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="showModal"
      class="modal-overlay"
      @click.self="closeModal"
    >
      <div class="modal">
        <div class="modal-header">
          <div>
            <h3>
              {{ modalType === 'IN' ? 'Stock In' : 'Stock Out' }}
            </h3>

            <p>
              {{
                modalType === 'IN'
                  ? 'Add inventory to a product'
                  : 'Remove inventory from a product'
              }}
            </p>
          </div>

          <button
            class="close-button"
            @click="closeModal"
          >
            ×
          </button>
        </div>

        <form @submit.prevent="submitStock">
          <div class="field">
            <label>Product</label>

            <select
              v-model="form.productId"
              @change="updateSelectedProduct"
              required
            >
              <option value="">
                Select product
              </option>

              <option
                v-for="product in products"
                :key="product.id"
                :value="product.id"
              >
                {{ product.name }} — Stock: {{ product.stock }}
              </option>
            </select>
          </div>

          <div
            v-if="selectedProduct"
            class="current-stock"
          >
            <span>Current Stock</span>

            <strong>
              {{ selectedProduct.stock }}
            </strong>

            <small>
              Minimum:
              {{ selectedProduct.minimum_stock }}
            </small>
          </div>

          <div class="field">
            <label>Quantity</label>

            <input
              v-model.number="form.quantity"
              type="number"
              min="1"
              step="1"
              required
              placeholder="Enter quantity"
            >
          </div>

          <div class="field">
            <label>Reason</label>

            <input
              v-model="form.reason"
              type="text"
              maxlength="255"
              :placeholder="
                modalType === 'IN'
                  ? 'Example: New delivery'
                  : 'Example: Damaged item'
              "
            >
          </div>

          <div
            v-if="modalError"
            class="error"
          >
            {{ modalError }}
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="cancel-button"
              @click="closeModal"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="submit-button"
              :disabled="saving"
            >
              {{
                saving
                  ? 'Saving...'
                  : modalType === 'IN'
                    ? 'Add Stock'
                    : 'Remove Stock'
              }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'

const products = ref([])
const movements = ref([])

const search = ref('')

const loadingProducts = ref(false)
const loadingMovements = ref(false)
const saving = ref(false)

const showModal = ref(false)
const modalType = ref('IN')
const modalError = ref('')

const selectedProduct = ref(null)

const form = ref({
  productId: '',
  quantity: 1,
  reason: ''
})

const filteredProducts = computed(() => {
  const value = search.value.trim().toLowerCase()

  if (!value) {
    return products.value
  }

  return products.value.filter(product =>
    product.name.toLowerCase().includes(value) ||
    product.sku.toLowerCase().includes(value)
  )
})

const totalStock = computed(() => {
  return products.value.reduce(
    (total, product) =>
      total + Number(product.stock || 0),
    0
  )
})

const lowStockCount = computed(() => {
  return products.value.filter(product =>
    Number(product.stock) > 0 &&
    Number(product.stock) <= Number(product.minimum_stock)
  ).length
})

const outOfStockCount = computed(() => {
  return products.value.filter(product =>
    Number(product.stock) <= 0
  ).length
})

const loadProducts = async () => {
  loadingProducts.value = true

  try {
    const response = await api.get('/products')
    products.value = response.data
  } catch (error) {
    console.error(error)
  } finally {
    loadingProducts.value = false
  }
}

const loadMovements = async () => {
  loadingMovements.value = true

  try {
    const response = await api.get('/stock/movements')
    movements.value = response.data
  } catch (error) {
    console.error(error)
  } finally {
    loadingMovements.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([
    loadProducts(),
    loadMovements()
  ])
}

const openStockIn = () => {
  modalType.value = 'IN'
  openModal()
}

const openStockOut = () => {
  modalType.value = 'OUT'
  openModal()
}

const openModal = () => {
  form.value = {
    productId: '',
    quantity: 1,
    reason: ''
  }

  selectedProduct.value = null
  modalError.value = ''
  showModal.value = true
}

const closeModal = () => {
  if (saving.value) {
    return
  }

  showModal.value = false
}

const updateSelectedProduct = () => {
  selectedProduct.value =
    products.value.find(
      product =>
        String(product.id) === String(form.value.productId)
    ) || null

  modalError.value = ''
}

const submitStock = async () => {
  modalError.value = ''

  const productId = form.value.productId
  const quantity = Number(form.value.quantity)

  if (!productId) {
    modalError.value = 'Please select a product.'
    return
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    modalError.value =
      'Quantity must be a positive whole number.'
    return
  }

  if (
    modalType.value === 'OUT' &&
    selectedProduct.value &&
    quantity > Number(selectedProduct.value.stock)
  ) {
    modalError.value =
      `Not enough stock. Current stock: ${selectedProduct.value.stock}.`
    return
  }

  saving.value = true

  try {
    const endpoint =
      modalType.value === 'IN'
        ? '/stock/in'
        : '/stock/out'

    await api.post(endpoint, {
      productId,
      quantity,
      reason: form.value.reason
    })

    showModal.value = false

    await refreshAll()
  } catch (error) {
    modalError.value =
      error.response?.data?.message ||
      'Failed to update stock.'
  } finally {
    saving.value = false
  }
}

const getStockStatus = (product) => {
  const stock = Number(product.stock)
  const minimum = Number(product.minimum_stock)

  if (stock <= 0) {
    return 'Out of Stock'
  }

  if (stock <= minimum) {
    return 'Low Stock'
  }

  return 'In Stock'
}

const getStockStatusClass = (product) => {
  const status = getStockStatus(product)

  if (status === 'Out of Stock') {
    return 'danger'
  }

  if (status === 'Low Stock') {
    return 'warning'
  }

  return 'good'
}

const formatDate = (date) => {
  return new Date(date).toLocaleString()
}

onMounted(() => {
  refreshAll()
})
</script>

<style scoped>
.stock-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.page-header p {
  margin: 5px 0 0;
  color: #777;
}

.refresh-button {
  border: 1px solid #ddd;
  background: white;
  padding: 9px 15px;
  border-radius: 6px;
  cursor: pointer;
}

.stock-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.action-button {
  border: none;
  padding: 11px 18px;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-weight: bold;
}

.stock-in-button {
  background: #287a36;
}

.stock-out-button {
  background: #c62828;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 18px;
}

.stat span {
  display: block;
  color: #777;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat strong {
  font-size: 25px;
}

.stat.warning strong {
  color: #b26a00;
}

.stat.danger strong {
  color: #c62828;
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
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
}

.panel-header p {
  margin: 5px 0 0;
  color: #777;
  font-size: 14px;
}

.panel-header input {
  width: 280px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 13px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

th {
  background: #f7f7f7;
}

.status,
.movement-type {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.status.good {
  background: #eaf6ec;
  color: #287a36;
}

.status.warning {
  background: #fff4df;
  color: #a66300;
}

.status.danger {
  background: #fff0f0;
  color: #c62828;
}

.movement-type.in {
  background: #eaf6ec;
  color: #287a36;
}

.movement-type.out {
  background: #fff0f0;
  color: #c62828;
}

.message {
  padding: 20px;
  text-align: center;
  color: #777;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  z-index: 1000;
}

.modal {
  width: 480px;
  max-width: 100%;
  background: white;
  border-radius: 8px;
  padding: 25px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
}

.modal-header p {
  margin: 5px 0 0;
  color: #777;
  font-size: 14px;
}

.close-button {
  border: none;
  background: none;
  font-size: 25px;
  cursor: pointer;
  color: #777;
}

.field {
  margin-bottom: 16px;
}

.field label {
  display: block;
  margin-bottom: 7px;
  font-weight: bold;
}

.field input,
.field select {
  width: 100%;
  padding: 11px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: white;
}

.current-stock {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f6f8;
  border-radius: 6px;
  margin-bottom: 16px;
}

.current-stock span {
  color: #777;
}

.current-stock strong {
  font-size: 20px;
}

.current-stock small {
  margin-left: auto;
  color: #777;
}

.error {
  padding: 10px;
  background: #fff0f0;
  color: #c62828;
  border-radius: 5px;
  font-size: 14px;
  margin-bottom: 15px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.cancel-button,
.submit-button {
  flex: 1;
  padding: 11px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.cancel-button {
  background: #eee;
}

.submit-button {
  background: #17191c;
  color: white;
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 800px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .panel-header input {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .stats {
    grid-template-columns: 1fr;
  }

  .stock-actions {
    flex-direction: column;
  }

  .page-header {
    align-items: flex-start;
    gap: 15px;
    flex-direction: column;
  }

  .current-stock {
    flex-wrap: wrap;
  }

  .current-stock small {
    margin-left: 0;
    width: 100%;
  }
}
</style>