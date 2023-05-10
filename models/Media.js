const mongoose = require('mongoose');

const mediaSchema = mongoose.Schema({
    url: { type: String, required: true },
    backup_url: { type: String, required: true },
    type: { type: String, default : 'image' }, // image, model3D etc
    api: { type: Boolean },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    width: { type: Number },
    height: { type: Number },
    isDeleted: { type: Boolean, default: false },
    creationDate: { type: Date, default: Date.now() },
    // added for 3D
    name: { type: String },
    category: { type: String },
});

module.exports = mongoose.model('Media', mediaSchema);