var mongoose = require('mongoose');
// var slug = require('mongoose-slug-generator');
var slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

var folderSchema = new mongoose.Schema
({
    name: {type: String, default: 'Untitled Folder'},
    slug: {type: String, slug: "name", slug_padding_size: 4, unique: true},
    creationDate: {type: Date, default: Date.now()},
    lastSavedTime: {type: Date, default: Date.now()},
    presentations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    rights: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Right'
    }],
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace'
    },
    isDeleted: {type: Boolean, default: false},
})

module.exports = mongoose.model('Folder', folderSchema);	