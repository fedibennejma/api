/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-26 12:53:19
 * @modify date 2021-03-29 13:26:52
 * @desc [description]
 */
var ObjectId = require('mongodb').ObjectID;
var mongoose = require("mongoose");
const Workspace = require('../models/Workspace');
const Right = require('../models/Right');
const mailController = require("../controllers/MailController");
const historyController = require("../controllers/HistoryController");
const User = require('../models/User');


exports.getAllWorkspace = (req, res, next) => {
    Workspace.find({ isDeleted: false }, (err, workspaces) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(workspaces)
    });
};

exports.getWorkspace = (req, res, next) => {
    Workspace.findOne({ _id: req.params.id , isDeleted : false }, (err, workspace) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(workspace)
    }).populate([{
        path: 'folders',
        model: 'Folder',
        match: { isDeleted: false },
        populate: [{
            path: 'presentations',
            match: { isDeleted: false },
            populate: [
                {
                    path: 'user',
                    model: 'User',
                    select: '_id userName firstName profilePicture login jobTitle creationDate'
                },
                {
                    path: 'slides',
                    model: 'Slide',
                    match: { isDeleted: false }
                }
            ],
        }, {
            path: 'collaborators',
            model: 'User',
            select: '_id userName firstName profilePicture login jobTitle creationDate'
        }]
    },
    {
        path: 'rights',
        model: 'Right',
        match: { isDeleted: false },
        populate: [{
            path: 'user',
            model: 'User',
            select: '_id userName firstName profilePicture login jobTitle creationDate'
        }]
    }, {
        path: 'team',
        model: 'Team',
        match: { isDeleted: false },
        populate:
        {
            path: 'users',
            model: 'User',
            select: '_id userName firstName profilePicture login jobTitle creationDate'
        }
    }]
    )
};

exports.getWorkspace = (req, res, next) => {
    Workspace.findOne({ _id: req.params.id }, (err, workspace) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(workspace)
    }).populate([{
        path: 'folders',
        model: 'Folder',
        populate: [{
            path: 'presentations',
            match: { isDeleted: false },
            populate: [
                {
                    path: 'user',
                    model: 'User',
                    select: '_id userName firstName profilePicture login'
                },
                {
                    path: 'slides',
                    model: 'Slide',
                    match: { isDeleted: false }
                }
            ],
        },
        {
            path: 'collaborators',
            model: 'User',
            select: '_id userName firstName profilePicture login'
        }]
    },
    {
        path: 'rights',
        model: 'Right',
        populate: [{
            path: 'user',
            model: 'User',
            select: '_id userName firstName profilePicture login'
        }]
    }])
};

exports.updateWorkspace = (req, res) => {
    Workspace.updateOne({ _id: req.params.id }, { ...req.body, _id: req.params.id }, { new: true }, (err, workspace) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(workspace)
    });
};


exports.getOneWorkspaceByUserRight = (req, res) => {
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        Right.find({ user: ObjectId(req.userId) }).then((rights) => {
            Workspace.findOne({ rights: { "$in": rights }, _id: req.params.id, isDeleted: false }).then((workspaces) => {
                res.send(workspaces)
            })
        })
    } else {
        res.send({})
    }
}

/**
 * @Author: FediBn
 * Get all the rights and users of a workspace by id
 * @param {*} req 
 * @param {*} res 
 */
exports.getWorkspaceRights = (req, res) => {
    Right.find({ workspace: req.params.id, isDeleted : false }, (err, right) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(right)
    }).populate([
        {
            path: 'user',
            model: 'User',
            select: '_id userName firstName profilePicture login'
        }
    ])
}

exports.getAllWorkspaceByUserRight = (req, res) => {
    Right.find({ user: ObjectId(req.userId) }).then((rights) => {
        Workspace.find({ "rights": { "$in": rights },isDeleted : false }).populate([
        {
            path: 'rights',
            model: 'Right',
            match: { isDeleted: false },
            populate: [{
                path: 'user',
                model: 'User',
                select: '_id userName firstName profilePicture login jobTitle creationDate'
            }]
        }, {
            path: 'team',
            model: 'Team',
            match: { isDeleted: false },
            select: '_id name description',
            populate:
            {
                path: 'users',
                model: 'User',
                select: '_id userName firstName profilePicture login jobTitle creationDate'
            }
        }]
        ).then((workspaces) => {
            res.send(workspaces)
        })
    })
}

affectRightsToUser = (user, right) => {
    User.findOneAndUpdate({ _id: user }, { $addToSet: { rights: right } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => {

    });
}

exports.affectNewRightToWorkspace = async (req, res, next) => {
    const { users, workspace } = req.body;
    if (users && workspace && users.length > 0) {
        let newRights = [];
        await Promise.all(users.map((user) => {
            const newRight = new Right({
                user: user,
                workspace: workspace
            });
            if (user.login) {
                // send mail to all invited users
                mailController.sendMailInivitationWorkspace({ user, workspace: workspace });
                historyController.createHistory({
                        workspaceId : workspace._id,
                        action: 'Add',
                        actionDescription : 'AFFECTE_USERS_TO_WORKSPACE',
                        type:'Workspace',
                        targetId : workspace._id,
                        sender: req.userId,
                        receiver:user._id
                });
            }
            // add new right to workspace rights
            newRights.push(ObjectId(newRight._id));
            // save the right
            return newRight.save(function (err) {
                if (err) {
                    res.send(err);
                } else {
                    affectRightsToUser(user, newRight);
                }
            })
        }))

        // affect all rights to the new workspace
        Workspace.findOneAndUpdate({ _id: workspace._id }, { $addToSet: { rights: newRights } }, { upsert: true, new: true, setDefaultsOnInsert: true }).populate([{
            path: 'folders',
            model: 'Folder',
            match: { isDeleted: false },
            populate: [{
                path: 'presentations',
                match: { isDeleted: false },
                populate: [
                    {
                        path: 'user',
                        model: 'User',
                        select: '_id userName firstName profilePicture login jobTitle creationDate'
                    },
                    {
                        path: 'slides',
                        model: 'Slide',
                        match: { isDeleted: false }
                    }
                ],
            }, {
                path: 'collaborators',
                model: 'User',
                select: '_id userName firstName profilePicture login jobTitle creationDate'
            }]
        },
        {
            path: 'rights',
            model: 'Right',
            match: { isDeleted: false },
            populate: [{
                path: 'user',
                model: 'User',
                select: '_id userName firstName profilePicture login jobTitle creationDate'
            }]
        }, {
            path: 'team',
            model: 'Team',
            match: { isDeleted: false },
            populate:
            {
                path: 'users',
                model: 'User',
                select: '_id userName firstName profilePicture login jobTitle creationDate'
            }
        }]
        ).then((newWorkspace) => {
            res.send(newWorkspace)
        })
    }
};

exports.deleteRightFromWorkspace = async (req, res, next) => {
    const { user, workspace } = req.body;
    if (user && workspace) {
        Right.findOneAndUpdate({ user: user, workspace: workspace, isDeleted: false }, { isDeleted: true }, { new: true }, function (err, right) {
            if (err) {
                res.send(err)
            } else {
                Workspace.findOneAndUpdate({ _id: workspace._id }, { $pull: { rights: ObjectId(right._id) } }, { upsert: true, new: true, setDefaultsOnInsert: true }).populate([{
                    path: 'folders',
                    model: 'Folder',
                    match: { isDeleted: false },
                    populate: [{
                        path: 'presentations',
                        match: { isDeleted: false },
                        populate: [
                            {
                                path: 'user',
                                model: 'User',
                                select: '_id userName firstName profilePicture login jobTitle creationDate'
                            },
                            {
                                path: 'slides',
                                model: 'Slide',
                                match: { isDeleted: false }
                            }
                        ],
                    }, {
                        path: 'collaborators',
                        model: 'User',
                        select: '_id userName firstName profilePicture login jobTitle creationDate'
                    }]
                },
                {
                    path: 'rights',
                    model: 'Right',
                    match: { isDeleted: false },
                    populate: [{
                        path: 'user',
                        model: 'User',
                        select: '_id userName firstName profilePicture login jobTitle creationDate'
                    }]
                }, {
                    path: 'team',
                    model: 'Team',
                    match: { isDeleted: false },
                    populate:
                    {
                        path: 'users',
                        model: 'User',
                        select: '_id userName firstName profilePicture login jobTitle creationDate'
                    }
                }]
                ).then((newWorkspace) => {
                    User.findOneAndUpdate({ _id: user._id }, { $pull: { rights: ObjectId(right._id) } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((newUser) => {
                        historyController.createHistory({
                            workspaceId : newWorkspace._id,
                            action: 'Delete',
                            actionDescription : 'DELETE_USER_FROM_WORKSPACE',
                            type:'Workspace',
                            targetId : newWorkspace._id,
                            sender: req.userId,
                            receiver: newUser._id
                        });
                        res.send({ newWorkspace,newUser });
                    });
                });
            }
        })
    }

};

exports.deleteWorkspace =  (req, res, next) => {
    Right.find({ user: ObjectId(req.userId) }).then((rights) => {
        Workspace.updateOne({ _id: req.params.id,"rights": { "$in": rights } }, { isDeleted : true }, { new: true }, (err, workspace) => {
            if (err) {
                res.status(500).send(err)
            } else {
                res.send(workspace)
            }
        });
    }).catch(error => res.status(500).send(error));
};


