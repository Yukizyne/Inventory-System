<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <h1>Grocery Stock</h1>
        <p>Inventory Management System</p>
      </div>

      <form @submit.prevent="login">
        <div class="field">
          <label>Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="Enter your email"
            required
          >
        </div>

        <div class="field">
          <label>Password</label>
          <input
            v-model="password"
            type="password"
            placeholder="Enter your password"
            required
          >
        </div>

        <p v-if="error" class="login-error">
          {{ error }}
        </p>

        <button
          type="submit"
          class="login-button"
          :disabled="loading"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const login = async () => {
  error.value = ''
  loading.value = true

  try {
    const response = await api.post('/auth/login', {
      email: email.value,
      password: password.value
    })

    localStorage.setItem('token', response.data.token)
    localStorage.setItem(
      'user',
      JSON.stringify(response.data.user)
    )

    router.push('/')
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Unable to login.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6f8;
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 400px;
  background: white;
  border: 1px solid #e4e5e7;
  border-radius: 8px;
  padding: 30px;
}

.login-header {
  margin-bottom: 25px;
}

.login-header h1 {
  margin: 0;
  font-size: 24px;
}

.login-header p {
  margin: 6px 0 0;
  color: #777;
}

.field {
  margin-bottom: 18px;
}

.field label {
  display: block;
  margin-bottom: 7px;
  font-size: 14px;
  font-weight: bold;
}

.field input {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid #d6d8dc;
  border-radius: 6px;
  font-size: 14px;
}

.login-button {
  width: 100%;
  border: 0;
  border-radius: 6px;
  padding: 12px;
  background: #17191c;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.login-button:hover {
  background: #292c31;
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-error {
  margin: 0 0 15px;
  color: #c62828;
  font-size: 14px;
}

@media (max-width: 500px) {
  .login-box {
    padding: 24px;
  }
}
</style>