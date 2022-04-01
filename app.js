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
app.use(express.static('uploads'));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
// Set EJS as templating engine 
app.set("view engine", "ejs");
const corsOptions = { 
  // origin: process.env.ORIGIN_URL 
  origin: [
    'https://kurierapka.pl',
    'https://hungry-mcnulty-330bd5.netlify.app',
    'http://localhost:4200'
  ],
  credentials: true
};

app.use(cors(corsOptions));

app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Content-Length, X-Api-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use((req, res, next) => {
  logger.info(req.path.concat(' ', req.method, ' request from ', req.ip));
  next();
});

app.use('/api/user', userRoutes);
app.use('/api/consignments', consignmentRoutes);
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
