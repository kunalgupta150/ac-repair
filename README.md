# AC Repair & Care Management System

A full-stack web application designed for comprehensive AC repair, servicing, and technician dispatch management.

## 🌟 Features

- **Multi-Role Portal**:
  - **Customer Portal**: Service booking, booking tracking, payment management, profile settings, and service feedback.
  - **Technician Portal**: Assigned job management, customer job details, earnings tracking, and customer reviews.
  - **Admin Dashboard**: Comprehensive overview of bookings, customer management, technician allocation, financial/payment tracking, reviews, and reporting.
- **Authentication & Security**:
  - Secure registration & login for customers, technicians, and administrators.
  - Password reset flow powered by Brevo email delivery.
- **Backend API**:
  - Express.js RESTful API service.
  - MySQL database integration for persistent storage of users, services, appointments, and payments.

## 📁 Project Structure

```
ac-repair/
├── backend/
│   ├── .env.example       # Template for backend environment variables
│   ├── server.js          # Main Express server and API endpoints
│   ├── create-admin.js    # Utility script to initialize admin user
│   ├── verify-admin.js    # Utility script to check admin credentials
│   ├── package.json       # Node.js dependencies and scripts
│   └── package-lock.json
├── frontend/
│   ├── admin/             # Admin management pages
│   ├── customer/          # Customer dashboard and booking pages
│   ├── technician/        # Technician workflow and job views
│   ├── assets/            # CSS stylesheets, JavaScript files, and images
│   ├── index.html         # Homepage
│   ├── booking.html       # Public appointment booking page
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── reset-password.html# Password recovery page
│   ├── services.html      # Service catalog
│   ├── about.html         # About page
│   └── contact.html       # Contact page
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL](https://www.mysql.com/) Server (v8.0 or higher)

### Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update the database credentials (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`) and Brevo API details in `.env`.

4. Start the backend server:
   ```bash
   node server.js
   ```
   The backend will start on `http://localhost:5000`.

### Frontend Setup

1. Open the `frontend` folder using any local HTTP server (such as VS Code Live Server or `npx serve frontend`).
2. Navigate to `http://127.0.0.1:5500` (or the respective port configured) to access the application.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

