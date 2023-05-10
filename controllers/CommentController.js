const Comment = require('../models/Comment');
const Slide = require('../models/Slide');
const Presentation = require('../models/Presentation');
var ObjectId = require('mongodb').ObjectID;
const historyController = require("../controllers/HistoryController");

/**
 * For the API calls (may be removed if not needed)
 * @param {*} req 
 * @param {*} res 
 */
exports.createComment = (req, res) => {
    const comment = new Comment({
        value: req.body.value,
        user: req.userId,
        slide: req.body.slideId,
        presentation: req.body.presentationId,
        taggedUsers: req.body.taggedUsers
    });
    comment.save((err, comment) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.send(comment)
        }
    })
};

commentToHistory = (comment,action) => {
    Presentation.findOne({slides : ObjectId(comment.slide) , isDeleted : false}, (err, presentation) => {
        if (!err) {
            historyController.createHistory({
                workspaceId : ObjectId(presentation.workspace),
                presentationId : presentation._id,
                action: action,
                actionDescription : (action == 'Add') ? 'ADD_COMMENT_PRESENTATION' : 'DELETE_COMMENT_PRESENTATION',
                type:'Presentation',
                targetId : presentation._id,
                sender: ObjectId(comment.user)
            });
        }
    })
}

/**
 * For the socket
 * @param {*} comment 
 */
exports.addComment = (userId, comment) => {
    const newComment = new Comment({
        _id: comment._id,
        value: comment.value,
        user: userId,
        slide: comment.slide,
        element: comment.element,
        presentation: comment.presentationId,
        taggedUsers: comment.taggedUsers,
        parent: comment.parent
    });

    // if the comment is a reply we save it as a child to a comment, else we save it in the slide comments
    if (comment.parent) {
        Comment.findOneAndUpdate(
            { _id: comment.parent },
            { $push: { children: comment } },
            (error) => {
                if (!error) {
                    commentToHistory(newComment,'Add');
                    return newComment.save();
                }
                    
            })
    } else {
        Slide.findOneAndUpdate(
            { _id: comment.slide },
            { $push: { comments: comment } },
            (error) => {
                if (!error) {
                    commentToHistory(newComment,'Add');
                    return newComment.save();
                }
            })
    }
};

/**
 * For the socket
 * @param {*} comment 
 */
exports.deleteComment = (id) => {
    return Comment.findOneAndUpdate(
        { _id: ObjectId(id) },
        { isDeleted: true }, { new: true }, function (err, result) {
            if (err)
                console.log("eerr", err)
            else {
                commentToHistory(result,'Delete');
            }
        })
};

/**
 * For the socket
 * @param {*} comment 
 */
exports.resolveComment = (id) => {
    return Comment.findOneAndUpdate(
        { _id: ObjectId(id) },
        { isResolved: true }, { new: true }, function (err, result) {
            if (err)
                console.log("eerr", err)
            else
                console.log('succuess', result)
        })
};

exports.getTaggedComments = (req, res) => {
    const limit = parseInt(req.params.limit)
    Comment.find({ taggedUsers: req.userId , isDeleted : false }, (err, comments) => {
        if (err) {
            res.status(500)
        }
        else {
            res.send(comments)
        }
    }).sort({creationDate: 'desc'}).limit(limit).populate([
        {
            path: 'user',
            model: 'User',
            select: 'userName firstName profilePicture',
        },
        {
            path: 'taggedUsers',
            model: 'User',
            select: 'userName firstName profilePicture',
        },
        {
            path: 'children',
            model: 'Comment',
            match: { isDeleted: false },
            populate: {
                path: 'user',
                model: 'User',
                select: 'userName firstName profilePicture',
            }
        },
        {
            path: 'slide',
            model: 'Slide',
            match: { isDeleted: false },
            populate : [{
                path: 'presentation',
                model: 'Presentation'
            },{
                path: 'elements',
                model: 'Element'
            }]
        }
    ])
};

exports.getPresentationComments = (req, res) => {
    Comment.find({ presentation: req.params.presentationId }, (err, comments) => {
        if (err)
            res.status(500)
        else
            res.send(comments)
    })
}

exports.getSlideComments = (req, res) => {
    Comment.find({ slide: req.params.slide }, (err, comments) => {
        if (err)
            res.status(500)
        else
            res.send(comments)
    })
}