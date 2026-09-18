<template>
  <div>
    <div class="page-header">
      <div>
        <h2>Purchase Orders</h2>
        <p>Manage supplier orders and incoming inventory.</p>
      </div>

      <button
        class="add-button"
        @click="openCreate"
      >
        + New Purchase Order
      </button>
    </div>

    <div
      v-if="message"
      class="message success"
    >
      {{ message }}
    </div>

    <div
      v-if="error"
      class="message error"
    >
      {{ error }}
    </div>

    <div class="stats">
      <div class="stat">
        <span>Total Orders</span>
        <strong>{{ orders.length }}</strong>
      </div>

      <div class="stat">
        <span>Pending</span>
        <strong>{{ pendingCount }}</strong>
      </div>

      <div class="stat">
        <span>Received</span>
        <strong>{{ receivedCount }}</strong>
      </div>

      <div class="stat">
        <span>Total Value</span>
        <strong>₱{{ money(totalValue) }}</strong>
      </div>
    </div>

    <div class="panel">
      <div
        v-if="loading"
        class="empty"
      >
        Loading purchase orders...
      </div>

      <div
        v-else-if="!orders.length"
        class="empty"
      >
        No purchase orders yet.
      </div>

      <div
        v-else
        class="table-wrapper"
      >
        <table>
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Created</th>
              <th>Received</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="order in orders"
              :key="order.id"
            >
              <td>#{{ order.id }}</td>

              <td>
                {{ order.supplier_name }}
              </td>

              <td>
                {{ order.item_count }}
              </td>

              <td>
                ₱{{ money(order.total) }}
              </td>

              <td>
                <span
                  :class="[
                    'status',
                    order.status.toLowerCase()
                  ]"
                >
                  {{ order.status }}
                </span>
              </td>

              <td>
                {{ formatDate(order.created_at) }}
              </td>

              <td>
                {{
                  order.received_at
                    ? formatDate(order.received_at)
                    : '-'
                }}
              </td>

              <td>
                <div class="actions">
                  <button
                    class="small-button"
                    @click="viewOrder(order.id)"
                  >
                    View
                  </button>

                  <button
                    v-if="order.status === 'PENDING'"
                    class="small-button receive"
                    @click="receiveOrder(order.id)"
                  >
                    Receive
                  </button>

                  <button
                    v-if="order.status === 'PENDING'"
                    class="small-button cancel"
                    @click="cancelOrder(order.id)"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="showForm"
      class="modal-overlay"
      @click.self="closeForm"
    >
      <div class="modal">
        <div class="modal-header">
          <div>
            <h3>New Purchase Order</h3>
            <p>
              Add products and their supplier purchase costs.
            </p>
          </div>

          <button
            class="close-button"
            @click="closeForm"
          >
            ×
          </button>
        </div>

        <div class="field">
          <label>Supplier</label>

          <select v-model="form.supplier_id">
            <option value="">
              Select supplier
            </option>

            <option
              v-for="supplier in suppliers"
              :key="supplier.id"
              :value="supplier.id"
            >
              {{ supplier.name }}
            </option>
          </select>
        </div>

        <div class="items-header">
          <strong>Products</strong>

          <button
            class="small-button"
            @click="addItem"
          >
            + Add Product
          </button>
        </div>

        <div
          v-for="(item, index) in form.items"
          :key="index"
          class="order-item"
        >
          <div class="field">
            <label>Product</label>

            <select
              v-model="item.product_id"
            >
              <option value="">
                Select product
              </option>

              <option
                v-for="product in availableProducts(index)"
                :key="product.id"
                :value="product.id"
              >
                {{ product.name }}
                —
                {{ product.sku }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>Quantity</label>

            <input
              v-model.number="item.quantity"
              type="number"
              min="1"
            >
          </div>

          <div class="field">
            <label>Purchase Cost</label>

            <input
              v-model.number="item.cost"
              type="number"
              min="0"
              step="0.01"
            >
          </div>

          <div class="item-total">
            ₱{{ money(itemSubtotal(item)) }}
          </div>

          <button
            class="remove-button"
            :disabled="form.items.length === 1"
            @click="removeItem(index)"
          >
            Remove
          </button>
        </div>

        <div class="order-total">
          <span>Total</span>
          <strong>
            ₱{{ money(formTotal) }}
          </strong>
        </div>

        <div class="form-actions">
          <button
            class="secondary-button"
            @click="closeForm"
          >
            Cancel
          </button>

          <button
            class="primary-button"
            :disabled="saving"
            @click="createOrder"
          >
            {{
              saving
                ? 'Creating...'
                : 'Create Purchase Order'
            }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="selectedOrder"
      class="modal-overlay"
      @click.self="selectedOrder = null"
    >
      <div class="modal">
        <div class="modal-header">
          <div>
            <h3>
              Purchase Order #{{ selectedOrder.order.id }}
            </h3>

            <p>
              {{ selectedOrder.order.supplier_name }}
            </p>
          </div>

          <button
            class="close-button"
            @click="selectedOrder = null"
          >
            ×
          </button>
        </div>

        <div class="detail-grid">
          <div>
            <span>Status</span>
            <strong>
              {{ selectedOrder.order.status }}
            </strong>
          </div>

          <div>
            <span>Total</span>
            <strong>
              ₱{{ money(selectedOrder.order.total) }}
            </strong>
          </div>

          <div>
            <span>Created</span>
            <strong>
              {{ formatDate(selectedOrder.order.created_at) }}
            </strong>
          </div>

          <div>
            <span>Received</span>
            <strong>
              {{
                selectedOrder.order.received_at
                  ? formatDate(
                      selectedOrder.order.received_at
                    )
                  : '-'
              }}
            </strong>
          </div>
        </div>

        <div class="detail-items">
          <div
            v-for="item in selectedOrder.items"
            :key="item.id"
            class="detail-item"
          >
            <div>
              <strong>
                {{ item.product_name }}
              </strong>

              <span>
                {{ item.sku }}
              </span>
            </div>

            <div>
              {{ item.quantity }}
              ×
              ₱{{ money(item.cost) }}
            </div>

            <strong>
              ₱{{ money(item.subtotal) }}
            </strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  onMounted,
  ref
} from 'vue'

import api from '../services/api'

const orders = ref([])
const suppliers = ref([])
const products = ref([])

const loading = ref(true)
const saving = ref(false)

const error = ref('')
const message = ref('')

const showForm = ref(false)
const selectedOrder = ref(null)

const form = ref({
  supplier_id: '',
  items: [
    {
      product_id: '',
      quantity: 1,
      cost: 0
    }
  ]
})

const pendingCount = computed(() => {
  return orders.value.filter(
    order => order.status === 'PENDING'
  ).length
})

const receivedCount = computed(() => {
  return orders.value.filter(
    order => order.status === 'RECEIVED'
  ).length
})

const totalValue = computed(() => {
  return orders.value.reduce(
    (total, order) =>
      total + Number(order.total || 0),
    0
  )
})

const formTotal = computed(() => {
  return form.value.items.reduce(
    (total, item) =>
      total + itemSubtotal(item),
    0
  )
})

function money(value) {
  return Number(value || 0).toFixed(2)
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString()
}

function itemSubtotal(item) {
  const quantity =
    Number(item.quantity) || 0

  const cost =
    Number(item.cost) || 0

  return quantity * cost
}

function clearMessages() {
  error.value = ''
  message.value = ''
}

async function loadOrders() {
  const response =
    await api.get('/purchase-orders')

  orders.value = response.data
}

async function loadSuppliers() {
  const response =
    await api.get('/suppliers')

  suppliers.value = response.data
}

async function loadProducts() {
  const response =
    await api.get('/products')

  products.value = response.data
}

async function loadData() {
  loading.value = true
  clearMessages()

  try {
    await Promise.all([
      loadOrders(),
      loadSuppliers(),
      loadProducts()
    ])
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to load purchase orders.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  clearMessages()

  form.value = {
    supplier_id: '',
    items: [
      {
        product_id: '',
        quantity: 1,
        cost: 0
      }
    ]
  }

  showForm.value = true
}

function closeForm() {
  if (saving.value) {
    return
  }

  showForm.value = false
}

function addItem() {
  form.value.items.push({
    product_id: '',
    quantity: 1,
    cost: 0
  })
}

function removeItem(index) {
  if (form.value.items.length === 1) {
    return
  }

  form.value.items.splice(index, 1)
}

function availableProducts(index) {
  const selectedIds =
    form.value.items
      .map((item, itemIndex) => {
        if (itemIndex === index) {
          return null
        }

        return Number(item.product_id)
      })
      .filter(Boolean)

  return products.value.filter(product => {
    return !selectedIds.includes(
      Number(product.id)
    )
  })
}

async function createOrder() {
  clearMessages()

  if (!form.value.supplier_id) {
    error.value =
      'Please select a supplier.'

    return
  }

  if (!form.value.items.length) {
    error.value =
      'Add at least one product.'

    return
  }

  for (const item of form.value.items) {
    if (!item.product_id) {
      error.value =
        'Please select a product for every row.'

      return
    }

    if (
      !Number.isInteger(
        Number(item.quantity)
      ) ||
      Number(item.quantity) <= 0
    ) {
      error.value =
        'Quantity must be a positive whole number.'

      return
    }

    if (
      !Number.isFinite(
        Number(item.cost)
      ) ||
      Number(item.cost) < 0
    ) {
      error.value =
        'Purchase cost must be zero or higher.'

      return
    }
  }

  const productIds =
    form.value.items.map(item =>
      Number(item.product_id)
    )

  if (
    new Set(productIds).size !==
    productIds.length
  ) {
    error.value =
      'A product can only be added once.'

    return
  }

  saving.value = true

  try {
    await api.post(
      '/purchase-orders',
      {
        supplier_id:
          Number(form.value.supplier_id),

        items:
          form.value.items.map(item => ({
            product_id:
              Number(item.product_id),

            quantity:
              Number(item.quantity),

            cost:
              Number(item.cost)
          }))
      }
    )

    showForm.value = false

    message.value =
      'Purchase order created successfully.'

    await loadOrders()
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to create purchase order.'
  } finally {
    saving.value = false
  }
}

async function viewOrder(id) {
  clearMessages()

  try {
    const response =
      await api.get(
        `/purchase-orders/${id}`
      )

    selectedOrder.value =
      response.data
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to load purchase order.'
  }
}

async function receiveOrder(id) {
  const confirmed =
    window.confirm(
      `Receive Purchase Order #${id}?\n\nThis will increase stock and update the product cost price using the purchase cost in this order.`
    )

  if (!confirmed) {
    return
  }

  clearMessages()

  try {
    await api.post(
      `/purchase-orders/${id}/receive`
    )

    message.value =
      `Purchase Order #${id} received successfully. Stock and cost prices were updated.`

    await loadOrders()
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to receive purchase order.'
  }
}

async function cancelOrder(id) {
  const confirmed =
    window.confirm(
      `Cancel Purchase Order #${id}?`
    )

  if (!confirmed) {
    return
  }

  clearMessages()

  try {
    await api.put(
      `/purchase-orders/${id}/cancel`
    )

    message.value =
      `Purchase Order #${id} cancelled successfully.`

    await loadOrders()
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to cancel purchase order.'
  }
}

onMounted(() => {
  loadData()
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

.add-button,
.primary-button {
  border: 0;
  background: #202124;
  color: white;
  padding: 11px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.add-button:hover,
.primary-button:hover {
  background: #303134;
}

.message {
  padding: 12px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.message.success {
  background: #edf7ee;
  color: #216e39;
  border: 1px solid #cce8d1;
}

.message.error {
  background: #fff1f0;
  color: #b42318;
  border: 1px solid #f2c7c3;
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
  margin-bottom: 9px;
}

.stat strong {
  font-size: 24px;
}

.panel {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 950px;
}

th,
td {
  padding: 13px 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}

th {
  color: #666;
  font-size: 13px;
  font-weight: 600;
}

.status {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: bold;
}

.status.pending {
  background: #fff5d6;
  color: #8a6500;
}

.status.received {
  background: #eaf7ed;
  color: #23743b;
}

.status.cancelled {
  background: #fbecec;
  color: #a32929;
}

.actions {
  display: flex;
  gap: 6px;
}

.small-button {
  border: 1px solid #d5d7da;
  background: white;
  color: #333;
  padding: 7px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
}

.small-button:hover {
  background: #f5f5f5;
}

.small-button.receive {
  border-color: #b7d9be;
  color: #216e39;
}

.small-button.cancel {
  border-color: #e5b9b5;
  color: #b42318;
}

.empty {
  text-align: center;
  padding: 35px;
  color: #777;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 850px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 9px;
  padding: 25px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.modal-header h3 {
  margin: 0;
}

.modal-header p {
  margin: 5px 0 0;
  color: #777;
  font-size: 13px;
}

.close-button {
  border: 0;
  background: transparent;
  font-size: 26px;
  cursor: pointer;
  color: #777;
}

.field {
  margin-bottom: 15px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: bold;
}

.field input,
.field select {
  width: 100%;
  border: 1px solid #d5d7da;
  border-radius: 5px;
  padding: 10px;
  background: white;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 12px;
}

.order-item {
  display: grid;
  grid-template-columns: 2fr 0.8fr 1fr auto auto;
  gap: 10px;
  align-items: end;
  border: 1px solid #e5e5e5;
  border-radius: 7px;
  padding: 12px;
  margin-bottom: 10px;
}

.order-item .field {
  margin-bottom: 0;
}

.item-total {
  padding: 10px 0;
  font-weight: bold;
  white-space: nowrap;
}

.remove-button {
  border: 0;
  background: #fff0ef;
  color: #b42318;
  padding: 9px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.remove-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.order-total {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #ddd;
  padding-top: 18px;
  margin-top: 18px;
  font-size: 18px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.secondary-button {
  border: 1px solid #d5d7da;
  background: white;
  padding: 11px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.detail-grid div {
  background: #f7f7f7;
  padding: 13px;
  border-radius: 6px;
}

.detail-grid span {
  display: block;
  color: #777;
  font-size: 12px;
  margin-bottom: 5px;
}

.detail-grid strong {
  font-size: 14px;
}

.detail-items {
  border-top: 1px solid #eee;
}

.detail-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 20px;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid #eee;
}

.detail-item div:first-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item span {
  color: #777;
  font-size: 12px;
}

@media (max-width: 900px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .order-item {
    grid-template-columns: 1fr 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .page-header {
    display: block;
  }

  .page-header .add-button {
    margin-top: 15px;
    width: 100%;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .order-item {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-item {
    grid-template-columns: 1fr;
    gap: 7px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>