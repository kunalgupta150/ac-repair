require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const Admin = require("./models/Admin");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function verifyAdmin() {
    try {
        const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ac_care";
        await mongoose.connect(uri);

        const admin = await Admin.findOne({ email: "admin@accare.com" });

        if (!admin) {
            console.log("Admin account was not found.");
            return;
        }

        console.log("Admin account found.");

        rl.question("Enter your original admin password: ", async (password) => {
            try {
                const matches = await bcrypt.compare(password, admin.password);
                console.log(matches ? "PASSWORD MATCHES the database hash." : "PASSWORD DOES NOT MATCH the database hash.");
            } catch (error) {
                console.error("Verification failed:", error.message);
            } finally {
                rl.close();
                await mongoose.disconnect();
            }
        });

    } catch (error) {
        console.error("Database check failed:", error.message);
        rl.close();
        await mongoose.disconnect();
    }
}

verifyAdmin();