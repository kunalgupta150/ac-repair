const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
    service_name: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    category: { type: String, default: "AC Service" },
    price: { type: Number, required: true },
    description: { type: String, default: "" },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id.toString();
            if (!ret.name) ret.name = ret.service_name;
            return ret;
        }
    }
});

// Pre-save hook
serviceSchema.pre("save", function() {
    if (!this.name) this.name = this.service_name;
});

module.exports = mongoose.model("Service", serviceSchema);
