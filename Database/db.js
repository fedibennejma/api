var mongoose=require('mongoose');
require('dotenv').config()

mongoose.connect(/*'mongodb://localhost:27017/slidzo' ||*/ process.env.MONGODB_URI);

console.log(process.env.MONGODB_URI , "process.env.MONGODB_URI ")

