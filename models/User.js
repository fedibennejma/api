var mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const saltRounds = 10;
var userSchema=new mongoose.Schema
({
    login: String,
    password:{type:String,/* required:true, */minglength:6},
    name: String,
    address: String,
    phone: String,
    premium: {type: Number, default: 0},
    type: {type: String, enum: ['kintrad', 'user'], default: 'user'},
    subscription: {type: String, enum: ['trial', 'basic', 'pro', 'business', 'normal'], default: 'trial'},
    licenseExpiration: {type: Date},
    isActive: {type: Boolean, default: true},
    isVerified: {type: Boolean, default: false},
    firstName: {type: String},
    lastName: {type: String}, // to be removed
    profileURL: {type: String},
    userName: {type: String},
    publicName: {type: String}, // to be removed
    profilePicture: {
        overview: String,
        small_overview: String,
        large_overview: String
    },
    creationDate: {type: Date, default: Date.now()},
    lasLoginDate: {type: Date, default: Date.now()},
    facebookId : {type: String},
    googleID : {type: String},
    pwdReset: {type: Boolean , default:false},
    companyName : {type: String},
    jobTitle : {type: String},
    tutorialsCategory : {type:Array , default:['overview', 'dashboard', 'editor2D', 'editor3D']},
    sharedFolders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder'
    }],
    teams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }],
    rights: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Right'
    }],
    selectedTeam : {type: String},
    credits : {type: Number, default: 200}
})

userSchema.pre('save', function (next) {
    if (this.isNew || this.isModified('password')) {
        const document = this;
        bcrypt.hash(document.password, saltRounds,
            function (err, hashedPassword) {
                if (err) {
                    next(err);
                }
                else {
                    document.password = hashedPassword;
                    next();
                }
            });
    } else {
        next();
    }
});

userSchema.methods.isCorrectPassword = function (password, callback) {
    bcrypt.compare(password, this.password, function (err, same) {
        if (err) {
            console.log(err)
            callback(err);
        } else {
            console.log(same);
            callback(err, same);
        }
    });
}

userSchema.methods.isExpired = function (user, callback) {
    console.log(user)
}

module.exports = mongoose.model('User', userSchema);	