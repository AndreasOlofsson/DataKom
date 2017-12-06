const config = require("./config.js");

const mongodb = require("mongodb").MongoClient;
const crypto = require("crypto");

module.exports = async function() {
    const db = await mongodb.connect(config.dbURL);

    let bookingsCollection = await db.createCollection("bookings");

    let adminCollection = await db.createCollection("admins");
    
    let daysCollection = await db.createCollection("days");
    
    // end --- Create/get collections
    
    // start --- Create indexes
    
    if (!await daysCollection.indexExists("date_ttl")) {
        await daysCollection.createIndex({
            "date": 1
        }, {
            name: "date_ttl",
            unique: true,
            expireAfterSeconds: 60 * 60 * 24 * 14
        });
    }
    
    // end --- Create indexes
    
    // start --- DB Functions
    
    async function addAdmin(name, password) {
        return await adminCollection
            .insertOne({
                name: name,
                password: null,
                salt: null,
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
                name: name,
            },
            {
                $set: {
                    password: passwordDigest,
                    salt: salt,
                },
            }
        );
    }

    async function addBooking(name, email, time, date, numPeople, text) {
        return await db.collection("bookings").insertOne({
            name: name,
            email: email,
            time: time,
            date: date,
            number: numPeople,
            text: text,
            submitted: new Date().getTime(),
            status: "pending",
            emails: [],
        });
    }

    async function changeBookingStatus(id, status) {
        bookingsCollection.updateOne({
            _id: ObjectID(id)
        }, {
            $set: {
                status: status
            }
        });
    }
    
    async function removeBooking(id) {
        bookingsCollection.remove({ _id: ObjectID(id) });
        //om status på den dagen är full behöver detta ändras
    }

    async function getBookingsOnDate(date) {
        return bookingsCollection.find({ date: date });
    }

    async function dayAvailable(date) {
        let result = await daysCollection.find({
            date: date
        });

        if (await result.count() < 1) {
            return true;
        }

        return !(await result.next()).full;
    }

    async function markDayAsFull(date, full = true) {
        daysCollection.updateOne({
            date: date
        }, {
            $set: {
                full: full
            }
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
        getBookingsOnDate: getBookingsOnDate,
        dayAvailable: dayAvailable,
        markDayAsFull: markDayAsFull,
        debug: {
            db: db,
            bookings: bookingsCollection,
            admins: adminCollection,
            days: daysCollection
        }
    };
};