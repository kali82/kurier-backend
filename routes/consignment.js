const express = require('express');
const router = express.Router();
const jsdom = require('jsdom');
const fs = require('fs');

require('dotenv').config({
  path: 'backend/.env',
});
const logger = require('../logger');
const checkAuth = require('../middleware/check-auth');
const Structures = require('../DHL/Structures');
const DHLNodeAPI = require('../DHL/services').DHLNodeAPI;
const User = require('../models/user');
const ConsignmentExcerpt = require('../models/consignmentExcerpt');

// lista przesyłek
router.post('/', checkAuth, (req, res) => {
  console.log('1')
  new DHLNodeAPI().createClient(
    'https://dhl24.com.pl/webapi2',
   '').done(api => {});
  const userId = req.body.userId;
  let consignments = [];
  console.log('2')
  console.log(userId)
  getDbConsignments(userId)
    .then(
 
      dbConsignments => {
          let itemsToLabelData = [];
          console.log('3')
          dbConsignments.forEach(dbConsignment => {
            console.log('XXX')
            console.log(dbConsignment)
            let consignment = new ConsignmentExcerpt(
              dbConsignment.id,
              dbConsignment.creationDateTime,
              dbConsignment.shipmentDateTime,
              dbConsignment.settled
            );
            consignments.push(consignment);
            console.log('4')
            itemsToLabelData.push(
              new Structures.ItemToLabelData(dbConsignment.id)
            );
            console.log(dbConsignment.id)
            console.log(itemsToLabelData)
          });
          return itemsToLabelData.length !== 0 ? itemsToLabelData : 0;
          
      },
      error => {
        console.log('5')
        res.status(400).json({
          message: 'Nie udało się pobrać przesyłek.',
          error: error,
        });  
      }
    )
    .catch(error => {
      console.log('6')
      //reject(error);
      logger.error(req.originalUrl.concat(' error'));

      res.status(400).json({
        message: 'Nie udało się pobrać przesyłek.4',
        error: error,
      });
    })
    .then(itemsToLabelData => {
      connectDHL()
        .then(api => {
          return new Promise((resolve, reject) => {
            api
              .getLabelsData(
                new Structures.ArrayOfItemtolabeldata(itemsToLabelData)
              )
              .then(result => {
                const shipments = result[0].getLabelsDataResult.item;
                for (let i = 0; i < shipments.length; i++) {
                  const shipment = shipments[i];
                  consignments[i].setLogin = shipment.reference;
                  consignments[i].setShipperName = shipment.shipper.name;
                  consignments[i].setReceiverName = shipment.receiver.name;
                  const item = shipment.pieceList.item[0];
                  console.log(shipment);
                  consignments[i].setType = item.type;
                  if (item.type != 'ENVELOPE') {
                    consignments[i].setWidth = item.width;
                    consignments[i].setHeight = item.height;
                    consignments[i].setLength = item.length;
                    consignments[i].setWeight = item.weight;
                    consignments[i].setPrice = shipment.service.collectOnDeliveryValue;
                  }
                  // wciąż zakładamy, że w przesyłce jest tylko jedna paczka/paleta/koperta
                  // jak sie zmieni wymaganie to do wyjebania
                  // const item = shipment.pieceList.item[0];
                  // consignments[i].setType = item.type;
                  // if (item.type != 'ENVELOPE') {
                  //   consignments[i].setWidth = item.width;
                  //   consignments[i].setHeight = item.height;
                  //   consignments[i].setLength = item.length;
                  //   consignments[i].setWeight = item.weight;
                  // }
                }
              })
              .then(() => {
                resolve(api);
              })
              .catch(error => {
          
                console.log(error);
                
                reject(error);
              });
          });
        })
        .catch(error => {
          reject(error);
          logger.error(req.originalUrl.concat(' error'));

          // res.status(400).json({
          //   message: 'Nie udało się pobrać przesyłek.3',
          //   error: error,
          // });
        })
        .then(api => {
          let promises = [];
          for (let i = 0; i < consignments.length; i++) {
            promises.push(
              new Promise((resolve, reject) => {
                api
                  .getTrackAndTraceInfo(consignments[i].consignmentId)
                  .then(result => {
                    let trackAndTraceInfo = [];
                    let items;
                    try{
                      items =
                      result[0].getTrackAndTraceInfoResult.events.item;
                    } catch(err){

                    }
                    
                    if (items) {
                      items.forEach(element => {
                        // jeśli na liście chcemy wyświetlić tylko ostatni (chronologicznie) status to nei pchajmy w odpowiedź wszystkeigo
                        trackAndTraceInfo.push(element);
                      });
                    } else {
                      trackAndTraceInfo.push({
                        status: 'EDWP',
                        description:
                          'DHL otrzymał dane elektroniczne przesyłki. Informacje zostaną zaktualizowane po przekazaniu przez Nadawcę przesyłki do transportu',
                        timestamp: '',
                      });
                    }
                    consignments[i].setTrackAndTraceInfo = trackAndTraceInfo;

                    resolve();
                  })
                  .catch(error => {
                    //console.log(error)
                    reject(error);
                  });
              })
            );
          }

          return Promise.all(promises);
        })
        .catch(error => {
          logger.error(req.originalUrl.concat(' error'));

          res.status(400).json({
            message: 'Brak przesyłek',
            error: error,
          });
        })
        .then(() => {
          logger.info(req.originalUrl.concat(' response'));

          res.status(201).json({
            message: 'Przesyłki zostały pobrane.',
            consignments: consignments,
          });
        })
        .catch(error => {
          logger.error(req.originalUrl.concat(' error'));

          res.status(400).json({
            message: 'Nie udało się pobrać przesyłek.6',
            error: error,
          });
        });
    })
    .catch(error => {
      logger.error(req.originalUrl.concat(' error'));

      res.status(400).json({
        message: 'Nie udało się pobrać przesyłek.7',
        error: error,
      });
    });;
});

//usuwanie przesyłek
router.patch('/', checkAuth, (req, res) => {
  let selectedConsignmentsId = [];
  let selectedConsignments = req.body.selectedConsignments;
  console.log(selectedConsignments)
  //let userId = req.body.userId;

  selectedConsignments.forEach(selected => {
      User.find({ login: selected.userName}, function (err, user) {
        if (err){
            console.log(err);
        }
        else{
            console.log(user[0]);
            selectedConsignmentsId.push(selected.consignmentId);
            user[0].consignments.forEach((item, index) => {
              if (item.id === selected.consignmentId) {
                user[0].consignments.splice(index, 1);
              }
            });
        }
        user[0].save();
    });
      //console.log(user2);
    //   User.findById(userId, (err, user) => {
    //     if (err) {
    //       res.status(400).json({
    //         message: 'Użytkownik nie istnieje.',
    //         error: err,
    //       });
    //     }
    //   selectedConsignmentsId.push(selected.consignmentId);
    //   user.consignments.forEach((item, index) => {
    //     if (item.id === selected.consignmentId) {
    //       user2.consignments.splice(index, 1);
    //     }
    //   });
    //   user2.save();
    // });
   
  });
  new DHLNodeAPI().createClient(
     'https://dhl24.com.pl/webapi2','').done(api => {    
      api.setAuthData('STARADAMALEGIAWARSZAWA', 'QRsb5lCEWwln:Rg');
      api
        .deleteShipments(new Structures.ArrayOfString(selectedConsignmentsId))
        .done(
          result => {
            // w odpowiedzi dostajemy listę przesyłek które zleciliśmy do usunięcia
            // dla każdej przesyłki dostajemy info czy usunięcie powiodło się czy nie
            // odpowiedź którą tworzymy dla frontu bedzie nieprawdziwa w przypadku niepowodzenia po stronie dhl
            // jeśli zlecimy usunięcie nieistniejącej przesyłki, nie dostaniemy erroru tylko stosowną odpowiedź
            let message = 'Wybrana przesyłka została usunięta.';
            if (selectedConsignments.length > 1) {
              message = 'Wybrane przesyłki zostały usunięte.';
            }
            logger.info(req.originalUrl.concat(' response'));

            res.status(201).json({
              message: message,
              consignmentList: result,
            });
          },
          error => {
            let faultString = '';
            const document = new jsdom.JSDOM(error).window.document;
            if (document.querySelector('faultString')) {
              faultString = document.querySelector('faultString').textContent;
            } else {
              faultString = 'Nie udało się usunąć przesyłek.';
            }
            logger.error(req.originalUrl.concat(' error`: ', faultString));

            res.status(400).json({
              message: faultString,
            });
          }
        );
      });
});
//tworzenie przesyłki
router.post('/create', checkAuth, (req, res) => {
  const userId = req.body.userId;
  const shipper = req.body.shipper;
  const receiver = req.body.receiver;
  const piece = req.body.piece;
  const payerType = req.body.payerType;
  let paymentMethod = payerType === 'RECEIVER'? 'CASH': 'BANK_TRANSFER';
  // payerType === 'RECEIVER'
  //   ? (paymentMethod = 'CASH')
  //   : (paymentMethod = 'BANK_TRANSFER');
  const serviceDefinition = req.body.service;
  serviceDefinition.product = 'AH';
  if (serviceDefinition.CoD === true) {
    serviceDefinition.CoDForm = 'BANK_TRANSFER';
  }
  const shipmentDate = req.body.shipmentDate;
  const comment = req.body.comment;
  const content = req.body.content;
  const reference = req.body.login;
  const shipmentDateTime = req.body.shipmentDateTime;

  new DHLNodeAPI()
    .createClient('https://dhl24.com.pl/webapi2', '')
    .done(api => {
      api.setAuthData('STARADAMALEGIAWARSZAWA', 'QRsb5lCEWwln:Rg');
      api
        .createShipments([
          new Structures.ArrayOfShipmentfulldata([
            new Structures.ShipmentFullData(
              new Structures.AddressData(
                shipper.name,
                shipper.postalCode,
                shipper.city,
                shipper.street,
                shipper.houseNumber,
                shipper.apartmentNumber,
                shipper.contactPerson,
                shipper.contactPhone,
                shipper.contactEmail
              ),
              new Structures.ReceiverAddressData(
                receiver.country,
                undefined,
                undefined,
                undefined,
                receiver.name,
                receiver.postalCode,
                receiver.city,
                receiver.street,
                receiver.houseNumber,
                receiver.apartmentNumber,
                receiver.contactPerson,
                receiver.contactPhone,
                receiver.contactEmail
              ),
              new Structures.NeighbourAddress(
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined
              ),
              new Structures.ArrayOfPiecedefinition([
                new Structures.PieceDefinition(
                  piece.type,
                  piece.width,
                  piece.height,
                  piece.length,
                  piece.weight,
                  piece.quantity,
                  piece.nonStandard,
                  undefined,
                  undefined
                ),
              ]),
              new Structures.PaymentData(
                paymentMethod,
                payerType,
                '2381128',
                undefined
              ),
              new Structures.ServiceDefinition(
                serviceDefinition.product,
                undefined,
                undefined,
                undefined,
                serviceDefinition.CoD,
                serviceDefinition.CoDValue,
                serviceDefinition.CoDForm,
                undefined,
                serviceDefinition.insurance,
                serviceDefinition.insuranceValue,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined
              ),
              shipmentDate,
              true,
              comment,
              content,
              reference,
              '',
              '',
              ''
            ),
          ]),
        ])
        .done(
          result => {
            
            consignmentId = result[0].createShipmentsResult.item[0].shipmentId;
            User.findById(userId, (err, doc) => {
              if (err) {
                logger.error(req.originalUrl.concat(' error'));

                res.status(400).json({
                  message: 'Użytkownik nie istnieje.',
                });
              }

              const creationDateTime = new Date().toLocaleString('pl-PL');
              doc.consignments.push({
                id: consignmentId,
                creationDateTime: creationDateTime,
                shipmentDateTime: shipmentDateTime,
                settled: false
              });
              doc.save().then(
                () => {
                  logger.info(req.originalUrl.concat(' response'));

                  res.status(201).json({
                    message:
                      'Przesyłka ' + consignmentId + ' została utworzona.',
                    consignmentId: consignmentId,
                  });
                },
                error => {}
              );
            });
          },
          error => {
            let faultString = '';
            const document = new jsdom.JSDOM(error).window.document;
            if (document.querySelector('faultString')) {
              faultString = document.querySelector('faultString').textContent;
            } else {
              faultString = 'Nie udało się utworzyć przesyłki.';
            }
            logger.error(req.originalUrl.concat(' error`: ', faultString));

            res.status(400).json({
              message: faultString,
            });
          }
        );
    });
});

//pobranie przesyłki
router.get('/:consignmentId', checkAuth, (req, res) => {
  const consignmentId = req.params.consignmentId;
  const userId = req.userId;

  authorizeUser(userId, consignmentId)
    .then(isAuthorized => {
      if (!isAuthorized) {
        return res.status(403).json({
          message: 'Nie masz przesyłki o identyfikatorze ' + consignmentId,
        });
      } else {
        const label = 'BLP';
        const letter = 'LP';

        connectDHL()
          .then(api => {
            let promises = [];
            // promises[0]
            promises.push(
              new Promise((resolve, reject) => {
                api
                  .getLabelsData(
                    new Structures.ArrayOfItemtolabeldata([
                      new Structures.ItemToLabelData(consignmentId),
                    ])
                  )
                  .then(result => {
                    const consignmentData =
                      result[0].getLabelsDataResult.item[0];

                    resolve(consignmentData);
                  })
                  .catch(error => {
                    reject('Nie udało się pobrać przesyłki.');
                  });
              })
            );
            // promises[1]
            promises.push(
              new Promise((resolve, reject) => {
                let trackAndTraceInfo = [];
                api
                  .getTrackAndTraceInfo(consignmentId)
                  .then(result => {
                    try{
                      if (result[0].getTrackAndTraceInfoResult.events.item) {
                      
                          result[0].getTrackAndTraceInfoResult.events.item.forEach(
                            element => {
                              trackAndTraceInfo.push(element);
                            }
                          );
                        
                        
                      } else {
                        trackAndTraceInfo.push({
                          status: 'EDWP',
                          description:
                            'DHL otrzymał dane elektroniczne przesyłki.',
                          timestamp: '',
                        });
                      }
                  } catch(err) {
                    console.log(err);
                  }
                  })
                  .then(() => {
                    resolve(trackAndTraceInfo);
                  })
                  .catch(error => {
                    reject('Nie udało się pobrać statusu przesyłki.');
                  });
              })
            );
            // promises[2]
            promises.push(
              new Promise((resolve, reject) => {
                api
                  .getLabels(
                    new Structures.ArrayOfItemtoprint([
                      new Structures.ItemToPrint(label, consignmentId),
                    ])
                  )
                  .then(result => {
                    const labelData = result[0].getLabelsResult.item[0];
                    decodeFile(labelData, label)
                      .then(labelPath => {
                        resolve(labelPath);
                      })
                      .catch(error => {
                        reject('Nie udało się pobrać etykiety przesyłki.');
                      });
                  });
              })
            );
            // promises[3]
            promises.push(
              new Promise((resolve, reject) => {
                api
                  .getLabels(
                    new Structures.ArrayOfItemtoprint([
                      new Structures.ItemToPrint(letter, consignmentId),
                    ])
                  )
                  .then(result => {
                    const letterData = result[0].getLabelsResult.item[0];
                    decodeFile(letterData, letter).then(letterPath => {
                      resolve(letterPath);
                    });
                  })
                  .catch(error => {
                    reject(
                      'Nie udało się pobrać listu przewozowego przesyłki.'
                    );
                  });
              })
            );

            return Promise.all(promises);
          })
          .then(
            consignmentData => {
              const consignment = consignmentData[0];
              const trackAndTraceInfo = consignmentData[1];
              const labelPath = consignmentData[2];
              const letterPath = consignmentData[3];

              logger.info(req.originalUrl.concat(' response'));

              res.status(201).json({
                message: 'Przesyłka została pobrana.',
                // to długie gówno zastąpić obiektem Consignment
                // consignment: consignment
                login: consignment.reference,
                consignmentId: consignment.shipmentId,
                creationDate: consignment.created,
                status: consignment.orderStatus,
                trackAndTraceInfo: trackAndTraceInfo,
                shipper: {
                  name: consignment.shipper.name,
                  postalCode: consignment.shipper.postalCode,
                  city: consignment.shipper.city,
                  street: consignment.shipper.street,
                  houseNumber: consignment.shipper.houseNumber,
                  apartmentNumber: consignment.shipper.apartmentNumber,
                  contactPerson: consignment.shipper.contactPerson,
                  contactPhone: consignment.shipper.contactPhone,
                  contactEmail: consignment.shipper.contactEmail,
                },
                receiver: {
                  name: consignment.receiver.name,
                  postalCode: consignment.receiver.postalCode,
                  city: consignment.receiver.city,
                  street: consignment.receiver.street,
                  houseNumber: consignment.receiver.houseNumber,
                  apartmentNumber: consignment.receiver.apartmentNumber,
                  contactPerson: consignment.receiver.contactPerson,
                  contactPhone: consignment.receiver.contactPhone,
                  contactEmail: consignment.receiver.contactEmail,
                },
                piece: {
                  type: consignment.pieceList.item[0].type,
                  weight: consignment.pieceList.item[0].weight,
                  width: consignment.pieceList.item[0].width,
                  length: consignment.pieceList.item[0].length,
                  height: consignment.pieceList.item[0].height,
                  quantity: consignment.pieceList.item[0].quantity,
                  nonStandard: consignment.pieceList.item[0].nonStandard,
                },
                payerType: consignment.billing.shippingPaymentType,
                service: {
                  CoD: consignment.service.collectOnDelivery,
                  CoDValue: consignment.service.collectOnDeliveryValue,
                  insurance: consignment.service.insurance,
                  insuranceValue: consignment.service.insuranceValue,
                },
                shipmentDate: consignment.shipmentTime.shipmentDate,
                comment: consignment.comment,
                content: consignment.content,
                labelPath: labelPath,
                letterPath: letterPath,
              });
            },
            error => {
              logger.error(req.originalUrl.concat(' error'));
              let faultString = error ? error : 'Nie ma takiej przesyłki.';

              res.status(400).json({
                message: faultString,
              });
            }
          );
      }
    })
    .catch(error => {
      logger.error(req.originalUrl.concat(' error'));
      let faultString = error ? error : 'Nie udało się pobrać przesyłki.';

      res.status(400).json({
        message: faultString,
      });
    });
});

function connectDHL() {
  return new Promise((resolve, reject) => {
    new DHLNodeAPI().createClient('https://dhl24.com.pl/webapi2', '').done(
      api => {  
        console.log("before set auth data");
        api.setAuthData('STARADAMALEGIAWARSZAWA', 'QRsb5lCEWwln:Rg');
        resolve(api)
      },
      error => {
        console.log(error)
        reject('error');
      }
    );
  });
}

function getDbConsignments(userId) {
  return new Promise((resolve, reject) => {
    let dbConsignments = [];
    let query = buildQueryForDbUser(userId);

    User.find(query)
      .then(users => {
        users.forEach(user => {
          if (user.consignments.length >0) {
          //   reject('Użytkownik nie ma przesyłek.');
          // } else {
            user.consignments.forEach(consignment => {
              dbConsignments.push(consignment);
            });
            
          }
        });
        return resolve(dbConsignments)      
      })
      .catch(error => {
        logger.error(req.originalUrl.concat(' error'));

        reject(error);
      });
  });
}

router.patch('/settle', checkAuth, (req, res) => {
  let selectedConsignmentsId = [];
  let selectedConsignments = req.body.selectedConsignments;
  //console.log(selectedConsignments)
  //let userId = req.body.userId;

  selectedConsignments.forEach(selected => {
      User.find({ login: selected.userName}, function (err, user) {
        if (err){
            console.log(err);
        }
        else{
            console.log(user[0]);
            selectedConsignmentsId.push(selected.consignmentId);
            console.log("CONSIGNMENTS");
            console.log(user[0].consignments);
            user[0].consignments.forEach((item, index) => {
              console.log(item.id);
              console.log(selected);
              if (item.id == selected.consignmentId) {
                console.log("ROZLICZONE")
                console.log(index)
                user[0].consignments[index].settled =true;
              }
            });
        }
        user[0].save();
    
    });
      //console.log(user2);
    //   User.findById(userId, (err, user) => {
    //     if (err) {
    //       res.status(400).json({
    //         message: 'Użytkownik nie istnieje.',
    //         error: err,
    //       });
    //     }
    //   selectedConsignmentsId.push(selected.consignmentId);
    //   user.consignments.forEach((item, index) => {
    //     if (item.id === selected.consignmentId) {
    //       user2.consignments.splice(index, 1);
    //     }
    //   });
    //   user2.save();
    // });
   
  });
  res.status(200).json({
    message:
      ''+selectedConsignments.length + ' przesyłki zostały rozliczone.'
  });
});

function buildQueryForDbUser(userId) {
  const isAdmin = userId === '5ead7ab5556feb3794d8b0a5' ? true : false;
  const query = isAdmin ? null : { _id: userId };

  return query;
}

function authorizeUser(userId, consignmentId) {
  // czy to musi być promise? może wystarczy poszukać tej przesyłki w db user'a i zwrócić odp z bazy?
  return new Promise((resolve, reject) => {
    const query = buildQueryForDbUser(userId);
    let isOwner = false;
    User.find(query)
      .then(users => {
        // może lepiej wyszukać daną przesyłkę w przesyłkach danego user'a?
        users.forEach(user => {
          user.consignments.forEach(consignment => {
            if (consignment.id === consignmentId) {
              isOwner = true;
            }
          });
        });
      })
      .then(() => {
        resolve(isOwner);
      })
      .catch(error => {
        reject(error);
      });
  });
}

function decodeFile(encodedData) {
  return new Promise((resolve, reject) => {
    const encodedFile = encodedData.labelData;
    const buffer = new Buffer.from(encodedFile, 'base64');
    const relativePath = encodedData.shipmentId.concat(
      '/',
      encodedData.labelType,
      '/'
    );
    const absolutePath = './files/'.concat(relativePath);
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true }, err => {
        if (err) {
          logger.error('decodeFile() error');

          reject(err);
        }
      });
    }
    absFilePath = absolutePath.concat(encodedData.labelName);
    fs.writeFileSync(absFilePath, buffer, err => {
      if (err) {
        logger.error('decodeFile() error');

        reject(err);
      }
    });
    relFilePath = relativePath.concat(encodedData.labelName);
    logger.info('decodeFile() response');

    resolve(relFilePath);
  });
}

module.exports = router;
