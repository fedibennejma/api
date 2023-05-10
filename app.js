var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var db = require('./Database/db');


var indexRouter = require('./routes/index');
var userRouter = require('./routes/user');
var presentationRouter = require('./routes/presentation');
var slideRouter = require('./routes/SlideRouter');
var folderRouter = require('./routes/folderRouter');
var assistantRouter = require('./routes/assistantRouter');
var themeRouter = require('./routes/themeRouter');
var invitationRouter = require('./routes/invitationRouter');
var blogRouter = require('./routes/blog');
var teamRouter = require('./routes/teamRouter');
var workspaceRouter = require('./routes/workspaceRouter');
var commentRouter = require('./routes/commentRouter');
var sceneRouter = require('./routes/sceneRouter');
var notificationRouter = require('./routes/notificationRouter');
var contactRouter = require('./routes/contactRouter');
var historiesRouter = require('./routes/historyRouter');
var mediaRouter = require('./routes/mediaRouter');
var statsRouter = require('./routes/statsRouter');

var endpointsConfig = require('./bin/endpoints.config');

var app = express();
app.use(cors());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('endpointsConfig', endpointsConfig);

app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/presentation', presentationRouter);
app.use('/slide', slideRouter);
app.use('/folder', folderRouter);
app.use('/assistant', assistantRouter);
app.use('/theme', themeRouter);
app.use('/invitation', invitationRouter);
app.use('/blog', blogRouter);
app.use('/team', teamRouter);
app.use('/workspace', workspaceRouter);
app.use('/comment', commentRouter);
app.use('/scene', sceneRouter);
app.use('/notification', notificationRouter);
app.use('/contact', contactRouter);
app.use('/history', historiesRouter);
app.use('/media', mediaRouter);
app.use('/stat', statsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;