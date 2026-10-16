
require("dotenv").config();

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetAdminPassword() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || "ac_care",
            port: Number(process.env.DB_PORT || 3306)
        });

        const [admins] = await connection.execute(
            "SELECT id FROM admins WHERE email = ?",
            ["admin@accare.com"]
        );

        if (admins.length === 0) {
            console.log("Admin account not found.");
            return;
        }

        const password = await new Promise(resolve => {
            rl.question("Enter a NEW admin password: ", resolve);
        });

        if (password.length < 12) {
            console.log("Password must be at least 12 characters.");
            return;
        }

        const hash = await bcrypt.hash(password, 10);

        const [result] = await connection.execute(
            "UPDATE admins SET password = ? WHERE email = ?",
            [hash, "admin@accare.com"]
        );

        const [rows] = await connection.execute(
            "SELECT password FROM admins WHERE email = ?",
            ["admin@accare.com"]
        );

        const matches = await bcrypt.compare(
            password,
            rows[0].password
        );

        console.log("Updated rows:", result.affectedRows);
        console.log("Password verification:", matches ? "SUCCESS" : "FAILED");

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        rl.close();

        if (connection) {
            await connection.end();
        }
    }
}

resetAdminPassword();