var mongoose = require('mongoose');

var CommentSchema = new mongoose.Schema
({
    value: {type: String},
    presentation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    },
    slide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slide'
    },
    element: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Element'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    taggedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    creationDate: {type: Date, default: Date.now()},
    isResolved: {type: Boolean, default: false},
    type: {type: String}, // for the future: 'TO_FIX', 'RQ' etc
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    },
    children: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ],
    isDeleted: {type: Boolean, default: false},
})

module.exports = mongoose.model('Comment', CommentSchema);	