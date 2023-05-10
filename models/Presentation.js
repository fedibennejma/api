var mongoose = require('mongoose');
var slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

var presentationSchema = new mongoose.Schema
({
    name: {type: String, default: 'Untitled Presentation'},
    description: String,
    slug: {type: String, slug: "name", slug_padding_size: 4, unique: true},
    creationDate: {type: Date, default: Date.now()},
    lastSavedTime: {type: Date, default: Date.now()},
    sideVideo: {type: Boolean, default: false},
    private: {type: Boolean, default: true},
    live: {type: Boolean, default: false},
    type: {type: String, enum: ['presentation', 'video_presentation', 'course', 'template', 'presentation3D','template3D'], default: 'presentation'},
    format: {type: String, enum: ['IG_story']}, // optional, if not included it's a presentation
    thumbnail: { type: String },
    landing_URL: String,
    quality_score: {type: Number, default: 0},
    has_watermark: {type: Boolean, default: false},
    current_version: {type: Number, default: 1},
    isAuthorAI: {type: Boolean, default: false},
    info: {
        views: {type: Number, default: 0},
        size: {type: Number, default: 0},
        score: {type: Number, default: 0}
    },
    slides: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slide'
    }],
    theme: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    invitations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    owners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    visitors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace'
    },
    scenes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scene'
    }],
    cameraId: {type: String}, // added later to get directly the needed camera Id from here in a 3D presentation for 2D editor
    isDeleted: {type: Boolean, default: false},
})

module.exports = mongoose.model('Presentation', presentationSchema);	