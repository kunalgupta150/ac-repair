const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "general" },
    related_booking_id: { type: String, default: null },
    is_read: { type: Boolean, default: false }
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

module.exports = mongoose.model("Notification", notificationSchema);
