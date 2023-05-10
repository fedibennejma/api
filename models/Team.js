/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-26 11:22:40
 * @modify date 2021-03-08 11:09:18
 * @desc [description]
 */

const mongoose = require('mongoose');

const TeamSchema = mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String},
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    temporaryUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    licence : { type: String },
    company : { type: String },
    workspaces: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace'
    }],
    isDeleted: { type: Boolean, default: false },
    creationDate: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('Team', TeamSchema);