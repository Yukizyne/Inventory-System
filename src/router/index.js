import { createRouter, createWebHistory } from 'vue-router'

import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Products from '../views/Products.vue'
import Stock from '../views/Stock.vue'
import Sales from '../views/Sales.vue'
import Suppliers from '../views/Suppliers.vue'
import Categories from '../views/Categories.vue'
import Reports from '../views/Reports.vue'
import Audit from '../views/Audit.vue'
import Users from '../views/Users.vue'
import PurchaseOrders from '../views/PurchaseOrders.vue'
import Settings from '../views/Settings.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/products',
    component: Products,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/stock',
    component: Stock,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/sales',
    component: Sales,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/suppliers',
    component: Suppliers,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/categories',
    component: Categories,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/reports',
    component: Reports,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/audit',
    component: Audit,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/users',
    component: Users,
    meta: {
      requiresAuth: true,
      role: 'ADMIN'
    }
  },
  {
    path: '/purchase-orders',
    component: PurchaseOrders,
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/settings',
    component: Settings,
    meta: {
      requiresAuth: true,
      role: 'ADMIN'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const userData = localStorage.getItem('user')

  let user = null

  try {
    user = userData ? JSON.parse(userData) : null
  } catch {
    user = null
  }

  if (to.meta.requiresAuth && !token) {
    return '/login'
  }

  if (to.path === '/login' && token) {
    return '/dashboard'
  }

  if (
    to.meta.role &&
    user?.role !== to.meta.role
  ) {
    return '/dashboard'
  }

  return true
})

export default router