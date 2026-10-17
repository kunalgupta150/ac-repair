// =====================================================
// AC CARE - BACKEND SERVER (MONGODB / MONGOOSE VERSION)
// =====================================================

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();

const { connectDB } = require("./db");
const Admin = require("./models/Admin");
const Customer = require("./models/Customer");
const Technician = require("./models/Technician");
const Service = require("./models/Service");
const Booking = require("./models/Booking");
const Payment = require("./models/Payment");
const Review = require("./models/Review");
const Notification = require("./models/Notification");
const PasswordResetToken = require("./models/PasswordResetToken");

// =====================================================
// HELPER FUNCTIONS
// =====================================================

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

// Safely resolve an ID (handles MongoDB ObjectId or booking_id string)
function toObjectId(id) {
    if (!id) return null;
    if (mongoose.isValidObjectId(id)) {
        return new mongoose.Types.ObjectId(String(id));
    }
    return null;
}

// =====================================================
// BREVO SERVICE TEST
// =====================================================

(async () => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.log("ℹ️ Brevo API key not configured.");
            return;
        }
        const response = await fetch("https://api.brevo.com/v3/account", {
            method: "GET",
            headers: {
                "api-key": process.env.BREVO_API_KEY,
                "accept": "application/json"
            }
        });
        if (response.ok) {
            console.log("✅ Brevo authentication successful!");
        } else {
            const data = await response.json().catch(() => ({}));
            console.log("Brevo test status:", response.status, data.message || "");
        }
    } catch (error) {
        console.log("Brevo test skipped:", error.message);
    }
})();

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// HOME & TEST ROUTES
// =====================================================

app.get("/", (req, res) => {
    res.json({ message: "AC CARE Backend is running successfully with MongoDB!" });
});

app.get("/api/test-db", (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    res.json({
        success: isConnected,
        message: isConnected ? "MongoDB connected successfully!" : "MongoDB connection pending"
    });
});

app.get("/api/test-customers", (req, res) => {
    res.json({ success: true, message: "Customers route is working" });
});

// =====================================================
// DASHBOARD STATISTICS API (ADMIN)
// =====================================================

app.get("/api/dashboard/stats", async (req, res) => {
    try {
        const [
            totalCustomers,
            totalTechnicians,
            totalServices,
            totalBookings,
            pendingBookings,
            completedBookings,
            revenueAggregation
        ] = await Promise.all([
            Customer.countDocuments(),
            Technician.countDocuments(),
            Service.countDocuments({ status: "Active" }),
            Booking.countDocuments(),
            Booking.countDocuments({ status: "Pending" }),
            Booking.countDocuments({ status: "Completed" }),
            Payment.aggregate([
                { $match: { payment_status: "Paid" } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
        ]);

        const totalRevenue = revenueAggregation[0]?.total || 0;

        res.json({
            success: true,
            data: {
                totalCustomers,
                totalTechnicians,
                totalServices,
                totalBookings,
                pendingBookings,
                completedBookings,
                totalRevenue
            }
        });
    } catch (error) {
        console.error("Dashboard API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load dashboard statistics",
            error: error.message
        });
    }
});

// =====================================================
// CUSTOMER REGISTRATION & LOGIN
// =====================================================

app.post("/api/customers/register", async (req, res) => {
    try {
        const { full_name, phone, email, address, password } = req.body;

        if (!full_name || !phone || !email || !address || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingCustomer = await Customer.findOne({ email: normalizedEmail });
        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Email already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newCustomer = await Customer.create({
            full_name: full_name.trim(),
            phone: phone.trim(),
            email: normalizedEmail,
            address: address.trim(),
            password: hashedPassword
        });

        res.status(201).json({
            success: true,
            message: "Customer registered successfully.",
            customerId: newCustomer._id
        });
    } catch (error) {
        console.error("Customer registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed.",
            error: error.message
        });
    }
});

app.post("/api/customers/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });
        }

        const customer = await Customer.findOne({ email: email.trim().toLowerCase() });
        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(password, customer.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        res.json({
            success: true,
            message: "Login successful.",
            customer: {
                id: customer._id,
                full_name: customer.full_name,
                phone: customer.phone,
                email: customer.email,
                address: customer.address
            }
        });
    } catch (error) {
        console.error("Customer login error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed.",
            error: error.message
        });
    }
});

// =====================================================
// ADMIN LOGIN
// =====================================================

app.post("/api/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });
        }

        const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin email or password."
            });
        }

        res.json({
            success: true,
            message: "Admin login successful.",
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email
            }
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({
            success: false,
            message: "Admin login failed."
        });
    }
});

// =====================================================
// CUSTOMER DASHBOARD
// =====================================================

app.get("/api/customer/dashboard/:customerId", async (req, res) => {
    try {
        const cId = toObjectId(req.params.customerId);
        if (!cId) {
            return res.status(400).json({ success: false, message: "Invalid customer ID." });
        }

        const [totalBookings, pendingBookings, completedBookings, customerBookings] = await Promise.all([
            Booking.countDocuments({ customer_id: cId }),
            Booking.countDocuments({ customer_id: cId, status: "Pending" }),
            Booking.countDocuments({ customer_id: cId, status: "Completed" }),
            Booking.find({ customer_id: cId }).select("_id")
        ]);

        const bookingIds = customerBookings.map(b => b._id);
        const spentAggregation = await Payment.aggregate([
            { $match: { booking_id: { $in: bookingIds }, payment_status: "Paid" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const totalSpent = spentAggregation[0]?.total || 0;

        res.json({
            success: true,
            data: {
                totalBookings,
                pendingBookings,
                completedBookings,
                totalSpent
            }
        });
    } catch (error) {
        console.error("Customer dashboard API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load customer dashboard.",
            error: error.message
        });
    }
});

// =====================================================
// BOOKINGS APIs
// =====================================================

// Create a new booking
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

        if (!customer_id || !ac_type || !service_name || !address || !preferred_date || !preferred_time) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required booking fields."
            });
        }

        const cId = toObjectId(customer_id);
        const customer = await Customer.findById(cId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        // Match service by name
        let service = await Service.findOne({
            $or: [{ service_name: service_name }, { name: service_name }],
            status: "Active"
        });

        if (!service) {
            // Auto-create service if not found
            service = await Service.create({
                service_name: service_name,
                name: service_name,
                price: 499,
                status: "Active"
            });
        }

        const bookingId = "AC" + Math.floor(10000 + Math.random() * 90000);

        const newBooking = await Booking.create({
            booking_id: bookingId,
            customer_id: customer._id,
            service_id: service._id,
            ac_type,
            address,
            preferred_date,
            preferred_time,
            problem_description: problem_description || "",
            status: "Pending",
            total_amount: service.price
        });

        // Trigger notification
        try {
            await Notification.create({
                title: "New Booking Received",
                message: `A new AC service booking (${bookingId}) has been received.`,
                type: "booking",
                related_booking_id: bookingId,
                is_read: false
            });
        } catch (notifErr) {
            console.error("Notification creation warning:", notifErr.message);
        }

        res.status(201).json({
            success: true,
            message: "Booking created successfully.",
            booking: {
                id: newBooking._id,
                booking_id: bookingId,
                service_name: service.service_name,
                preferred_date,
                preferred_time,
                status: "Pending",
                total_amount: service.price
            }
        });
    } catch (error) {
        console.error("Booking creation error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create booking.",
            error: error.message
        });
    }
});

// Get customer bookings
app.get("/api/bookings/customer/:customerId", async (req, res) => {
    try {
        const cId = toObjectId(req.params.customerId);
        if (!cId) {
            return res.status(400).json({ success: false, message: "Invalid customer ID." });
        }

        const bookings = await Booking.find({ customer_id: cId })
            .populate("service_id", "service_name name price")
            .populate("technician_id", "full_name phone")
            .sort({ created_at: -1 });

        const formatted = bookings.map(b => ({
            id: b._id,
            booking_id: b.booking_id,
            customer_id: b.customer_id,
            service_name: b.service_id?.service_name || b.service_id?.name || "AC Service",
            ac_type: b.ac_type,
            address: b.address,
            preferred_date: b.preferred_date,
            preferred_time: b.preferred_time,
            problem_description: b.problem_description,
            status: b.status,
            total_amount: b.total_amount,
            technician_name: b.technician_id?.full_name || "Not Assigned",
            created_at: b.created_at
        }));

        res.json({
            success: true,
            bookings: formatted
        });
    } catch (error) {
        console.error("Fetch customer bookings error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load bookings.",
            error: error.message
        });
    }
});

// Admin: Recent bookings (last 10)
app.get("/api/admin/recent-bookings", async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("customer_id", "full_name phone email")
            .populate("service_id", "service_name name")
            .populate("technician_id", "full_name")
            .sort({ created_at: -1 })
            .limit(10);

        const bookingIds = bookings.map(b => b._id);
        const payments = await Payment.find({ booking_id: { $in: bookingIds } });
        const paymentMap = new Map(payments.map(p => [String(p.booking_id), p.payment_status]));

        const formatted = bookings.map(b => ({
            booking_id: b.booking_id,
            customer_name: b.customer_id?.full_name || "Unknown",
            service_name: b.service_id?.service_name || b.service_id?.name || "AC Service",
            technician_name: b.technician_id?.full_name || "Not Assigned",
            preferred_date: b.preferred_date,
            status: b.status,
            total_amount: b.total_amount,
            payment_status: paymentMap.get(String(b._id)) || "Pending"
        }));

        res.json({
            success: true,
            bookings: formatted
        });
    } catch (error) {
        console.error("Admin recent bookings error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load recent bookings.",
            error: error.message
        });
    }
});

// Admin: All bookings
app.get("/api/admin/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate("customer_id", "full_name phone email")
            .populate("service_id", "service_name name")
            .populate("technician_id", "full_name")
            .sort({ created_at: -1 });

        const formatted = bookings.map(b => ({
            id: b._id,
            booking_id: b.booking_id,
            customer_name: b.customer_id?.full_name || "Unknown",
            customer_phone: b.customer_id?.phone || "",
            customer_email: b.customer_id?.email || "",
            service_name: b.service_id?.service_name || b.service_id?.name || "AC Service",
            technician_name: b.technician_id?.full_name || "Not Assigned",
            ac_type: b.ac_type,
            address: b.address,
            preferred_date: b.preferred_date,
            preferred_time: b.preferred_time,
            problem_description: b.problem_description,
            status: b.status,
            total_amount: b.total_amount,
            created_at: b.created_at
        }));

        res.json({
            success: true,
            data: formatted
        });
    } catch (error) {
        console.error("Admin bookings API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load admin bookings.",
            error: error.message
        });
    }
});

// Admin: Assign technician
app.put("/api/admin/bookings/:id/assign", async (req, res) => {
    try {
        const { technician_id } = req.body;
        if (!technician_id) {
            return res.status(400).json({ success: false, message: "Technician is required." });
        }

        const bQuery = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { booking_id: req.params.id };
        const booking = await Booking.findOne(bQuery);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const technician = await Technician.findById(technician_id);
        if (!technician) {
            return res.status(404).json({ success: false, message: "Technician not found." });
        }

        booking.technician_id = technician._id;
        booking.status = "Assigned";
        await booking.save();

        res.json({
            success: true,
            message: "Technician assigned successfully.",
            bookingId: booking.booking_id,
            technician: technician.full_name
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

// Admin: Edit booking preferred date/time
app.put("/api/admin/bookings/:id", async (req, res) => {
    try {
        const { preferred_date, preferred_time } = req.body;
        if (!preferred_date || !preferred_time) {
            return res.status(400).json({ success: false, message: "Date and time are required." });
        }

        const bQuery = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { booking_id: req.params.id };
        const booking = await Booking.findOne(bQuery);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        booking.preferred_date = preferred_date;
        booking.preferred_time = preferred_time;
        await booking.save();

        res.json({
            success: true,
            message: "Booking date and time saved.",
            booking: {
                id: booking._id,
                booking_id: booking.booking_id,
                preferred_date: booking.preferred_date,
                preferred_time: booking.preferred_time
            }
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

// Technician: Update booking status
app.put("/api/technicians/bookings/:id/status", async (req, res) => {
    try {
        const { status, technician_id } = req.body;
        const allowedStatuses = ["Accepted", "In Progress", "Completed"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid booking status." });
        }
        if (!technician_id) {
            return res.status(400).json({ success: false, message: "Technician ID is required." });
        }

        const bQuery = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { booking_id: req.params.id };
        const booking = await Booking.findOne(bQuery);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        if (String(booking.technician_id) !== String(technician_id)) {
            return res.status(403).json({
                success: false,
                message: "This booking is not assigned to this technician."
            });
        }

        if (status === "Accepted" && booking.status !== "Assigned") {
            return res.status(400).json({ success: false, message: "Only an assigned job can be accepted." });
        }
        if (status === "In Progress" && booking.status !== "Accepted") {
            return res.status(400).json({ success: false, message: "Job must be accepted before starting." });
        }
        if (status === "Completed" && booking.status !== "In Progress") {
            return res.status(400).json({ success: false, message: "Job must be in progress before completing." });
        }

        booking.status = status;
        await booking.save();

        res.json({
            success: true,
            message: "Booking status updated successfully.",
            bookingId: booking.booking_id,
            status: booking.status
        });
    } catch (error) {
        console.error("Technician status update error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking status.",
            error: error.message
        });
    }
});

// Admin: Today's jobs
app.get("/api/admin/todays-jobs", async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split("T")[0];
        const jobs = await Booking.find({
            preferred_date: todayStr,
            status: { $nin: ["Completed", "Cancelled"] }
        })
            .populate("customer_id", "full_name")
            .populate("service_id", "service_name name")
            .populate("technician_id", "full_name")
            .sort({ preferred_time: 1 });

        const formatted = jobs.map(b => ({
            id: b._id,
            booking_id: b.booking_id,
            customer_name: b.customer_id?.full_name || "Unknown",
            service_name: b.service_id?.service_name || b.service_id?.name || "AC Service",
            technician_name: b.technician_id?.full_name || "Not Assigned",
            address: b.address,
            preferred_date: b.preferred_date,
            preferred_time: b.preferred_time,
            status: b.status
        }));

        res.json({ success: true, jobs: formatted });
    } catch (error) {
        console.error("Today's jobs API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load today's jobs",
            error: error.message
        });
    }
});

// Admin: Bookings overview
app.get("/api/admin/bookings-overview", async (req, res) => {
    try {
        const [
            totalBookings,
            completedBookings,
            pendingBookings,
            cancelledBookings,
            assignedBookings,
            acceptedBookings,
            inProgressBookings
        ] = await Promise.all([
            Booking.countDocuments(),
            Booking.countDocuments({ status: "Completed" }),
            Booking.countDocuments({ status: "Pending" }),
            Booking.countDocuments({ status: "Cancelled" }),
            Booking.countDocuments({ status: "Assigned" }),
            Booking.countDocuments({ status: "Accepted" }),
            Booking.countDocuments({ status: "In Progress" })
        ]);

        res.json({
            success: true,
            overview: {
                totalBookings,
                completedBookings,
                pendingBookings,
                cancelledBookings,
                assignedBookings,
                acceptedBookings,
                inProgressBookings
            }
        });
    } catch (error) {
        console.error("Bookings overview API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load bookings overview."
        });
    }
});

// =====================================================
// CUSTOMERS MANAGEMENT (ADMIN)
// =====================================================

app.get("/api/admin/customers", async (req, res) => {
    try {
        const customers = await Customer.find().sort({ created_at: -1 });
        const customerIds = customers.map(c => c._id);

        const bookingAgg = await Booking.aggregate([
            { $match: { customer_id: { $in: customerIds } } },
            {
                $group: {
                    _id: "$customer_id",
                    total_bookings: { $sum: 1 },
                    last_service: { $max: "$preferred_date" }
                }
            }
        ]);

        const aggMap = new Map(bookingAgg.map(a => [String(a._id), a]));

        const formatted = customers.map(c => {
            const agg = aggMap.get(String(c._id)) || { total_bookings: 0, last_service: null };
            return {
                id: c._id,
                full_name: c.full_name,
                phone: c.phone,
                email: c.email,
                address: c.address,
                created_at: c.created_at,
                total_bookings: agg.total_bookings,
                last_service: agg.last_service
            };
        });

        res.json({ success: true, customers: formatted });
    } catch (error) {
        console.error("Admin customers error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load customers.",
            error: error.message
        });
    }
});

app.get("/api/admin/customers/:id", async (req, res) => {
    try {
        const cId = toObjectId(req.params.id);
        const customer = await Customer.findById(cId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found." });
        }

        const bookings = await Booking.find({ customer_id: cId })
            .populate("service_id", "service_name name")
            .populate("technician_id", "full_name")
            .sort({ created_at: -1 });

        const formattedBookings = bookings.map(b => ({
            booking_id: b.booking_id,
            service_name: b.service_id?.service_name || b.service_id?.name || "AC Service",
            technician_name: b.technician_id?.full_name || "Not Assigned",
            ac_type: b.ac_type,
            preferred_date: b.preferred_date,
            preferred_time: b.preferred_time,
            status: b.status,
            total_amount: b.total_amount
        }));

        res.json({
            success: true,
            customer: {
                id: customer._id,
                full_name: customer.full_name,
                phone: customer.phone,
                email: customer.email,
                address: customer.address,
                created_at: customer.created_at
            },
            bookings: formattedBookings
        });
    } catch (error) {
        console.error("Customer details API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load customer details.",
            error: error.message
        });
    }
});

// =====================================================
// TECHNICIANS MANAGEMENT
// =====================================================

app.post("/api/technicians/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const technician = await Technician.findOne({ email: email.trim().toLowerCase() });
        if (!technician) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(password, technician.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const techObj = technician.toObject();
        delete techObj.password;

        res.json({
            success: true,
            message: "Technician login successful.",
            technician: {
                id: technician._id,
                ...techObj
            }
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

app.get("/api/technicians", async (req, res) => {
    try {
        const technicians = await Technician.find().sort({ created_at: -1 });
        const techIds = technicians.map(t => t._id);

        const [bookingCounts, reviewAgg] = await Promise.all([
            Booking.aggregate([
                { $match: { technician_id: { $in: techIds } } },
                { $group: { _id: "$technician_id", count: { $sum: 1 } } }
            ]),
            Review.aggregate([
                { $match: { technician_id: { $in: techIds } } },
                { $group: { _id: "$technician_id", avgRating: { $avg: "$rating" } } }
            ])
        ]);

        const countMap = new Map(bookingCounts.map(b => [String(b._id), b.count]));
        const ratingMap = new Map(reviewAgg.map(r => [String(r._id), Math.round(r.avgRating * 10) / 10]));

        const formatted = technicians.map(t => ({
            id: t._id,
            full_name: t.full_name,
            phone: t.phone,
            email: t.email,
            specialization: t.specialization,
            experience: t.experience,
            status: t.status,
            created_at: t.created_at,
            assigned_jobs: countMap.get(String(t._id)) || 0,
            rating: ratingMap.get(String(t._id)) || 5.0
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error("Technicians API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load technicians.",
            error: error.message
        });
    }
});

app.put("/api/technicians/update-passwords", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash("123456", 10);
        const result = await Technician.updateMany({}, { $set: { password: hashedPassword } });

        res.json({
            success: true,
            message: "All technician passwords updated successfully.",
            updated: result.modifiedCount
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

app.get("/api/technicians/:id", async (req, res) => {
    try {
        const tId = toObjectId(req.params.id);
        const technician = await Technician.findById(tId);
        if (!technician) {
            return res.status(404).json({ success: false, message: "Technician not found." });
        }

        const [assigned_jobs, reviewAgg] = await Promise.all([
            Booking.countDocuments({ technician_id: tId }),
            Review.aggregate([
                { $match: { technician_id: tId } },
                { $group: { _id: null, avgRating: { $avg: "$rating" } } }
            ])
        ]);

        res.json({
            success: true,
            technician: {
                id: technician._id,
                full_name: technician.full_name,
                phone: technician.phone,
                email: technician.email,
                specialization: technician.specialization,
                experience: technician.experience,
                status: technician.status,
                created_at: technician.created_at,
                assigned_jobs,
                rating: reviewAgg[0] ? Math.round(reviewAgg[0].avgRating * 10) / 10 : 5.0
            }
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

app.put("/api/technicians/:id", async (req, res) => {
    try {
        const tId = toObjectId(req.params.id);
        const { full_name, phone, email, specialization, experience } = req.body;

        if (!full_name?.trim() || !phone?.trim() || !email?.trim() || !specialization?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, email and specialization are required."
            });
        }

        const updated = await Technician.findByIdAndUpdate(
            tId,
            {
                full_name: full_name.trim(),
                phone: phone.trim(),
                email: email.trim().toLowerCase(),
                specialization: specialization.trim(),
                experience: Math.max(0, Number(experience) || 0)
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Technician not found." });
        }

        res.json({
            success: true,
            message: "Technician updated successfully.",
            technician: {
                id: updated._id,
                full_name: updated.full_name,
                phone: updated.phone,
                email: updated.email,
                specialization: updated.specialization,
                experience: updated.experience,
                status: updated.status
            }
        });
    } catch (error) {
        console.error("Update technician API error:", error);
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "This email is already registered." });
        }
        res.status(500).json({
            success: false,
            message: "Failed to update technician.",
            error: error.message
        });
    }
});

app.post("/api/technicians", async (req, res) => {
    try {
        const { full_name, phone, email, specialization, experience, status, password } = req.body;

        if (!full_name || !phone || !email || !specialization) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, email and specialization are required."
            });
        }

        const allowedStatuses = ["Available", "Busy", "Inactive"];
        const technicianStatus = status || "Available";

        if (!allowedStatuses.includes(technicianStatus)) {
            return res.status(400).json({ success: false, message: "Invalid technician status." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await Technician.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(409).json({ success: false, message: "This email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password || "123456", 10);
        const newTech = await Technician.create({
            full_name: full_name.trim(),
            phone: phone.trim(),
            email: normalizedEmail,
            specialization: specialization.trim(),
            experience: Number(experience) || 0,
            status: technicianStatus,
            password: hashedPassword
        });

        res.status(201).json({
            success: true,
            message: "Technician added successfully.",
            technicianId: newTech._id
        });
    } catch (error) {
        console.error("Add technician API error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add technician.",
            error: error.message
        });
    }
});

// Technician: Dashboard
app.get("/api/technicians/:id/dashboard", async (req, res) => {
    try {
        const tId = toObjectId(req.params.id);
        const technician = await Technician.findById(tId);
        if (!technician) {
            return res.status(404).json({ success: false, message: "Technician not found." });
        }

        const rawBookings = await Booking.find({ technician_id: tId })
            .populate("customer_id", "full_name phone email")
            .populate("service_id", "service_name name")
            .sort({ created_at: -1 });

        const bookings = rawBookings.map(b => ({
            id: b._id,
            booking_id: b.booking_id,
            customer_name: b.customer_id?.full_name || "Unknown",
            customer_phone: b.customer_id?.phone || "",
            customer_email: b.customer_id?.email || "",
            address: b.address,
            service_name: b.service_id?.service_name || b.service_id?.name || "AC Service",
            ac_type: b.ac_type,
            preferred_date: b.preferred_date,
            preferred_time: b.preferred_time,
            problem_description: b.problem_description,
            status: b.status,
            total_amount: b.total_amount,
            created_at: b.created_at
        }));

        const totalJobs = bookings.length;
        const pendingJobs = bookings.filter(b => b.status === "Assigned" || b.status === "Pending").length;
        const inProgressJobs = bookings.filter(b => b.status === "In Progress").length;
        const completedJobs = bookings.filter(b => b.status === "Completed").length;

        const totalEarnings = bookings
            .filter(b => b.status === "Completed")
            .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

        const today = new Date().toISOString().split("T")[0];
        const todayEarnings = bookings
            .filter(b => b.status === "Completed" && String(b.preferred_date).substring(0, 10) === today)
            .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

        const reviewAgg = await Review.aggregate([
            { $match: { technician_id: tId } },
            { $group: { _id: null, avgRating: { $avg: "$rating" } } }
        ]);

        const customerRating = reviewAgg[0] ? Math.round(reviewAgg[0].avgRating * 10) / 10 : 5.0;
        const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

        res.json({
            success: true,
            technician: {
                id: technician._id,
                full_name: technician.full_name,
                phone: technician.phone,
                email: technician.email,
                specialization: technician.specialization,
                experience: technician.experience,
                status: technician.status
            },
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
        console.error("Technician dashboard error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load technician dashboard.",
            error: error.message
        });
    }
});

// Technician: Customers served
app.get("/api/technicians/:id/customers", async (req, res) => {
    try {
        const tId = toObjectId(req.params.id);
        const bookings = await Booking.find({ technician_id: tId })
            .populate("customer_id")
            .sort({ preferred_date: -1 });

        const customerMap = new Map();
        for (const b of bookings) {
            const cust = b.customer_id;
            if (!cust) continue;
            const cidStr = String(cust._id);
            if (!customerMap.has(cidStr)) {
                customerMap.set(cidStr, {
                    id: cust._id,
                    full_name: cust.full_name,
                    phone: cust.phone,
                    email: cust.email,
                    address: cust.address,
                    total_bookings: 0,
                    completed_bookings: 0,
                    last_service: b.preferred_date
                });
            }
            const data = customerMap.get(cidStr);
            data.total_bookings += 1;
            if (b.status === "Completed") data.completed_bookings += 1;
        }

        res.json({ success: true, customers: Array.from(customerMap.values()) });
    } catch (error) {
        console.error("Technician customers error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load technician customers.",
            error: error.message
        });
    }
});

// Technician: Earnings
app.get("/api/technicians/:id/earnings", async (req, res) => {
    try {
        const tId = toObjectId(req.params.id);
        const completedBookings = await Booking.find({
            technician_id: tId,
            status: "Completed"
        })
            .populate("customer_id", "full_name")
            .populate("service_id", "service_name name")
            .sort({ preferred_date: -1 });

        const today = new Date().toISOString().split("T")[0];
        let total_earnings = 0;
        let today_earnings = 0;

        const earnings = completedBookings.map(b => {
            const amt = Number(b.total_amount) || 0;
            total_earnings += amt;
            if (String(b.preferred_date).substring(0, 10) === today) {
                today_earnings += amt;
            }
            return {
                booking_id: b.booking_id,
                customer_name: b.customer_id?.full_name || "Unknown",
                service_name: b.service_id?.service_name || b.service_id?.name || "AC Service",
                preferred_date: b.preferred_date,
                total_amount: amt,
                status: b.status
            };
        });

        res.json({
            success: true,
            summary: {
                completed_jobs: completedBookings.length,
                total_earnings,
                today_earnings
            },
            earnings
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

// Technician: Reviews
app.get("/api/technicians/:id/reviews", async (req, res) => {
    try {
        const tId = toObjectId(req.params.id);
        const reviews = await Review.find({ technician_id: tId })
            .populate("customer_id", "full_name")
            .populate("booking_id", "booking_id")
            .sort({ created_at: -1 });

        let totalScore = 0;
        const formatted = reviews.map(r => {
            totalScore += r.rating;
            return {
                id: r._id,
                rating: r.rating,
                comment: r.comment,
                created_at: r.created_at,
                customer_name: r.customer_id?.full_name || "Anonymous",
                booking_id: r.booking_id?.booking_id || "AC00000",
                service_name: "AC Service"
            };
        });

        const total_reviews = reviews.length;
        const average_rating = total_reviews > 0 ? Math.round((totalScore / total_reviews) * 10) / 10 : 0;

        res.json({
            success: true,
            summary: { average_rating, total_reviews },
            reviews: formatted
        });
    } catch (error) {
        console.error("Technician reviews error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load technician reviews.",
            error: error.message
        });
    }
});

// =====================================================
// ADMIN: REPORTS & REVIEWS
// =====================================================

app.get("/api/admin/reports", async (req, res) => {
    try {
        const [
            totalBookings,
            pendingBookings,
            assignedBookings,
            acceptedBookings,
            inProgressBookings,
            completedBookings,
            cancelledBookings,
            allPayments
        ] = await Promise.all([
            Booking.countDocuments(),
            Booking.countDocuments({ status: "Pending" }),
            Booking.countDocuments({ status: "Assigned" }),
            Booking.countDocuments({ status: "Accepted" }),
            Booking.countDocuments({ status: "In Progress" }),
            Booking.countDocuments({ status: "Completed" }),
            Booking.countDocuments({ status: "Cancelled" }),
            Payment.find()
        ]);

        let totalRevenue = 0;
        let pendingPayments = 0;
        let refundedAmount = 0;
        let technicianShare = 0;
        let technicianPayoutsRecorded = 0;
        let technicianPayoutsPending = 0;
        let ownerShare = 0;

        for (const p of allPayments) {
            if (p.payment_status === "Paid") {
                totalRevenue += p.amount;
                technicianShare += p.technician_share || 0;
                ownerShare += p.owner_share || 0;
                if (p.technician_payout_status === "Paid") {
                    technicianPayoutsRecorded += p.technician_share || 0;
                } else {
                    technicianPayoutsPending += p.technician_share || 0;
                }
            } else if (p.payment_status === "Pending") {
                pendingPayments += p.amount;
            } else if (p.payment_status === "Refunded") {
                refundedAmount += p.amount;
            }
        }

        res.json({
            success: true,
            bookings: {
                totalBookings,
                pendingBookings,
                assignedBookings,
                acceptedBookings,
                inProgressBookings,
                completedBookings,
                cancelledBookings
            },
            payments: {
                totalRevenue,
                pendingPayments,
                refundedAmount,
                technicianShare,
                technicianPayoutsRecorded,
                technicianPayoutsPending,
                ownerShare
            }
        });
    } catch (error) {
        console.error("Reports API error:", error);
        res.status(500).json({ success: false, message: "Failed to load reports." });
    }
});

app.get("/api/admin/reviews", async (req, res) => {
    try {
        const rawReviews = await Review.find()
            .populate("customer_id", "full_name phone")
            .populate("booking_id", "booking_id service_id")
            .populate("technician_id", "full_name")
            .sort({ created_at: -1 });

        let fiveStar = 0, fourStar = 0, threeStar = 0, twoStar = 0, oneStar = 0;
        let sumRating = 0;

        const reviews = rawReviews.map(r => {
            const rate = r.rating;
            sumRating += rate;
            if (rate === 5) fiveStar++;
            else if (rate === 4) fourStar++;
            else if (rate === 3) threeStar++;
            else if (rate === 2) twoStar++;
            else if (rate === 1) oneStar++;

            return {
                id: r._id,
                rating: r.rating,
                comment: r.comment,
                created_at: r.created_at,
                booking_reference: r.booking_id?.booking_id || "AC00000",
                customer_name: r.customer_id?.full_name || "Customer",
                customer_phone: r.customer_id?.phone || "",
                service_name: "AC Repair & Care",
                technician_name: r.technician_id?.full_name || "Technician"
            };
        });

        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 ? Math.round((sumRating / totalReviews) * 10) / 10 : 0;

        res.json({
            success: true,
            reviews,
            stats: {
                totalReviews,
                averageRating,
                fiveStarReviews: fiveStar,
                fourStarReviews: fourStar,
                threeStarReviews: threeStar,
                twoStarReviews: twoStar,
                oneStarReviews: oneStar
            }
        });
    } catch (error) {
        console.error("Reviews API error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get("/api/admin/reports/monthly-revenue", async (req, res) => {
    try {
        const sevenMonthsAgo = new Date();
        sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

        const rows = await Payment.aggregate([
            {
                $match: {
                    payment_status: "Paid",
                    payment_date: { $gte: sevenMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$payment_date" } },
                    revenue: { $sum: "$amount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyRevenue = rows.map(r => {
            const [year, month] = r._id.split("-");
            return {
                monthKey: r._id,
                monthLabel: months[parseInt(month, 10) - 1],
                revenue: r.revenue
            };
        });

        res.json({ success: true, monthlyRevenue });
    } catch (error) {
        console.error("Monthly revenue report error:", error);
        res.status(500).json({ success: false, message: "Failed to load monthly revenue." });
    }
});

// =====================================================
// NOTIFICATIONS APIs
// =====================================================

app.get("/api/admin/notifications", async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ created_at: -1 });
        const unreadCount = notifications.filter(n => !n.is_read).length;

        res.json({
            success: true,
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error("Load notifications error:", error);
        res.status(500).json({ success: false, message: "Failed to load notifications." });
    }
});

app.post("/api/admin/notifications", async (req, res) => {
    try {
        const { title, message, type, related_booking_id } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: "Title and message are required." });
        }

        const notif = await Notification.create({
            title: title.trim(),
            message: message.trim(),
            type: type || "general",
            related_booking_id: related_booking_id || null,
            is_read: false
        });

        res.status(201).json({
            success: true,
            message: "Notification created successfully.",
            id: notif._id
        });
    } catch (error) {
        console.error("Create notification error:", error);
        res.status(500).json({ success: false, message: "Failed to create notification." });
    }
});

app.put("/api/admin/notifications/:id/read", async (req, res) => {
    try {
        const nId = toObjectId(req.params.id);
        const updated = await Notification.findByIdAndUpdate(nId, { $set: { is_read: true } });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }
        res.json({ success: true, message: "Notification marked as read." });
    } catch (error) {
        console.error("Mark notification read error:", error);
        res.status(500).json({ success: false, message: "Failed to update notification." });
    }
});

app.delete("/api/admin/notifications/:id", async (req, res) => {
    try {
        const nId = toObjectId(req.params.id);
        const deleted = await Notification.findByIdAndDelete(nId);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }
        res.json({ success: true, message: "Notification deleted successfully." });
    } catch (error) {
        console.error("Delete notification error:", error);
        res.status(500).json({ success: false, message: "Failed to delete notification." });
    }
});

// =====================================================
// PAYMENTS APIs
// =====================================================

app.get("/api/admin/payments", async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate({
                path: "booking_id",
                populate: [
                    { path: "customer_id", select: "full_name" },
                    { path: "service_id", select: "service_name name" },
                    { path: "technician_id", select: "full_name" }
                ]
            })
            .sort({ created_at: -1 });

        const formatted = payments.map(p => {
            const b = p.booking_id;
            return {
                payment_id: p._id,
                database_booking_id: b?._id,
                booking_id: b?.booking_id || "AC00000",
                customer_name: b?.customer_id?.full_name || "Unknown",
                service_name: b?.service_id?.service_name || b?.service_id?.name || "AC Service",
                technician_name: b?.technician_id?.full_name || "Not Assigned",
                amount: p.amount,
                payment_method: p.payment_method,
                payment_status: p.payment_status,
                transaction_id: p.transaction_id,
                payment_date: p.payment_date,
                collected_by: p.collected_by,
                technician_share: p.technician_share,
                owner_share: p.owner_share,
                technician_payout_status: p.technician_payout_status,
                technician_payout_date: p.technician_payout_date,
                payout_reference: p.payout_reference
            };
        });

        res.json({ success: true, payments: formatted });
    } catch (error) {
        console.error("Load payments error:", error);
        res.status(500).json({ success: false, message: "Failed to load payments." });
    }
});

app.post("/api/payments", async (req, res) => {
    const { bookingId, paymentMethod } = req.body;
    const allowedMethods = ["Cash", "UPI", "Card", "Online"];

    if (!bookingId || !allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({
            success: false,
            message: "Valid booking ID and payment method are required."
        });
    }

    try {
        const bQuery = mongoose.isValidObjectId(bookingId) ? { _id: bookingId } : { booking_id: bookingId };
        const booking = await Booking.findOne(bQuery);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const split = calculatePaymentSplit(booking.total_amount);
        if (split.totalAmount <= 0) {
            return res.status(400).json({ success: false, message: "Booking amount must be greater than zero." });
        }

        const existing = await Payment.findOne({
            booking_id: booking._id,
            payment_status: "Pending"
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "A pending payment already exists for this booking."
            });
        }

        const payment = await Payment.create({
            booking_id: booking._id,
            amount: split.totalAmount,
            payment_method: paymentMethod,
            payment_status: "Pending",
            technician_share: split.technicianShare,
            owner_share: split.ownerShare,
            technician_payout_status: "Not Due"
        });

        res.status(201).json({
            success: true,
            message: paymentMethod === "Cash"
                ? "Cash payment recorded as pending."
                : "Payment created. Online payment requires gateway verification.",
            payment: {
                id: payment._id,
                bookingId: booking._id,
                amount: split.totalAmount,
                paymentMethod,
                paymentStatus: "Pending",
                technicianShare: split.technicianShare,
                ownerShare: split.ownerShare
            }
        });
    } catch (error) {
        console.error("Create payment error:", error);
        res.status(500).json({ success: false, message: "Failed to create payment." });
    }
});

app.put("/api/admin/payments/:id/confirm-cash", async (req, res) => {
    const { collectedBy } = req.body;
    if (!["Owner", "Admin"].includes(collectedBy)) {
        return res.status(400).json({ success: false, message: "collectedBy must be Owner or Admin." });
    }

    try {
        const pId = toObjectId(req.params.id);
        const payment = await Payment.findById(pId);
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found." });
        }

        if (payment.payment_method !== "Cash" || payment.payment_status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: "Only pending cash payments can be confirmed here."
            });
        }

        payment.payment_status = "Paid";
        payment.collected_by = collectedBy;
        await payment.save();

        res.json({ success: true, message: "Cash payment confirmed." });
    } catch (error) {
        console.error("Confirm cash error:", error);
        res.status(500).json({ success: false, message: "Failed to confirm cash payment." });
    }
});

app.put("/api/admin/payments/:id/payout", async (req, res) => {
    const { payoutReference } = req.body;

    try {
        const pId = toObjectId(req.params.id);
        const payment = await Payment.findById(pId);
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment not found." });
        }

        if (payment.payment_status !== "Paid") {
            return res.status(400).json({
                success: false,
                message: "Payment must be confirmed before technician payout."
            });
        }

        if (payment.technician_payout_status === "Paid") {
            return res.status(409).json({
                success: false,
                message: "Technician payout has already been recorded."
            });
        }

        payment.technician_payout_status = "Paid";
        payment.technician_payout_date = new Date();
        payment.payout_reference = payoutReference || null;
        await payment.save();

        res.json({ success: true, message: "Technician payout recorded." });
    } catch (error) {
        console.error("Technician payout error:", error);
        res.status(500).json({ success: false, message: "Failed to record technician payout." });
    }
});

app.post("/api/customer/payments/upi-reference", async (req, res) => {
    const { bookingId, customerId, transactionReference } = req.body;
    const reference = String(transactionReference || "").trim();

    if (!bookingId || !customerId || reference.length < 6 || reference.length > 100) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid booking details and transaction reference."
        });
    }

    try {
        const bQuery = mongoose.isValidObjectId(bookingId) ? { _id: bookingId } : { booking_id: bookingId };
        const booking = await Booking.findOne({
            ...bQuery,
            customer_id: customerId,
            status: "Completed"
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Completed booking not found for this customer."
            });
        }

        let payment = await Payment.findOne({
            booking_id: booking._id,
            payment_method: "UPI"
        }).sort({ created_at: -1 });

        if (payment) {
            if (payment.payment_status !== "Pending") {
                return res.status(409).json({
                    success: false,
                    message: "This payment is already processed. Contact the administrator if you need help."
                });
            }
            payment.transaction_id = reference;
            await payment.save();
        } else {
            const split = calculatePaymentSplit(booking.total_amount);
            payment = await Payment.create({
                booking_id: booking._id,
                amount: split.totalAmount,
                payment_method: "UPI",
                payment_status: "Pending",
                transaction_id: reference,
                technician_share: split.technicianShare,
                owner_share: split.ownerShare,
                technician_payout_status: "Not Due"
            });
        }

        res.status(201).json({
            success: true,
            message: "UPI reference submitted. Payment is awaiting administrator verification.",
            payment: {
                id: payment._id,
                bookingId: booking._id,
                paymentStatus: "Pending"
            }
        });
    } catch (error) {
        console.error("UPI reference submission error:", error);
        res.status(500).json({ success: false, message: "Could not submit the UPI reference." });
    }
});

// =====================================================
// AUTH: FORGOT & RESET PASSWORD
// =====================================================

const MODEL_ROLES = {
    customer: Customer,
    technician: Technician,
    admin: Admin
};

app.post("/api/auth/forgot-password", async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const role = String(req.body.role || "").trim().toLowerCase();

    if (!["customer", "technician", "admin"].includes(role) || !email || email.length > 254) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid email and account type."
        });
    }

    try {
        const Model = MODEL_ROLES[role];
        const user = await Model.findOne({ email });
        const message = "If an account exists for that email, a reset link will be sent.";

        if (!user) {
            return res.json({ success: true, message });
        }

        // Throttle 1 email per minute
        const oneMinAgo = new Date(Date.now() - 60 * 1000);
        const recent = await PasswordResetToken.findOne({
            role,
            user_id: user._id,
            created_at: { $gt: oneMinAgo }
        });
        if (recent) {
            return res.json({ success: true, message });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        await PasswordResetToken.deleteMany({ role, user_id: user._id, used_at: null });
        await PasswordResetToken.create({
            role,
            user_id: user._id,
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + 15 * 60 * 1000)
        });

        const resetUrl = new URL(process.env.FRONTEND_RESET_URL || "http://127.0.0.1:5500/reset-password.html");
        resetUrl.searchParams.set("token", token);
        resetUrl.searchParams.set("role", role);

        if (process.env.BREVO_API_KEY) {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json",
                    "accept": "application/json"
                },
                body: JSON.stringify({
                    sender: {
                        email: process.env.BREVO_SENDER_EMAIL || "kunalg8828@gmail.com",
                        name: "AC CARE"
                    },
                    to: [{ email: user.email }],
                    subject: "Reset your AC CARE password",
                    htmlContent: `
                        <div style="font-family:Arial,sans-serif">
                          <h2>AC CARE Password Reset</h2>
                          <p>We received a request to reset your password.</p>
                          <p>This link expires in 15 minutes and can only be used once.</p>
                          <p><a href="${resetUrl.toString()}"
                             style="background:#1769e0;color:white;
                             padding:12px 20px;text-decoration:none;
                             border-radius:5px">Reset Password</a></p>
                          <p>If you did not request this, ignore this email.</p>
                        </div>`
                })
            });

            if (!response.ok) {
                await PasswordResetToken.deleteOne({ token_hash: tokenHash });
                console.error("Brevo email request failed with status:", response.status);
                return res.status(502).json({
                    success: false,
                    message: "Unable to send the reset email right now."
                });
            }
        } else {
            console.log("ℹ️ Password Reset Link (Brevo disabled):", resetUrl.toString());
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error("Forgot-password error:", error.message);
        res.status(500).json({ success: false, message: "Unable to process the request right now." });
    }
});

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

    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const resetToken = await PasswordResetToken.findOne({
            role,
            token_hash: tokenHash,
            used_at: null,
            expires_at: { $gt: new Date() }
        });

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid, expired, or already used."
            });
        }

        const Model = MODEL_ROLES[role];
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Model.findByIdAndUpdate(resetToken.user_id, { password: hashedPassword });

        resetToken.used_at = new Date();
        await resetToken.save();

        res.json({
            success: true,
            message: "Password reset successfully. You can now log in."
        });
    } catch (error) {
        console.error("Reset-password error:", error.message);
        res.status(500).json({ success: false, message: "Unable to reset the password right now." });
    }
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 AC CARE Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Server startup failed due to database connection error:", err.message);
});
