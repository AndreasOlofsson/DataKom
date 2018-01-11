const config = require("./config.js");

const mongodb = require("mongodb").MongoClient;

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

        setDayStatus(
            new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())),
            "booked"
        );
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
        const booking = await bookingsCollection.findOne({_id: ObjectID(id)});
        const year = booking.date.getFullYear();
        const month = booking.date.getMonth();
        const day = booking.date.getDate();
        const result = await bookingsCollection.remove({_id: ObjectID(id)});
        if (
            (await bookingsCollection
                .find({
                    date: {
                        $gt: new Date(Date.UTC(year, month, day)),
                        $lt: new Date(Date.UTC(year, month, day + 1))
                    }
                })
                .count()) < 1
        ) {
            setDayStatus(new Date(Date.UTC(year, month, day)), "empty");
        }
        return result.result.n > 0;
    }

    async function dayAvailable(date, amountGuests = 2) {
        let result = await daysCollection.findOne({
            date: date
        });

        if (result && result.status === "full") {
            return false;
        }

        let dateNextDay = new Date(Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate() + 1));

        try {
            result = await bookingsCollection.aggregate([
                {
                    $match: {
                        date: {
                            $gte: date,
                            $lt: dateNextDay
                        }
                    }
                },
                {
                    $group: {
                        _id: 1,
                        booked: {
                            $sum: {
                                $floor: {
                                    $divide: [
                                        {
                                            $add: [
                                                "$number",
                                                config.guestGroupSize - 1
                                            ]
                                        },
                                        config.guestGroupSize
                                    ]
                                }
                            }
                        }
                    }
                }
            ]).next();

            const guestGroups = ~~((amountGuests + config.guestGroupSize - 1) / config.guestGroupSize);

            if (!result) {
                return config.maxGuestGroupsPerDay >= guestGroups;
            }

            console.log(`day ${ date.getYear() }-${ date.getMonth() }-${ date.getDate() } - ${ result.booked } booked - ${ config.maxGuestGroupsPerDay - result.booked } available - ${ guestGroups } requested`);

            return result && config.maxGuestGroupsPerDay - result.booked >= guestGroups;
        } catch (e) {
            console.error(e);
        }
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
