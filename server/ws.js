const WebSocket = require("ws");

const config = require('./config.js');

module.exports = (server, db) => {
    const wss = new WebSocket.Server({server});

    function sendJSON(ws, data) {
        ws.send(JSON.stringify(data));
    }

    function parseDate(date) {
        if (typeof date !== "string") {
            throw 'Bad Request ("date" is not a string)';
        }

        date = date.split("-");

        if (date.length < 3) {
            throw 'Bad Request ("date" must be in the format "YYYY-MM-DD")';
        }

        return date.map(num => {
            return parseInt(num);
        });
    }

    function getReservedTablesByDate(date, clientSelf) {
        let reserved = 0;

        wss.clients.forEach((client) => {
            if (client === clientSelf) return;
            if (client.isAlive !== false) {
                if (client.reserved && client.reserved.date === date) {
                    reserved += client.reserved.tables;
                }
            }
        });

        return reserved;
    }


    async function getAvailable(ws, msg) {
        if (!msg["date"]) {
            throw 'Bad Request ("date" is missing)';
        }

        let date = parseDate(msg["date"]);
        let available;

        let reservedTables = getReservedTablesByDate(`${ date[0] }-${ date[1] }-${ date[2] }`, ws);

        let amountGuests = msg.amountGuests && parseInt(msg.amountGuests);

        try {
            available = await db.dayAvailable(new Date(Date.UTC(date[0], date[1] - 1, date[2])), amountGuests + reservedTables * 4);
        } catch (e) {
            throw "Server Error (DB access failed)";
        }

        return {
            available: available
        };
    }

    async function addBooking(ws, msg) {
        let booking = msg["booking"];
        let date = parseDate(booking.date);
        let hour = booking.date.slice(11, 13);
        let minute = booking.date.slice(14, 15);

        let available;

        try {
            available = await db.dayAvailable(new Date(Date.UTC(date[0], date[1] - 1, date[2])));
        } catch (e) {
            throw "Server Error (DB access failed)";
        }

        if (!available) {
            throw "Day is full";
        }

        if (booking.name.length < 1) {
            throw "Name is required";
        }
        if (!validateEmail(booking.email)) {
            throw "not valid emailadress!";
        }

        try {
            booking = await db.addBooking(
                booking.name,
                booking.email,
                new Date(Date.UTC(date[0], date[1] - 1, date[2], hour, minute)), // blir inte ett dateobjekt på servern
                parseInt(booking.amountGuests),
                booking.text
            );
        } catch (e) {
            throw "Server Error (DB access failed)";
        }
        return {
            booking: booking
        };
    }

    async function removeBooking(ws, msg) {
        const id = msg["bookingID"];

        let result;

        try {
            result = await db.removeBooking(id);
        } catch (e) {
            throw "Server Error (DB access failed)";
        }

        if (result) {
            return {};
        } else {
            throw "Bad Request (booking not found)";
        }
    }

    async function setBookingStatus(ws, msg) {
        if (msg["bookingID"] == null) {
            throw 'Bad Request ("bookingID" is missing)';
        }

        if (typeof msg["bookingID"] !== "string") {
            throw 'Bad Request ("bookingID" must be a string)';
        }

        if (msg["status"] == null) {
            throw 'Bad Request ("status" is missing)';
        }

        if (msg["status"] !== "confirmed" && msg["status"] !== "pending") {
            throw 'Bad Request ("status" must be "confirmed" or "pending")';
        }

        let result;

        try {
            result = await db.changeBookingStatus(msg["bookingID"], msg["status"]);
        } catch (e) {
            console.error(e);

            throw "Server Error (DB access failed)";
        }

        if (result) {
            return {};
        } else {
            throw "Booking not found";
        }
    }

    async function getBookingsDate(ws, msg) {
        if (!msg["date"]) {
            throw 'Bad Request ("date" is missing)';
        }

        let date = parseDate(msg["date"]);

        let bookings;

        try {
            bookings = await db.getBookings(
                new Date(Date.UTC(date[0], date[1] - 1, date[2])),
                new Date(Date.UTC(date[0], date[1] - 1, date[2] + 1))
            );
        } catch (e) {
            throw "Server Error (DB access failed)";
        }

        return {
            bookings: bookings
        };
    }

    async function getAvailableMonth(ws, msg) {
        const date = parseDate(msg["date"]);
        let days;
        try {
            days = await db.availableMonth(
                new Date(Date.UTC(date[0], date[1] - 1, 1)),
                new Date(Date.UTC(date[0], date[1], 0))
            );
        } catch (e) {
            throw "Server Error (DB access failed)";
        }
        return {
            days: days
        };
    }

    async function reserveTables(ws, msg) {
        const date = parseDate(msg["date"]);

        const amountGuests = parseInt(msg["amountGuests"]);

        let reservedTables = getReservedTablesByDate(`${ date[0] }-${ date[1] }-${ date[2] }`, ws);

        let available;

        try {
            available = await db.dayAvailable(new Date(Date.UTC(date[0], date[1] - 1, date[2])), amountGuests + reservedTables * 4);
        } catch (e) {
            throw "Server Error (DB access failed)";
        }

        if (available) {
            ws.reserved = {
                date: `${ date[0] }-${ date[1] }-${ date[2] }`,
                tables: (amountGuests + config.guestGroupSize - 1) / config.guestGroupSize
            };

            return {};
        } else {
            throw "Tables not available";
        }
    }

    function validateEmail(email) {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        return re.test(email);
    }

    async function setDayStatus(ws, msg) {
        if (!msg["date"]) {
            throw 'Bad Request ("date" is missing)';
        }

        let date = parseDate(msg["date"]);

        if (msg["status"] == null) {
            throw 'Bad Request ("status" is missing)';
        }

        if (!["empty", "booked", "full"].includes(msg["status"])) {
            throw 'Bad Request ("status" must be one of "empty", "booked" or "full")';
        }

        try {
            await db.setDayStatus(new Date(Date.UTC(date[0], date[1] - 1, date[2])), msg["status"]);
        } catch (e) {
            console.error(e);

            throw "Server Error (DB access failed)";
        }

        return {};
    }

    wss.on("connection", (ws, req) => {
        ws.on("message", msg => {
            (async function() {
                let err;

                try {
                    msg = JSON.parse(msg);

                    const func = {
                        addBooking: addBooking,
                        removeBooking: removeBooking,
                        setBookingStatus: setBookingStatus,
                        getBookingsDate: getBookingsDate,

                        getAvailable: getAvailable,
                        getAvailableMonth: getAvailableMonth,

                        setDayStatus: setDayStatus,
                        reserveTables: reserveTables
                    }[msg["request"]];

                    if (func) {
                        try {
                            let result = await func(ws, msg);

                            result["result"] = "ok";
                            result["_id"] = msg["_id"];

                            sendJSON(ws, result);
                        } catch (e) {
                            err = e;
                        }
                    } else {
                        err = "Bad Request (function not found)";
                    }
                } catch (_) {
                    err = "Invalid JSON";
                }

                if (err) {
                    try {
                        sendJSON(ws, {
                            result: err,
                            _id: msg["_id"]
                        });
                    } catch (e) {
                        console.error("Failed to send error message: ");
                        console.error(err);
                    }
                }
            })();
        });

        ws.on('pong', () => {
            ws.isAlive = true;
        });
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping(() => {});
        });
    }, 30000);
};
