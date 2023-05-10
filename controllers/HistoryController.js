const History = require('../models/History');
const Right = require('../models/Right');
const Workspace = require('../models/Workspace');
var ObjectId = require('mongodb').ObjectID;


exports.createHistory = (req, res, next) => {
    const { workspaceId, action, actionDescription, type, targetId, sender, receiver, presentationId, browser } = req;
    const history = new History({
        workspace: workspaceId ? ObjectId(workspaceId) : null,
        presentation: presentationId ? ObjectId(presentationId) : null,
        action: action,
        actionDescription: actionDescription,
        type: type,
        targetId: targetId ? ObjectId(targetId) : null,
        sender: sender ? ObjectId(sender) : null,
        receiver: receiver ? ObjectId(receiver) : null,
        browser: browser ? browser : null,
        creationDate : Date.now()
    });
    history.save((err, history) => {
        if (err) {
            res.status(500).send(err)
        }
    })
};

exports.getHistories = (req, res, next) => {
    Right.find({ user: ObjectId(req.userId) }).then((rights) => {
        Workspace.find({ "rights": { "$in": rights }, isDeleted: false }).then((workspaces) => {
            History.find({ workspace: { $in: workspaces }, isDeleted: false }).populate([
                {
                    path: 'sender',
                    model: 'User',
                    select: '_id userName firstName profilePicture login jobTitle creationDate'
                },
                {
                    path: 'receiver',
                    model: 'User',
                    select: '_id userName firstName profilePicture login jobTitle creationDate'
                },
                {
                    path: 'workspace',
                    model: 'Workspace',
                },
                {
                    path: 'presentation',
                    model: 'Presentation',
                }
            ]).limit(50).sort({ creationDate: 'desc' }).then((histories) => {
                res.send(histories);
            })
        })
    })
};

exports.getHistoriesConnection = (req, res, next) => {
    History.find({ sender: req.body.id, action: { $in: ['Login', 'Logout'] }, isDeleted: false }).populate([
        {
            path: 'sender',
            model: 'User',
            select: '_id userName firstName profilePicture login jobTitle creationDate'
        },
        {
            path: 'receiver',
            model: 'User',
            select: '_id userName firstName profilePicture login jobTitle creationDate'
        },
        {
            path: 'workspace',
            model: 'Workspace',
        },
        {
            path: 'presentation',
            model: 'Presentation',
        }
    ]).limit(50).sort({ creationDate: 'desc' }).then((histories) => {
        res.send(histories);
    })
};