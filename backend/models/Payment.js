const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    amount: { type: Number, required: true },
    payment_method: {
        type: String,
        enum: ["Cash", "UPI", "Card", "Online"],
        required: true
    },
    payment_status: {
        type: String,
        enum: ["Pending", "Paid", "Refunded", "Failed"],
        default: "Pending"
    },
    transaction_id: { type: String, default: null },
    payment_date: { type: Date, default: Date.now },
    collected_by: {
        type: String,
        enum: ["Owner", "Admin", "Technician", null],
        default: null
    },
    technician_share: { type: Number, default: 0 },
    owner_share: { type: Number, default: 0 },
    technician_payout_status: {
        type: String,
        enum: ["Not Due", "Pending", "Paid"],
        default: "Not Due"
    },
    technician_payout_date: { type: Date, default: null },
    payout_reference: { type: String, default: null }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id.toString();
            return ret;
        }
    }
});

module.exports = mongoose.model("Payment", paymentSchema);
