var mongoose = require('mongoose');

/**
 * This Model is used in the 3D Presentation as: camera which is a parent for the 3D Slide,
 * Or for a 3D model to define its movements
 */
var movementSchema = new mongoose.Schema
({
    rank: {type: Number},
    creationDate: {type: Date, default: Date.now()},
    slide: { // only for the camera in Presentation. Contains the slide elements to display
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slide'
    },
    slideRef: {type: String, default: 'next'}, // only for the camera (newly added). The movement is not the slide itself, but connected to that slide // SlideId, or 'previous', 'next'
    slideDisplay: {type: String, default: "default" , enum: ["default", "transition", "end", "start"]}, // if the slide is displayed when the movement is reached (default) or when transition
    isDeleted: {type: Boolean, default: false},
    scale: {
        x: {type: Number},
        y: {type: Number},
        z: {type: Number}
    },
    position: {
        x: {type: Number},
        y: {type: Number},
        z: {type: Number},
    },
    rotation: {
        x: {type: Number},
        y: {type: Number},
        z: {type: Number},
    },
    // depth of field only for the camera
    dof: {
        focus: {type: Number},
        aperture: {type: Number},
        maxblur: {type: Number},
    },
    time: {type: Number, default: 0},
    delay: {type: Number, default: 0},
    easing: {type: String, default: 'TWEEN.Easing.Cubic.InOut'},
    userControl: {type: Boolean, default: false},
    actions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Action'
    }],
    isContinuous: {type: Boolean, default: false}, // if true, the element is never stopped, even when the camera moves
    isRotating: {
        x: {type: Number},
        y: {type: Number},
        z: {type: Number}
    }, // continuous rotation on each or one of the axes and its value on each animation frame
    spotlight: {
        color: {type: String},
        intensity: {type: Number}
    },
    group: {type: String} // added for objects. Categories of movement (walking, idle etc) should be in a group array instead but we will start like this
})

module.exports = mongoose.model('Movement', movementSchema);