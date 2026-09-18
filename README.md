# Grocery Inventory System

A full-stack grocery inventory management system built with Vue 3, Node.js, Express, and MySQL.

The system is designed to manage products, inventory, sales, suppliers, purchase orders, users, reports, and system activity in one application.

## Features

* User authentication
* JWT-based authentication
* Admin and Staff roles
* User management
* Product management
* Product images
* Product barcodes
* Category management
* Supplier management
* Stock In and Stock Out
* Stock movement history
* Sales / POS system
* Cash payment and change calculation
* Printable sales receipts
* Barcode scanner
* Purchase orders
* Purchase order receiving
* Cost price tracking
* Sales profit calculation
* Dashboard analytics
* Sales and inventory reports
* Low-stock monitoring
* Audit logs
* Store information settings
* Responsive interface

## Tech Stack

### Frontend

* Vue 3
* Vite
* Vue Router
* Axios
* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js
* MySQL2
* JWT
* bcryptjs
* Multer

### Database

* MySQL

## Project Structure

```text
grocery-inventory/
├── src/
│   ├── components/
│   ├── router/
│   ├── services/
│   ├── views/
│   ├── App.vue
│   ├── main.js
│   └── style.css
│
├── server/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── uploads/
│   ├── utils/
│   ├── .env.example
│   ├── server.js
│   └── package.json
│
├── .gitignore
├── package.json
└── README.md
```

## Main Modules

### Dashboard

Displays inventory and sales information including:

* Total products
* Inventory value
* Low-stock products
* Out-of-stock products
* Total sales
* Total profit
* Daily sales
* Product performance
* Recent inventory activity

### Products

Products can be:

* Added
* Edited
* Deleted
* Searched
* Filtered
* Paginated

Each product can contain:

* Name
* SKU
* Barcode
* Category
* Supplier
* Cost price
* Selling price
* Stock quantity
* Minimum stock
* Product image

### Inventory

The inventory module supports:

* Stock In
* Stock Out
* Quantity validation
* Stock history
* Low-stock detection
* Out-of-stock detection

### Sales

The sales module provides a basic POS workflow.

It supports:

* Product selection
* Cart management
* Quantity management
* Cash payment
* Change calculation
* Automatic stock deduction
* Sales history
* Profit calculation
* Printable receipts
* Barcode scanning

### Purchase Orders

Purchase orders can be:

* Created
* Viewed
* Received
* Cancelled

Receiving an order automatically updates inventory and product cost information.

### Suppliers

Supplier information includes:

* Supplier name
* Contact person
* Phone
* Email
* Address
* Purchase order history
* Products supplied

### Reports

The reporting system provides information about:

* Sales
* Profit
* Inventory
* Low stock
* Top-selling products
* Daily sales
* Stock movements

### User Management

The system supports two roles:

* ADMIN
* STAFF

Administrators can manage users and system settings.

### Audit Logs

Important system actions are recorded in an audit log, including actions involving:

* Products
* Stock
* Sales
* Suppliers
* Categories
* Purchase orders
* Users
* Settings

## Installation

### Requirements

Install:

* Node.js
* MySQL
* Git
* XAMPP or another local MySQL server

### Clone the Repository

```bash
git clone https://github.com/Yukizyne/Inventory-System.git
cd Inventory-System
```

### Install Frontend Dependencies

```bash
npm install
```

### Install Backend Dependencies

```bash
cd server
npm install
```

### Database Setup

Create a MySQL database named:

```text
grocery_inventory
```

Import the project's database SQL file if provided, or execute the required database creation scripts.

### Backend Environment

Create:

```text
server/.env
```

Use:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=grocery_inventory
PORT=5000
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Change the database credentials if your MySQL installation uses a password.

### Start the Backend

```bash
cd server
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### Start the Frontend

Open another terminal:

```bash
cd grocery-inventory
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Demo Accounts

For local development:

### Admin

```text
Email: admin@example.com
Password: admin123
```

### Staff

```text
Email: staff@example.com
Password: staff123
```

These accounts are intended for local/demo use.

## Production Build

To create the frontend production build:

```bash
npm run build
```

The generated files are placed inside:

```text
dist/
```

## Security Notes

Do not commit real environment files.

The following files should remain private:

```text
.env
server/.env
```

Use `.env.example` as a reference for required environment variables.

Do not use the demo passwords in a real production environment.

## Project Status

This project is currently designed as a local full-stack portfolio project.

The application is functional for local development and demonstration.

## Author

Yukizyne

GitHub:

https://github.com/Yukizyne
