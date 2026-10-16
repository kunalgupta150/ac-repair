
require("dotenv").config();

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function verifyAdmin() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || "ac_care",
            port: Number(process.env.DB_PORT || 3306)
        });

        const [rows] = await connection.execute(
            "SELECT email, password FROM admins WHERE email = ?",
            ["admin@accare.com"]
        );

        if (rows.length === 0) {
            console.log("Admin account was not found.");
            return;
        }

        console.log("Admin account found.");

        rl.question("Enter your original admin password: ", async (password) => {
            try {
                const matches = await bcrypt.compare(
                    password,
                    rows[0].password
                );

                console.log(
                    matches
                        ? "PASSWORD MATCHES the database hash."
                        : "PASSWORD DOES NOT MATCH the database hash."
                );
            } catch (error) {
                console.error("Verification failed:", error.message);
            } finally {
                rl.close();
                await connection.end();
            }
        });

    } catch (error) {
        console.error("Database check failed:", error.message);

        if (connection) await connection.end();
        rl.close();
    }
}

verifyAdmin();