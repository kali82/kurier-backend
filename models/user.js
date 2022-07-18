const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = mongoose.Schema(
  {
    name: { type: String },
    login: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    street: { type: String },
    house: { type: String },
    apartment: { type: String },
    city: { type: String },
    contactPerson: { type: String },
    email: { type: String },
    postalCode: { type: String },
    consignments: [
      {
        id: String,
        creationDateTime: { type: String },
        shipmentDateTime: { type: String },
        shipmentDateMilis: { type: Number },
        settled: { type: Boolean }
      },
    ],
    img: {
      data: { type: Buffer },
      contentType: { type: String }
    },
    avatar: { type: String }
  },
  { collection: 'users' }
);

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
