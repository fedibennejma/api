/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-26 11:22:40
 * @modify date 2021-03-23 12:31:53
 * @desc [description]
 */

const mongoose = require('mongoose');

const RightSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace'
    },
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    },
    read : { type: Boolean, default: true},
    write : { type: Boolean, default: true},
    delete : { type: Boolean, default: true},
    isDeleted: { type: Boolean, default: false },
    creationDate: { type: Date, default: Date.now()},
});

module.exports = mongoose.model('Right', RightSchema);