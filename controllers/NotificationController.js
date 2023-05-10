const Notification = require('../models/Notification');

exports.getNotification = (req, res, next) => {
    Notification.find({ receiver: req.userId, isDeleted: false }).populate([
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
        },
        {
            path: 'targetId',
            model: 'Presentation' || 'Workspace',
        }
    ]).sort({ creationDate: 'desc' }).then((notifications) => {
        res.send(notifications);
    })
};

exports.openNotifications = (req, res, next) => {
    Notification.updateMany({receiver : req.userId, isDeleted : false}, { $set: { isSeen: true } },{ new: true },
        function (error, success) {
            if (error)
                res.status(500).send(error)
            else 
                res.send(success);
    });
};

exports.getNotificationsLength = (req, res, next) => {
    Notification.countDocuments({receiver : req.userId, isSeen: false,isDeleted : false}).exec((count_error, count) => {
        if(count_error) {
            res.status(500).send(count_error)
        } else {
            res.send({count});
        }
    })
};
