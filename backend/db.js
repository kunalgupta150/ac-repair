const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("./models/Admin");
const Service = require("./models/Service");

const DEFAULT_SERVICES = [
    { service_name: "AC Repair", name: "AC Repair", price: 499, category: "Repair", description: "Diagnosis and repair of AC malfunctions." },
    { service_name: "AC General Service", name: "AC General Service", price: 399, category: "Servicing", description: "Complete cleaning and general servicing." },
    { service_name: "AC Installation", name: "AC Installation", price: 999, category: "Installation", description: "Professional installation for split or window AC." },
    { service_name: "AC Gas Refill", name: "AC Gas Refill", price: 1499, category: "Gas Refill", description: "Refrigerant top-up and leak detection." },
    { service_name: "AC Cleaning", name: "AC Cleaning", price: 449, category: "Cleaning", description: "Deep foam cleaning for filters and coils." },
    { service_name: "Water Leakage Repair", name: "Water Leakage Repair", price: 349, category: "Repair", description: "Fix drainage blockages and water leaks." }
];

async function connectDB() {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ac_care";

    try {
        await mongoose.connect(uri);
        console.log("✅ MongoDB connected successfully to:", uri.replace(/\/\/.*@/, "//***:***@"));

        // Seed default Admin if not exists
        const adminExists = await Admin.findOne({ email: "admin@accare.com" });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash("ACCare@2026", 10);
            await Admin.create({
                name: "AC Care Admin",
                email: "admin@accare.com",
                password: hashedPassword,
                phone: "9876543210",
                role: "admin"
            });
            console.log("🌱 Default admin created: admin@accare.com (Password: ACCare@2026)");
        }

        // Seed default services if not exists
        for (const item of DEFAULT_SERVICES) {
            const exists = await Service.findOne({ service_name: item.service_name });
            if (!exists) {
                await Service.create(item);
            }
        }
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        throw error;
    }
}

module.exports = { connectDB };
