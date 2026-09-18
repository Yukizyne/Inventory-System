<template>
  <div>
    <div class="page-header">
      <div>
        <h2>Sales</h2>
        <p>Create sales and view transaction history</p>
      </div>
    </div>

    <div class="sales-layout">
      <div class="panel sale-panel">
        <div class="panel-header">
          <div>
            <h3>New Sale</h3>
            <p>Add products to the cart</p>
          </div>
          <button class="scan-button" @click="startScanner">
            Scan Barcode
          </button>
        </div>

        <div class="search-box">
          <input
            v-model="productSearch"
            type="text"
            placeholder="Search product, SKU or barcode..."
          >
        </div>

        <div v-if="scannerOpen" class="scanner-container">
          <div id="barcode-reader"></div>

          <button class="close-scanner" @click="stopScanner">
            Close Scanner
          </button>
        </div>

        <div class="product-list">
          <button
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-item"
            @click="addToCart(product)"
          >
            <div class="product-info">
              <strong>{{ product.name }}</strong>
              <span>{{ product.sku }}</span>
            </div>

            <div class="product-price">
              ₱{{ Number(product.price).toFixed(2) }}
            </div>
          </button>

          <div
            v-if="!filteredProducts.length"
            class="empty-message"
          >
            No products found.
          </div>
        </div>

        <div class="cart-section">
          <div class="cart-header">
            <h3>Cart</h3>
            <span>{{ cart.length }} item(s)</span>
          </div>

          <div v-if="cart.length" class="cart-list">
            <div
              v-for="item in cart"
              :key="item.product_id"
              class="cart-item"
            >
              <div class="cart-product">
                <strong>{{ item.name }}</strong>
                <span>
                  ₱{{ Number(item.price).toFixed(2) }} each
                </span>
              </div>

              <div class="quantity-controls">
                <button @click="decreaseQuantity(item)">−</button>

                <span>{{ item.quantity }}</span>

                <button @click="increaseQuantity(item)">+</button>
              </div>

              <strong class="cart-subtotal">
                ₱{{ Number(item.subtotal).toFixed(2) }}
              </strong>

              <button
                class="remove-button"
                @click="removeFromCart(item.product_id)"
              >
                ×
              </button>
            </div>
          </div>

          <div v-else class="empty-cart">
            No products added to the cart.
          </div>
        </div>

        <div class="payment-section">
          <h3>Payment</h3>

          <div class="payment-method">
            <label>Payment Method</label>

            <select v-model="paymentMethod">
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div class="cash-input">
            <label>Cash Received</label>

            <input
              v-model.number="cashReceived"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
            >
          </div>

          <div class="quick-cash">
            <button
              v-for="amount in quickCashAmounts"
              :key="amount"
              @click="cashReceived = amount"
            >
              ₱{{ amount }}
            </button>
          </div>

          <div
            v-if="paymentError"
            class="payment-error"
          >
            {{ paymentError }}
          </div>

          <div class="payment-summary">
            <div>
              <span>Subtotal</span>
              <strong>₱{{ cartTotal.toFixed(2) }}</strong>
            </div>

            <div>
              <span>Cash</span>
              <strong>₱{{ Number(cashReceived || 0).toFixed(2) }}</strong>
            </div>

            <div class="change-row">
              <span>Change</span>
              <strong>₱{{ changeAmount.toFixed(2) }}</strong>
            </div>
          </div>

          <button
            class="complete-button"
            :disabled="!cart.length || cashReceived < cartTotal || saving"
            @click="completeSale"
          >
            {{ saving ? 'Processing...' : 'Complete Sale' }}
          </button>
        </div>
      </div>

      <div class="panel history-panel">
        <div class="panel-header">
          <div>
            <h3>Sales History</h3>
            <p>Latest transactions</p>
          </div>

          <button
            class="refresh-button"
            @click="loadSales"
          >
            Refresh
          </button>
        </div>

        <div v-if="loadingSales" class="message">
          Loading sales...
        </div>

        <div v-else-if="!sales.length" class="message">
          No sales recorded yet.
        </div>

        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Sale #</th>
                <th>Date</th>
                <th>Total</th>
                <th>Cash</th>
                <th>Change</th>
                <th>Cost</th>
                <th>Profit</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="sale in sales"
                :key="sale.id"
              >
                <td>#{{ sale.id }}</td>

                <td>
                  {{ formatDate(sale.created_at) }}
                </td>

                <td>
                  ₱{{ Number(sale.total).toFixed(2) }}
                </td>

                <td>
                  ₱{{ Number(sale.cash_received).toFixed(2) }}
                </td>

                <td>
                  ₱{{ Number(sale.change_amount).toFixed(2) }}
                </td>

                <td>
                  ₱{{ Number(sale.total_cost).toFixed(2) }}
                </td>

                <td class="profit">
                  ₱{{ Number(sale.profit).toFixed(2) }}
                </td>

                <td>
                  <button
                    class="view-button"
                    @click="viewSale(sale.id)"
                  >
                    Receipt
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="receiptVisible"
      class="receipt-overlay"
      @click.self="closeReceipt"
    >
      <div class="receipt-modal">
        <div class="receipt-actions">
          <button @click="printReceipt">
            Print Receipt
          </button>

          <button
            class="close-button"
            @click="closeReceipt"
          >
            Close
          </button>
        </div>

        <div id="printable-receipt" class="receipt">
          <div class="receipt-header">
            <h2>GROCERY INVENTORY</h2>
            <p>Official Sales Receipt</p>
            <p>Thank you for your purchase</p>
          </div>

          <div class="receipt-divider"></div>

          <div class="receipt-details">
            <div>
              <span>Sale #</span>
              <strong>#{{ selectedSale?.id }}</strong>
            </div>

            <div>
              <span>Date</span>
              <strong>
                {{ formatDate(selectedSale?.created_at) }}
              </strong>
            </div>

            <div>
              <span>Payment</span>
              <strong>
                {{ selectedSale?.payment_method || 'CASH' }}
              </strong>
            </div>
          </div>

          <div class="receipt-divider"></div>

          <div class="receipt-items">
            <div
              v-for="item in selectedItems"
              :key="item.id"
              class="receipt-item"
            >
              <div class="receipt-item-name">
                {{ item.name }}
              </div>

              <div class="receipt-item-row">
                <span>
                  {{ item.quantity }} ×
                  ₱{{ Number(item.price).toFixed(2) }}
                </span>

                <strong>
                  ₱{{ Number(item.subtotal).toFixed(2) }}
                </strong>
              </div>
            </div>
          </div>

          <div class="receipt-divider"></div>

          <div class="receipt-total">
            <div>
              <span>Total</span>
              <strong>
                ₱{{ Number(selectedSale?.total || 0).toFixed(2) }}
              </strong>
            </div>

            <div>
              <span>Cash Received</span>
              <strong>
                ₱{{ Number(selectedSale?.cash_received || 0).toFixed(2) }}
              </strong>
            </div>

            <div class="receipt-change">
              <span>Change</span>
              <strong>
                ₱{{ Number(selectedSale?.change_amount || 0).toFixed(2) }}
              </strong>
            </div>
          </div>

          <div class="receipt-divider"></div>

          <div class="receipt-footer">
            <p>Thank you for shopping with us!</p>
            <p>Please keep this receipt.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import api from '../services/api'

const products = ref([])
const sales = ref([])
const cart = ref([])

const productSearch = ref('')
const paymentMethod = ref('CASH')
const cashReceived = ref(0)

const loadingSales = ref(false)
const saving = ref(false)

const paymentError = ref('')

const scannerOpen = ref(false)
let scanner = null

const receiptVisible = ref(false)
const selectedSale = ref(null)
const selectedItems = ref([])

const quickCashAmounts = [50, 100, 200, 500, 1000]

const filteredProducts = computed(() => {
  const search = productSearch.value.trim().toLowerCase()

  if (!search) {
    return products.value.filter(product => Number(product.stock) > 0)
  }

  return products.value.filter(product => {
    const name = String(product.name || '').toLowerCase()
    const sku = String(product.sku || '').toLowerCase()
    const barcode = String(product.barcode || '').toLowerCase()

    return (
      Number(product.stock) > 0 &&
      (
        name.includes(search) ||
        sku.includes(search) ||
        barcode.includes(search)
      )
    )
  })
})

const cartTotal = computed(() => {
  return cart.value.reduce(
    (total, item) => total + Number(item.subtotal),
    0
  )
})

const changeAmount = computed(() => {
  const cash = Number(cashReceived.value || 0)
  const total = Number(cartTotal.value || 0)

  if (cash <= total) {
    return 0
  }

  return cash - total
})

function addToCart(product) {
  const existing = cart.value.find(
    item => item.product_id === product.id
  )

  if (existing) {
    if (existing.quantity >= Number(product.stock)) {
      return
    }

    existing.quantity++
    existing.subtotal =
      existing.quantity * Number(existing.price)

    return
  }

  cart.value.push({
    product_id: product.id,
    name: product.name,
    sku: product.sku,
    price: Number(product.price),
    stock: Number(product.stock),
    quantity: 1,
    subtotal: Number(product.price)
  })
}

function increaseQuantity(item) {
  if (item.quantity >= item.stock) {
    return
  }

  item.quantity++

  item.subtotal =
    item.quantity * Number(item.price)
}

function decreaseQuantity(item) {
  if (item.quantity <= 1) {
    removeFromCart(item.product_id)
    return
  }

  item.quantity--

  item.subtotal =
    item.quantity * Number(item.price)
}

function removeFromCart(productId) {
  cart.value = cart.value.filter(
    item => item.product_id !== productId
  )
}

async function loadProducts() {
  try {
    const response = await api.get('/products')

    products.value = Array.isArray(response.data)
      ? response.data
      : response.data.products || []
  } catch (error) {
    console.error(error)
  }
}

async function loadSales() {
  loadingSales.value = true

  try {
    const response = await api.get('/sales')

    sales.value = Array.isArray(response.data)
      ? response.data
      : response.data.sales || []
  } catch (error) {
    console.error(error)
  } finally {
    loadingSales.value = false
  }
}

async function completeSale() {
  paymentError.value = ''

  if (!cart.value.length) {
    paymentError.value = 'Cart is empty.'
    return
  }

  const cash = Number(cashReceived.value || 0)
  const total = Number(cartTotal.value)

  if (cash < total) {
    paymentError.value =
      `Insufficient cash. Need ₱${total.toFixed(2)}.`
    return
  }

  saving.value = true

  try {
    const response = await api.post('/sales', {
      items: cart.value.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      })),
      payment_method: paymentMethod.value,
      cash_received: cash
    })

    const saleId = response.data.saleId

    cart.value = []
    cashReceived.value = 0
    productSearch.value = ''

    await loadProducts()
    await loadSales()

    await viewSale(saleId)
  } catch (error) {
    paymentError.value =
      error.response?.data?.message ||
      'Failed to complete sale.'
  } finally {
    saving.value = false
  }
}

async function viewSale(id) {
  try {
    const response = await api.get(`/sales/${id}`)

    selectedSale.value = response.data.sale
    selectedItems.value = response.data.items || []

    receiptVisible.value = true

    await nextTick()
  } catch (error) {
    console.error(error)
  }
}

function closeReceipt() {
  receiptVisible.value = false
  selectedSale.value = null
  selectedItems.value = []
}

function printReceipt() {
  window.print()
}

async function startScanner() {
  try {
    const { Html5Qrcode } = await import('html5-qrcode')

    scannerOpen.value = true

    await nextTick()

    scanner = new Html5Qrcode('barcode-reader')

    await scanner.start(
      {
        facingMode: 'environment'
      },
      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 150
        }
      },
      decodedText => {
        handleBarcode(decodedText)
      },
      () => {}
    )
  } catch (error) {
    console.error(error)
    scannerOpen.value = false
    alert('Unable to start barcode scanner.')
  }
}

async function stopScanner() {
  if (scanner) {
    try {
      await scanner.stop()
      await scanner.clear()
    } catch (error) {
      console.error(error)
    }
  }

  scanner = null
  scannerOpen.value = false
}

function handleBarcode(barcode) {
  const product = products.value.find(
    item =>
      String(item.barcode || '').trim() ===
      String(barcode).trim()
  )

  if (!product) {
    alert(`Product with barcode ${barcode} was not found.`)
    return
  }

  if (Number(product.stock) <= 0) {
    alert('This product is out of stock.')
    return
  }

  addToCart(product)
  stopScanner()
}

function formatDate(date) {
  if (!date) {
    return ''
  }

  return new Date(date).toLocaleString()
}

onMounted(async () => {
  await Promise.all([
    loadProducts(),
    loadSales()
  ])
})

onBeforeUnmount(() => {
  if (scanner) {
    scanner.stop().catch(() => {})
  }
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

.sales-layout {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(600px, 1.5fr);
  gap: 20px;
}

.panel {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
}

.sale-panel {
  min-width: 0;
}

.history-panel {
  min-width: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
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

.scan-button,
.refresh-button,
.view-button {
  border: 0;
  border-radius: 6px;
  padding: 9px 13px;
  cursor: pointer;
  background: #292c31;
  color: white;
}

.search-box {
  margin-bottom: 15px;
}

.search-box input,
.cash-input input,
.payment-method select {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid #d8dade;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.search-box input:focus,
.cash-input input:focus,
.payment-method select:focus {
  border-color: #888;
}

.product-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
}

.product-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  background: white;
  border: 0;
  border-bottom: 1px solid #eee;
  padding: 13px;
  cursor: pointer;
}

.product-item:last-child {
  border-bottom: 0;
}

.product-item:hover {
  background: #f7f7f7;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-info span {
  color: #777;
  font-size: 12px;
}

.product-price {
  font-weight: bold;
}

.empty-message,
.empty-cart,
.message {
  color: #777;
  padding: 20px;
  text-align: center;
}

.cart-section {
  margin-top: 25px;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.cart-header h3 {
  margin: 0;
}

.cart-header span {
  color: #777;
  font-size: 13px;
}

.cart-list {
  border: 1px solid #e5e5e5;
  border-radius: 6px;
}

.cart-item {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 15px;
  align-items: center;
  padding: 13px;
  border-bottom: 1px solid #eee;
}

.cart-item:last-child {
  border-bottom: 0;
}

.cart-product {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.cart-product strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-product span {
  color: #777;
  font-size: 12px;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-controls button {
  width: 28px;
  height: 28px;
  border: 1px solid #d5d5d5;
  background: white;
  border-radius: 5px;
  cursor: pointer;
}

.quantity-controls span {
  min-width: 20px;
  text-align: center;
}

.cart-subtotal {
  white-space: nowrap;
}

.remove-button {
  width: 28px;
  height: 28px;
  border: 0;
  background: #eee;
  border-radius: 5px;
  cursor: pointer;
  font-size: 18px;
}

.payment-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.payment-section h3 {
  margin-top: 0;
}

.payment-method,
.cash-input {
  margin-bottom: 15px;
}

.payment-method label,
.cash-input label {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  color: #555;
}

.quick-cash {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.quick-cash button {
  padding: 8px 12px;
  border: 1px solid #d5d5d5;
  background: white;
  border-radius: 5px;
  cursor: pointer;
}

.quick-cash button:hover {
  background: #f4f4f4;
}

.payment-error {
  background: #fff1f1;
  color: #b42318;
  border: 1px solid #f2caca;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 14px;
}

.payment-summary {
  border-top: 1px solid #eee;
  margin-top: 15px;
  padding-top: 15px;
}

.payment-summary > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 9px;
}

.payment-summary span {
  color: #777;
}

.change-row {
  font-size: 17px;
}

.change-row strong {
  font-size: 20px;
}

.complete-button {
  width: 100%;
  margin-top: 10px;
  padding: 13px;
  border: 0;
  border-radius: 6px;
  background: #17191c;
  color: white;
  cursor: pointer;
  font-weight: bold;
}

.complete-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scanner-container {
  margin-bottom: 15px;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

#barcode-reader {
  width: 100%;
}

.close-scanner {
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  border: 0;
  border-radius: 6px;
  background: #555;
  color: white;
  cursor: pointer;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 850px;
}

th,
td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}

th {
  font-size: 13px;
  color: #666;
  font-weight: 600;
}

td {
  font-size: 14px;
}

.profit {
  font-weight: bold;
}

.receipt-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
  overflow-y: auto;
}

.receipt-modal {
  width: 100%;
  max-width: 430px;
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.receipt-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 20px;
}

.receipt-actions button {
  flex: 1;
  padding: 10px;
  border: 0;
  border-radius: 6px;
  background: #17191c;
  color: white;
  cursor: pointer;
}

.receipt-actions .close-button {
  background: #777;
}

.receipt {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  padding: 20px 15px;
  background: white;
  color: #111;
  font-family: "Courier New", monospace;
}

.receipt-header {
  text-align: center;
}

.receipt-header h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.receipt-header p {
  margin: 3px 0;
  font-size: 12px;
}

.receipt-divider {
  border-top: 1px dashed #777;
  margin: 15px 0;
}

.receipt-details > div,
.receipt-total > div {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 7px;
  font-size: 12px;
}

.receipt-items {
  font-size: 12px;
}

.receipt-item {
  margin-bottom: 12px;
}

.receipt-item-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.receipt-item-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.receipt-total {
  font-size: 13px;
}

.receipt-total > div:first-child {
  font-size: 15px;
  font-weight: bold;
}

.receipt-change {
  font-size: 15px !important;
  font-weight: bold;
}

.receipt-footer {
  text-align: center;
  font-size: 11px;
}

.receipt-footer p {
  margin: 4px 0;
}

@media (max-width: 1100px) {
  .sales-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .page-header {
    align-items: flex-start;
  }

  .panel {
    padding: 15px;
  }

  .cart-item {
    grid-template-columns: 1fr auto;
  }

  .cart-subtotal {
    grid-column: 1;
  }

  .remove-button {
    grid-column: 2;
    grid-row: 2;
  }

  .quantity-controls {
    grid-column: 2;
    grid-row: 1;
  }

  .receipt-overlay {
    padding: 10px;
  }

  .receipt-modal {
    padding: 12px;
  }
}

@media print {
  body * {
    visibility: hidden !important;
  }

  .receipt,
  .receipt * {
    visibility: visible !important;
  }

  .receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
    max-width: 80mm;
    margin: 0;
    padding: 5mm;
  }

  .receipt-overlay {
    position: static;
    display: block;
    background: white;
    padding: 0;
  }

  .receipt-modal {
    max-width: none;
    padding: 0;
    margin: 0;
    border: 0;
  }

  .receipt-actions {
    display: none !important;
  }
}
</style>