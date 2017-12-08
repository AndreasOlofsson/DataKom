const WebSocket = require("ws");

module.exports = (server, db) => {
    const wss = new WebSocket.Server({server});

    function sendJSON(ws, data) {
        ws.send(JSON.stringify(data));
    }

    async function getAvailable(ws, msg) {
        let date = msg["date"];

        if (typeof date !== "string") {
            throw 'Bad Request ("date" is not a string)';
        }

        date = date.split("-");

        if (date.length !== 3) {
            throw 'Bad Request ("date" must be in the format "YYYY-MM-DD")';
        }

        let available;

        try {
            available = await db.dayAvailable(new Date(Date.UTC(date[0], date[1] - 1, date[2])));
        } catch (e) {
            throw "Server Error (DB access failed)";
        }

        return {
            available: available
        };
    }

    async function getBookingsDate(ws, msg) {
        var date = msg["getBookingsDate"];

        date = date.split("-");
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

    async function removeBooking(ws, msg) {
        var id = msg["removeBooking"];
        try {
            await db.removeBooking(id);
        } catch (e) {
            throw "Server Error (DB access failed)";
        }
        return true;
    }

    async function confirmBooking(ws, msg) {
        var id = msg["confirmBooking"];
        try {
            await db.changeBookingStatus(id, "Confirmed");
        } catch (e) {
            throw "Error on confirm booking";
        }
        return true;
    }

    async function unConfirmBooking(ws, msg) {
        var id = msg["unConfirmBooking"];
        try {
            await db.changeBookingStatus(id, "Pending");
        } catch (e) {
            throw "Error on unConfirmBooking";
        }
        return true;
    }

    async function getDaysWithBooking(ws, msg) {
        var date = msg["getDaysWithBooking"];
        date = date.split("-");
        var available = [];
        try {
            for (i = 0; i < 30; i++) {
                available[i] = await db.dayAvailable(new Date(Date.UTC(date[0], date[1] - 1, i)));
            }
        } catch (e) {
            throw "Server Error (DB access failed)";
        }
        return available;
    }

    function validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    function validDate(date) {
        if (typeof date !== "string") {
            throw 'Bad Request ("date" is not a string)';
        }

        date = date.split("-");

        if (date.length !== 3) {
            throw 'Bad Request ("date" must be in the format "YYYY-MM-DD")';
        }
        return true;
    }

    async function addBooking(ws, msg) {
        let booking = msg["booking"];
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
                booking.date, // blir -1 på servern
                booking.amountGuests,
                booking.text
            );
        } catch (e) {
            throw "Server Error (DB access failed)";
        }
        return booking;
    }

    async function markDayAsFull(ws, msg) {
        let date = msg["markDayAsFull"];
        if (validDate(date)) {
            try {
                response = await db.markDayAsFull(date);
            } catch (e) {
                throw "Server Error (DB access failed)";
            }
        }
    }

    wss.on("connection", (ws, req) => {
        ws.on("message", msg => {
            (async function() {
                let err;

                try {
                    msg = JSON.parse(msg);

                    const func = {
                        markDayAsFull: markDayAsFull,
                        markDayAsNotFull: markDayAsNotFull,
                        getDaysWithBooking: getDaysWithBooking,
                        confirmBooking: confirmBooking,
                        unConfirmBooking: unConfirmBooking,
                        removeBooking: removeBooking,
                        getAvailable: getAvailable,
                        addBooking: addBooking
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
    });
};
