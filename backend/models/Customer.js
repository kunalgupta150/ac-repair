const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
    full_name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    password: { type: String, required: true }
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

module.exports = mongoose.model("Customer", customerSchema);
