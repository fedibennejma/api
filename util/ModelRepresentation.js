/**
 * This contains all the model representations we will need to return in the populate functions. 
 */

let slide = (isVisitor) => {
    return {
        path: 'slides',
        match: { isDeleted: false },
        select : isVisitor ? '-comments' : '',
        populate: [
            elements(),
            captions(),
            comments()
        ],
    }
}

/**
 * Return only one slide
 * @returns 
 */
let oneSlide = () => {
    return {
        path: 'slides',
        match: { isDeleted: false },
        select : '_id svg background',
        perDocumentLimit: 5
    }
}

let allSlides = () => {
    return {
        path: 'slides',
        match: { isDeleted: false },
        select : '_id svg background',
    }
}

/**
 * Returns the user model for populate
 * @param {*} useSelect if true selects only userName firstName profilePicture...
 */
let user = (useSelect = true) => {
    let select = ''
    if (useSelect)
        select = 'userName firstName profilePicture'
    return {
        path: 'user',
        model: 'User',
        select: select,
    }
}

let owners = (useSelect = true) => {
    let select = ''
    if (useSelect)
        select = 'userName firstName profilePicture'
    return {
        path: 'owners',
        model: 'User',
        select: select,
    }
}

let visitors = (useSelect = true) => {
    let select = ''
    if (useSelect)
        select = 'userName firstName profilePicture'
    return {
        path: 'visitors',
        model: 'User',
        select: select,
    }
}

let comments = () => {
    return {
        path: 'comments',
        model: 'Comment',
        match: { isDeleted: false, isResolved: false },
        populate: [
            user(),
            {
                path: 'children',
                model: 'Comment',
                match: { isDeleted: false },
                populate: user()
            },
            {
                path: 'taggedUsers',
                model: 'User',
                select: 'userName firstName profilePicture',
            }
        ]
    }
}

let captions = () => {
    return {
        path: 'captions',
        model: 'Caption',
    }
}

let elements = () => {
    return {
        path: 'elements',
        model: 'Element',
        match: { isDeleted: false }
    }
}

let scenes = () => {
    return {
        path: 'scenes',
        match: { isDeleted: false },
        populate: 
            {
                path: 'elements',
                model: 'Element',
                match: { isDeleted: false },
                populate: 
                    {
                        path: '_3DProperties.movements',
                        model: 'Movement',
                        match: { isDeleted: false },
                        populate: [
                            {
                                path: 'actions',
                                model: 'Action',
                                match: { isDeleted: false },
                            },
                            {
                                path: 'slide',
                                model: 'Slide',
                                match: { isDeleted: false },
                                populate: {
                                    path: 'elements',
                                    model: 'Element',
                                    match: { isDeleted: false },
                                }
                            }
                        ]
                    }
            }
        
    }
}

module.exports = {
    slide,
    user,
    comments,
    captions,
    elements,
    scenes,
    owners,
    visitors,
    oneSlide,
    allSlides
}