var mongoose = require('mongoose');

var slideSchema = new mongoose.Schema
({
    rank: {type: Number},
    creationDate: {type: Date, default: Date.now()},
    lastSavedTime: {type: Date, default: Date.now()},
    svg: {type: String, default:''},
    presentation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    },
    elements: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Element"
        }
    ],
    isDeleted: {type: Boolean, default: false},
    background: {
        type: {type: String, default: 'image'},
        color: {
            value: { type: String }
        },
        gradient: {
            isActive: {type: Boolean, default: false},
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
        },
        image: {
            source: {type: String},
            size: { type : String, enum: ['default', 'cover', 'middle']} // cover covers the slide, middle keeps the height intact at puts the image in the middle
        },
        opacity: {type: Number},
        stretch: {type: Boolean, default: false},
    },
    dimensions: {
        width: {type: Number, default: 936.96},
        height: {type: Number, default: 527.04}
    },
    captions: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Caption"
        }
    ],
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ],

    template: { // selected template
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    },
    templateSlide: { // selected template slide (we add it but don't really use it. We can use it again if we want to highight selected layout in layoutMenu)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slide'
    },
    // templateStyle should never have default values (because of some conditions in the front-end)
    templateStyle: { // newly added. Stores the font types of the slide (blank or from template)
        title: {
            color: {type: String},
            align: {type: String},
            family: {type: String},
            weight: {type: String},
            size: {type: Number},
            isUnderlined: {type: Boolean},
            isItalic: {type: Boolean},
            lineHeight: {type: Number},
            charSpacing: {type: Number},
            textShadow: {type: String},
        },
        subtitle: {
            color: {type: String},
            align: {type: String},
            family: {type: String},
            weight: {type: String},
            size: {type: Number},
            isUnderlined: {type: Boolean},
            isItalic: {type: Boolean},
            lineHeight: {type: Number},
            charSpacing: {type: Number},
            textShadow: {type: String},
        },
    },
    theme: { // old
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Presentation'
    },
    // not sure if we can add this (for copy)
    movement: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movement'
    },

    // old
    layout: { // used for theme
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Layout',
        default: "5f4057570866483e285c6ddb" // default layout to "blank"
    },
    note: {type: String},
})

module.exports = mongoose.model('Slide', slideSchema);	