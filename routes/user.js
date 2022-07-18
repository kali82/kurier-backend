const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uid = require('rand-token').uid;
var multer = require('multer');
const logger = require('../logger');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');
const user = require('../models/user');
var fs = require('fs');
var path = require('path');

const secret = '1234';
//const secret = process.env.tokenSecret;
const accessTokenExpiresIn = 3600;

const uploadFile = require("../middleware/upload");

router.post("/upload", async (req, res) => {
  await uploadFile(req,res).then({
    
  })
  let oldPath = __basedir + "/resources/static/assets/uploads/TEMP.png"
  let newPath = __basedir + "/resources/static/assets/uploads/"+req.body.login+".png"
  try {
    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }
    else{
    fs.rename(oldPath,newPath, (err)=>{
      console.log(err)
    })
    res.status(200).send({
      message: "Uploaded the file successfully: " + req.file.originalname,
    });
  }
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
});
router.get("/files", (req, res) => {
  const directoryPath = __basedir + "/resources/static/assets/uploads/";



  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      res.status(500).send({
        message: "Unable to scan files!",
      });
    }
    let fileInfos = [];
    files.forEach((file) => {
      fileInfos.push({
        name: file,
        url: baseUrl + file,
      });
    });
    res.status(200).send(fileInfos);
  });
});
router.get("/files/:name", (req, res) => {
  const fileName = req.params.name;
  const directoryPath = __basedir + "/resources/static/assets/uploads/";
  var img = fs.readFileSync(directoryPath + fileName);
  res.writeHead(200, {'Content-Type': 'image/gif' });
  res.end(img, 'binary');
  // res.download(directoryPath + fileName, fileName, (err) => {
  //   if (err) {
  //     res.status(500).send({
  //       message: "Could not download the file. " + err,
  //     });
  //   }
  // });
});
////////////////////////////

router.get('/listUsers', async (req, res) => {
  users = [];
 
  User.find({ }).stream()
  .on('data', function(doc){
    if(doc._id !="5ead7ab5556feb3794d8b0a5" ) users.push(doc)
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
        message: 'Lista została pobrana',
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
        //reject(error);
      });
  });
//////////////////////////////////////////////////////////

router.patch('/delete', (req, res, next) => {
  console.log(req)
  const filter = {login: req.body.login};
  User.findOneAndRemove(filter, (err,doc)=>{
    if (err) {
      console.log("Something wrong when deleting user!");
  } else {
    res.status(201).json({
      message: 'Usunięto użytkownika.'
    });
  }
  })


});




//////////////////////////////////////////////////////////

router.post('/create', (req, res, next) => {
  bcrypt.hash(req.body.password, 10).then(hash => {
    const user = new User({
      login: req.body.login,
      password: hash, 
      avatar: baseUrl+"/"+req.body.login+".png"
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
});
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

        return res
        .status(500).json({message: " " + error,});
      }
    )
    .then(result => {
      if (!result) {
        logger.info(req.originalUrl.concat(' response'));

        return res.status(401)
       // .header('Access-Control-Allow-Origin', 'XD')
        .json({
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
