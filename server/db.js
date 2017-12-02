const config = require("./config.js");

const mongodb = require("mongodb").MongoClient;
const crypto = require("crypto");

const ObjectID = require("mongodb").ObjectID;

module.exports = async function() {
    const db = await mongodb.connect(config.dbURL);

    let bookingsCollection = await db.createCollection("bookings");

    let adminCollection = await db.createCollection("admins");

    let daysCollection = await db.createCollection("days");

    // end --- Create/get collections

    // start --- Create indexes

    if (!await daysCollection.indexExists("date_ttl")) {
        await daysCollection.createIndex(
            {
                date: 1
            },
            {
                name: "date_ttl",
                unique: true,
                expireAfterSeconds: 60 * 60 * 24 * 14
            }
        );
    }

    // end --- Create indexes

    // start --- DB Functions

    async function addAdmin(name, password) {
        return await adminCollection
            .insertOne({
                name: name,
                password: null,
                salt: null
            })
            .then(() => {
                return changeAdminPassword(name, password);
            });
    }

    async function changeAdminPassword(name, newPassword) {
        const salt = crypto.randomBytes(32); // 128-bits

        const passwordDigest = crypto
            .createHmac("sha256", salt)
            .update(newPassword)
            .digest("hex");

        return await adminCollection.updateOne(
            {
                name: name
            },
            {
                $set: {
                    password: passwordDigest,
                    salt: salt
                }
            }
        );
    }

    async function addBooking(name, email, date, numPeople, text) {
        return await bookingsCollection.insertOne({
            name: name,
            email: email,
            date: date,
            number: numPeople,
            text: text,
            submitted: new Date(Date.now()),
            status: "pending",
            emails: []
        });
    }
    /*db.debug.db.collection('bookings').find({date:{$gt:(new Date(2017,11,10))}}).toArray().then(it => console.log(it))
    db.debug.db.collection('bookings').find({date:{$gt:(new Date(2017,11,10))}}).toArray().then(it => console.log(it))
find({date:{$gt:(start),$lte:(end)}})
*/
    async function getBookings(start, end) {
        const bookings = bookingsCollection.find({ date: { $gt: start, $lte: end } });
        return await bookings.toArray();
    }

    async function changeBookingStatus(id, status) {
        bookingsCollection.updateOne(
            {
                _id: ObjectID(id)
            },
            {
                $set: {
                    status: status
                }
            }
        );
    }

    async function removeBooking(id) {
        bookingsCollection.remove({ _id: ObjectID(id) });
    }

    async function dayAvailable(date) {
        let result = await daysCollection.find({
            date: date
        });

        if ((await result.count()) < 1) {
            return true;
        }

        return false;
    }

    async function markDayAsFull(date, full = true) {
        daysCollection.insertOne(
            {
                date: date
            },
            {
                $set: {
                    full: full
                }
            }
        );
    }

    async function markDayAsNotFull(date) {
        daysCollection.remove({
            date: date
        });
    }

    if ((await adminCollection.find({ name: config.defaultAdminUsername })).count() < 1) {
        addAdmin(config.defaultAdminUsername, config.defaultAdminPassword);
    }

    return {
        addAdmin: addAdmin,
        changeAdminPassword: changeAdminPassword,
        addBooking: addBooking,
        changeBookingStatus: changeBookingStatus,
        removeBooking: removeBooking,
        getBookings: getBookings,
        dayAvailable: dayAvailable,
        markDayAsFull: markDayAsFull,
        markDayAsNotFull: markDayAsNotFull,
        debug: {
            db: db,
            bookings: bookingsCollection,
            admins: adminCollection,
            days: daysCollection
        }
    };
};
