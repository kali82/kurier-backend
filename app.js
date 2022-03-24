const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config({ path: './.env' });

const logger = require('./logger');
const userRoutes = require('./routes/user');
const consignmentRoutes = require('./routes/consignment');

const app = express();

app.use(express.static('files'));

app.use(bodyParser.json());

const corsOptions = { 
  // origin: process.env.ORIGIN_URL 
  origin: [
    'https://murmuring-hollows-26750.herokuapp.com/',
    'http://localhost:4200',
    //'https://kurierapka.pl',
    
  ]
};

app.use(cors(corsOptions));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// var allowCrossDomain = function(req, res, next) {
//   res.header('Access-Control-Allow-Origin', "*");
//   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
//   res.header('Access-Control-Allow-Headers', 'Content-Type');
//   next();
// }
// app.use(allowCrossDomain);
app.use((req, res, next) => {
  logger.info(req.path.concat(' ', req.method, ' request from ', req.ip));
  next();
});

app.use('/api/user', userRoutes);
app.use('/api/consignments', consignmentRoutes);
logger.info(process.env.MONGO);
let mongo = "mongodb+srv://wojtek:wojtek123@kurierappka-tqv1b.mongodb.net/dev?authSource=admin&replicaSet=kurierappka-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass%20Community&retryWrites=true&ssl=true"
mongoose.Promise = global.Promise;
mongoose
  .connect(
    mongo, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .then(
    () => {
      logger.info('Database connected sucessfully');
    },
    error => {
      logger.error('Could not connect to database: ' + error);
    }
  );

module.exports = app;
