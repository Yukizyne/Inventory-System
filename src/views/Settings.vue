<template>
  <div>
    <div class="page-header">
      <div>
        <h2>System Settings</h2>
        <p>Manage store information and receipt details</p>
      </div>
    </div>

    <div class="settings-layout">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Store Information</h3>
            <p>This information is used throughout the system.</p>
          </div>
        </div>

        <form @submit.prevent="saveSettings">
          <div class="field">
            <label>Store Name</label>

            <input
              v-model="form.store_name"
              type="text"
              maxlength="150"
              placeholder="Enter store name"
              required
            >
          </div>

          <div class="field">
            <label>Address</label>

            <textarea
              v-model="form.address"
              maxlength="255"
              placeholder="Enter store address"
              rows="3"
            ></textarea>
          </div>

          <div class="form-grid">
            <div class="field">
              <label>Phone</label>

              <input
                v-model="form.phone"
                type="text"
                maxlength="50"
                placeholder="Enter phone number"
              >
            </div>

            <div class="field">
              <label>Email</label>

              <input
                v-model="form.email"
                type="email"
                maxlength="150"
                placeholder="Enter email address"
              >
            </div>
          </div>

          <div class="field">
            <label>Receipt Footer</label>

            <input
              v-model="form.receipt_footer"
              type="text"
              maxlength="255"
              placeholder="Thank you for shopping with us!"
            >
          </div>

          <div
            v-if="message"
            class="success-message"
          >
            {{ message }}
          </div>

          <div
            v-if="errorMessage"
            class="error-message"
          >
            {{ errorMessage }}
          </div>

          <button
            class="save-button"
            type="submit"
            :disabled="saving"
          >
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>
        </form>
      </div>

      <div class="panel preview-panel">
        <div class="panel-header">
          <div>
            <h3>Receipt Preview</h3>
            <p>Preview how your store information will appear.</p>
          </div>
        </div>

        <div class="receipt-preview">
          <div class="preview-store">
            <strong>
              {{ form.store_name || 'Grocery Inventory' }}
            </strong>

            <span v-if="form.address">
              {{ form.address }}
            </span>

            <span v-if="form.phone">
              {{ form.phone }}
            </span>

            <span v-if="form.email">
              {{ form.email }}
            </span>
          </div>

          <div class="preview-divider"></div>

          <div class="preview-row">
            <span>Sample Product</span>
            <strong>₱100.00</strong>
          </div>

          <div class="preview-row">
            <span>1 × ₱100.00</span>
            <strong>₱100.00</strong>
          </div>

          <div class="preview-divider"></div>

          <div class="preview-total">
            <span>Total</span>
            <strong>₱100.00</strong>
          </div>

          <div class="preview-divider"></div>

          <div class="preview-footer">
            {{ form.receipt_footer || 'Thank you for shopping with us!' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import api from '../services/api'

const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const form = reactive({
  store_name: '',
  address: '',
  phone: '',
  email: '',
  receipt_footer: ''
})

async function loadSettings() {
  try {
    const response = await api.get('/settings')

    form.store_name = response.data.store_name || ''
    form.address = response.data.address || ''
    form.phone = response.data.phone || ''
    form.email = response.data.email || ''
    form.receipt_footer = response.data.receipt_footer || ''
  } catch (error) {
    console.error(error)

    errorMessage.value =
      error.response?.data?.message ||
      'Failed to load settings.'
  }
}

async function saveSettings() {
  message.value = ''
  errorMessage.value = ''
  saving.value = true

  try {
    await api.put('/settings', {
      store_name: form.store_name,
      address: form.address,
      phone: form.phone,
      email: form.email,
      receipt_footer: form.receipt_footer
    })

    message.value = 'Settings saved successfully.'
  } catch (error) {
    console.error(error)

    errorMessage.value =
      error.response?.data?.message ||
      'Failed to save settings.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 25px;
}

.page-header h2 {
  margin: 0;
}

.page-header p {
  margin: 5px 0 0;
  color: #777;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(400px, 1.2fr) minmax(300px, 0.8fr);
  gap: 20px;
}

.panel {
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 20px;
}

.panel-header {
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

.field {
  margin-bottom: 17px;
}

.field label {
  display: block;
  margin-bottom: 7px;
  color: #555;
  font-size: 13px;
}

.field input,
.field textarea {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid #d8dade;
  border-radius: 6px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  outline: none;
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  border-color: #888;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.save-button {
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 6px;
  background: #17191c;
  color: white;
  cursor: pointer;
  font-weight: bold;
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-message,
.error-message {
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 14px;
}

.success-message {
  background: #e8f5e9;
  color: #287d3c;
  border: 1px solid #c9e8cd;
}

.error-message {
  background: #ffe8e8;
  color: #b42318;
  border: 1px solid #f2caca;
}

.receipt-preview {
  max-width: 300px;
  margin: 0 auto;
  padding: 25px 20px;
  border: 1px dashed #aaa;
  font-family: "Courier New", monospace;
}

.preview-store {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
  font-size: 11px;
}

.preview-store strong {
  font-size: 15px;
}

.preview-divider {
  border-top: 1px dashed #888;
  margin: 15px 0;
}

.preview-row,
.preview-total {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
  margin-bottom: 8px;
}

.preview-total {
  font-size: 14px;
  font-weight: bold;
}

.preview-footer {
  text-align: center;
  font-size: 10px;
  line-height: 1.4;
}

@media (max-width: 900px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .panel {
    padding: 15px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>