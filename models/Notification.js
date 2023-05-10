 const mongoose = require('mongoose');

 const NotificationSchema = mongoose.Schema({
     name: { type: String, required: true },
     description: { type: String },
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
     isSeen: { type: Boolean, default: false },
     isDeleted: { type: Boolean, default: false },
     creationDate: { type: Date, default: Date.now() },
 });
 
 module.exports = mongoose.model('Notification', NotificationSchema);