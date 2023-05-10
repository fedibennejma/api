const nodemailer = require('nodemailer');
const jade = require('jade');

const transporter = nodemailer.createTransport({
    port: 465, // true for 465, false for other ports
    host: "smtp.gmail.com",
    auth: {
        user: 'noreplyslydesapp@gmail.com',
        pass: 'cdravpavhlllybxg',
    },
    secure: true,
});

/**
 * Mail confirmation using ConfirmationMailTemplate.jade
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.sendMailConfiramtion = (req, res, next) => {
    const {
        login,
        token
    } = req;
    let content = jade.renderFile('./views/ConfirmationMailTemplate.jade', {
        link: `${process.env.CLIENT_URL}/start/confirmation/${token}`
    });
    const mailData = getMailData(login, `Account activation`, content);
    transporter.sendMail(mailData, function (err, info) {
        if (err) {
            console.error(err);
        } else {
            console.info('Mail sent successfully');
        }
    });
};

/**
 * Reset password email using ResetPasswordMailTemplate.jade
 */
exports.sendMailResetPassword = (req, res, next) => {
    const {
        login,
        token
    } = req;
    let content = jade.renderFile('./views/ResetPasswordMailTemplate.jade', {
        login,
        link: `${process.env.CLIENT_URL}/start/change/${token}`
    });
    const mailData = getMailData(login, `Reset password`, content);
    transporter.sendMail(mailData, function (err, info) {
        if (err) {
            console.error(err);
        } else {
            console.info('Mail sent successfully');
        }
    });
};

/**
 * Invitation to a team email using InvitationTeamMailTemplate.jade
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.sendMailInivitationTeam = (req, res, next) => {
    const {
        login,
        token
    } = req;
    let content = jade.renderFile('./views/InvitationTeamMailTemplate.jade', {
        login,
        link: `${process.env.CLIENT_URL}/start/invitation/${token}/${login}`
    });
    const mailData = getMailData(login, `Team member invitation`, content);
    transporter.sendMail(mailData, function (err, info) {
        if (err) {
            console.error(err);
        } else {
            console.info('Mail sent successfully');
        }
    });
};

/**
 * Invitation to a workspace email using InvitationWorkspaceMailTemplate.jade
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.sendMailInivitationWorkspace = (req, res, next) => {
    const {
        user,
        workspace
    } = req;
    let content = jade.renderFile('./views/InvitationWorkspaceMailTemplate.jade', {
        user,
        workspace
    });
    const mailData = getMailData(user.login, `Workspace invitation`, content);
    transporter.sendMail(mailData, function (err, info) {
        if (err) {
            console.error(err);
        } else {
            console.info('Mail sent successfully');
        }
    });
};


/**
 * Invitation collaboration email using InvitationCollaborationMailTemplate.jade
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.sendMailInivitationCollaboration = (req, res, next) => {
    const {
        sender,
        receiver,
        presentation
    } = req;
    let content = jade.renderFile('./views/InvitationCollaborationMailTemplate.jade', {
        presentation: presentation,
        link: `${process.env.CLIENT_URL}/edit/${presentation.slug}`,
        sender: sender
    });
    const mailData = getMailData(receiver.login, `Invitation for a presentation on Slidzo`, content);
    transporter.sendMail(mailData, function (err, info) {
        if (err) {
            console.error(err);
        } else {
            console.info('Mail sent successfully');
        }
    });
};


let getMailData = (login, subject, content) => {
    return {
        from: 'Slidzo <noreplyslydesapp@gmail.com>',
        to: login,
        subject: subject,
        html: content
    }
}


mailContent = (contact) => {
    let mailData = {
        from: 'noreplyslydesapp@gmail.com', // sender address
        to: 'contact@slidzo.com', // contact address
        subject: ``,
        html: ``,
    };
    switch (contact.type) {
        case 'outsourcing':
            mailData.subject = 'Outsourcing a presentation';
            mailData.html = `<h2>Outsourcing a presentation : </h2>
            <p>
                name : ${contact.userName}<br>
                phone : ${contact.phone}<br>
                email : ${contact.email}<br>
                theme : ${contact.theme}<br>
                company : ${contact.company}<br>
                content : ${contact.content}<br>
            </p>`;
            return mailData;
        case 'reportBug':
            mailData.subject = 'Report a bug';
            mailData.html = `<h2>Report a bug : </h2>
                <p>
                title : ${contact.title}<br>
                content : ${contact.content}<br>
                bug_url : ${contact.bug_url}<br>
                date_url : ${contact.date_url}<br>
                </p>`;
            return mailData;
        case 'support':
            mailData.subject = 'Support requests';
            mailData.html = `<h2>Support requests : </h2>
                <p>
                userName : ${contact.userName}<br>
                email : ${contact.email}<br>
                content : ${contact.content}<br>
                </p>`;
            return mailData;
        default:
            return mailData;
    }
}

exports.sendMailContact = (req, res, next) => {
    const mailData = mailContent(req);
    transporter.sendMail(mailData, function (err, info) {
        if (err) {
            console.error(err);
        } else {
            console.info('Mail send successfully');
        }
    });
};