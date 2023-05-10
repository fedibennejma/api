const mongoose = require('mongoose');

const HistorySchema = mongoose.Schema({
    action : {type: String,enum: ['Add', 'Delete', 'Edit','Login','Logout']},
    actionDescription : {type: String},
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace'
    },
    presentation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    },
    type: { type: String, enum: ['Presentation', 'Comment', 'Folder', 'Workspace'] }, // we use this for the targetId to know what to fetch
    targetId: {
        type:  mongoose.Schema.Types.ObjectId,
        // Instead of a hardcoded model name in ref, refPath means Mongoose
        // will look at the onModel property to find the right model.
        refPath: 'type'
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isDeleted: { type: Boolean, default: false },
    creationDate: { type: Date, default: Date.now() },
    browser: { type: String },
});

module.exports = mongoose.model('History', HistorySchema);