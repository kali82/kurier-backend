/**
 * @constructor
 * @param {string} type Jedna z wartości: "ENVELOPE", "PACKAGE", "PALLET".
 * @param {number} width Szerokość w centymetrach, wymagana gdy typ inny niż "ENVELOPE".
 * @param {number} height Wysokość w centymetrach, wymagana gdy typ inny niż "ENVELOPE".
 * @param {number} length Długość w centymetrach, wymagana gdy typ inny niż "ENVELOPE".
 * @param {number} weight Waga w kilogramach, wymagana gdy typ inny niż "ENVELOPE".
 * @param {number} quantity Ilość paczek.
 * @param {boolean} nonStandard Czy paczka jest niestandardowa (wg definicji z cennika).
 * @param {string} blpPieceId Identyfikator BLP - dla klientów drukujących etykiety tego typu, którzy prowadzą własną numerację paczek.
 * @param {boolean} euroReturn Czy palety euro do zwrotu (można wybrać tylko przy type = "PALLET").
 */
function PieceDefinition(type, width, height, length, weight, quantity, nonStandard, blpPieceId, euroReturn) {
    this.type = type;
    this.width = width;
    this.height = height;
    this.length = length;
    this.weight = weight;
    this.quantity = quantity;
    this.nonStandard = nonStandard;
    this.blpPieceId = blpPieceId;
    this.euroReturn = euroReturn;
}


module.exports.PieceDefinition = PieceDefinition;