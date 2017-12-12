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
        const booking = await bookingsCollection.insertOne({
            name: name,
            email: email,
            date: date,
            number: numPeople,
            text: text,
            submitted: new Date(Date.now()),
            status: "pending",
            emails: []
        });
        setDayStatus(date, "booked");
        // TODO set day as booked

        return booking;
    }

    async function getBookings(start, end) {
        const bookings = bookingsCollection.find({date: {$gt: start, $lt: end}});
        return await bookings.toArray();
    }

    async function availableMonth(start, end) {
        const bookings = daysCollection.find({date: {$gt: start, $lt: end}});
        const days = {};

        (await bookings.toArray()).forEach(booking => {
            days[booking.date.toISOString()] = booking.status;
        });

        return days;
    }

    async function changeBookingStatus(id, status) {
        const result = await bookingsCollection.updateOne(
            {
                _id: ObjectID(id)
            },
            {
                $set: {
                    status: status
                }
            }
        );

        return result.result.nModified > 0;
    }

    async function changeBookingAmount(id, numPeople) {
        bookingsCollection.updateOne(
            {
                _id: ObjectID(id)
            },
            {
                $set: {
                    number: numPeople
                }
            }
        );
    }

    async function removeBooking(id) {
        const result = await bookingsCollection.remove({_id: ObjectID(id)});

        return result.result.n > 0;
    }

    async function dayAvailable(date) {
        let result = await daysCollection.findOne({
            date: date
        });

        return !result || result.status !== "full";
    }

    async function setDayStatus(date, status) {
        const result = await daysCollection.updateOne(
            {
                date: date
            },
            {
                $set: {
                    status: status
                }
            },
            {
                upsert: true
            }
        );

        return result.result.ok;
    }

    if ((await adminCollection.find({name: config.defaultAdminUsername})).count() < 1) {
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
        setDayStatus: setDayStatus,
        changeBookingAmount: changeBookingAmount,
        availableMonth: availableMonth,
        debug: {
            db: db,
            bookings: bookingsCollection,
            admins: adminCollection,
            days: daysCollection
        }
    };
};
