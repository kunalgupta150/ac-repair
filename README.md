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

- [Node.js](https://nodejs.org/) (v20 or higher)
- [MongoDB Atlas](https://www.mongodb.com/atlas) or a local MongoDB server

### Local Setup

1. Open a terminal in the repository and install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables by copying `.env.example` to `.env`, then set `MONGODB_URI` and any Brevo email settings:
   ```bash
   cp .env.example .env
   ```

3. Start the app from the `backend` directory:
   ```bash
   npm start
   ```
   The frontend and API are both available at `http://localhost:5000`.

### Deploy to Render (one service)

Create one **Web Service** connected to this repository. Leave **Root Directory** blank.

| Render setting | Value |
|---|---|
| Build Command | `cd backend && npm ci` |
| Start Command | `cd backend && npm start` |

Add these environment variables in Render:

| Key | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `BREVO_API_KEY` | Your Brevo API key |
| `BREVO_SENDER_EMAIL` | Your verified Brevo sender email |
| `FRONTEND_RESET_URL` | `https://YOUR-SERVICE-NAME.onrender.com/reset-password.html` |

Render provides `PORT` automatically; do not add it yourself. Replace the example service URL with the URL Render assigns to your Web Service.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
