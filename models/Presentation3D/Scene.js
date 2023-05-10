var mongoose = require('mongoose');

/**
 * Scene for 3D Presentation
 */
var sceneSchema = new mongoose.Schema
({
    creationDate: {type: Date, default: Date.now()},
    isDeleted: {type: Boolean, default: false},
    elements: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Element"
        }
    ],
    presentation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Presentation"
    },
    postProcess: [
        {
            name: {type: String, default: 'ACESFilmicToneMapping'},
            value: {type: Number, default: 0.9},
            render: {type: String} // optional value for the postprocess (specifically for the LUT process)
        }
    ],
    background: {type: String}, //(/*0x2A4B9A*/ 0x202533);//#880808 // 0x2A4B9A
    distance: {type: Number},
    metallicOptions: {
        metalness: { type: Number },
        roughness: { type: Number },
        transparent: { type: Boolean },
    },

    // temporary, will not be used
    fog: {
        color: { type: String },
        near: { type: Number },
        far: { type: Boolean },
    },
})

module.exports = mongoose.model('Scene', sceneSchema);	