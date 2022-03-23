/**
 * @constructor
 * @param {string} shipmentId Numer przesyłki, dla której chcemy pobrać wszystkie dane.
 */
function ItemToLabelData(shipmentId) {
  this.shipmentId = shipmentId;
}

module.exports.ItemToLabelData = ItemToLabelData;
