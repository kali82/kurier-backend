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
   origin: process.env.ORIGIN_URL 
  //origin: 'http://localhost:4200'
};

app.use(cors(corsOptions));

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}
app.use(allowCrossDomain);
app.use((req, res, next) => {
  logger.info(req.path.concat(' ', req.method, ' request from ', req.ip));
  next();
});

app.use('/api/user', userRoutes);
app.use('/api/consignments', consignmentRoutes);

mongoose.Promise = global.Promise;
mongoose
  .connect(
    process.env.MONGO, {
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
