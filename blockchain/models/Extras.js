/**
 * @description Extras class definition
 */
class Extras {
    /**
     * @param {number} masks
     * @param {number} respirators
     * @param {number} volunteers
     * @param {number} doctors
     * @param {number} ventilators
     * @param {number} hazmats
     * @param {number} researches mined blocks (determines reward)
     */
    constructor(masks, respirators, volunteers, doctors, ventilators, hazmats, researches) {
        this.masks = masks;
        this.respirators = respirators;
        this.volunteers = volunteers;
        this.doctors = doctors;
        this.ventilators = ventilators;
        this.hazmats = hazmats;
        this.researches = researches;
    }

    toString() {
        return this.masks.toString() +
            this.respirators.toString() +
            this.volunteers.toString() +
            this.doctors.toString() +
            this.ventilators.toString() +
            this.hazmats.toString() +
            this.researches.toString();
    }
}

module.exports = Extras;