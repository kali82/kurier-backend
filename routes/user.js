const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uid = require('rand-token').uid;

const logger = require('../logger');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');
const user = require('../models/user');

const secret = '1234';
//const secret = process.env.tokenSecret;
const accessTokenExpiresIn = 3600;

router.get('/dupa', (req,res) => {
  res.send("asdasd");
  console.log("ASDASDA")
  console.log(req.url);
})

router.get('/listUsers', async (req, res) => {
  users = [];
 
  User.find({}).stream()
  .on('data', function(doc){
    users.push(doc)
    // handle doc
  })
  .on('error', function(error){
    // handle error
    res.status(403).json({
        // m.in. Użytkownik o podanym login już istnieje
        message: 'Nie mozna pobrac listy uzytkowników.',
        error: error,
    })
    reject(error);
  })
  .on('end', function(){
      res.status(201).json({
        message: 'Lista została pobrana.',
        data: users
      })
  })

});

router.post('/getUser', async (req, res) => {
  User.find({ login: req.body.login })
      .then(user => {
        res.status(201).json({
          message: 'Dane "' + user[0].login + '" zostały pobrane.',
          user: user[0]
        });
      })
      .catch(error => {
        logger.error(req.originalUrl.concat(' error'));
        res.status(403).json({
          // m.in. Użytkownik o podanym login już istnieje
          message: 'Nie mozna pobrac danych uzytkownika.',
          error: error,
        });
        reject(error);
      });
  });


router.post('/create', (req, res, next) => {
  bcrypt.hash(req.body.password, 10).then(hash => {
    const user = new User({
      login: req.body.login,
      password: hash,
    });
    user.save().then(
      result => {
        logger.info(req.originalUrl.concat(' response'));

        res.status(201).json({
          message: 'Użytkownik "' + result.login + '" został zarejestrowany.',
          result: result,
        });
      },
      error => {
        logger.error(req.originalUrl.concat(' error'));

        res.status(403).json({
          // m.in. Użytkownik o podanym login już istnieje
          message: 'Jakiś ogólny błąd bazy danych.',
          error: error,
        });
      }
    );
  });
});

router.post('/update', async (req, res) => {
  console.log(req.body)
  const update = {
    firstName: req.body.shipperName,
    street: req.body.street, 
    house: req.body.house,
    apartment: req.body.apartment,
    city: req.body.city,
    contactPerson: req.body.contactPerson,
    phone: req.body.phone,
    email: req.body.email,
    postalCode: req.body.postalCode
  }
  const filter = {login: req.body.login};
   User.findOneAndUpdate(filter,update,{returnOriginal: false, upsert: true}, (err, doc) => {
    if (err) {
        console.log("Something wrong when updating data!");
    } else {
      res.status(201).json({
        message: 'Zaktualizowano dane "' + doc.login + '".'
      });
    }

    //console.log(doc);
});
  //const updatedDocument = await User.findOneAndUpdate(filter, update, { new: true }, function( error, result){
    // In this moment, you recive a result object or error
  //console.log(result)
    // ... Your code when have result ... //
//});
  //console.log(updatedDocument)

  //return updatedDocument;
});

router.post('/login', async (req, res, next) => {
  let fetchedUser;
  User.findOne({ login: req.body.login })
    .then(
      user => {
        if (!user) {
          logger.info(req.originalUrl.concat(' response'));
          return
        }
        fetchedUser = user;

        return bcrypt.compare(req.body.password, user.password);
      },
      error => {
        logger.error(req.originalUrl.concat(' response'));

        return res.status(500).json({
          message: "dupa "+ error,
        });
      }
    )
    .then(result => {
      if (!result) {
        logger.info(req.originalUrl.concat(' response'));

        return res.status(401).json({
          message: 'Błędne dane logowania.',
        });
      } 
      const accessToken = jwt.sign({ userId: fetchedUser._id }, secret, {
        expiresIn: accessTokenExpiresIn,
      });
      const refreshToken = uid(256);
      // na razie refreshToken nie ma terminu ważności!
      RefreshToken.updateOne(
        { userId: fetchedUser._id },
        { refreshToken: refreshToken },
        { upsert: true }
      )
        .then(() => {
          logger.info(req.originalUrl.concat(' response'));

          return res.status(200).json({
            message: 'Użytkownik zalogowany.',
            userId: fetchedUser._id,
            accessToken: accessToken,
            expiresIn: accessTokenExpiresIn,
            login: fetchedUser.login,
            refreshToken: refreshToken,
          });
        })
        .catch(err => {
          logger.error(req.originalUrl.concat(' response'));

          // dopieścić ten case
          return res.status(500).json({
            message:
              'Kredentiale ok ale zapis tokena w bazie danych nieudany.' + err,
          });
        });
    
    })
    .catch(err => {
      logger.error(req.originalUrl.concat(' error'));
      throw err;
      return res.status(401).json({
        message: err,
      });
    });
});

router.post('/accessToken', (req, res, next) => {
  const userId = req.body.userId;
  const refreshToken = req.body.refreshToken;

  RefreshToken.findOne({ refreshToken: refreshToken })
    .then(doc => {
      if (doc.userId === userId) {
        const accessToken = jwt.sign({ userId: doc.userId }, secret, {
          expiresIn: accessTokenExpiresIn,
        });
        logger.info(req.originalUrl.concat(' response'));

        res.status(200).json({
          message: 'Sesja użytkownika została przedłużona.',
          userId: doc.userId,
          accessToken: accessToken,
          expiresIn: accessTokenExpiresIn,
        });
      } else {
        logger.error(req.originalUrl.concat(' error'));

        res
          .status(401)
          .json({ message: 'Przedłuzenie sesji nie powiodło się.' });
      }
    })
    .catch(err => {
      logger.info(req.originalUrl.concat(' response'));

      res.status(401).json({
        message: 'Przedłuzenie sesji nie powiodło się.',
        error: err,
      });
    });
});

module.exports = router;
