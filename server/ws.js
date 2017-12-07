const WebSocket = require("ws");

module.exports = (server, db) => {
    const wss = new WebSocket.Server({server});

    function sendJSON(ws, data) {
        ws.send(JSON.stringify(data));
    }

    async function getAvailable(ws, msg) {
        if (msg["date"]) {
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
                available = await db.dayAvailable(
                    new Date(Date.UTC(date[0], date[1] - 1, date[2]))
                );
            } catch (e) {
                throw "Server Error (DB access failed)";
            }

            return {
                available: available
            };
        } else {
            throw 'bad request ("date" missing)';
        }
    }

    async function getBookingsDate(ws, msg) {
        if (msg["getBookingsDate"]) {
            var date = msg["getBookingsDate"];

            date = date.split("-");
            let bookings;
            try {
                bookings = await db.getBookings(
                    new Date(Date.UTC(date[0], date[1] - 1, date[2])),
                    new Date(Date.UTC(date[0], date[1] - 1, date[2], 23, 00))
                );
            } catch (e) {
                throw "Server Error (DB access failed)";
            }
            return {
                bookings: bookings
            };
        } else {
            throw 'bad request ("bookings" missing)';
        }
    }

    async function removeBooking(ws, msg) {
        if (msg["removeBooking"]) {
            var id = msg["removeBooking"];
            try {
                await db.removeBooking(id);
            } catch (e) {
                throw "Server Error (DB access failed)";
            }
            return true;
        } else {
            throw "bad request ";
        }
    }

    async function confirmBooking(ws, msg) {
        if (msg["confirmBooking"]) {
            var id = msg["confirmBooking"];
            try {
                await db.changeBookingStatus(id, "Confirmed");
            } catch (e) {
                throw "Error on confirm booking";
            }
            return true;
        } else {
            throw "bad request ";
        }
    }

    async function unConfirmBooking(ws, msg) {
        if (msg["unConfirmBooking"]) {
            var id = msg["unConfirmBooking"];
            try {
                await db.changeBookingStatus(id, "Pending");
            } catch (e) {
                throw "Error on unConfirmBooking";
            }
            return true;
        } else {
            throw "bad request ";
        }
    }

    async function getDaysWithBooking(year, month) {
        //array true eller false
    }
    //  function editBooking()

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
        if (msg["booking"]) {
            let booking = msg["booking"];
            console.log(booking);
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
    }

    async function markDayAsFull(ws, msg) {
        if (msg["markDayAsFull"]) {
            let date = msg["markDayAsFull"];
            if (validDate(date)) {
                try {
                    response = await db.markDayAsFull(date);
                } catch (e) {
                    throw "Server Error (DB access failed)";
                }
            }
        } else {
            throw "Error markDayAsFull";
        }
    }

    wss.on("connection", (ws, req) => {
        ws.on("message", msg => {
            (async function() {
                let err;

                try {
                    msg = JSON.parse(msg);

                    const func = {
                        getAvailable: getAvailable,
                        addBooking: addBooking
                    }[msg["request"]];

                    if (func) {
                        try {
                            let result = await func(ws, msg);

                            result["result"] = "ok";
                            result["id"] = msg["id"];

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
                            id: msg["id"]
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
