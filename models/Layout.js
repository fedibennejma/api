var mongoose = require('mongoose');
// cache data array later?

// theme contains layouts (Title slide / title + header etc..)
// we apply a layout to a slide which means we copy the elements of the layout onto the elements of the slide OR we do we just apply the color schemes
// and position of each element? The problem with this second approch is that newly added elements (in the layout) won't be rendered.
// OR... we could make a mix of the two? Make a colorScheme for title/subtitle etc and add elements array for newly added elements that are unchanged and we render theù as a background
// The layout schema is applied to a slide. But it's not related to it by keys, we just take the info from here and apply them to our slide's elements
// If we have some elements in a slide and we apply a layout, we override our positions by the layout ones, but once we change a theme, we keep the positions
// of the important elements (title, subtilte, content, images etc) while the other elements are overriden
var LayoutSchema = new mongoose.Schema
({
    Theme: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Theme'
    },
    elements: [ // static elements
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Element"
        }
    ], // used for renderstaticElement
    name: {type: String}, // expl: Title slide, section header etc
    svg: {type: String, default:''},
    background: {
        color: {type: String},
    },
    title: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Element'
    },
    subtitle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Element'
    },
    content: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Element'
    },
    isDeleted: {type: Boolean, default: false},
    rank: {type: Number} // we use this for the display in order of the layouts
})

module.exports = mongoose.model('Layout', LayoutSchema);