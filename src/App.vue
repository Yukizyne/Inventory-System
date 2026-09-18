<template>
  <div
    v-if="$route.path !== '/login'"
    class="app"
  >
    <aside class="sidebar">
      <div class="logo">
        Grocery Inventory
      </div>

      <nav>
        <RouterLink to="/">
          Dashboard
        </RouterLink>

        <RouterLink to="/products">
          Products
        </RouterLink>

        <RouterLink to="/stock">
          Stock
        </RouterLink>

        <RouterLink to="/sales">
          Sales
        </RouterLink>

        <RouterLink to="/purchase-orders">
          Purchase Orders
        </RouterLink>

        <RouterLink to="/suppliers">
          Suppliers
        </RouterLink>

        <RouterLink to="/categories">
          Categories
        </RouterLink>

        <RouterLink to="/reports">
          Reports
        </RouterLink>

        <RouterLink to="/audit">
          Audit Logs
        </RouterLink>

        <RouterLink
          v-if="isAdmin"
          to="/users"
        >
          Users
        </RouterLink>
        <router-link
          v-if="user?.role === 'ADMIN'"
          to="/settings"
        >
          Settings
        </router-link>
      </nav>

      <div class="sidebar-user">
        <strong>{{ user?.name }}</strong>
        <span>{{ user?.role }}</span>

        <button @click="logout">
          Logout
        </button>
      </div>
    </aside>

    <main class="main">
      <div class="topbar">
        <h1>
          {{ pageTitle }}
        </h1>

        <p>
          Inventory management system
        </p>
      </div>

      <div class="content">
        <RouterView />
      </div>
    </main>
  </div>

  <RouterView v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

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

const pageTitle = computed(() => {
  if (route.path === '/') {
    return 'Dashboard'
  }

  if (route.path === '/products') {
    return 'Products'
  }

  if (route.path === '/stock') {
    return 'Stock'
  }

  if (route.path === '/sales') {
    return 'Sales'
  }

  if (route.path === '/purchase-orders') {
    return 'Purchase Orders'
  }

  if (route.path === '/suppliers') {
    return 'Suppliers'
  }

  if (route.path === '/categories') {
    return 'Categories'
  }

  if (route.path === '/reports') {
    return 'Reports'
  }

  if (route.path === '/audit') {
    return 'Audit Logs'
  }

  if (route.path === '/users') {
    return 'Users'
  }

  return 'Grocery Inventory'
})

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')

  router.push('/login')
}
</script>