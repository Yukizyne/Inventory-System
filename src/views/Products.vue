<template>
  <div>
    <div class="page-header">
      <div>
        <h2>Products</h2>
        <p>Manage your grocery inventory</p>
      </div>

      <button class="add-button" @click="openAddForm">
        + Add Product
      </button>
    </div>

    <div class="product-filters">
      <input
        v-model="search"
        @input="resetPage"
        type="text"
        placeholder="Search product, SKU or barcode..."
      >

      <select v-model="categoryFilter" @change="resetPage">
        <option value="">All categories</option>

        <option
          v-for="category in categories"
          :key="category.id"
          :value="String(category.id)"
        >
          {{ category.name }}
        </option>
      </select>

      <select v-model="stockFilter" @change="resetPage">
        <option value="">All stock</option>
        <option value="in">In stock</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </select>
    </div>

    <div class="product-count">
      Showing {{ paginatedProducts.length }}
      of {{ filteredProducts.length }} products
    </div>

    <div v-if="loading" class="message">
      Loading products...
    </div>

    <div v-else-if="error" class="message error">
      {{ error }}
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Product</th>
            <th>SKU</th>
            <th>Barcode</th>
            <th>Category</th>
            <th>Supplier</th>
            <th>Unit</th>
            <th>Cost Price</th>
            <th>Selling Price</th>
            <th>Profit</th>
            <th>Stock</th>
            <th>Minimum</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="product in paginatedProducts"
            :key="product.id"
          >
            <td>
              <img
                v-if="product.image"
                :src="getImageUrl(product.image)"
                class="product-image"
                alt="Product"
              >

              <div v-else class="no-image">
                No image
              </div>
            </td>

            <td>
              <strong>{{ product.name }}</strong>
            </td>

            <td>{{ product.sku }}</td>

            <td>
              {{ product.barcode || '-' }}
            </td>

            <td>
              {{ product.category_name || product.category || '-' }}
            </td>

            <td>
              {{ product.supplier_name || '-' }}
            </td>

            <td>{{ product.unit }}</td>

            <td>
              ₱{{ formatMoney(product.cost_price) }}
            </td>

            <td>
              ₱{{ formatMoney(product.price) }}
            </td>

            <td>
              ₱{{ formatMoney(getProfit(product)) }}
            </td>

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
              <div class="actions">
                <button
                  class="edit-button"
                  @click="openEditForm(product)"
                >
                  Edit
                </button>

                <button
                  v-if="isAdmin"
                  class="delete-button"
                  @click="deleteProduct(product)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="!paginatedProducts.length">
            <td colspan="13" class="empty">
              No products found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="totalPages > 1"
      class="pagination"
    >
      <button
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        Previous
      </button>

      <span>
        Page {{ currentPage }} of {{ totalPages }}
      </span>

      <button
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        Next
      </button>
    </div>

    <div v-if="showForm" class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h3>
              {{ editingProduct ? 'Edit Product' : 'Add Product' }}
            </h3>

            <p>
              Enter the product information below.
            </p>
          </div>

          <button
            class="close-button"
            @click="closeForm"
          >
            ×
          </button>
        </div>

        <form @submit.prevent="saveProduct">
          <div class="form-grid">
            <div class="field">
              <label>Product Name</label>

              <input
                v-model="newProduct.name"
                type="text"
                required
              >
            </div>

            <div class="field">
              <label>SKU</label>

              <input
                v-model="newProduct.sku"
                type="text"
                required
              >
            </div>

            <div class="field">
              <label>Barcode</label>

              <input
                v-model="newProduct.barcode"
                type="text"
                placeholder="Optional"
              >
            </div>

            <div class="field">
              <label>Category</label>

              <select
                v-model="newProduct.categoryId"
                required
              >
                <option value="">
                  Select category
                </option>

                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="String(category.id)"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>

            <div class="field">
              <label>Supplier</label>

              <select
                v-model="newProduct.supplierId"
              >
                <option value="">
                  No supplier
                </option>

                <option
                  v-for="supplier in suppliers"
                  :key="supplier.id"
                  :value="String(supplier.id)"
                >
                  {{ supplier.name }}
                </option>
              </select>
            </div>

            <div class="field">
              <label>Unit</label>

              <input
                v-model="newProduct.unit"
                type="text"
                placeholder="pcs, kg, bottle..."
                required
              >
            </div>

            <div class="field">
              <label>Cost Price</label>

              <input
                v-model="newProduct.costPrice"
                type="number"
                min="0"
                step="0.01"
                required
              >
            </div>

            <div class="field">
              <label>Selling Price</label>

              <input
                v-model="newProduct.price"
                type="number"
                min="0"
                step="0.01"
                required
              >
            </div>

            <div class="field">
              <label>Initial Stock</label>

              <input
                v-model="newProduct.stock"
                type="number"
                min="0"
                step="1"
                required
              >
            </div>

            <div class="field">
              <label>Minimum Stock</label>

              <input
                v-model="newProduct.minimumStock"
                type="number"
                min="0"
                step="1"
                required
              >
            </div>

            <div class="field full">
              <label>Product Image</label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="handleImageChange"
              >
            </div>

            <div
              v-if="imagePreview"
              class="image-preview-wrapper full"
            >
              <img
                :src="imagePreview"
                class="image-preview"
                alt="Preview"
              >
            </div>
          </div>

          <div
            v-if="formError"
            class="form-error"
          >
            {{ formError }}
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="cancel-button"
              @click="closeForm"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="save-button"
              :disabled="saving"
            >
              {{ saving ? 'Saving...' : 'Save Product' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../services/api'

const products = ref([])
const categories = ref([])
const suppliers = ref([])

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const formError = ref('')

const showForm = ref(false)
const editingProduct = ref(null)

const search = ref('')
const categoryFilter = ref('')
const stockFilter = ref('')

const currentPage = ref(1)
const itemsPerPage = 8

const imageFile = ref(null)
const imagePreview = ref('')

let user = null

try {
  user = JSON.parse(localStorage.getItem('user') || 'null')
} catch {
  localStorage.removeItem('user')
}

const isAdmin = computed(() => user?.role === 'ADMIN')

const newProduct = ref({
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  supplierId: '',
  unit: '',
  costPrice: 0,
  price: 0,
  stock: 0,
  minimumStock: 0
})

const filteredProducts = computed(() => {
  const searchValue = search.value.trim().toLowerCase()

  return products.value.filter(product => {
    const matchesSearch =
      !searchValue ||
      product.name?.toLowerCase().includes(searchValue) ||
      product.sku?.toLowerCase().includes(searchValue) ||
      product.barcode?.toLowerCase().includes(searchValue)

    const matchesCategory =
      !categoryFilter.value ||
      String(product.category_id || '') === String(categoryFilter.value)

    let matchesStock = true

    if (stockFilter.value === 'out') {
      matchesStock = Number(product.stock) === 0
    }

    if (stockFilter.value === 'low') {
      matchesStock =
        Number(product.stock) > 0 &&
        Number(product.stock) <= Number(product.minimum_stock)
    }

    if (stockFilter.value === 'in') {
      matchesStock =
        Number(product.stock) > Number(product.minimum_stock)
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStock
    )
  })
})

const totalPages = computed(() => {
  return Math.max(
    1,
    Math.ceil(
      filteredProducts.value.length / itemsPerPage
    )
  )
})

const paginatedProducts = computed(() => {
  const start =
    (currentPage.value - 1) * itemsPerPage

  return filteredProducts.value.slice(
    start,
    start + itemsPerPage
  )
})

watch(
  [
    () => filteredProducts.value.length,
    () => totalPages.value
  ],
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
  }
)

function resetPage() {
  currentPage.value = 1
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function getProfit(product) {
  return (
    Number(product.price || 0) -
    Number(product.cost_price || 0)
  )
}

function getStockClass(product) {
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

function getImageUrl(image) {
  return `http://localhost:5000/uploads/products/${image}`
}

async function loadProducts() {
  loading.value = true
  error.value = ''

  try {
    const response = await api.get('/products')
    products.value = response.data
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Failed to load products.'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const response = await api.get('/categories')
    categories.value = response.data
  } catch (err) {
    console.error(err)
  }
}

async function loadSuppliers() {
  try {
    const response = await api.get('/suppliers')
    suppliers.value = response.data
  } catch (err) {
    console.error(err)
  }
}

function resetForm() {
  newProduct.value = {
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    supplierId: '',
    unit: '',
    costPrice: 0,
    price: 0,
    stock: 0,
    minimumStock: 0
  }

  imageFile.value = null
  imagePreview.value = ''
  formError.value = ''
}

function openAddForm() {
  editingProduct.value = null
  resetForm()
  showForm.value = true
}

function openEditForm(product) {
  editingProduct.value = product
  formError.value = ''

  newProduct.value = {
    name: product.name || '',
    sku: product.sku || '',
    barcode: product.barcode || '',
    categoryId: String(product.category_id || ''),
    supplierId: String(product.supplier_id || ''),
    unit: product.unit || '',
    costPrice: Number(product.cost_price || 0),
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    minimumStock: Number(product.minimum_stock || 0)
  }

  imageFile.value = null

  imagePreview.value = product.image
    ? getImageUrl(product.image)
    : ''

  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingProduct.value = null
  resetForm()
}

function handleImageChange(event) {
  const file = event.target.files?.[0]

  if (!file) {
    imageFile.value = null
    return
  }

  imageFile.value = file

  imagePreview.value =
    URL.createObjectURL(file)
}

async function saveProduct() {
  formError.value = ''

  const costPrice =
    Number(newProduct.value.costPrice)

  const sellingPrice =
    Number(newProduct.value.price)

  if (costPrice < 0 || sellingPrice < 0) {
    formError.value =
      'Prices cannot be negative.'

    return
  }

  if (sellingPrice < costPrice) {
    formError.value =
      'Selling price should not be lower than cost price.'

    return
  }

  saving.value = true

  try {
    const formData = new FormData()

    formData.append(
      'name',
      newProduct.value.name
    )

    formData.append(
      'sku',
      newProduct.value.sku
    )

    formData.append(
      'barcode',
      newProduct.value.barcode
    )

    formData.append(
      'categoryId',
      newProduct.value.categoryId
    )

    formData.append(
      'supplierId',
      newProduct.value.supplierId
    )

    formData.append(
      'unit',
      newProduct.value.unit
    )

    formData.append(
      'costPrice',
      costPrice
    )

    formData.append(
      'price',
      sellingPrice
    )

    formData.append(
      'stock',
      Number(newProduct.value.stock)
    )

    formData.append(
      'minimumStock',
      Number(newProduct.value.minimumStock)
    )

    if (imageFile.value) {
      formData.append(
        'image',
        imageFile.value
      )
    }

    if (editingProduct.value) {
      await api.put(
        `/products/${editingProduct.value.id}`,
        formData
      )
    } else {
      await api.post(
        '/products',
        formData
      )
    }

    closeForm()
    await loadProducts()
  } catch (err) {
    formError.value =
      err.response?.data?.message ||
      'Failed to save product.'
  } finally {
    saving.value = false
  }
}

async function deleteProduct(product) {
  if (
    !confirm(
      `Delete "${product.name}"?`
    )
  ) {
    return
  }

  try {
    await api.delete(
      `/products/${product.id}`
    )

    await loadProducts()
  } catch (err) {
    alert(
      err.response?.data?.message ||
      'Failed to delete product.'
    )
  }
}

onMounted(async () => {
  await Promise.all([
    loadProducts(),
    loadCategories(),
    loadSuppliers()
  ])
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.page-header p {
  margin: 5px 0 0;
  color: #777;
}

.add-button,
.save-button {
  border: 0;
  background: #202124;
  color: white;
  padding: 11px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.add-button:hover,
.save-button:hover {
  background: #000;
}

.product-filters {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.product-filters input,
.product-filters select,
.field input,
.field select {
  width: 100%;
  padding: 11px;
  border: 1px solid #d7d9dd;
  border-radius: 6px;
  background: white;
}

.product-count {
  margin-bottom: 12px;
  color: #777;
  font-size: 14px;
}

.table-wrapper {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1250px;
  border-collapse: collapse;
}

th,
td {
  padding: 13px 14px;
  border-bottom: 1px solid #eee;
  text-align: left;
  white-space: nowrap;
}

th {
  background: #f8f8f8;
  font-size: 13px;
}

.product-image,
.no-image {
  width: 45px;
  height: 45px;
  border-radius: 6px;
}

.product-image {
  object-fit: cover;
}

.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  color: #777;
  font-size: 10px;
  text-align: center;
}

.stock-badge {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: bold;
}

.stock-badge.good {
  background: #e7f6ec;
  color: #19733a;
}

.stock-badge.low {
  background: #fff4d6;
  color: #946200;
}

.stock-badge.out {
  background: #fde8e8;
  color: #b42318;
}

.actions {
  display: flex;
  gap: 6px;
}

.edit-button,
.delete-button {
  border: 0;
  padding: 7px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.edit-button {
  background: #eee;
}

.delete-button {
  background: #fbe4e4;
  color: #a51d1d;
}

.message {
  background: white;
  border: 1px solid #e4e5e7;
  padding: 20px;
  border-radius: 8px;
}

.message.error,
.form-error {
  color: #b42318;
}

.empty {
  text-align: center;
  color: #777;
  padding: 30px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-top: 18px;
}

.pagination button {
  border: 1px solid #d7d9dd;
  background: white;
  padding: 9px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-backdrop {
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
  max-width: 760px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 10px;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
}

.modal-header p {
  margin: 5px 0 0;
  color: #777;
}

.close-button {
  border: 0;
  background: transparent;
  font-size: 28px;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: bold;
}

.full {
  grid-column: 1 / -1;
}

.image-preview-wrapper {
  display: flex;
  justify-content: center;
}

.image-preview {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.form-error {
  margin-top: 15px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

.cancel-button {
  border: 1px solid #d7d9dd;
  background: white;
  padding: 11px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
  }

  .product-filters {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .full {
    grid-column: auto;
  }
}
</style>