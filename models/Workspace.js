/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-26 11:22:40
 * @modify date 2021-03-22 13:37:01
 * @desc [description]
 */

const mongoose = require('mongoose');

const WorkspaceSchema = mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    privacy: {type: String, default: 'public'},
    folders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    }],
    rights: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Right'
    }],
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    presentations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    }],
    logo : { type: String},
    isPersonal : { type : Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    creationDate: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);