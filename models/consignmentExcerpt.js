class ConsignmentExcerpt {
  constructor(consignmentId, creationDateTime, shipmentDateTime, settled, price) {
    this.consignmentId = consignmentId;
    this.creationDateTime = creationDateTime;
    this.shipmentDateTime = shipmentDateTime;
    this.settled = settled;
    this.price = price;
  }
  set setLogin(value) {
    this.login = value;
  }

  set setShipperName(value) {
    this.shipperName = value;
  }

  set setReceiverName(value) {
    this.receiverName = value;
  }

  set setSettled(value) {
    this.settled = value;
  }

  set setWidth(value) {
    this.width = value;
  }

  set setType(value) {
    this.type = value;
  }

  set setHeight(value) {
    this.height = value;
  }

  set setLength(value) {
    this.length = value;
  }

  set setWeight(value) {
    this.weight = value;
  }

  set setTrackAndTraceInfo(value) {
    this.trackAndTraceInfo = value;
  }
  set setPrice(value) {
    this.price = value;
  }
}

module.exports = ConsignmentExcerpt;
