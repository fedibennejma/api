/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-26 12:53:19
 * @modify date 2021-07-28 14:31:05
 * @desc [description]
 */
var ObjectId = require('mongodb').ObjectID;
const Team = require('../models/Team');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Right = require('../models/Right');
const jwt = require('jsonwebtoken');
const config = require("../bin/auth.config.js");
const mailController = require("../controllers/MailController");
const historyController = require("../controllers/HistoryController");

exports.createTeam = (req, res, next) => {
    const usersArray = []
    usersArray.push(ObjectId(req.userId));
    findUsersAndReturnId(req.body.users, res).then((result) => {
        const team = new Team({
            name: req.body.name,
            description: req.body.description,
            temporaryUsers: result,
            users: usersArray
        });
        team.save((err, team) => {
            if (err) {
                res.status(500).send(err)
            } else {
                team.temporaryUsers.map((user) => {
                    const token = jwt.sign({ login: user.login, team: team._id, isVerified: user.isVerified }, config.activateToken, { expiresIn: '48h' })
                    mailController.sendMailInivitationTeam({ login: user.login, token },res);
                })
                affectTeamToUsers(team);
                team.populate({
                    path: 'users',
                    model: 'User',
                    select: '_id userName firstName profilePicture login jobTitle creationDate'
                }, (err, result) => {
                    res.send(result)
                })
            }
        })
    });
};

affectTeamToUsers = (team) => {
    User.bulkWrite(
        team.users.map((user) => (
            {
                updateOne: {
                    filter: { _id: user._id },
                    update: { $addToSet: { teams: ObjectId(team._id) }, $set: { isVerified: true } },
                },
            }
        )));
}

exports.affectNewUserToTeam = (req, res) => {
    findUsersAndReturnId(req.body.users, res).then((users) => {
        Team.findOneAndUpdate({ _id: ObjectId(req.body.teamId) }, { $addToSet: { temporaryUsers: users } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((team) => {
            users.map((user) => {
                const token = jwt.sign({ login: user.login, team: team._id, isVerified: user.isVerified }, config.activateToken, { expiresIn: '48h' })
                mailController.sendMailInivitationTeam({ login: user.login, token }, res)
            })
            res.send(team);
        });
    })
}


exports.acceptInvitation = (req, res, next) => {
    let { token } = req.body;
    jwt.verify(token, config.activateToken, (err, decodedToken) => {
        if (err) {
            return res.status(403).send('Incorrect or Expired token');
        } else {
            let { login, team, isVerified } = decodedToken;
            User.findOne({ login: login }, function (err, user) {
                if (err) {
                    res.status(500).send(err)
                } else {
                    Team.findOne({ _id: team }, function (err, team) {
                        if (err) {
                            res.status(500).send(err)
                        } else {
                            const array = [...team.temporaryUsers]
                            team.temporaryUsers = array.filter((element) => !element.equals(user._id));
                            if (!team.users.includes(user._id)) {
                                team.users.push(user._id)
                                affectTeamToUsers(team);
                            }
                            team.save((err) => {
                                if (err)
                                    res.status(500)
                                else
                                    return res.send({ token: token, isVerified: isVerified })
                            })
                        }
                    })
                }
            })

        }

    })
};


findUsersAndReturnId = async (users, res) => {
    let temporaryUsers = [];
    await Promise.all(users.map((user) => {
        return User.findOne({ login: user }).then((client) => {
            if (!client) {
                var newUser = new User({
                    login: user,
                    password: ''
                })
                temporaryUsers.push(newUser)
                newUser.save(function (err) {
                    if (err)
                        res.send(err);
                })
            } else {
                temporaryUsers.push(client)
            }
        });
    }));
    return temporaryUsers;
}

exports.getAllTeam = (req, res, next) => {
    Team.find({ isDeleted: false }, (err, teams) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(teams)
    });
};

exports.getTeam = (req, res, next) => {
    Team.findOne({ _id: req.params.id }, (err, team) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(team)
    })
};

exports.getTeamsByUser = (req, res, next) => {
    User.findOne({ _id: req.userId }, (err, user) => {
        if (err) {
            res.status(500).send(err)
        } else if (user && user !== null){
            res.send(user.teams)
        }
    }).populate({
        path: 'teams',
        model: 'Team',
        match: { isDeleted: false },
        populate:
        [{
            path: 'users',
            model: 'User',
            select: '_id userName firstName profilePicture login jobTitle creationDate'
        },
        {
            path: 'workspaces',
            match: { isDeleted: false },
        }
    ]
    });
};


exports.updateTeam = (req, res) => {
    Team.updateOne({ _id: req.params.id }, { ...req.body, _id: req.params.id }, { new: true }, (err, team) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(team)
    });
};


affectRightsToUser = (user, right) => {
    User.findOneAndUpdate({ _id: user }, { $addToSet: { rights: right } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => {
        console.log(result);
    });
}


/**
 * Affects workspace to a team
 */
exports.affectWorkspaceToTeam = async (req, res) => {
    let { _id, workspace, users } = req.body;
    // add user connected to users of workspace
    users.push(ObjectId(req.userId))
    let newWorkspace = new Workspace({
        name: workspace.name,
        description: workspace.description,
        team: ObjectId(_id)
    });
    if (users.length > 0) {
        let newRights = [];
        await Promise.all(users.map((user) => {
            const newRight = new Right({
                user: user,
                workspace: newWorkspace
            });
            if (user.login) {
                // send mail to all invited users
                mailController.sendMailInivitationWorkspace({ user, workspace: newWorkspace });
                historyController.createHistory({
                    workspaceId : newWorkspace._id,
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
        newWorkspace.rights = newRights;
    }
    newWorkspace.save((err, workspace) => {
        if (err) {
            res.status(500).send(err)
        } else {
            // affect workspace To team
            Team.findOneAndUpdate({ _id: ObjectId(_id) }, { $addToSet: { workspaces: workspace } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => { });
            // populate workspace before sending to get all users of the workspace
            workspace.populate(
                [{
                    path: 'rights',
                    model: 'Right',
                    populate: [{
                        path: 'user',
                        model: 'User',
                        select: '_id userName firstName profilePicture login jobTitle creationDate'
                    }]
                },
                {
                    path: 'team',
                    model: 'Team',
                }], (err, result) => {
                    res.send({ teamId: _id, workspace });
                }
            )
        }
    })
}

exports.deleteTeam = (req, res) => {
    Team.updateOne({ _id: req.params.id, users: ObjectId(req.userId) },
        { isDeleted: true },
        { new: true },
        (err, team) => {
            if (err) {
                res.status(500).send(err)
            } else
                res.send(team)
        });
};
/**
 * delete user from team
 * @param {*} req 
 * @param {*} res 
 */
exports.deleteUserFromTeam = (req, res) => {
    const { user, team } = req.body;
    if (user && team) {
        Team.findOneAndUpdate({ _id: ObjectId(team._id) }, { $pull: { users: ObjectId(user._id) } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((newTeam) => {
            User.findOneAndUpdate({ _id: ObjectId(user._id) }, { $pull: { teams: ObjectId(team._id) } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((newUser) => {
                res.send({ newTeam, newUser });
            });
        });
    }
}

/**
 * @Author: FediBn
 * Get the users of a team from workspaceId
 * @param {*} req 
 * @param {*} res 
 */
exports.getTeamMembersFromWorkspace = (req, res) => {
    const { workspaceId } = req.params;
    Workspace.findOne({ _id: ObjectId(workspaceId) }, (err, workspace) => {
        if (workspace) {
            Team.findOne({ _id: workspace.team }, (err, team) => {
                if (team)
                    res.send(team.users)
                else
                    res.send([])
            }).populate({
                path: 'users',
                model: 'User',
                select: '_id userName firstName profilePicture login'
            })
        } else
            res.status(500).send()
    })

}
