var User = require('../models/User');
const Message = require('../models/Message');

let checkUserValid = (userId) => {
    return User.findOne({ _id: userId, isActive: true }, {_id: 1, userName: 1}, function (err, user) {
        if (err) 
            return null
    })
}

let searchUser = (req, res) => {
    let searchInput = req.body.searchInput.toLowerCase()
    if (searchInput !== '')
        User.find().or([{ userName: { $regex: '.*' + searchInput + '.*' } }, { login: { $regex: '.*' + searchInput + '.*' } }]).limit(10)
        .select('login userName profilePicture')
        .then(users => { 
            res.send(users)
        })
        .catch(error => { 
            res.status(500)
        })
    else
        res.send([])
}

let searchUserForAdmin = (req, res) => {
    let searchInput = req.body.searchInput.toLowerCase()
    if (searchInput !== '')
        User.find({isActive: true}).or([{ userName: { $regex: '.*' + searchInput + '.*' } }, { login: { $regex: '.*' + searchInput + '.*' } }])
        .then(users => { 
            res.send(users)
        })
        .catch(error => { 
            res.status(500)
        })
    else
        User.find({isActive: true}).sort({lasLoginDate : 'desc'})
        .then(users => { 
            res.send(users)
        })
        .catch(error => { 
            res.status(500)
        })
}

let decreaseCredits = (req, res) => {
    let userId = req.userId, 
    credits = req.credits || 50;

    if (!userId || !credits) return;

    User.findOneAndUpdate(
        { _id: userId },
        { $inc: { credits: -Math.abs(credits) } },
        (error, succes) => {
            console.log(succes)
            if (error)
                console.log('error with user credits update')
        }
    );
}

module.exports = {
    checkUserValid: checkUserValid,
    searchUser: searchUser,
    searchUserForAdmin: searchUserForAdmin,
    decreaseCredits: decreaseCredits
}