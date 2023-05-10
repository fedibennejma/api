const jwt = require('jsonwebtoken');
const config = require("../bin/auth.config.js");
var User = require('../models/User');
var Presentation = require('../models/Presentation');
const axios = require('axios');

const withAuth = function (req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        res.status(401).send('Unauthorized: No token provided');
    } else {
        jwt.verify(token, secret, function (err, decoded) {
            if (err) {
                res.status(401).send('Unauthorized: Invalid token');
            } else {
                req.email = decoded.email;
                next();
            }
        });
    }
}

const verifyToken = (req, res, next) => {
    let token = req.headers["x-access-token"];
    if (!token) {
        return res.status(403).send({ message: "No token provided!" });
    }
    jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized!" });
        }
        req.userId = decoded.id;
        next();
    });
}

const getUserId = (req, res, next) => {
    let token = req.headers["x-access-token"];
    if (!token) {
        return res.status(403).send({ message: "No token provided!" });
    }
    jwt.verify(token, config.secret, (err, decoded) => {
        /*if (err) {
            return res.status(401).send({ message: "Unauthorized!" });
        }*/
        req.userId = decoded.id;
        next(); 
    });
}

/**
 * Same as verifytoken but lets you pass anyway
 * @param {S} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
const verifyTokenOrNot = (req, res, next) => {
    let token = req.headers["x-access-token"];
    if (!token) {
        next();
    } else
        jwt.verify(token, config.secret, (err, decoded) => {
            if (!err && decoded) 
                req.userId = decoded.id;
            next();
        });
}

const isAdmin = (req, res, next) => {
    User.findById(req.userId).exec((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        if (user && user.type === 'kintrad') // should be changed with role id from db 
        {
            next();
            return;
        }

        res.status(403).send({ message: "Require Admin Role!" });
    });
};

/**
 * Checks if the user is the owner of a presentation
 */
const isOwner = (req, res, next) => {
    
}

const credentialsNotEmpty = (req, res, next) => {
    const { login, fullName, userName, password } = req.body;
    if (login && password && userName && login !== '' && password !== '' && userName !== '') {
        next();
        return;
    }
    return res.status(401).send("Please provide all your details");
}
/**
 * check if facebook token is correct
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const checkFacebookToken = (req, res, next) => {
    axios.get('https://graph.facebook.com/v9.0/me?fields=id&access_token=' + req.body.data.accessToken).then((response) => {
        const extractedId = response.data.id;
        const facebookId = req.body.data.userID;
        if (extractedId === facebookId) {
            next();
            return;
        } else {
            return res.status(401).send({ message: "Unauthorized!" });
        }
    }).catch(function (error) {
        return res.status(401).send("Please provide all your details");
    })
};

/**
 * check if google token is correct
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const checkGoogleToken = (req, res, next) => {
    const { data } = req.body;
    axios.get('https://oauth2.googleapis.com/tokeninfo?id_token=' + data.tokenId).then((response) => {
        const extractedId = response.data.sub;
        if (extractedId === data.googleId) {
            next();
            return;
        } else {
            return res.status(401).send({ message: "Unauthorized!" });
        }
    }).catch(function (error) {
        return res.status(401).send("Please provide all your details");
    })
};

/**
 * Checks if the user account pack is pro
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const isPro = (req, res, next) => {
    let currentDate = new Date().toISOString();
    User.findOne({_id: req.userId, licenseExpiration: { $gte: currentDate }}).exec((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        if (user && (user.subscription === 'pro' || user.subscription === 'business' || user.subscription === 'trial' || user.type === 'kintrad')) // should be changed with role id from db 
        {
            next();
            return;
        }

        res.status(403).send({ message: "Pack pro licence needed" });
    })
};

/**
 * Checks if the user account pack is pro
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
 const isBusiness = (req, res, next) => {
    let currentDate = new Date().toISOString();
    User.findOne({_id: req.userId, licenseExpiration: { $gte: currentDate }}).exec((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        if (user && (user.subscription === 'business' || user.subscription === 'trial' || user.type === 'kintrad')) // should be changed with role id from db 
        {
            next();
            return;
        }

        res.status(403).send({ message: "Pack pro licence needed" });
    })
};

/**
 * Added for AI generation to know if user has enough credits
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const hasCredits = (req, res, next) => {
    User.findById(req.userId).exec((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        if (user && user.type === 'kintrad') // for admin
        {
            next();
            return;
        }

        if (user?.credits >= 50) {
            next();
            return;
        } else {
            res.status(403).send({message: 'NO_CREDITS_PRESENTATION'})
        }
    });
};

/**
 * Added for AI generation slide to know if user has enough credits
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const hasCreditsSlide = (req, res, next) => {
    User.findById(req.userId).exec((err, user) => {
        if (err) {
            res.status(500).send({ message: err });
            return;
        }

        if (user && user.type === 'kintrad') // for admin
        {
            next();
            return;
        }

        if (user?.credits >= 25) {
            next();
            return;
        } else {
            res.status(403).send({message: 'NO_CREDITS_SLIDE'})
        }
    });
};

const authJwt = {
    verifyToken,
    isAdmin,
    withAuth,
    credentialsNotEmpty,
    checkFacebookToken,
    checkGoogleToken,
    verifyTokenOrNot,
    isPro,
    isBusiness,
    getUserId,
    hasCredits,
    hasCreditsSlide
};

module.exports = authJwt;


