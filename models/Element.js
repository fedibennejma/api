var mongoose = require('mongoose');

var ElementSchema = new mongoose.Schema
({
    rank: {type: Number},
    type: {type: String},
    linkUrl: {type: String},
    isNumbered: {type: Boolean, default: true},
    isLocked: {type: Boolean, default: false}, // or isStatic, used for templates or for the locked objects, or for the groups
    layout: {
        origin: {
            originX: {type: String},
            originY: {type: String},
        },
        position: {
            left: {type: Number, default: 0},
            top: {type: Number, default: 0},
            angle: {type: Number, default: 0},
        },
        text: {
            content: {type: String, default: ''},
            placeholder: {type: String, default: ''},
            font: {
                color: {type: String, default: 'rgba(1,0,1,1)'},
                align: {type: String, default: 'center'},
                family: {type: String, default: 'Open Sans'},
                weight: {type: String},
                size: {type: Number, default: 25},
                isUnderlined: {type: Boolean, default: false},
                isItalic: {type: Boolean, default: false},
                lineHeight: {type: Number, default: 1}, // added later in SLYDES-78
                charSpacing: {type: Number, default: 0}, // added later in SLYDES-460
                textShadow: {type: String},
                sizeHeight: {type: Number} // only for 3D presentation CSS resize when height of screen changes
            },
        },
        scale: {
            x: {type: Number, default: 1},
            y: {type: Number, default: 1},
        },
        centerObject: {
            center: {type: Boolean, default: false}, // absolute center
            centerH: {type: Boolean, default: false}, // center horizontal (we don't look at this if center is true)
            centerV: {type: Boolean, default: false}, // center vertical (we don't look at this if center is true)
            offset: {
                top: {type: Number},
                left: {type: Number},
            },
        },
        size: {
            width: {type: Number, default: 200}, // usually for the 2D this is the size of the 2D element, but in 3D CSS titles we use these for sizes when the height or width are scaling u^p and dow
            height: {type: Number, default: 100},
        },
        animation: {
            action: { type: String }, // action called by the Menu in the frontEnd
            name: { type: String }, // name of the animation to be used
            from: { type: Number }, // initial value of the animation (deprecated !)
            value: { type: Number }, // final value of the animation (deprecated !)
            amount: {type: Number, default: 350}, // value of the animation to add or retract from initial value
            duration: { type: Number }, // duration of the animation
            isLooping: { type: Boolean }, // if the animaiton is indefinetly looping
            easing: { type: String, default: 'easeInOutCubic' }
        },
        color: {
            value: { type: String },
            gradient: {
                isActive: {type: Boolean, default: false},
                linearDegree: {type: Number, default: 0},
                type: {type: String, default: 'linear'},
                gradientUnits: {type: String, default: 'percentage'},
                coords: { 
                    x1: { type: Number, default: 0 }, 
                    y1: { type: Number, default: 0 }, 
                    x2: { type: Number, default: 1 }, 
                    y2: { type: Number, default: 0 }
                }, 
                colorStops: [
                    { offset: { type: Number, default: 0 }, color: {type: String, default: '#000000'}}
                ]
            }
        },
        radius: { type: Number }, // radius for the circle
        border: {
            rx: { type: Number }, // border radius
            ry: { type: Number }, // border radius
            color: {type: String},
            strokeWidth: {type: Number},
        },
        opacity: {type: Number, default: 1},
        image: {
            source: {type: String},
            croppedUrl: {type: String},
            filters : {type: Array},
            crop: {
                aspect: {type: String},
                height: {type: Number},
                unit: {type: String},
                width: {type: Number},
                x: {type: Number},
                y: {type: Number}
            }
        },
        layer : {type: Boolean}, // not used anymore
        zIndex: {type: Number}, // newly added. if 0 back and if 1000 front
        shadow: {
            color: { type: String },
            radius: { type: Number },
            offsetX: { type: Number },
            offsetY: { type: Number },
            blur: { type: Number }
        }
    },
    slide: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slide'
    },
    _3DProperties: {
        scale: {
            x: {type: Number, default: 1},
            y: {type: Number, default: 1},
            z: {type: Number, default: 1}
        },
        position: {
            x: {type: Number, default: 0},
            y: {type: Number, default: 0},
            z: {type: Number, default: 0}
        },
        rotation: {
            x: {type: Number, default: 0},
            y: {type: Number, default: 0},
            z: {type: Number, default: 0}
        },
        source: {
            low: {type: String},
            normal: {type: String}
        },
        type: {type: String, enum: ['camera', 'model', '3DText', 'image', 'light', 'audio', '2DText', 'graph']},
        movements: [{ // array of movements for each object (similar to the old camerMovement array that existed in the first versions)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movement'
        }],
        originalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Element'
        }, // newly added: the original id of the element of the original presentation, we need it for action references
        metallicOptions: {
            metalness: { type: Number },
            roughness: { type: Number },
            transparent: { type: Boolean },
        },
        envmap: {
            source: {type: String}
        }
    }, // newly added. 3D elements properties
    isDeleted: {type: Boolean, default: false},
    start: { // manages the starting time of the element
        type: { type: String, enum: ['rank', 'time', 'default'], default: 'default' }, // type of the starting time: either default (directly) or with time (after a timer) or by rank
        value: {type: Number, default: 0} // depends on type. If timer it's the delay time in ms, else it's 0
    }, // also used for audio and video
    name: {
        title: {type: String},
        subtitle: {type: String}
    }, // for audio and video, we show the asset name and owner etc
    tag: {type: String/*, enum: ['title', 'subtitle', 'content', 'imageContent', 'templatePart', 'logo']*/}, // newly added. Used for templating and AI to know which element is the title etc
    table: {
        headers: [
            [{type: String}]
        ],
        rows: [
            [{type: String}]
        ],
        type: {type: String}
    },
    graph: {
        name: {type: String},
        elements: [
            {name: {type: String},
            value: {type: Number},}
        ]
    },
    clipPath: {
        type: { type: String },
        text: { type: String },
        strokeWidth: {type: Number},
        rx: {type: Number},
        ry: {type: Number},
        shadow: {
            color: { type: String },
            radius: { type: Number },
            offsetX: { type: Number },
            offsetY: { type: Number },
            blur: { type: Number }
        },
        angle: {type: Number},
        width: {type: Number},
        height: {type: Number},
        left: {type: Number},
        top: {type: Number},
        radius: {type: Number},
        scaleX: {type: Number},
        scaleY: {type: Number},
        originX: { type: String },
        originY: { type: String },
        fontFamily: { type: String },
        fontSize: {type: Number},
        textAlign: { type: String },
        lineHeight: {type: Number},
        underline: {type: Boolean},
    },
    grouped: {type: String},
    startsWithPres: {type: Boolean}, // only added for the audio
    isLooping: {type: Boolean, default: true}, // for the video
})

module.exports = mongoose.model('Element', ElementSchema);	