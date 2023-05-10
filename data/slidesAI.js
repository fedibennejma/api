
exports.getTitleElementEmpty = (content) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 736,
            "top": 270.7715355382777,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "#101010",
                "align": "left",
                "family": "Roboto",
                "size": 70,
                "isUnderlined": false,
                "isItalic": false,
                "lineHeight": 1,
                "charSpacing": 0,
                "weight": "700"
            },
            "content": content,
            "placeholder": "Edit Title"
        },
        "size": {
            "width": 1163.4782237878746,
            "height": 158.2
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "opacity": 1,
        "zIndex": 1,
        "layer": null
    }
}

exports.getSubtitleElementEmpty = (content) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 736,
            "top": 541.8738015387833,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "#101010",
                "align": "left",
                "family": "Roboto",
                "size": 35,
                "isUnderlined": false,
                "isItalic": false,
                "lineHeight": 1,
                "charSpacing": 0,
                "weight": "300"
            },
            "content": content,
            "placeholder": "Edit Subtitle"
        },
        "size": {
            "width": 674.7413577841116,
            "height": 39.55
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "opacity": 1,
        "zIndex": 2,
        "layer": null
    }

}

exports.getContentElementEmpty = (content, index = 0) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 736,
            "top": 674.0090757026367 + index * 50,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "#101010",
                "align": "left",
                "family": "Roboto",
                "size": 25,
                "isUnderlined": false,
                "isItalic": false,
                "lineHeight": 1.4,
                "charSpacing": 0,
                "weight": "300"
            },
            "content": content,
            "placeholder": "Edit Content"
        },
        "size": {
            "width": 874.7033520507752,
            "height": 186.45
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "opacity": 1,
        "zIndex": 2,
        "layer": null
    }
}

exports.getNumerotationElement = (number) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 1796.0955107920279,
            "top": 981.8292253521126,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "#101010",
                "align": "right",
                "family": "Roboto",
                "size": 25,
                "isUnderlined": false,
                "isItalic": false,
                "lineHeight": 1.4,
                "charSpacing": 0,
                "weight": "300"
            },
            "content": number || '',
            "placeholder": ""
        },
        "scale": {
            "x": 1,
            "y": 1
        },
        "size": {
            "width": 25.854688590075153,
            "height": 28.25
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "shadow": null,
        "opacity": 1,
        "zIndex": 2,
        "layer": null
    }
}

exports.getImageEmpty = (path) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 0,
            "top": 0,
            "angle": 0
        },
        "scale": {
            "x": 1,
            "y": 1
        },
        "size": {
            "width": 600,
            "height": 1080
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "image": {
            "filters": [],
            "source": path,
        },
        "shadow": null,
        "opacity": 1,
        "layer": null
    }
}



exports.getTitleSlideTitleElement = (content) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 117,
            "top": 708.4619437954284,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "rgba(255,255,255,1)",
                "align": "left",
                "family": "Roboto",
                "size": 130,
                "isUnderlined": false,
                "isItalic": false,
                "lineHeight": 1,
                "charSpacing": 0,
                "weight": "700"
            },
            "content": content,
            "placeholder": "Edit Title"
        },
        "scale": {
            "x": 1,
            "y": 1
        },
        "size": {
            "width": 1232.5147740829655,
            "height": 146.89999999999998
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "opacity",
            "duration": 1500,
            "from": 0,
            "action": "FADE_IN",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "opacity": 1,
        "zIndex": 1,
        "layer": null
    }
}

exports.getTitleSlideSubtitleElement = (content) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 117,
            "top": 860.1680562045715,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "rgba(255,255,255,1)",
                "align": "left",
                "family": "Roboto",
                "size": 35,
                "isUnderlined": false,
                "isItalic": false,
                "lineHeight": 1,
                "charSpacing": 0,
                "weight": "300"
            },
            "content": content,
            "placeholder": "Edit Subtitle"
        },
        "scale": {
            "x": 1,
            "y": 1
        },
        "centerObject": {
            "center": false,
            "centerH": false,
            "centerV": false
        },
        "size": {
            "width": 1117.7921002477028,
            "height": 39.55
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "opacity",
            "duration": 1500,
            "from": 0,
            "action": "FADE_IN",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "opacity": 1,
        "zIndex": 2,
        "layer": null
    }
}

exports.getOverviewTitle = () => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 142.71286927144132,
            "top": 477.86138425592947,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "rgba(255,255,255,1)",
                "align": "left",
                "family": "Roboto",
                "size": 70,
                "isUnderlined": false,
                "isItalic": false,
                "lineHeight": 1,
                "charSpacing": 0,
                "weight": "700"
            },
            "content": "Summary Overview",
            "placeholder": "Edit Title"
        },
        "size": {
            "width": 560.0259219517917,
            "height": 158.2
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "zIndex": 1,
        "layer": null
    }
}

exports.getOverviewLines = () => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 787.8383374097405,
            "top": 4.688270507585912,
            "angle": 89.36313384213945
        },
        "scale": {
            "x": 3.5834572237736237,
            "y": 1.5772627146785437e+36
        },
        "size": {
            "width": 300,
            "height": 100
        },
        "animation": {
            "amount": 350,
            "easing": "easeInOutCubic",
            "name": "opacity",
            "duration": 1500,
            "from": 0,
            "action": "FADE_IN",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "border": {
            "rx": 0,
            "ry": 0,
            "color": "#00000",
            "strokeWidth": 2
        },
        "opacity": 1,
        "zIndex": 3,
        "layer": null
    }
}

exports.getCircle = (index) => {
    let originalTop = 302.47946964613635;

    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 760.9919994802424,
            "top": originalTop + index * 150,
            "angle": 0
        },
        "scale": {
            "x": 0.19201469605191057,
            "y": 0.19201469605191057
        },
        "size": {
            "width": 300,
            "height": 300
        },
        "animation": {
            "amount": 350 + index * 100,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "#101010"
        },
        "opacity": 1,
        "radius": 150,
        "zIndex": -2,
        "layer": null
    }
}

exports.circleText = (index) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 771.5850603998756,
            "top": 318.66449883177154 + index * 150,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "rgba(255,255,255,1)",
                "align": "center",
                "family": "Roboto",
                "size": 25,
                "isUnderlined": false,
                "isItalic": false,
                "lineHeight": 1,
                "charSpacing": 0,
                "weight": "300"
            },
            "content": index + 1,
            "placeholder": "Edit Title"
        },
        "scale": {
            "x": 1,
            "y": 1
        },
        "size": {
            "width": 32.66869887630893,
            "height": 28.249999999999996
        },
        "animation": {
            "amount": 350 + index * 100,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "opacity": 1,
        "zIndex": 7,
        "layer": null
    }
}

exports.titleOverview = (index, content) => {
    return {
        "origin": {
            "originX": "center"
        },
        "position": {
            "left": 962.9546779753712,
            "top": 314.28 + index * 150,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "rgba(255,255,255,1)",
                "align": "left",
                "family": "Roboto",
                "size": 28,
                "lineHeight": 1,
                "charSpacing": 0,
                "weight": "700"
            },
            "content": content || "",
            "placeholder": "Edit Title"
        },
        "scale": {
            "x": 1,
            "y": 1
        },
        "size": {
            "width": 211.25263357146838,
            "height": 31.639999999999997
        },
        "animation": {
            "amount": 350 + index * 100,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "opacity": 1,
        "zIndex": 1,
        "layer": null
    }
}

exports.subtitleOverview = (index, content) => {
    return {
        "origin": {
            "originX": "left"
        },
        "position": {
            "left": 1140.40679996395,
            "top": 314.28 + index * 150,
            "angle": 0
        },
        "text": {
            "font": {
                "color": "#ffffff",
                "align": "left",
                "family": "Roboto",
                "size": 25,
                "lineHeight": 1,
                "charSpacing": 0,
                "weight": "300"
            },
            "content": content || "",
            "placeholder": "Edit Subtitle"
        },
        "scale": {
            "x": 1,
            "y": 1
        },
        "size": {
            "width": 683.8048388464127,
            "height": 28.249999999999996
        },
        "animation": {
            "amount": 350 + index * 100,
            "easing": "easeInOutCubic",
            "name": "left",
            "duration": 1500,
            "action": "SLIDE_RIGHT",
            "isLooping": false
        },
        "color": {
            "value": "rgba(255,255,255,1)"
        },
        "opacity": 1,
        "zIndex": 2,
        "layer": null
    }
}