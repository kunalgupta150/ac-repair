require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const Admin = require("./models/Admin");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetAdminPassword() {
    try {
        const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ac_care";
        await mongoose.connect(uri);

        let admin = await Admin.findOne({ email: "admin@accare.com" });

        const password = await new Promise(resolve => {
            rl.question("Enter a NEW admin password: ", resolve);
        });

        if (password.length < 8) {
            console.log("Password must be at least 8 characters.");
            return;
        }

        const hash = await bcrypt.hash(password, 10);

        if (!admin) {
            admin = await Admin.create({
                name: "AC Care Admin",
                email: "admin@accare.com",
                password: hash,
                phone: "9876543210",
                role: "admin"
            });
            console.log("Admin account created successfully!");
        } else {
            admin.password = hash;
            await admin.save();
            console.log("Admin password updated successfully!");
        }

        const matches = await bcrypt.compare(password, admin.password);
        console.log("Password verification:", matches ? "SUCCESS" : "FAILED");

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        rl.close();
        await mongoose.disconnect();
    }
}

resetAdminPassword();