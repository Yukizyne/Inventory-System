<template>
  <div class="categories-page">
    <div class="page-title">
      <div>
        <h2>Categories</h2>
        <p>Manage your product categories.</p>
      </div>

      <button
        v-if="isAdmin"
        class="add-button"
        @click="openAddModal"
      >
        + Add Category
      </button>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="success" class="success">
      {{ success }}
    </div>

    <div class="panel">
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Products</th>
            <th>Created</th>
            <th v-if="isAdmin">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="category in categories"
            :key="category.id"
          >
            <td>{{ category.name }}</td>

            <td>
              {{ category.product_count }}
            </td>

            <td>
              {{ formatDate(category.created_at) }}
            </td>

            <td v-if="isAdmin" class="actions">
              <button
                class="edit-button"
                @click="openEditModal(category)"
              >
                Edit
              </button>

              <button
                class="delete-button"
                :disabled="category.product_count > 0"
                @click="deleteCategory(category)"
              >
                Delete
              </button>
            </td>
          </tr>

          <tr v-if="categories.length === 0">
            <td
              :colspan="isAdmin ? 4 : 3"
              class="empty"
            >
              No categories found.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="showModal"
      class="modal-overlay"
      @click.self="closeModal"
    >
      <div class="modal">
        <h3>
          {{ editingCategory ? 'Edit Category' : 'Add Category' }}
        </h3>

        <div class="field">
          <label>Category Name</label>

          <input
            v-model="form.name"
            type="text"
            placeholder="Example: Beverages"
          >
        </div>

        <div v-if="modalError" class="error">
          {{ modalError }}
        </div>

        <div class="modal-actions">
          <button
            class="cancel-button"
            @click="closeModal"
          >
            Cancel
          </button>

          <button
            class="save-button"
            @click="saveCategory"
          >
            {{ editingCategory ? 'Update' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'

const categories = ref([])
const showModal = ref(false)
const editingCategory = ref(null)
const error = ref('')
const success = ref('')
const modalError = ref('')

const form = ref({
  name: ''
})

const user = computed(() => {
  const storedUser = localStorage.getItem('user')

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser)
  } catch {
    localStorage.removeItem('user')
    return null
  }
})

const isAdmin = computed(() => {
  return user.value?.role === 'ADMIN'
})

const loadCategories = async () => {
  try {
    const response = await api.get('/categories')
    categories.value = response.data
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Failed to load categories.'
  }
}

const openAddModal = () => {
  editingCategory.value = null

  form.value = {
    name: ''
  }

  modalError.value = ''
  showModal.value = true
}

const openEditModal = (category) => {
  editingCategory.value = category

  form.value = {
    name: category.name
  }

  modalError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveCategory = async () => {
  modalError.value = ''

  if (!form.value.name.trim()) {
    modalError.value = 'Category name is required.'
    return
  }

  try {
    if (editingCategory.value) {
      await api.put(
        `/categories/${editingCategory.value.id}`,
        {
          name: form.value.name
        }
      )

      success.value = 'Category updated successfully.'
    } else {
      await api.post('/categories', {
        name: form.value.name
      })

      success.value = 'Category created successfully.'
    }

    closeModal()
    await loadCategories()

    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err) {
    modalError.value =
      err.response?.data?.message ||
      'Failed to save category.'
  }
}

const deleteCategory = async (category) => {
  if (category.product_count > 0) {
    return
  }

  if (!confirm(`Delete "${category.name}"?`)) {
    return
  }

  try {
    await api.delete(`/categories/${category.id}`)

    success.value = 'Category deleted successfully.'

    await loadCategories()

    setTimeout(() => {
      success.value = ''
    }, 3000)
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Failed to delete category.'
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

onMounted(loadCategories)
</script>

<style scoped>
.categories-page {
  width: 100%;
}

.page-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.add-button,
.save-button,
.edit-button,
.delete-button,
.cancel-button {
  border: 0;
  border-radius: 6px;
  padding: 9px 14px;
  cursor: pointer;
}

.add-button,
.save-button {
  background: #17191c;
  color: white;
}

.edit-button {
  background: #eef0f3;
  color: #202124;
}

.delete-button {
  background: #f3dddd;
  color: #9b2226;
}

.delete-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cancel-button {
  background: #eee;
  color: #333;
}

.actions {
  display: flex;
  gap: 8px;
}

.error,
.success {
  padding: 12px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.error {
  background: #f8dddd;
  color: #a11;
}

.success {
  background: #ddf3e2;
  color: #176b2c;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 14px;
  border-bottom: 1px solid #eee;
}

th {
  color: #666;
  font-size: 13px;
}

.empty {
  text-align: center;
  color: #777;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 8px;
  padding: 25px;
}

.modal h3 {
  margin-top: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 20px 0;
}

.field input {
  padding: 11px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 700px) {
  .page-title {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel {
    overflow-x: auto;
  }

  table {
    min-width: 650px;
  }
}
</style>