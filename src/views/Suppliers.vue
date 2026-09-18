<template>
  <div>
    <div class="page-header">
      <div>
        <h2>Suppliers</h2>
        <p>Manage suppliers and purchasing activity.</p>
      </div>

      <button
        v-if="isAdmin"
        class="add-button"
        @click="openCreate"
      >
        + Add Supplier
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
        <span>Total Suppliers</span>
        <strong>{{ suppliers.length }}</strong>
      </div>

      <div class="stat">
        <span>Pending Orders</span>
        <strong>{{ pendingOrders }}</strong>
      </div>

      <div class="stat">
        <span>Received Orders</span>
        <strong>{{ receivedOrders }}</strong>
      </div>

      <div class="stat">
        <span>Total Purchasing</span>
        <strong>
          ₱{{ money(totalPurchases) }}
        </strong>
      </div>
    </div>

    <div class="panel">
      <div
        v-if="loading"
        class="empty"
      >
        Loading suppliers...
      </div>

      <div
        v-else-if="!suppliers.length"
        class="empty"
      >
        No suppliers found.
      </div>

      <div
        v-else
        class="table-wrapper"
      >
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Pending</th>
              <th>Received</th>
              <th>Total Purchasing</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="supplier in suppliers"
              :key="supplier.id"
            >
              <td>
                <strong>
                  {{ supplier.name }}
                </strong>

                <span class="subtext">
                  {{ supplier.email || 'No email' }}
                </span>
              </td>

              <td>
                {{ supplier.contact_person || '-' }}
              </td>

              <td>
                {{ supplier.phone || '-' }}
              </td>

              <td>
                {{ supplier.order_count }}
              </td>

              <td>
                {{ supplier.pending_orders }}
              </td>

              <td>
                {{ supplier.received_orders }}
              </td>

              <td>
                ₱{{ money(supplier.total_purchases) }}
              </td>

              <td>
                <div class="actions">
                  <button
                    class="small-button"
                    @click="viewSupplier(supplier.id)"
                  >
                    View
                  </button>

                  <button
                    v-if="isAdmin"
                    class="small-button"
                    @click="openEdit(supplier)"
                  >
                    Edit
                  </button>

                  <button
                    v-if="isAdmin"
                    class="small-button danger"
                    @click="deleteSupplier(supplier)"
                  >
                    Delete
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
      <div class="modal small-modal">
        <div class="modal-header">
          <div>
            <h3>
              {{
                editingSupplier
                  ? 'Edit Supplier'
                  : 'Add Supplier'
              }}
            </h3>

            <p>
              Supplier contact information.
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
          <label>Supplier Name</label>

          <input
            v-model="form.name"
            type="text"
            placeholder="Supplier name"
          >
        </div>

        <div class="field">
          <label>Contact Person</label>

          <input
            v-model="form.contact_person"
            type="text"
            placeholder="Contact person"
          >
        </div>

        <div class="field">
          <label>Phone</label>

          <input
            v-model="form.phone"
            type="text"
            placeholder="Phone number"
          >
        </div>

        <div class="field">
          <label>Email</label>

          <input
            v-model="form.email"
            type="email"
            placeholder="Email address"
          >
        </div>

        <div class="field">
          <label>Address</label>

          <textarea
            v-model="form.address"
            rows="3"
            placeholder="Supplier address"
          ></textarea>
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
            @click="saveSupplier"
          >
            {{
              saving
                ? 'Saving...'
                : 'Save Supplier'
            }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="selectedSupplier"
      class="modal-overlay"
      @click.self="selectedSupplier = null"
    >
      <div class="modal large-modal">
        <div class="modal-header">
          <div>
            <h3>
              {{ selectedSupplier.supplier.name }}
            </h3>

            <p>
              Supplier performance and purchasing history.
            </p>
          </div>

          <button
            class="close-button"
            @click="selectedSupplier = null"
          >
            ×
          </button>
        </div>

        <div class="supplier-contact">
          <div>
            <span>Contact Person</span>
            <strong>
              {{
                selectedSupplier.supplier.contact_person ||
                '-'
              }}
            </strong>
          </div>

          <div>
            <span>Phone</span>
            <strong>
              {{ selectedSupplier.supplier.phone || '-' }}
            </strong>
          </div>

          <div>
            <span>Email</span>
            <strong>
              {{ selectedSupplier.supplier.email || '-' }}
            </strong>
          </div>

          <div>
            <span>Address</span>
            <strong>
              {{ selectedSupplier.supplier.address || '-' }}
            </strong>
          </div>
        </div>

        <div class="supplier-stats">
          <div>
            <span>Total Orders</span>
            <strong>
              {{ selectedSupplier.supplier.order_count }}
            </strong>
          </div>

          <div>
            <span>Pending</span>
            <strong>
              {{ selectedSupplier.supplier.pending_orders }}
            </strong>
          </div>

          <div>
            <span>Received</span>
            <strong>
              {{ selectedSupplier.supplier.received_orders }}
            </strong>
          </div>

          <div>
            <span>Total Purchasing</span>
            <strong>
              ₱{{
                money(
                  selectedSupplier.supplier.total_purchases
                )
              }}
            </strong>
          </div>
        </div>

        <div class="detail-section">
          <h4>Products Supplied</h4>

          <div
            v-if="!selectedSupplier.products.length"
            class="empty small-empty"
          >
            No products are currently assigned to this supplier.
          </div>

          <div
            v-else
            class="product-list"
          >
            <div
              v-for="product in selectedSupplier.products"
              :key="product.id"
              class="product-item"
            >
              <div>
                <strong>
                  {{ product.name }}
                </strong>

                <span>
                  {{ product.sku }}
                  ·
                  {{ product.category_name || 'Uncategorized' }}
                </span>
              </div>

              <div>
                Stock:
                <strong>
                  {{ product.stock }}
                </strong>
              </div>

              <div>
                Cost:
                <strong>
                  ₱{{ money(product.cost_price) }}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Recent Purchase Orders</h4>

          <div
            v-if="!selectedSupplier.orders.length"
            class="empty small-empty"
          >
            No purchase orders yet.
          </div>

          <div
            v-else
            class="order-list"
          >
            <div
              v-for="order in selectedSupplier.orders"
              :key="order.id"
              class="order-item"
            >
              <div>
                <strong>
                  PO #{{ order.id }}
                </strong>

                <span>
                  {{ order.item_count }} item(s)
                </span>
              </div>

              <span
                :class="[
                  'status',
                  order.status.toLowerCase()
                ]"
              >
                {{ order.status }}
              </span>

              <strong>
                ₱{{ money(order.total) }}
              </strong>

              <span>
                {{ formatDate(order.created_at) }}
              </span>
            </div>
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

const suppliers = ref([])

const loading = ref(true)
const saving = ref(false)

const error = ref('')
const message = ref('')

const showForm = ref(false)
const editingSupplier = ref(null)
const selectedSupplier = ref(null)

const form = ref({
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: ''
})

const user = ref(null)

try {
  user.value =
    JSON.parse(
      localStorage.getItem('user')
    )
} catch {
  user.value = null
}

const isAdmin = computed(() => {
  return user.value?.role === 'ADMIN'
})

const pendingOrders = computed(() => {
  return suppliers.value.reduce(
    (total, supplier) =>
      total +
      Number(supplier.pending_orders || 0),
    0
  )
})

const receivedOrders = computed(() => {
  return suppliers.value.reduce(
    (total, supplier) =>
      total +
      Number(supplier.received_orders || 0),
    0
  )
})

const totalPurchases = computed(() => {
  return suppliers.value.reduce(
    (total, supplier) =>
      total +
      Number(supplier.total_purchases || 0),
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

function clearMessages() {
  error.value = ''
  message.value = ''
}

function resetForm() {
  form.value = {
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  }
}

function openCreate() {
  clearMessages()

  editingSupplier.value = null

  resetForm()

  showForm.value = true
}

function openEdit(supplier) {
  clearMessages()

  editingSupplier.value = supplier

  form.value = {
    name: supplier.name || '',
    contact_person:
      supplier.contact_person || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    address: supplier.address || ''
  }

  showForm.value = true
}

function closeForm() {
  if (saving.value) {
    return
  }

  showForm.value = false
}

async function loadSuppliers() {
  loading.value = true
  clearMessages()

  try {
    const response =
      await api.get('/suppliers')

    suppliers.value =
      response.data
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to load suppliers.'
  } finally {
    loading.value = false
  }
}

async function saveSupplier() {
  clearMessages()

  if (!form.value.name.trim()) {
    error.value =
      'Supplier name is required.'

    return
  }

  saving.value = true

  try {
    if (editingSupplier.value) {
      await api.put(
        `/suppliers/${editingSupplier.value.id}`,
        form.value
      )

      message.value =
        'Supplier updated successfully.'
    } else {
      await api.post(
        '/suppliers',
        form.value
      )

      message.value =
        'Supplier created successfully.'
    }

    showForm.value = false

    await loadSuppliers()
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to save supplier.'
  } finally {
    saving.value = false
  }
}

async function viewSupplier(id) {
  clearMessages()

  try {
    const response =
      await api.get(
        `/suppliers/${id}`
      )

    selectedSupplier.value =
      response.data
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to load supplier details.'
  }
}

async function deleteSupplier(supplier) {
  const confirmed =
    window.confirm(
      `Delete supplier "${supplier.name}"?`
    )

  if (!confirmed) {
    return
  }

  clearMessages()

  try {
    await api.delete(
      `/suppliers/${supplier.id}`
    )

    message.value =
      'Supplier deleted successfully.'

    await loadSuppliers()
  } catch (err) {
    console.error(err)

    error.value =
      err.response?.data?.message ||
      'Failed to delete supplier.'
  }
}

onMounted(() => {
  loadSuppliers()
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
  margin-bottom: 8px;
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
  min-width: 1050px;
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
}

td strong {
  display: block;
}

.subtext {
  display: block;
  color: #777;
  font-size: 12px;
  margin-top: 4px;
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

.small-button.danger {
  color: #b42318;
  border-color: #e4b8b4;
}

.empty {
  text-align: center;
  padding: 35px;
  color: #777;
}

.small-empty {
  padding: 20px;
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
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 9px;
  padding: 25px;
}

.small-modal {
  max-width: 600px;
}

.large-modal {
  max-width: 1000px;
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
  color: #777;
  cursor: pointer;
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
.field textarea {
  width: 100%;
  border: 1px solid #d5d7da;
  border-radius: 5px;
  padding: 10px;
  font-family: inherit;
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
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

.supplier-contact {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.supplier-contact div {
  background: #f7f7f7;
  border-radius: 6px;
  padding: 13px;
}

.supplier-contact span,
.supplier-stats span {
  display: block;
  color: #777;
  font-size: 12px;
  margin-bottom: 6px;
}

.supplier-contact strong {
  font-size: 13px;
  word-break: break-word;
}

.supplier-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 25px;
}

.supplier-stats div {
  background: #f7f7f7;
  padding: 15px;
  border-radius: 6px;
}

.supplier-stats strong {
  font-size: 20px;
}

.detail-section {
  margin-top: 25px;
}

.detail-section h4 {
  margin: 0 0 12px;
}

.product-list,
.order-list {
  border-top: 1px solid #eee;
}

.product-item,
.order-item {
  display: grid;
  align-items: center;
  gap: 15px;
  padding: 13px 0;
  border-bottom: 1px solid #eee;
}

.product-item {
  grid-template-columns: 1fr auto auto;
}

.order-item {
  grid-template-columns: 1fr auto auto auto;
}

.product-item div:first-child,
.order-item div:first-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-item span,
.order-item span {
  color: #777;
  font-size: 12px;
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

@media (max-width: 1000px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .supplier-contact {
    grid-template-columns: repeat(2, 1fr);
  }

  .supplier-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .page-header {
    display: block;
  }

  .page-header .add-button {
    width: 100%;
    margin-top: 15px;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .supplier-contact,
  .supplier-stats {
    grid-template-columns: 1fr;
  }

  .product-item,
  .order-item {
    grid-template-columns: 1fr;
  }
}
</style>