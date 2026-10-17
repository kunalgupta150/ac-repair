const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    booking_id: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    technician_id: { type: mongoose.Schema.Types.ObjectId, ref: "Technician", default: null },
    service_id: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    ac_type: { type: String, required: true },
    address: { type: String, required: true },
    preferred_date: { type: String, required: true },
    preferred_time: { type: String, required: true },
    problem_description: { type: String, default: "" },
    status: {
        type: String,
        enum: ["Pending", "Assigned", "Accepted", "In Progress", "Completed", "Cancelled"],
        default: "Pending"
    },
    total_amount: { type: Number, required: true }
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

module.exports = mongoose.model("Booking", bookingSchema);
