function calculatePaymentSplit(amount) {
    const total = Number(amount);

    if (!Number.isFinite(total) || total <= 0) {
        throw new Error("Invalid payment amount.");
    }

    const totalPaise = Math.round(total * 100);

    const technicianPaise = Math.round(totalPaise * 0.55);
    const ownerPaise = totalPaise - technicianPaise;

    return {
        totalAmount: totalPaise / 100,
        technicianShare: technicianPaise / 100,
        ownerShare: ownerPaise / 100
    };
}
// =====================================================
// AC CARE - BACKEND SERVER
// =====================================================

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();
(async () => {
    try {
        const response = await fetch("https://api.brevo.com/v3/account", {
            method: "GET",
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "accept": "application/json"
            }
        });

        console.log("Brevo authentication test status:", response.status);

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            console.log("Brevo error code:", data.code || "Not provided");
            console.log("Brevo error message:", data.message || "Not provided");
        } else {
            console.log("Brevo authentication successful!");
        }
    } catch (error) {
        console.log("Brevo test failed:", error.message);
    }
})();
console.log("Brevo key loaded:", Boolean(process.env.BREVO_API_KEY));
console.log(
    "Brevo key has surrounding spaces:",
    process.env.BREVO_API_KEY !== process.env.BREVO_API_KEY?.trim()
);

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// MYSQL DATABASE CONNECTION
// =====================================================

const db = mysql.createPool({

    host: process.env.DB_HOST,

    user: process.env.DB_USER,

    password: process.env.DB_PASSWORD,

    database: process.env.DB_NAME,

    port: Number(process.env.DB_PORT) || 3306,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0

});


// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {

    res.json({

        message:
            "AC CARE Backend is running successfully!"

    });

});


// =====================================================
// TEST DATABASE CONNECTION
// =====================================================

app.get("/api/test-db", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT 1 AS result"
        );

        res.json({

            success: true,

            message:
                "MySQL database connected successfully!",

            result:
                rows[0].result

        });

    } catch (error) {

        console.error(
            "MySQL connection error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "MySQL connection failed",

            error:
                error.message

        });

    }

});


// =====================================================
// DASHBOARD STATISTICS API
// =====================================================

app.get("/api/dashboard/stats", async (req, res) => {

    try {

        const [customers] = await db.query(
            "SELECT COUNT(*) AS total FROM customers"
        );


        const [technicians] = await db.query(
            "SELECT COUNT(*) AS total FROM technicians"
        );


        const [services] = await db.query(
            "SELECT COUNT(*) AS total FROM services"
        );


        const [bookings] = await db.query(
            "SELECT COUNT(*) AS total FROM bookings"
        );


        const [pendingBookings] = await db.query(
            "SELECT COUNT(*) AS total FROM bookings WHERE status = 'Pending'"
        );


        const [completedBookings] = await db.query(
            "SELECT COUNT(*) AS total FROM bookings WHERE status = 'Completed'"
        );


        const [revenue] = await db.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE payment_status = 'Paid'`
        );


        res.json({

            success: true,

            data: {

                totalCustomers:
                    customers[0].total,

                totalTechnicians:
                    technicians[0].total,

                totalServices:
                    services[0].total,

                totalBookings:
                    bookings[0].total,

                pendingBookings:
                    pendingBookings[0].total,

                completedBookings:
                    completedBookings[0].total,

                totalRevenue:
                    revenue[0].total

            }

        });

    } catch (error) {

        console.error(
            "Dashboard API error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load dashboard statistics",

            error:
                error.message

        });

    }

});

// =====================================================
// CUSTOMER REGISTRATION API
// =====================================================

    app.post("/api/customers/register", async (req, res) => {

        try {

            const {
                full_name,
                phone,
                email,
                address,
                password
            } = req.body;


            // Check required fields

            if (
                !full_name ||
                !phone ||
                !email ||
                !address ||
                !password
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Please fill all required fields."
                });

            }


            // Check if email already exists

            const [existingCustomer] = await db.query(
                "SELECT id FROM customers WHERE email = ?",
                [email]
            );


            if (existingCustomer.length > 0) {

                return res.status(409).json({
                    success: false,
                    message: "Email already registered."
                });

            }


            // Hash password before saving

            const hashedPassword = await bcrypt.hash(password, 10);


            // Insert customer into MySQL

            const [result] = await db.query(
                `INSERT INTO customers
                (full_name, phone, email, address, password)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    full_name,
                    phone,
                    email,
                    address,
                    hashedPassword
                ]
            );


            res.status(201).json({

                success: true,

                message: "Customer registered successfully.",

                customerId: result.insertId

            });

        }

        catch (error) {

            console.error(
                "Customer registration error:",
                error
            );

            res.status(500).json({

                success: false,

                message: "Registration failed.",

                error: error.message

            });

        }

    });
    // =====================================================
// CUSTOMER LOGIN API
// =====================================================

app.post("/api/customers/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // Check required fields

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });

        }


        // Find customer by email

        const [customers] = await db.query(
            "SELECT * FROM customers WHERE email = ?",
            [email]
        );


        if (customers.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });

        }


        const customer = customers[0];


        // Check password

       const passwordMatch =
          await bcrypt.compare(
            password,
            customer.password
        );

       if (!passwordMatch) {

          return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });

    }

        // Login successful

        res.json({

            success: true,

            message: "Login successful.",

            customer: {

                id: customer.id,

                full_name: customer.full_name,

                phone: customer.phone,

                email: customer.email,

                address: customer.address

            }

        });

    }

    catch (error) {

        console.error(
            "Customer login error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Login failed.",

            error: error.message

        });

    }

});

 // ADMIN LOGIN API
app.post("/api/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });
        }

        const [admins] = await db.query(
            "SELECT id, name, email, password FROM admins WHERE email = ?",
            [email.trim()]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin email or password."
            });
        }

        const admin = admins[0];

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin email or password."
            });
        }

        return res.json({
            success: true,
            message: "Admin login successful.",
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email
            }
        });

    } catch (error) {
        console.error("Admin login error:", error);

        return res.status(500).json({
            success: false,
            message: "Admin login failed."
        });
    }
});
// ================= CUSTOMER DASHBOARD API =================

app.get(
    "/api/customer/dashboard/:customerId",
    async (req, res) => {

        try {

            const customerId =
                req.params.customerId;


            // Total bookings
            const [totalBookings] =
                await db.query(
                    `SELECT COUNT(*) AS total
                     FROM bookings
                     WHERE customer_id = ?`,
                    [customerId]
                );


            // Pending bookings
            const [pendingBookings] =
                await db.query(
                    `SELECT COUNT(*) AS total
                     FROM bookings
                     WHERE customer_id = ?
                     AND status = 'Pending'`,
                    [customerId]
                );


            // Completed bookings
            const [completedBookings] =
                await db.query(
                    `SELECT COUNT(*) AS total
                     FROM bookings
                     WHERE customer_id = ?
                     AND status = 'Completed'`,
                    [customerId]
                );


            // Total spent
            const [totalSpent] =
                await db.query(
                    `SELECT COALESCE(SUM(p.amount), 0) AS total
                     FROM payments p
                     INNER JOIN bookings b
                     ON p.booking_id = b.id
                     WHERE b.customer_id = ?
                     AND p.payment_status = 'Paid'`,
                    [customerId]
                );


            res.json({

                success: true,

                data: {

                    totalBookings:
                        totalBookings[0].total,

                    pendingBookings:
                        pendingBookings[0].total,

                    completedBookings:
                        completedBookings[0].total,

                    totalSpent:
                        totalSpent[0].total

                }

            });

        } catch (error) {

            console.error(
                "Customer dashboard API error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load customer dashboard.",

                error:
                    error.message

            });

        }

    }
);
// ================= CREATE BOOKING API =================

app.post("/api/bookings", async (req, res) => {

    try {

        const {
            customer_id,
            ac_type,
            service_name,
            address,
            preferred_date,
            preferred_time,
            problem_description
        } = req.body;


        // Validate required fields

        if (
            !customer_id ||
            !ac_type ||
            !service_name ||
            !address ||
            !preferred_date ||
            !preferred_time
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill all required booking fields."

            });

        }


        // Check customer

        const [customers] =
            await db.query(
                "SELECT id FROM customers WHERE id = ?",
                [customer_id]
            );


        if (customers.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Customer not found."

            });

        }


        // Find service

        const [services] =
            await db.query(
                `SELECT id, service_name, price
                 FROM services
                 WHERE service_name = ?
                 AND status = 'Active'
                 LIMIT 1`,
                [service_name]
            );


        if (services.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Selected service is not available in the database."

            });

        }


        const service =
            services[0];


        // Generate booking ID

        const bookingId =
            "AC" +
            Math.floor(
                10000 +
                Math.random() * 90000
            );


        // Insert booking

        const [result] =
            await db.query(
                `INSERT INTO bookings
                (
                    booking_id,
                    customer_id,
                    service_id,
                    ac_type,
                    address,
                    preferred_date,
                    preferred_time,
                    problem_description,
                    status,
                    total_amount
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
                [
                    bookingId,
                    customer_id,
                    service.id,
                    ac_type,
                    address,
                    preferred_date,
                    preferred_time,
                    problem_description || null,
                    service.price
                ]
            );
            
try {
    await db.query(
        `INSERT INTO notifications
         (title, message, type, is_read)
         VALUES (?, ?, ?, FALSE)`,
        [
            "New Booking Received",
            `A new AC service booking (${bookingId}) has been received.`,
            "booking"
        ]
    );
} catch (notificationError) {
    // Keep the booking successful even if notification creation fails.
    console.error(
        "Failed to create booking notification:",
        notificationError
    );
}


        res.status(201).json({

            success: true,

            message:
                "Booking created successfully.",

            booking: {

                id:
                    result.insertId,

                booking_id:
                    bookingId,

                service_name:
                    service.service_name,

                preferred_date:
                    preferred_date,

                preferred_time:
                    preferred_time,

                status:
                    "Pending",

                total_amount:
                    service.price

            }

        });


    } catch (error) {

        console.error(
            "Booking creation error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to create booking.",

            error:
                error.message

        });

    }

});
// ================= GET CUSTOMER BOOKINGS API =================

app.get("/api/bookings/customer/:customerId", async (req, res) => {

    try {

        const customerId = req.params.customerId;

        const [bookings] = await db.query(
            `SELECT
                b.id,
                b.booking_id,
                s.service_name,
                b.ac_type,
                b.address,
                b.preferred_date,
                b.preferred_time,
                b.problem_description,
                b.status,
                b.total_amount,
                COALESCE(t.full_name, 'Not Assigned') AS technician_name
             FROM bookings b
             INNER JOIN services s
                ON b.service_id = s.id
             LEFT JOIN technicians t
                ON b.technician_id = t.id
             WHERE b.customer_id = ?
             ORDER BY b.created_at DESC`,
            [customerId]
        );

        res.json({
            success: true,
            bookings: bookings
        });

    } catch (error) {

        console.error(
            "Fetch customer bookings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load bookings.",
            error: error.message
        });

    }

});
// ===============================
// TECHNICIAN LOGIN
// ===============================
app.post("/api/technicians/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const [technicians] = await db.query(
            `
            SELECT
                id,
                full_name,
                phone,
                email,
                specialization,
                experience,
                status,
                password
            FROM technicians
            WHERE email = ?
            `,
            [email]
        );

        if (technicians.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const technician = technicians[0];

        // Check password
        const passwordMatch = await bcrypt.compare(
            password,
            technician.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Do not send password to frontend
        delete technician.password;

        res.json({
            success: true,
            message: "Technician login successful.",
            technician: technician
        });

    } catch (error) {
        console.error("Technician login error:", error);

        res.status(500).json({
            success: false,
            message: "Technician login failed.",
            error: error.message
        });
    }
});
// =====================================================
// GET CUSTOMER BOOKINGS
// =====================================================

app.get("/api/bookings/customer/:customerId", async (req, res) => {

    try {

        const customerId = req.params.customerId;

        const [bookings] = await db.query(
            `SELECT
                b.id,
                b.booking_id,
                b.customer_id,
                b.ac_type,
                b.address,
                b.preferred_date,
                b.preferred_time,
                b.problem_description,
                b.status,
                b.total_amount,
                s.service_name,
                t.full_name AS technician_name
             FROM bookings b
             INNER JOIN services s
                ON b.service_id = s.id
             LEFT JOIN technicians t
                ON b.technician_id = t.id
             WHERE b.customer_id = ?
             ORDER BY b.created_at DESC`,
            [customerId]
        );

        res.json({
            success: true,
            bookings: bookings
        });

    } catch (error) {

        console.error(
            "Customer bookings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load customer bookings.",
            error: error.message
        });

    }

});
// =====================================================
// ADMIN - RECENT BOOKINGS
// =====================================================

app.get("/api/admin/recent-bookings", async (req, res) => {

    try {

        const [bookings] = await db.query(`
            SELECT
                b.booking_id,
                c.full_name AS customer_name,
                s.service_name,
                t.full_name AS technician_name,
                b.preferred_date,
                b.status,
                b.total_amount,
                COALESCE(p.payment_status, 'Pending') AS payment_status

            FROM bookings b

            INNER JOIN customers c
                ON b.customer_id = c.id

            INNER JOIN services s
                ON b.service_id = s.id

            LEFT JOIN technicians t
                ON b.technician_id = t.id

            LEFT JOIN payments p
                ON p.booking_id = b.id

            ORDER BY b.created_at DESC

            LIMIT 10
        `);

        res.json({
            success: true,
            bookings: bookings
        });

    } catch (error) {

        console.error(
            "Admin recent bookings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load recent bookings.",
            error: error.message
        });

    }

});
// =====================================================
// ADMIN - GET CUSTOMERS
// =====================================================

app.get("/api/admin/customers", async (req, res) => {

    try {

        const [customers] = await db.query(`
            SELECT
                c.id,
                c.full_name,
                c.phone,
                c.email,
                c.address,
                c.created_at,
                COUNT(b.id) AS total_bookings,
                MAX(b.preferred_date) AS last_service
            FROM customers c
            LEFT JOIN bookings b
                ON c.id = b.customer_id
            GROUP BY
                c.id,
                c.full_name,
                c.phone,
                c.email,
                c.address,
                c.created_at
            ORDER BY c.created_at DESC
        `);

        res.json({
            success: true,
            customers: customers
        });

    } catch (error) {

        console.error(
            "Admin customers error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load customers.",
            error: error.message
        });

    }

});
// ================= CUSTOMER DETAILS API =================

app.get("/api/admin/customers/:id", async (req, res) => {

    try {

        const customerId = req.params.id;

        // Get customer information
        const [customers] = await db.query(`
            SELECT
                id,
                full_name,
                phone,
                email,
                address,
                created_at
            FROM customers
            WHERE id = ?
        `, [customerId]);


        if (customers.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });

        }


        // Get customer's booking history
        const [bookings] = await db.query(`
            SELECT
                b.booking_id,
                s.service_name,
                COALESCE(t.full_name, 'Not Assigned') AS technician_name,
                b.ac_type,
                b.preferred_date,
                b.preferred_time,
                b.status,
                b.total_amount
            FROM bookings b

            INNER JOIN services s
                ON b.service_id = s.id

            LEFT JOIN technicians t
                ON b.technician_id = t.id

            WHERE b.customer_id = ?

            ORDER BY b.created_at DESC
        `, [customerId]);


        res.json({

            success: true,

            customer: customers[0],

            bookings: bookings

        });

    } catch (error) {

        console.error(
            "Customer details API error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Failed to load customer details.",

            error: error.message

        });

    }

});
// ================= TECHNICIANS API =================

app.get("/api/technicians", async (req, res) => {
    try {

        const [technicians] = await db.query(`
            SELECT
                t.id,
                t.full_name,
                t.phone,
                t.email,
                t.specialization,
                t.experience,
                t.status,
                t.created_at,

                (
                    SELECT COUNT(*)
                    FROM bookings b
                    WHERE b.technician_id = t.id
                ) AS assigned_jobs,

                (
                    SELECT ROUND(AVG(r.rating), 1)
                    FROM reviews r
                    WHERE r.technician_id = t.id
                ) AS rating

            FROM technicians t
            ORDER BY t.id DESC
        `);

        res.json({
            success: true,
            data: technicians
        });

    } catch (error) {

        console.error("Technicians API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load technicians.",
            error: error.message
        });

    }
});
// ===============================
// TEMPORARY: UPDATE TECHNICIAN PASSWORDS
// ===============================
app.put("/api/technicians/update-passwords", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash("123456", 10);

        const [result] = await db.query(
            `
            UPDATE technicians
            SET password = ?
            `,
            [hashedPassword]
        );

        res.json({
            success: true,
            message: "All technician passwords updated successfully.",
            updated: result.affectedRows
        });

    } catch (error) {
        console.error("Update technician passwords error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update technician passwords.",
            error: error.message
        });
    }
});
// ================= SINGLE TECHNICIAN API =================

app.get("/api/technicians/:id", async (req, res) => {
    try {

        const technicianId = req.params.id;

        const [technicians] = await db.query(`
            SELECT
                t.id,
                t.full_name,
                t.phone,
                t.email,
                t.specialization,
                t.experience,
                t.status,
                t.created_at,

                (
                    SELECT COUNT(*)
                    FROM bookings b
                    WHERE b.technician_id = t.id
                ) AS assigned_jobs,

                (
                    SELECT ROUND(AVG(r.rating), 1)
                    FROM reviews r
                    WHERE r.technician_id = t.id
                ) AS rating

            FROM technicians t
            WHERE t.id = ?
        `, [technicianId]);

        if (technicians.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Technician not found."
            });
        }

        res.json({
            success: true,
            technician: technicians[0]
        });

    } catch (error) {

        console.error("Single technician API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load technician details.",
            error: error.message
        });

    }
});

// ================= UPDATE TECHNICIAN API =================

app.put("/api/technicians/:id", async (req, res) => {
    try {
        const technicianId = req.params.id;

        const {
            full_name,
            phone,
            email,
            specialization,
            experience
        } = req.body;

        if (
            !full_name?.trim() ||
            !phone?.trim() ||
            !email?.trim() ||
            !specialization?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, email and specialization are required."
            });
        }

        const [result] = await db.query(
            `UPDATE technicians
             SET full_name = ?,
                 phone = ?,
                 email = ?,
                 specialization = ?,
                 experience = ?
             WHERE id = ?`,
            [
                full_name.trim(),
                phone.trim(),
                email.trim(),
                specialization.trim(),
                Math.max(0, Number(experience) || 0),
                technicianId
            ]
        );

        if (result.affectedRows === 0) {
            const [existing] = await db.query(
                "SELECT id FROM technicians WHERE id = ?",
                [technicianId]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Technician not found."
                });
            }
        }

        const [rows] = await db.query(
            `SELECT id, full_name, phone, email, specialization,
                    experience, status
             FROM technicians
             WHERE id = ?`,
            [technicianId]
        );

        return res.json({
            success: true,
            message: "Technician updated successfully.",
            technician: rows[0]
        });

    } catch (error) {
        console.error("Update technician API error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update technician.",
            error: error.message
        });
    }
});


// ================= ADD TECHNICIAN API =================

app.post("/api/technicians", async (req, res) => {
    try {

        const {
            full_name,
            phone,
            email,
            specialization,
            experience,
            status,
            password
        } = req.body;

        if (!full_name || !phone || !email || !specialization) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, email and specialization are required."
            });
        }

        const allowedStatuses = [
            "Available",
            "Busy",
            "Inactive"
        ];

        const technicianStatus = status || "Available";

        if (!allowedStatuses.includes(technicianStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid technician status."
            });
        }

       const technicianPassword = await bcrypt.hash(
    password || "123456",
    10
);

        const [result] = await db.query(`
            INSERT INTO technicians
            (
                full_name,
                phone,
                email,
                specialization,
                experience,
                status,
                password
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            full_name,
            phone,
            email,
            specialization,
            Number(experience) || 0,
            technicianStatus,
            technicianPassword
        ]);

        res.status(201).json({
            success: true,
            message: "Technician added successfully.",
            technicianId: result.insertId
        });

    } catch (error) {

        console.error("Add technician API error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to add technician.",
            error: error.message
        });

    }
});
// ================= GET ADMIN BOOKINGS API =================

app.get("/api/admin/bookings", async (req, res) => {

    try {

        const [bookings] = await db.query(`
            SELECT
                b.id,
                b.booking_id,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                s.service_name,
                COALESCE(t.full_name, 'Not Assigned') AS technician_name,
                b.ac_type,
                b.address,
                b.preferred_date,
                b.preferred_time,
                b.problem_description,
                b.status,
                b.total_amount,
                b.created_at
            FROM bookings b

            INNER JOIN customers c
                ON b.customer_id = c.id

            INNER JOIN services s
                ON b.service_id = s.id

            LEFT JOIN technicians t
                ON b.technician_id = t.id

            ORDER BY b.created_at DESC
        `);


        res.json({

            success: true,

            data: bookings

        });


    } catch (error) {

        console.error(
            "Admin bookings API error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to load admin bookings.",

            error:
                error.message

        });

    }

});
// ==========================================
// TECHNICIAN DASHBOARD
// ==========================================

app.get("/api/technicians/:id/dashboard", async (req, res) => {
    try {
        const technicianId = req.params.id;

        // ==========================================
        // GET TECHNICIAN DETAILS
        // ==========================================

        const [technicians] = await db.query(
            `
            SELECT
                id,
                full_name,
                phone,
                email,
                specialization,
                experience,
                status
            FROM technicians
            WHERE id = ?
            `,
            [technicianId]
        );

        if (technicians.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Technician not found."
            });
        }

        // ==========================================
        // GET ASSIGNED BOOKINGS
        // ==========================================

        const [bookings] = await db.query(
            `
            SELECT
                b.id,
                b.booking_id,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                c.email AS customer_email,
                b.address,
                s.service_name,
                b.ac_type,
                b.preferred_date,
                b.preferred_time,
                b.problem_description,
                b.status,
                b.total_amount,
                b.created_at
            FROM bookings b
            INNER JOIN customers c
                ON b.customer_id = c.id
            INNER JOIN services s
                ON b.service_id = s.id
            WHERE b.technician_id = ?
            ORDER BY b.created_at DESC
            `,
            [technicianId]
        );

        // ==========================================
        // JOB STATISTICS
        // ==========================================

        const totalJobs = bookings.length;

        const pendingJobs = bookings.filter(
            booking =>
                booking.status === "Assigned" ||
                booking.status === "Pending"
        ).length;

        const inProgressJobs = bookings.filter(
            booking =>
                booking.status === "In Progress"
        ).length;

        const completedJobs = bookings.filter(
            booking =>
                booking.status === "Completed"
        ).length;

        // ==========================================
        // TOTAL EARNINGS
        // ==========================================

        const totalEarnings = bookings
            .filter(
                booking =>
                    booking.status === "Completed"
            )
            .reduce(
                (total, booking) =>
                    total +
                    (Number(booking.total_amount) || 0),
                0
            );

        // ==========================================
        // TODAY'S EARNINGS
        // ==========================================

        const today = new Date()
            .toISOString()
            .split("T")[0];

        const todayEarnings = bookings
            .filter(
                booking =>
                    booking.status === "Completed" &&
                    String(booking.preferred_date)
                        .substring(0, 10) === today
            )
            .reduce(
                (total, booking) =>
                    total +
                    (Number(booking.total_amount) || 0),
                0
            );

        // ==========================================
        // CUSTOMER RATING
        // ==========================================

        const [ratingResult] = await db.query(
            `
            SELECT
                ROUND(AVG(rating), 1) AS average_rating,
                COUNT(*) AS total_reviews
            FROM reviews
            WHERE technician_id = ?
            `,
            [technicianId]
        );

        const customerRating =
            ratingResult[0].average_rating || 0;

        // ==========================================
        // SUCCESS RATE
        // ==========================================

        const successRate =
            totalJobs > 0
                ? Math.round(
                    (completedJobs / totalJobs) * 100
                )
                : 0;

        // ==========================================
        // SEND RESPONSE
        // ==========================================

        res.json({
            success: true,

            technician: technicians[0],

            stats: {
                totalJobs,
                pendingJobs,
                inProgressJobs,
                completedJobs,
                totalEarnings,
                todayEarnings,
                customerRating,
                successRate
            },

            bookings
        });

    } catch (error) {

        console.error(
            "Technician dashboard error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load technician dashboard.",
            error:
                error.message
        });
    }
});
// =====================================================
// TECHNICIAN - CUSTOMERS
// =====================================================

app.get("/api/technicians/:id/customers", async (req, res) => {

    try {

        const technicianId = req.params.id;

        const [customers] = await db.query(`
            SELECT
                c.id,
                c.full_name,
                c.phone,
                c.email,
                c.address,

                COUNT(b.id) AS total_bookings,

                COUNT(
                    CASE
                        WHEN b.status = 'Completed'
                        THEN 1
                    END
                ) AS completed_bookings,

                MAX(b.preferred_date) AS last_service

            FROM bookings b

            INNER JOIN customers c
                ON b.customer_id = c.id

            WHERE b.technician_id = ?

            GROUP BY
                c.id,
                c.full_name,
                c.phone,
                c.email,
                c.address

            ORDER BY last_service DESC
        `, [technicianId]);


        res.json({

            success: true,

            customers: customers

        });

    } catch (error) {

        console.error(
            "Technician customers error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load technician customers.",

            error:
                error.message

        });

    }

});
// ==========================================
// TECHNICIAN EARNINGS
// ==========================================

app.get("/api/technicians/:id/earnings", async (req, res) => {

    try {

        const technicianId = req.params.id;

        const [summary] = await db.query(`
            SELECT
                COUNT(
                    CASE
                        WHEN status = 'Completed'
                        THEN 1
                    END
                ) AS completed_jobs,

                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'Completed'
                            THEN total_amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS total_earnings,

                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'Completed'
                            AND DATE(preferred_date) = CURDATE()
                            THEN total_amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS today_earnings

            FROM bookings
            WHERE technician_id = ?

        `, [technicianId]);


        const [earnings] = await db.query(`
            SELECT
                b.booking_id,
                c.full_name AS customer_name,
                s.service_name,
                b.preferred_date,
                b.total_amount,
                b.status

            FROM bookings b

            INNER JOIN customers c
                ON b.customer_id = c.id

            INNER JOIN services s
                ON b.service_id = s.id

            WHERE b.technician_id = ?
            AND b.status = 'Completed'

            ORDER BY b.preferred_date DESC

        `, [technicianId]);


        res.json({
            success: true,
            summary: summary[0],
            earnings: earnings
        });

    } catch (error) {

        console.error("Technician earnings error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load technician earnings.",
            error: error.message
        });

    }

});
// ==========================================
// TECHNICIAN REVIEWS
// ==========================================

app.get("/api/technicians/:id/reviews", async (req, res) => {

    try {

        const technicianId = req.params.id;

        // ==========================================
        // REVIEWS
        // ==========================================

        const [reviews] = await db.query(`
            SELECT
                r.id,
                r.rating,
                r.comment,
                r.created_at,
                c.full_name AS customer_name,
                b.booking_id,
                s.service_name

            FROM reviews r

            INNER JOIN customers c
                ON r.customer_id = c.id

            INNER JOIN bookings b
                ON r.booking_id = b.id

            INNER JOIN services s
                ON b.service_id = s.id

            WHERE r.technician_id = ?

            ORDER BY r.created_at DESC

        `, [technicianId]);


        // ==========================================
        // RATING SUMMARY
        // ==========================================

        const [ratingResult] = await db.query(`
            SELECT
                COALESCE(
                    ROUND(AVG(rating), 1),
                    0
                ) AS average_rating,

                COUNT(*) AS total_reviews

            FROM reviews

            WHERE technician_id = ?

        `, [technicianId]);


        // ==========================================
        // RESPONSE
        // ==========================================

        res.json({

            success: true,

            summary: ratingResult[0],

            reviews: reviews

        });


    } catch (error) {

        console.error(
            "Technician reviews error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load technician reviews.",

            error:
                error.message

        });

    }

});
// =====================================================
// TECHNICIAN - REVIEWS
// =====================================================

app.get("/api/technicians/:id/reviews", async (req, res) => {

    try {

        const technicianId = req.params.id;


        const [reviews] = await db.query(`
            SELECT

                r.id,
                r.rating,
                r.comment,
                r.created_at,

                c.full_name AS customer_name,

                b.booking_id,

                s.service_name

            FROM reviews r

            INNER JOIN customers c
                ON r.customer_id = c.id

            INNER JOIN bookings b
                ON r.booking_id = b.id

            INNER JOIN services s
                ON b.service_id = s.id

            WHERE r.technician_id = ?

            ORDER BY r.created_at DESC
        `, [technicianId]);


        const [ratingResult] = await db.query(`
            SELECT

                COALESCE(
                    ROUND(AVG(rating), 1),
                    0
                ) AS average_rating,

                COUNT(*) AS total_reviews

            FROM reviews

            WHERE technician_id = ?
        `, [technicianId]);


        res.json({

            success: true,

            summary: ratingResult[0],

            reviews: reviews

        });

    } catch (error) {

        console.error(
            "Technician reviews error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load technician reviews.",

            error:
                error.message

        });

    }

});
// ================= ASSIGN TECHNICIAN TO BOOKING =================

app.put("/api/admin/bookings/:id/assign", async (req, res) => {

    try {

        const bookingId = req.params.id;
        const { technician_id } = req.body;

        // Check technician ID
        if (!technician_id) {
            return res.status(400).json({
                success: false,
                message: "Technician is required."
            });
        }

        // Check if booking exists
        const [bookings] = await db.query(
            `
            SELECT id, booking_id, status
            FROM bookings
            WHERE id = ?
            `,
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        // Check if technician exists
        const [technicians] = await db.query(
            `
            SELECT id, full_name, status
            FROM technicians
            WHERE id = ?
            `,
            [technician_id]
        );

        if (technicians.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Technician not found."
            });
        }

        // Update booking
        const [result] = await db.query(
            `
            UPDATE bookings
            SET
                technician_id = ?,
                status = 'Assigned'
            WHERE id = ?
            `,
            [technician_id, bookingId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                message: "Booking could not be updated."
            });
        }

        res.json({
            success: true,
            message: "Technician assigned successfully.",
            bookingId: bookings[0].booking_id,
            technician: technicians[0].full_name
        });

    } catch (error) {

        console.error("Assign technician error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to assign technician.",
            error: error.message
        });

    }

});


app.put("/api/admin/bookings/:id", async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { preferred_date, preferred_time } = req.body;

        if (!preferred_date || !preferred_time) {
            return res.status(400).json({
                success: false,
                message: "Date and time are required."
            });
        }

        const [result] = await db.query(
            `UPDATE bookings
             SET preferred_date = ?, preferred_time = ?
             WHERE id = ?`,
            [preferred_date, preferred_time, bookingId]
        );

        if (result.affectedRows === 0) {
            const [check] = await db.query(
                "SELECT id FROM bookings WHERE id = ?",
                [bookingId]
            );

            if (check.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found."
                });
            }
        }

        const [rows] = await db.query(
            `SELECT booking_id, preferred_date, preferred_time
             FROM bookings
             WHERE id = ?`,
            [bookingId]
        );

        console.log("Booking after edit:", rows[0]);

        res.json({
            success: true,
            message: "Booking date and time saved.",
            booking: rows[0]
        });

    } catch (error) {
        console.error("Edit booking error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update booking.",
            error: error.message
        });
    }
});
// =====================================================
// START SERVER
// =====================================================
// ==========================================
// TECHNICIAN UPDATE BOOKING STATUS
// ==========================================

app.put("/api/technicians/bookings/:id/status", async (req, res) => {
    try {

        const bookingId = req.params.id;

        const {
            status,
            technician_id
        } = req.body;


        // Allowed status changes
        const allowedStatuses = [
            "Accepted",
            "In Progress",
            "Completed"
        ];


        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid booking status."
            });

        }


        if (!technician_id) {

            return res.status(400).json({
                success: false,
                message: "Technician ID is required."
            });

        }


        // Check booking
        const [bookings] = await db.query(
            `
            SELECT
                id,
                booking_id,
                technician_id,
                status
            FROM bookings
            WHERE id = ?
            `,
            [bookingId]
        );


        if (bookings.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });

        }


        const booking = bookings[0];


        // Make sure this booking belongs
        // to the logged-in technician

        if (
            Number(booking.technician_id) !==
            Number(technician_id)
        ) {

            return res.status(403).json({
                success: false,
                message: "This booking is not assigned to this technician."
            });

        }


        // Check correct status sequence

        if (
            status === "Accepted" &&
            booking.status !== "Assigned"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Only an assigned job can be accepted."
            });

        }


        if (
            status === "In Progress" &&
            booking.status !== "Accepted"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Job must be accepted before starting."
            });

        }


        if (
            status === "Completed" &&
            booking.status !== "In Progress"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Job must be in progress before completing."
            });

        }


        // Update booking status

        const [result] = await db.query(
            `
            UPDATE bookings
            SET status = ?
            WHERE id = ?
            `,
            [
                status,
                bookingId
            ]
        );


        if (result.affectedRows === 0) {

            return res.status(400).json({
                success: false,
                message: "Booking status could not be updated."
            });

        }


        res.json({

            success: true,

            message:
                "Booking status updated successfully.",

            bookingId:
                booking.booking_id,

            status:
                status

        });


    } catch (error) {

        console.error(
            "Technician status update error:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to update booking status.",

            error:
                error.message

        });

    }
});

app.get("/api/admin/reports", async (req, res) => {
    try {
        const [bookingStats] = await db.query(`
            SELECT
                COUNT(*) AS totalBookings,
                SUM(status = 'Pending') AS pendingBookings,
                SUM(status = 'Assigned') AS assignedBookings,
                SUM(status = 'Accepted') AS acceptedBookings,
                SUM(status = 'In Progress') AS inProgressBookings,
                SUM(status = 'Completed') AS completedBookings,
                SUM(status = 'Cancelled') AS cancelledBookings
            FROM bookings
        `);

        const [paymentStats] = await db.query(`
            SELECT
                COALESCE(SUM(CASE
                    WHEN payment_status = 'Paid' THEN amount
                    ELSE 0
                END), 0) AS totalRevenue,
                COALESCE(SUM(CASE
                    WHEN payment_status = 'Pending' THEN amount
                    ELSE 0
                END), 0) AS pendingPayments,
                COALESCE(SUM(CASE
                    WHEN payment_status = 'Refunded' THEN amount
                    ELSE 0
                END), 0) AS refundedAmount,
                COALESCE(SUM(CASE
                    WHEN payment_status = 'Paid'
                    THEN technician_share ELSE 0
                END), 0) AS technicianShare,
                COALESCE(SUM(CASE
                    WHEN payment_status = 'Paid'
                     AND technician_payout_status = 'Paid'
                    THEN technician_share ELSE 0
                END), 0) AS technicianPayoutsRecorded,
                COALESCE(SUM(CASE
                    WHEN payment_status = 'Paid'
                     AND (technician_payout_status IS NULL
                      OR technician_payout_status <> 'Paid')
                    THEN technician_share ELSE 0
                END), 0) AS technicianPayoutsPending,
                COALESCE(SUM(CASE
                    WHEN payment_status = 'Paid'
                    THEN owner_share ELSE 0
                END), 0) AS ownerShare
            FROM payments
        `);

        res.json({
            success: true,
            bookings: bookingStats[0],
            payments: paymentStats[0]
        });
    } catch (error) {
        console.error("Reports API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load reports."
        });
    }
});

app.get("/api/admin/reviews", async (req, res) => {
    try {
        const [reviews] = await db.query(`
            SELECT
                r.id,
                r.rating,
                r.comment,
                r.created_at,
                b.booking_id AS booking_reference,
                c.full_name AS customer_name,
                c.phone AS customer_phone,
                s.name AS service_name,
                t.full_name AS technician_name
            FROM reviews r
            INNER JOIN bookings b
                ON r.booking_id = b.id
            INNER JOIN customers c
                ON r.customer_id = c.id
            LEFT JOIN services s
                ON b.service_id = s.id
            LEFT JOIN technicians t
                ON r.technician_id = t.id
            ORDER BY r.created_at DESC
        `);

        const [stats] = await db.query(`
            SELECT
                COUNT(*) AS totalReviews,
                COALESCE(ROUND(AVG(rating), 1), 0) AS averageRating,
                SUM(rating = 5) AS fiveStarReviews,
                SUM(rating = 4) AS fourStarReviews,
                SUM(rating = 3) AS threeStarReviews,
                SUM(rating = 2) AS twoStarReviews,
                SUM(rating = 1) AS oneStarReviews
            FROM reviews
        `);

        res.json({
            success: true,
            reviews,
            stats: stats[0]
        });

    } catch (error) {
    console.error("Reviews API error:", error);

    res.status(500).json({
        success: false,
        message: error.message
    });
}
});

app.get("/api/admin/reports/monthly-revenue", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                DATE_FORMAT(payment_date, '%Y-%m') AS monthKey,
                DATE_FORMAT(payment_date, '%b') AS monthLabel,
                COALESCE(SUM(amount), 0) AS revenue
            FROM payments
            WHERE payment_status = 'Paid'
              AND payment_date >= DATE_FORMAT(
                  DATE_SUB(CURDATE(), INTERVAL 7 MONTH),
                  '%Y-%m-01'
              )
              AND payment_date < DATE_FORMAT(
                  DATE_ADD(CURDATE(), INTERVAL 1 MONTH),
                  '%Y-%m-01'
              )
            GROUP BY
                DATE_FORMAT(payment_date, '%Y-%m'),
                DATE_FORMAT(payment_date, '%b')
            ORDER BY monthKey ASC
        `);

        res.json({
            success: true,
            monthlyRevenue: rows
        });
    } catch (error) {
        console.error("Monthly revenue report error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load monthly revenue."
        });
    }
});

/* =========================================
   AC CARE - NOTIFICATIONS API
   Add above app.listen(...)
========================================= */

// GET all notifications
app.get("/api/admin/notifications", async (req, res) => {
    try {
        const [notifications] = await db.query(`
            SELECT id, title, message, type,
                   related_booking_id, is_read, created_at
            FROM notifications
            ORDER BY created_at DESC
        `);

        const unreadCount = notifications.filter(
            n => !n.is_read
        ).length;

        res.json({
            success: true,
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error("Load notifications error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load notifications."
        });
    }
});


// CREATE a notification
app.post("/api/admin/notifications", async (req, res) => {
    try {
        const { title, message, type, related_booking_id } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: "Title and message are required."
            });
        }

        const [result] = await db.query(
            `INSERT INTO notifications
             (title, message, type, related_booking_id)
             VALUES (?, ?, ?, ?)`,
            [
                title.trim(),
                message.trim(),
                type || "general",
                related_booking_id || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Notification created successfully.",
            id: result.insertId
        });
    } catch (error) {
        console.error("Create notification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create notification."
        });
    }
});


// MARK a notification as read
app.put("/api/admin/notifications/:id/read", async (req, res) => {
    try {
        const [result] = await db.query(
            "UPDATE notifications SET is_read = TRUE WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        res.json({
            success: true,
            message: "Notification marked as read."
        });
    } catch (error) {
        console.error("Mark notification read error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update notification."
        });
    }
});


// DELETE a notification
app.delete("/api/admin/notifications/:id", async (req, res) => {
    try {
        const [result] = await db.query(
            "DELETE FROM notifications WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        res.json({
            success: true,
            message: "Notification deleted successfully."
        });
    } catch (error) {
        console.error("Delete notification error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete notification."
        });
    }
});

  // ================= TEST CUSTOMERS ROUTE =================

app.get("/api/test-customers", (req, res) => {
    res.json({
        success: true,
        message: "Customers route is working"
    });
});

/* =========================================
   AC CARE - PAYMENT APIs
   Insert above the START SERVER section
========================================= */

// 1. ADMIN: GET ALL PAYMENTS
app.get("/api/admin/payments", async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT
                p.id AS payment_id,
                p.booking_id AS database_booking_id,
                b.booking_id,
                c.full_name AS customer_name,
                s.service_name,
                t.full_name AS technician_name,
                p.amount,
                p.payment_method,
                p.payment_status,
                p.transaction_id,
                p.payment_date,
                p.collected_by,
                p.technician_share,
                p.owner_share,
                p.technician_payout_status,
                p.technician_payout_date,
                p.payout_reference
            FROM payments p
            INNER JOIN bookings b ON p.booking_id = b.id
            INNER JOIN customers c ON b.customer_id = c.id
            INNER JOIN services s ON b.service_id = s.id
            LEFT JOIN technicians t ON b.technician_id = t.id
            ORDER BY p.id DESC
        `);

        res.json({ success: true, payments });
    } catch (error) {
        console.error("Load payments error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load payments."
        });
    }
});


// 2. CREATE A PENDING PAYMENT
// bookingId must be the numeric bookings.id, not "AC20914".
app.post("/api/payments", async (req, res) => {
    const { bookingId, paymentMethod } = req.body;

    const allowedMethods = ["Cash", "UPI", "Card", "Online"];

    if (!Number.isInteger(Number(bookingId)) ||
        Number(bookingId) <= 0 ||
        !allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({
            success: false,
            message: "Valid booking ID and payment method are required."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [bookings] = await connection.query(
            `SELECT id, total_amount, status
             FROM bookings
             WHERE id = ?
             FOR UPDATE`,
            [Number(bookingId)]
        );

        if (!bookings.length) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }

        const booking = bookings[0];
        const split = calculatePaymentSplit(booking.total_amount);

        if (split.totalAmount <= 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Booking amount must be greater than zero."
            });
        }

        // Prevent creating another payment while one is pending
        const [existing] = await connection.query(
            `SELECT id FROM payments
             WHERE booking_id = ?
               AND payment_status = 'Pending'
             LIMIT 1`,
            [booking.id]
        );

        if (existing.length) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "A pending payment already exists for this booking."
            });
        }

        const [result] = await connection.query(
            `INSERT INTO payments
             (booking_id, amount, payment_method, payment_status,
              technician_share, owner_share, technician_payout_status)
             VALUES (?, ?, ?, 'Pending', ?, ?, 'Not Due')`,
            [
                booking.id,
                split.totalAmount,
                paymentMethod,
                split.technicianShare,
                split.ownerShare
            ]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: paymentMethod === "Cash"
                ? "Cash payment recorded as pending."
                : "Payment created. Online payment requires gateway verification.",
            payment: {
                id: result.insertId,
                bookingId: booking.id,
                amount: split.totalAmount,
                paymentMethod,
                paymentStatus: "Pending",
                technicianShare: split.technicianShare,
                ownerShare: split.ownerShare
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Create payment error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create payment."
        });
    } finally {
        if (connection) connection.release();
    }
});


// 3. ADMIN: CONFIRM CASH RECEIVED BY OWNER OR ADMIN
app.put("/api/admin/payments/:id/confirm-cash", async (req, res) => {
    const { collectedBy } = req.body;

    if (!["Owner", "Admin"].includes(collectedBy)) {
        return res.status(400).json({
            success: false,
            message: "collectedBy must be Owner or Admin."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [payments] = await connection.query(
            `SELECT id, payment_method, payment_status
             FROM payments
             WHERE id = ?
             FOR UPDATE`,
            [req.params.id]
        );

        if (!payments.length) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Payment not found."
            });
        }

        const payment = payments[0];

        if (payment.payment_method !== "Cash" ||
            payment.payment_status !== "Pending") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Only pending cash payments can be confirmed here."
            });
        }

        await connection.query(
            `UPDATE payments
             SET payment_status = 'Paid',
                 collected_by = ?
             WHERE id = ?`,
            [collectedBy, payment.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Cash payment confirmed."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Confirm cash error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to confirm cash payment."
        });
    } finally {
        if (connection) connection.release();
    }
});


// 4. ADMIN: RECORD TECHNICIAN PAYOUT
app.put("/api/admin/payments/:id/payout", async (req, res) => {
    const { payoutReference } = req.body;

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [payments] = await connection.query(
            `SELECT id, payment_status, technician_payout_status
             FROM payments
             WHERE id = ?
             FOR UPDATE`,
            [req.params.id]
        );

        if (!payments.length) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Payment not found."
            });
        }

        const payment = payments[0];

        if (payment.payment_status !== "Paid") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Payment must be confirmed before technician payout."
            });
        }

        if (payment.technician_payout_status === "Paid") {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "Technician payout has already been recorded."
            });
        }

        await connection.query(
            `UPDATE payments
             SET technician_payout_status = 'Paid',
                 technician_payout_date = NOW(),
                 payout_reference = ?
             WHERE id = ?`,
            [payoutReference || null, payment.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Technician payout recorded."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Technician payout error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to record technician payout."
        });
    } finally {
        if (connection) connection.release();
    }
});

/* =========================================
   CUSTOMER - SUBMIT UPI PAYMENT REFERENCE
   Payment stays Pending until admin verifies it.
========================================= */

app.post("/api/customer/payments/upi-reference", async (req, res) => {
    const { bookingId, customerId, transactionReference } = req.body;

    const reference = String(transactionReference || "").trim();

    if (
        !Number.isInteger(Number(bookingId)) ||
        Number(bookingId) <= 0 ||
        !Number.isInteger(Number(customerId)) ||
        Number(customerId) <= 0 ||
        reference.length < 6 ||
        reference.length > 100
    ) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid booking details and transaction reference."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Confirm that this booking belongs to the supplied customer
        // and that the service is completed.
        const [bookings] = await connection.query(
            `SELECT id, total_amount
             FROM bookings
             WHERE id = ?
               AND customer_id = ?
               AND status = 'Completed'
             FOR UPDATE`,
            [Number(bookingId), Number(customerId)]
        );

        if (bookings.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Completed booking not found for this customer."
            });
        }

        // Find an existing pending UPI payment, if any.
        const [payments] = await connection.query(
            `SELECT id, payment_status
             FROM payments
             WHERE booking_id = ?
               AND payment_method = 'UPI'
             ORDER BY id DESC
             LIMIT 1
             FOR UPDATE`,
            [Number(bookingId)]
        );

        let paymentId;

        if (payments.length > 0) {
            const payment = payments[0];

            if (payment.payment_status !== "Pending") {
                await connection.rollback();
                return res.status(409).json({
                    success: false,
                    message: "This payment is already processed. Contact the administrator if you need help."
                });
            }

            // Update the pending UPI payment with the reference.
            await connection.query(
                `UPDATE payments
                 SET transaction_id = ?
                 WHERE id = ?`,
                [reference, payment.id]
            );

            paymentId = payment.id;
        } else {
            const split = calculatePaymentSplit(
                bookings[0].total_amount
            );

            const [result] = await connection.query(
                `INSERT INTO payments
                 (booking_id, amount, payment_method, payment_status,
                  transaction_id, technician_share, owner_share,
                  technician_payout_status)
                 VALUES (?, ?, 'UPI', 'Pending', ?, ?, ?, 'Not Due')`,
                [
                    Number(bookingId),
                    split.totalAmount,
                    reference,
                    split.technicianShare,
                    split.ownerShare
                ]
            );

            paymentId = result.insertId;
        }

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: "UPI reference submitted. Payment is awaiting administrator verification.",
            payment: {
                id: paymentId,
                bookingId: Number(bookingId),
                paymentStatus: "Pending"
            }
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("UPI reference submission error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not submit the UPI reference."
        });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// =====================================
// ADMIN TODAY'S JOBS API
// =====================================

app.get("/api/admin/todays-jobs", async (req, res) => {
    try {
        const [jobs] = await db.query(`
            SELECT
                b.id,
                b.booking_id,
                c.full_name AS customer_name,
                s.service_name,
                COALESCE(t.full_name, 'Not Assigned') AS technician_name,
                b.address,
                b.preferred_date,
                b.preferred_time,
                b.status
            FROM bookings b
            INNER JOIN customers c
                ON b.customer_id = c.id
            INNER JOIN services s
                ON b.service_id = s.id
            LEFT JOIN technicians t
                ON b.technician_id = t.id
            WHERE b.preferred_date >= CURDATE()
              AND b.preferred_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
              AND b.status NOT IN ('Completed', 'Cancelled')
            ORDER BY b.preferred_time ASC
        `);

        res.json({
            success: true,
            jobs: jobs
        });

    } catch (error) {
        console.error("Today's jobs API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load today's jobs",
            error: error.message
        });
    }
});

/* =========================================
   ADMIN DASHBOARD: BOOKINGS OVERVIEW
========================================= */

app.get("/api/admin/bookings-overview", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                COUNT(*) AS totalBookings,
                SUM(status = 'Completed') AS completedBookings,
                SUM(status = 'Pending') AS pendingBookings,
                SUM(status = 'Cancelled') AS cancelledBookings,
                SUM(status = 'Assigned') AS assignedBookings,
                SUM(status = 'Accepted') AS acceptedBookings,
                SUM(status = 'In Progress') AS inProgressBookings
            FROM bookings
        `);

        res.json({
            success: true,
            overview: rows[0]
        });
    } catch (error) {
        console.error("Bookings overview API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load bookings overview."
        });
    }
});

const RESET_ACCOUNT_TABLES = {
    customer: "customers",
    technician: "technicians",
    admin: "admins"
};

// Request a password-reset email
app.post("/api/auth/forgot-password", async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = String(req.body.role || "").trim().toLowerCase();

    if (!["customer", "technician", "admin"].includes(role) ||
        !email || email.length > 254) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid email and account type."
        });
    }

    try {
        const table = RESET_ACCOUNT_TABLES[role];

        const [users] = await db.query(
            `SELECT id, email FROM ${table} WHERE LOWER(email) = ? LIMIT 1`,
            [email]
        );

        // Use the same response whether the account exists or not.
        const message =
            "If an account exists for that email, a reset link will be sent.";

        if (users.length === 0) {
            return res.json({ success: true, message });
        }

        const user = users[0];

        // Allow at most one reset email per account per minute.
        const [recent] = await db.query(
            `SELECT id FROM password_reset_tokens
             WHERE role = ? AND user_id = ?
             AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
             LIMIT 1`,
            [role, user.id]
        );

        if (recent.length > 0) {
            return res.json({ success: true, message });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        await db.query(
            `DELETE FROM password_reset_tokens
             WHERE role = ? AND user_id = ? AND used_at IS NULL`,
            [role, user.id]
        );

        await db.query(
            `INSERT INTO password_reset_tokens
             (role, user_id, token_hash, expires_at)
             VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
            [role, user.id, tokenHash]
        );

        const resetUrl = new URL(process.env.FRONTEND_RESET_URL);
        resetUrl.searchParams.set("token", token);
        resetUrl.searchParams.set("role", role);

        const response = await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
                method: "POST",
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json",
                    "accept": "application/json"
                },
                body: JSON.stringify({
                    sender: {
                        email: process.env.BREVO_SENDER_EMAIL,
                        name: "AC CARE"
                    },
                    to: [{ email: user.email }],
                    subject: "Reset your AC CARE password",
                    htmlContent: `
                        <div style="font-family:Arial,sans-serif">
                          <h2>AC CARE Password Reset</h2>
                          <p>We received a request to reset your password.</p>
                          <p>This link expires in 15 minutes and can only be
                          used once.</p>
                          <p><a href="${resetUrl.toString()}"
                             style="background:#1769e0;color:white;
                             padding:12px 20px;text-decoration:none;
                             border-radius:5px">Reset Password</a></p>
                          <p>If you did not request this, ignore this email.</p>
                        </div>`
                })
            }
        );

        if (!response.ok) {
            await db.query(
                `DELETE FROM password_reset_tokens WHERE token_hash = ?`,
                [tokenHash]
            );
            console.error("Brevo email request failed:", response.status);
            return res.status(502).json({
                success: false,
                message: "Unable to send the reset email right now."
            });
        }

        return res.json({ success: true, message });
    } catch (error) {
        console.error("Forgot-password error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to process the request right now."
        });
    }
});

// Complete a password reset
app.post("/api/auth/reset-password", async (req, res) => {
    const role = String(req.body.role || "").trim().toLowerCase();
    const token = String(req.body.token || "");
    const newPassword = String(req.body.newPassword || "");

    if (!["customer", "technician", "admin"].includes(role) ||
        !/^[a-f0-9]{64}$/i.test(token) ||
        newPassword.length < 8 || newPassword.length > 128) {
        return res.status(400).json({
            success: false,
            message: "Invalid reset details. Passwords must be at least 8 characters."
        });
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [tokens] = await connection.query(
            `SELECT id, user_id FROM password_reset_tokens
             WHERE role = ? AND token_hash = ?
             AND used_at IS NULL AND expires_at > NOW()
             LIMIT 1 FOR UPDATE`,
            [role, tokenHash]
        );

        if (tokens.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid, expired, or already used."
            });
        }

        const reset = tokens[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const table = RESET_ACCOUNT_TABLES[role];

        const [updateResult] = await connection.query(
            `UPDATE ${table} SET password = ? WHERE id = ?`,
            [hashedPassword, reset.user_id]
        );

        if (updateResult.affectedRows !== 1) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "The account could not be updated."
            });
        }

        await connection.query(
            `UPDATE password_reset_tokens
             SET used_at = NOW()
             WHERE role = ? AND user_id = ? AND used_at IS NULL`,
            [role, reset.user_id]
        );

        await connection.commit();

        return res.json({
            success: true,
            message: "Password reset successfully. You can now log in."
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Reset-password error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to reset the password right now."
        });
    } finally {
        if (connection) connection.release();
    }
});


// ================= START SERVER =================


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`AC CARE Server running on http://localhost:${PORT}`);
});

