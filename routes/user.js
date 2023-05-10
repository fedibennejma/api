var express = require('express');
var router = express.Router();
var User = require('../models/User');
var Presentation = require('../models/Presentation');
var Team = require('../models/Team');
var Workspace = require('../models/Workspace');
var Right = require('../models/Right');
var Payment = require('../models/Payment');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authJwt = require('../middlewares/authJwt');
const config = require("../bin/auth.config.js");
const UserController = require('../controllers/UserController');
const HistoryController = require('../controllers/HistoryController');
const mailCtrl = require('../controllers/MailController');
const { verifyToken } = require('../middlewares/authJwt');
const { cloudinary } = require('../bin/cloudinary');
const PresentationController = require('../controllers/PresentationController');
var ObjectId = require('mongodb').ObjectID;
const Notification = require('../models/Notification');
var Client = require('node-rest-client').Client;
var client = new Client();

/**
 * Authentifcate as another user by admin
 * adauuscnx => admin + authentification + user + connection
 */
router.post('/adauuscnx', [authJwt.verifyToken, authJwt.isAdmin], function (req, res) {
  const { login } = req.body;
  User.findOne({ login: login }, function (err, user) {
    if (err) {
      console.error(err);
      res.status(500).send('Internal error please try again');
    } else if (!user) {
      res.status(401).send('User not found');
    } else {
      generateToken(user, res);
    }
  });
});

router.post('/', [authJwt.credentialsNotEmpty], function (req, res) {
  const { login, fullName, userName, password } = req.body;

  User.find({ $or: [{ login: login }, { userName: userName }] }, function (err, results) {
    if (err) {
      res.status(404).send('error while checking if user exists, please retry later');
    }

    if (results.length) {
      res.status(500).send('user already exists');
    } else {
      let user = createUserAndData(login, password, userName, fullName);
      const token = jwt.sign({ login, fullName, userName }, config.activateToken, { expiresIn: '20m' })
      user ? user.save(function (err) {
        if (err)
          res.send(err);
        else {
          mailCtrl.sendMailConfiramtion({ login, token });
          res.send({ message: 'Check you email' });
        }
      }) : res.status(404);
    }
  })
});

router.get('/', [authJwt.verifyToken, authJwt.isAdmin], function (req, res) {
  User.find({ isActive: true }, function (err, users) {
    res.send(users)
  }).sort({ lasLoginDate: 'desc' })
})

router.post('/logout',/* [authJwt.verifyToken], */function (req, res) {
  HistoryController.createHistory({
    action: 'Logout',
    actionDescription: 'Logout',
    sender: req.userId || undefined,
    browser: req.body.browser
  });
  res.send('Logout')
});

router.post('/authenticate', function (req, res) {
  const { login, password } = req.body;
  let currentDate = new Date().toISOString();
  User.findOne({ login: login}, function (err, user) {
    if (err) {
      console.error(err);
      res.status(500).send('Internal error please try again');
    } else if (!user) {
      res.status(401).send('User not found');
    } else {
      if (!user.isVerified) {
        res.status(401).send('Please confirm your email to login');
      } else {
        user.isCorrectPassword(password, function (err, same) {
          if (err) {
            res.status(500).send('Internal error please try again');
          } else if (!same) {
            res.status(401).send('Incorrect email or password');
          } else {
            if (user?.licenseExpiration && Date.now() >= user?.licenseExpiration) { // add admin check to not enter here
              /*HistoryController.createHistory({
                action: 'Login_attempt_expired',
                actionDescription: 'Login_attempt_expired',
                sender: user._id,
                browser: req.body.browser
              });*/
              return generateFakeToken(user, res);

              res.status(402).send('Expired licence');
              return;
            }

            user.lasLoginDate = Date.now()
            user.save()
            HistoryController.createHistory({
              action: 'Login',
              actionDescription: 'Login',
              sender: user._id,
              browser: req.body.browser
            });
            generateToken(user, res);
          }
        });
      }
    }
  });
});

router.get('/checkToken', [authJwt.verifyToken, authJwt.isAdmin], function (req, res) {
  res.sendStatus(200);
});

/**
 * Method to generate token
 */
generateToken = (user, res) => {
  const payload = { id: user._id };
  const token = jwt.sign(payload, config.secret, {
    expiresIn: '9h'
  });
  const refreshToken = jwt.sign(payload, config.secret, {
    expiresIn: '9h'
  });

  res.status(200).send({
    id: user._id,
    userName: user.userName,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePicture: (user.profilePicture !== null && user.profilePicture !== undefined) ? user.profilePicture.overview : "https://i2.wp.com/avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BF-10.png?ssl=1",
    accessToken: token,
    refreshToken: refreshToken,
    type: user.type,
    companyName: user.companyName,
    phone: user.phone,
    login: user.login,
    jobTitle: user.jobTitle,
    tutorialsCategory: user.tutorialsCategory,
    selectedTeam: user.selectedTeam,
    credits: user.credits
  });
}

/**
 * Could be same function as generateToken but separated for security. Same logic, we just add isAccountExpired and 10s expiration
*/
generateFakeToken = (user, res) => {
  const payload = { id: user._id, isAccountExpired: true };
  const token = jwt.sign(payload, config.secret, {
    expiresIn: '10s',
  });

  res.status(200).send({
    id: user._id,
    userName: user.userName,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePicture: (user.profilePicture !== null && user.profilePicture !== undefined) ? user.profilePicture.overview : "https://i2.wp.com/avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BF-10.png?ssl=1",
    accessToken: token,
    type: user.type,
    companyName: user.companyName,
    phone: user.phone,
    login: user.login,
    jobTitle: user.jobTitle,
    tutorialsCategory: user.tutorialsCategory,
    selectedTeam: user.selectedTeam,
    isAccountExpired: true
  });
}

getInitials = (fullName) => {
  let initialsString = ''
  if (fullName && fullName !== '') {
    let initials = fullName.split(' ').map(element => element.charAt(0))
    initials.map((element) => initialsString += element)
  }

  return initialsString;
}

createUserAndData = (login, password, userName, fullName, picture, facebookId, googleID) => {
  let initialsString = getInitials(fullName)
  var user = new User({
    login: login,
    password: password,
    userName: userName,
    firstName: fullName,
    profilePicture: {
      overview: picture ? picture : "https://i2.wp.com/avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/" + initialsString.toUpperCase() + "-1.png?ssl=1"
    },
    facebookId: facebookId,
    googleID: googleID,
    teams: [],
    rights: []
  })

  // All this needs to be cleaned and put into different functions in the controllers
  const team = new Team({
    name: fullName + ' team',
    description: 'First team created by ' + fullName + '.',
    users: [user._id]
  });

  let workspace = new Workspace({
    name: 'Personal workspace',
    description: 'The personal workspace of ' + fullName + '.',
    team: ObjectId(team._id),
    isPersonal: true
  });

  const right = new Right({
    user: user,
    workspace: ObjectId(workspace._id)
  });

  team.workspaces = [workspace._id];
  workspace.rights = [right._id];

  team.save((teamErr, resultTeam) => {
    if (!teamErr && resultTeam) {
      workspace.save((workspaceErr, resultWorkspace) => {
        if (!workspaceErr && resultWorkspace) {
          HistoryController.createHistory({
            workspaceId : resultWorkspace._id,
            action: 'Add',
            actionDescription : 'CREATED_WORKSPACE',
            type:'Workspace',
            targetId : resultWorkspace._id,
            sender: user._id,
            receiver:user._id
          });
          let notification = new Notification({
            type: 'Workspace',
            sender: user._id,
            receiver: user._id,
            targetId: resultWorkspace._id,
            name: 'Creation of workspace',
            description: 'Created a new workspace'
          })

          notification.save();

          right.save();
          // should be in a loop of an array we get from the seeder
          /*["60bab5094a84c12ce0c6f085", "60d4ccb71ae49800170b0617", "606af13a90123003323d2844"].map((_id) => {
            PresentationController.copyPresentation({ params: { id: ObjectId(_id) }, userId: user._id,  body: {workspaceId: workspace._id}, keepName: true });
          });*/

          /*
          PresentationController.copyPresentation({ params: { id: ObjectId("614083e6da63d63bdc9b216a") }, userId: user._id,  body: {workspaceId: workspace._id}, keepName: true });
          PresentationController.copyPresentation({ params: { id: ObjectId("622c7f0a769bff0018850aca") }, userId: user._id,  body: {workspaceId: workspace._id}, keepName: true });
          PresentationController.copyPresentation({ params: { id: ObjectId("616043b4cf200332960d7a05") }, userId: user._id,  body: {workspaceId: workspace._id}, keepName: true });
          */
          // PresentationController.copyPresentation({ params: { id: ObjectId("606af13a90123003323d2844") }, userId: user._id,  body: {workspaceId: workspace._id}, keepName: true });
        }
      })
    }
  })

  // since we are sure that it's the first time we'll add an element we don't need a push
  user.teams = [team._id];
  user.rights = [right._id];
  return user;
}

/**
 * facebook authentification 
 */
router.post('/facebookAuth', [authJwt.checkFacebookToken], function (req, res) {
  const { data } = req.body;
  if (data.userID) {
    User.findOne({ $or: [{ facebookId: data.userID }, { login: data.email }] }, function (err, user) {
      if (err) {
        console.error(err);
        res.status(500).send('Internal error please try again');
      } else if (!user) {
        let newUser = createUserAndData(data.email, data.userID + data.email, data.name, data.name, data.picture.data.url, data.userID);
        newUser.save(function (err) {
          if (err)
            res.send(err);
          else {
            generateToken(newUser, res);
          }
        })

      } else {
        if (user.facebookId !== null && user.facebookId !== undefined && user.facebookId === data.userID) {
          user.lasLoginDate = Date.now()
          user.save()
          HistoryController.createHistory({
            action: 'Login',
            actionDescription: 'Login',
            sender: user._id,
            browser: req.body.browser
          });
          generateToken(user, res);
        } else {
          res.status(500).send('This email is already used');
        }
      }
    });
  } else {
    res.status(500).send('Please connect');
  }
});

/**
 * google authentification 
 */
router.post('/googleAuth', [authJwt.checkGoogleToken], function (req, res) {
  const { data } = req.body;
  if (data.googleId) {
    User.findOne({ $or: [{ googleID: data.googleId }, { login: data.profileObj.email }] }, function (err, user) {
      if (err) {
        console.error(err);
        res.status(500).send('Internal error please try again');
      } else if (!user) {
        let newUser = createUserAndData(data.profileObj.email, data.googleId + data.profileObj.email, data.profileObj.name, data.profileObj.givenName, data.profileObj.imageUrl, undefined, data.googleId);
        newUser.save(function (err) {
          if (err)
            res.send(err);
          else {
            generateToken(newUser, res);
          }
        })
      } else {
        if (user.googleID !== null && user.googleID !== undefined && user.googleID === data.googleId) {
          HistoryController.createHistory({
            action: 'Login',
            actionDescription: 'Login',
            sender: user._id,
            browser: req.body.browser
          });
          user.lasLoginDate = Date.now()
          user.save()
          generateToken(user, res);
        } else {
          res.status(500).send('This email is already used');
        }
      }
    });
  } else {
    res.status(500).send('Please connect');
  }
});

router.post('/email-activate', function (req, res) {
  const { token } = req.body;
  if (token) {
    jwt.verify(token, config.activateToken, (err, decodedToken) => {
      if (err) {
        return res.status(403).send('Incorrect or Expired token');
      }
      const { login, fullName, userName } = decodedToken;
      User.findOneAndUpdate(
        { login: login },
        { $set: { isVerified: true } },
        { new: true },
        (error, user) => {
          if (error)
            res.status(500).send(error)
          else
            return generateToken(user, res);
        });
    })
  } else {
    return res.status(500).send('Error activate email');
  }
});

router.post('/reset-password', function (req, res) {
  const { login } = req.body;
  if (login) {
    User.findOneAndUpdate({ login: login }, { pwdReset: false }, { new: true }, function (err, user) {
      if (err) {
        res.status(404).send('error while checking if user exists, please retry later');
      }
      if (!user) {
        res.status(500).send('user not found');
      }
      else {
        const token = jwt.sign({ login }, config.activateToken, { expiresIn: '20m' })
        mailCtrl.sendMailResetPassword({ login, token });
        res.send({ message: 'Check you email' });
      }
    })
  } else {
    res.status(500).send('Please provide all your details');
  }
});

router.post('/change-password', function (req, res) {
  const { token, newPassword } = req.body;
  if (token && newPassword) {
    jwt.verify(token, config.activateToken, (err, decodedToken) => {
      if (err) {
        return res.status(403).send('Incorrect or Expired token');
      }
      const { login } = decodedToken;
      User.findOne({ login: login }, function (err, user) {
        if (err) {
          res.status(404).send('error while checking if user exists, please retry later');
        }
        if (!user) {
          res.status(500).send('user not found');
        }
        else {
          if (user.pwdReset) {
            res.status(500).send('password already reset');
          } else {
            user.password = newPassword;
            user.pwdReset = true;
            user.save((err) => {
              if (err)
                res.status(500)
              else
                return generateToken(user, res);
            })
          }
        }
      })
    })
  } else {
    res.status(500).send('Please provide all your details');
  }
});

router.post('/update', async function (req, res) {
  const { username, company, phone, jobTitle, login, profilePicture, oldProfilePicture } = req.body;
  try {
    let picture = ''
    // check if profile picture changed 
    if (profilePicture === oldProfilePicture) {
      picture = oldProfilePicture
    } else {
      const uploadedResponse = await cloudinary.uploader.
        upload(profilePicture, {
          upload_preset: 'tto6fni3',
          width: 200,
          height: 200,
          crop: "limit",
          timeout: 60000,
        });
      picture = uploadedResponse.url;
    }
    // update user
    User.findOneAndUpdate(
      { login: login },
      {
        userName: username,
        companyName: company,
        phone: phone,
        jobTitle: jobTitle,
        profilePicture: {
          overview: picture
        }
      },
      { new: true },
      (error, user) => {
        if (error)
          return 'error while updating user';
        else
          res.status(200).send({
            id: user._id,
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: (user.profilePicture !== null && user.profilePicture !== undefined) ? user.profilePicture.overview : "https://i2.wp.com/avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BF-10.png?ssl=1",
            type: user.type,
            companyName: user.companyName,
            phone: user.phone,
            login: user.login,
            jobTitle: user.jobTitle,
            tutorialsCategory: user.tutorialsCategory,
            selectedTeam: user.selectedTeam
          });
      })
  } catch (error) {
    console.error(error);
    res.status(500).json({ err: 'error cloudinary' });
  }
});

/**
 * update user tutorial's category
 */
router.post('/delete-category', function (req, res) {
  const { login, newCategories } = req.body;
  User.findOneAndUpdate(
    { login: login },
    { $set: { tutorialsCategory: newCategories } },
    { new: true },
    (error, user) => {
      if (error)
        return 'error while updating user';
      else if (user && user !== null)
        return res.status(200).send({
          id: user._id,
          userName: user.userName,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: (user.profilePicture !== null && user.profilePicture !== undefined) ? user.profilePicture.overview : "https://i2.wp.com/avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BF-10.png?ssl=1",
          type: user.type,
          companyName: user.companyName,
          phone: user.phone,
          login: user.login,
          jobTitle: user.jobTitle,
          tutorialsCategory: user.tutorialsCategory,
          selectedTeam: user.selectedTeam
        });
    })
});

/**
 * select team so we can see it in overview
 */
router.post('/select-team', [authJwt.verifyToken], function (req, res) {
  const { teamId } = req.body
  User.findOneAndUpdate({ _id: req.userId }, { selectedTeam: teamId }, { new: true }, function (err, user) {
    if (err) {
      res.status(404).send('error while checking if user exists, please retry later');
    }
    if (!user) {
      res.status(500).send('user not found');
    }
    else {
      res.status(200).send({
        id: user._id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: (user.profilePicture !== null && user.profilePicture !== undefined) ? user.profilePicture.overview : "https://i2.wp.com/avatar-management--avatars.us-west-2.prod.public.atl-paas.net/initials/BF-10.png?ssl=1",
        type: user.type,
        companyName: user.companyName,
        phone: user.phone,
        login: user.login,
        jobTitle: user.jobTitle,
        tutorialsCategory: user.tutorialsCategory,
        selectedTeam: user.selectedTeam
      });
    }
  })
});

router.get('/lengths', [authJwt.verifyToken], function (req, res) {
  Presentation.countDocuments({ user: req.userId, isDeleted: false }).exec((presentation_error, presentation_count) => {
    if (presentation_error) {
      res.status(500).send(presentation_error)
    } else {
      Right.find({ user: req.userId }).then((rights) => {
        Workspace.countDocuments({ "rights": { "$in": rights }, isDeleted: false }).exec((workspace_error, workspace_count) => {
          if (workspace_error) {
            res.status(500).send(workspace_error)
          } else {
            Team.countDocuments({ users: req.userId, isDeleted: false }).exec((team_error, team_count) => {
              if (team_error) {
                res.status(500).send(team_error)
              } else {
                Presentation.countDocuments({ type: { $in: ['template', 'template3D'] }, isDeleted: false }).exec((template_error, template_count) => {
                  if (template_error) {
                    res.status(500).send(template_error)
                  } else {
                    res.status(200).send({
                      presentation_count,
                      workspace_count,
                      team_count,
                      template_count
                    });
                  }
                })
              }
            })
          }
        })
      })
    }
  })
})

router.post(`/payment/:userId`, (req, res) => {
  let userId = req.params.userId;
  
  if (!userId) return res.status(404).send('no user id provided');

  User.findOne({ _id: ObjectId(userId) }, function (err, user) {
    if (err) {
      res.status(500).send('Internal error please try again');
    } else if (!user) {
      res.status(401).send('User not found');
    } else {
      let payment = new Payment({
        amount: req.body.amount,
        token: req.body.token,
        user: userId,
        transaction_id: req.body.transaction_id,
        buyer_id: req.body.buyer_id
      })

      payment.save((err, paid) => {
        if (err)
          res.status(500).send('Internal error please try again');
        else if (paid) {
          var currentDate = Date.now(); //new Date();
          var expiration = new Date(currentDate);
          expiration.setDate(expiration.getDate() + 30);

          user.licenseExpiration = expiration;

          user.save((err, us) => {
            if (us)
              return generateToken(user, res);
            else
              return res.status(404).send()
          });
        }
      });
    }
  });
})


/**
 * Should be the official way to check. But the client returns a buffer object. Once we settle this, this should be the official way
 */
router.post('/payment/check', (req, res) => {
  let token = req.body.token;

  var args = {
    headers: {
      'content-Type': 'application/json',
      'Authorization': 'Token ff69c14c121ba99000c09fc310bcf9dd2d0694a9'
    }
  };

  client.get(`https://sandbox.paymee.tn/api/v1/payments/${token}/check`, args, (data, response) => {
    let jsonData = JSON.stringify(data?.toString('utf-8'));
    return res.status(200).send({jsonData});
  })
})

router.post('/search', [authJwt.verifyToken], UserController.searchUser)
router.post('/search-users', [authJwt.verifyToken, authJwt.isAdmin], UserController.searchUserForAdmin)
module.exports = router;
