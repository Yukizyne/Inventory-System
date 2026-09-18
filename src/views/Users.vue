<template>
  <div>
    <div class="page-header">
      <div class="page-title">
        <h2>Users</h2>
        <p>Manage system users and permissions</p>
      </div>

      <button class="add-button" @click="openAdd">
        Add User
      </button>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div class="panel">
      <div v-if="loading" class="empty">
        Loading users...
      </div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
            >
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>

              <td>
                <span
                  class="badge"
                  :class="user.role === 'ADMIN'
                    ? 'admin'
                    : 'staff'"
                >
                  {{ user.role }}
                </span>
              </td>

              <td>
                <span
                  class="badge"
                  :class="user.status === 'ACTIVE'
                    ? 'active'
                    : 'inactive'"
                >
                  {{ user.status }}
                </span>
              </td>

              <td>
                {{ formatDate(user.created_at) }}
              </td>

              <td class="actions">
                <button
                  class="edit-button"
                  @click="openEdit(user)"
                >
                  Edit
                </button>

                <button
                  v-if="
                    user.role !== 'ADMIN' &&
                    user.id !== currentUserId
                  "
                  class="delete-button"
                  @click="deleteUser(user)"
                >
                  Delete
                </button>
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
          <h3>
            {{ editing ? 'Edit User' : 'Add User' }}
          </h3>

          <button
            class="close-button"
            @click="closeModal"
          >
            ×
          </button>
        </div>

        <form @submit.prevent="saveUser">
          <div class="field">
            <label>Name</label>
            <input
              v-model="form.name"
              type="text"
              required
            >
          </div>

          <div class="field">
            <label>Email</label>
            <input
              v-model="form.email"
              type="email"
              required
            >
          </div>

          <div class="field">
            <label>
              {{ editing
                ? 'New Password (optional)'
                : 'Password' }}
            </label>

            <input
              v-model="form.password"
              type="password"
              :required="!editing"
              placeholder="Minimum 6 characters"
            >
          </div>

          <div class="field">
            <label>Role</label>

            <select v-model="form.role">
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          <div
            v-if="editing"
            class="field"
          >
            <label>Status</label>

            <select v-model="form.status">
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div v-if="modalError" class="error">
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
              class="save-button"
              :disabled="saving"
            >
              {{ saving ? 'Saving...' : 'Save User' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '../services/api'

const users = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const modalError = ref('')
const showModal = ref(false)
const editing = ref(false)
const editingId = ref(null)

let currentUser = {}

try {
  currentUser = JSON.parse(
    localStorage.getItem('user') || '{}'
  )
} catch {
  localStorage.removeItem('user')
}

const currentUserId = currentUser.id

const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'STAFF',
  status: 'ACTIVE'
})

const loadUsers = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await api.get('/users')
    users.value = response.data
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Failed to load users.'
  } finally {
    loading.value = false
  }
}

const openAdd = () => {
  editing.value = false
  editingId.value = null

  form.value = {
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    status: 'ACTIVE'
  }

  modalError.value = ''
  showModal.value = true
}

const openEdit = user => {
  editing.value = true
  editingId.value = user.id

  form.value = {
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    status: user.status
  }

  modalError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveUser = async () => {
  saving.value = true
  modalError.value = ''

  try {
    if (editing.value) {
      await api.put(
        `/users/${editingId.value}`,
        form.value
      )
    } else {
      await api.post('/users', form.value)
    }

    closeModal()
    await loadUsers()
  } catch (err) {
    modalError.value =
      err.response?.data?.message ||
      'Failed to save user.'
  } finally {
    saving.value = false
  }
}

const deleteUser = async user => {
  const confirmed = window.confirm(
    `Delete user "${user.name}"?`
  )

  if (!confirmed) {
    return
  }

  try {
    await api.delete(`/users/${user.id}`)
    await loadUsers()
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Failed to delete user.'
  }
}

const formatDate = date => {
  return new Date(date).toLocaleDateString(
    'en-PH',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
  )
}

onMounted(loadUsers)
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}

.page-title {
  margin-bottom: 0;
}

.add-button,
.save-button {
  border: 0;
  border-radius: 6px;
  padding: 10px 15px;
  background: #17191c;
  color: white;
  cursor: pointer;
}

.add-button:hover,
.save-button:hover {
  background: #292c31;
}

.error {
  margin-bottom: 15px;
  padding: 12px;
  border-radius: 6px;
  background: #ffebee;
  color: #c62828;
  font-size: 14px;
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
  padding: 13px 10px;
  border-bottom: 1px solid #eee;
  text-align: left;
  font-size: 13px;
  white-space: nowrap;
}

th {
  color: #777;
  font-weight: normal;
}

.badge {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: bold;
}

.admin {
  background: #ede7f6;
  color: #5e35b1;
}

.staff {
  background: #e3f2fd;
  color: #1565c0;
}

.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.inactive {
  background: #ffebee;
  color: #c62828;
}

.actions {
  display: flex;
  gap: 6px;
}

.edit-button,
.delete-button {
  border: 1px solid #d6d8dc;
  border-radius: 5px;
  padding: 7px 10px;
  background: white;
  cursor: pointer;
}

.edit-button:hover {
  background: #f0f1f3;
}

.delete-button {
  color: #c62828;
}

.delete-button:hover {
  background: #ffebee;
}

.empty {
  padding: 40px;
  text-align: center;
  color: #777;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
}

.modal {
  width: 100%;
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 8px;
  padding: 25px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
}

.close-button {
  border: 0;
  background: transparent;
  font-size: 25px;
  color: #777;
  cursor: pointer;
}

.field {
  margin-bottom: 16px;
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
  padding: 10px 12px;
  border: 1px solid #d6d8dc;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-button {
  border: 1px solid #d6d8dc;
  border-radius: 6px;
  padding: 10px 15px;
  background: white;
  cursor: pointer;
}

@media (max-width: 600px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .add-button {
    width: 100%;
  }
}
</style>