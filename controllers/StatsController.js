const Stat = require('../models/Stat');
const User = require("../models/User");
var ObjectId = require('mongodb').ObjectID;
const ModelRepresentation = require('../util/ModelRepresentation');

/**
 * Create stats 'presentation', 'presentation3D', 'template', 'template3D', 'slide'
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.createStat = (req, res, next) => {
    const {
        reference,
        type,
        parentId,
        userId,
        isDuplicated
    } = req;
    const stat = new Stat({
        reference: reference,
        type: type,
        parentId: parentId,
        userId: userId,
        isDuplicated: isDuplicated,
        creationDate: Date.now(),
        lastSavedTime: Date.now()
    });
    stat.save((err, stat) => {
        if (err) {
            res.status(500).send(err)
        }
    })
};

/**
 * Update lastSavedTime slide
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.updateStat = (req, res, next) => {
    Stat.findOneAndUpdate({
        reference: ObjectId(req.reference)
    }, {
        lastSavedTime: Date.now()
    }, {
        new: true
    }, function (err, result) {
        if (err && res) {
            res.status(500).send(err);
        }
    })
};


findByPeriod = (period, type, res) => {
    if (period) {
        Stat.find({
            type,
            creationDate: {
                $gte: new Date(new Date() - period * 60 * 60 * 24 * 1000)
            },
            isDeleted: false
        }, function (err, result) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.send({
                    count: result.length
                });
            }
        });
    }
}

findUserByPeriod = (period, res) => {
    if (period) {
        User.countDocuments({
            creationDate: {
                $gte: new Date(new Date() - period * 60 * 60 * 24 * 1000)
            }
        }).exec((count_error, count) => {
            if (count_error) {
                res.status(500).send(count_error)
            } else {
                res.send({
                    count
                });
            }
        })
    }
}

/**
 * find stats by period and type
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.getStatByDate = (req, res, next) => {
    if (!req.params.type || !req.params.date) {
        res.status(500).send('no data');
    } else {
        let type = req.params.type;
        if (req.params.date === 'month') {
            findByPeriod(30, type, res);
        } else if (req.params.date === 'week') {
            findByPeriod(7, type, res);
        } else {
            Stat.find({
                type,
                isDeleted: false
            }, function (err, result) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.send({
                        count: result.length
                    });
                }
            });
        }
    }
};


exports.getNbrUsersStats = (req, res, next) => {
    if (req.params.date === 'week') {
        findUserByPeriod(7, res)
    } else if (req.params.date === 'month') {
        findUserByPeriod(30, res)
    } else {
        User.countDocuments().exec((count_error, count) => {
            if (count_error) {
                res.status(500).send(count_error)
            } else {
                res.send({
                    count
                });
            }
        })
    }
};


/* exports.getBestUsersStats = (req, res, next) => {
    Stat.aggregate([
        {
            $group: {
                _id: "$userId",
                count: {
                    $count: {}
                }
            },
        },
        {
            $sort: {
                count: -1
            }
        },
        {
            $limit: 2
        }
    ], function (err, bestUsers) {
        if (err) {
            res.status(500).send(err);
        } else {
            const usersArray = [];
            if (bestUsers) {
                bestUsers.map((user) => {
                    usersArray.push(user._id);
                });
                User.find({
                    _id: usersArray
                }, function (err, result) {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        res.send(result);
                    }
                }).select('login userName profilePicture')
            }
        }
    })
}; */




findUsersCounts = async (bestUsers,usersArray) => {
    const promises = bestUsers.map(async (user) => {
        await Stat.find({userId : user._id}, async (err,statsFetched) => {
            let presentationsCount = 0;
            let templatesCount = 0;
            let slidesCount = 0;
            let user = null;
            await statsFetched.map((stat) => {
                if(stat.type === 'presentation' || stat.type === 'presentation3D') {
                    presentationsCount++;
                } else if (stat.type === 'template' || stat.type === 'template3D') {
                    templatesCount++;
                } else {
                    slidesCount++;
                }
                user = stat.userId
            })
            const obj = {
                user,
                presentationsCount,
                templatesCount,
                slidesCount
            }
            usersArray.push(obj)
        }).populate({
            path: 'userId',
            model: 'User',
            select: '_id userName login profilePicture'
        })
    })
    await Promise.all(promises)
    return new Promise((resolve) => {
        return resolve(usersArray);
    })
}

/**
 * find users by period and type
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
 exports.getBestUsersStats = (req, res, next) => {
    Stat.aggregate([
        { $match: { userId: { $nin: [ObjectId('6156daaea65e7d0018391ad6'),ObjectId('6220aab3ea780c63eebff0eb'),ObjectId('6135f235f573ca00184ad3c8')] } } },
        {
            $group: {
                _id: "$userId",
                count: {
                    $count: {}
                }
            },
        },
        {
            $sort: {
                count: -1
            }
        },
        {
            $limit: 3
        }
    ], function (err, bestUsers) {
        if (err) {
            res.status(500).send(err);
        } else {
            if (bestUsers) {
                const usersArray = []
                console.log(bestUsers.length)
                findUsersCounts(bestUsers,usersArray).then((result) => {
                    console.log(result)
                    res.send(result)
                })
            }
        }
    })
};


exports.getBestTemplates = (req,res,next) => {
    Stat.aggregate([
        { $match: { userId: { $nin: [] } } },
        {
            $group: {
                _id: "$parentId",
                count: {
                    $count: {}
                }
            },
        },
        {
            $sort: {
                count: -1
            }
        },
        {
            $limit: 3
        }
    ], function (err, bestUsers) {
        if (err) {
            res.status(500).send(err);
        } else {
            if (bestUsers) {
                const usersArray = []
                console.log(bestUsers.length)
                findUsersCounts(bestUsers,usersArray).then((result) => {
                    console.log(result)
                    res.send(result)
                })
            }
        }
    })
}