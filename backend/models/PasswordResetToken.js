const mongoose = require("mongoose");

const passwordResetTokenSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["customer", "technician", "admin"],
        required: true
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    token_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: null }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
