const WebSocket = require("ws");

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

        if (date.length !== 3) {
            throw 'Bad Request ("date" must be in the format "YYYY-MM-DD")';
        }

        return date.map(num => {
            return parseInt(num);
        });
    }

    async function getAvailable(ws, msg) {
        if (!msg["date"]) {
            throw 'Bad Request ("date" is missing)';
        }

        let date = parseDate(msg["date"]);

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
        return {
            booking: booking
        };
    }
    
    async function removeBooking(ws, msg) {
        const id = msg["bookingID"];

        try {
            await db.removeBooking(id);
        } catch (e) {
            throw "Server Error (DB access failed)";
        }

        return true;
    }
    
    async function setBookingStatus(ws, msg) {
        if (msg['bookingID'] == null) {
            throw 'Bad Request ("bookingID" is missing)';
        }
        
        if (typeof msg['bookingID'] !== 'string') {
            throw 'Bad Request ("bookingID" must be a string)';
        }
        
        if (msg['status'] == null) {
            throw 'Bad Request ("status" is missing)';
        }
        
        if (msg['status'] !== 'confirmed' && msg['status'] !== 'pending') {
            throw 'Bad Request ("status" must be "confirmed" or "pending")';
        }
        
        let result;
        
        try {
            result = await db.changeBookingStatus(msg['id'], msg['status']);
        } catch (e) {
            console.error(e);
            
            throw 'Server Error (DB access failed)';
        }
        
        if (result) {
            return {};
        } else {
            throw 'Booking not found';
        }
    }

    async function getAvailableMonth(ws, msg) {
        const date = parseDate(msg["date"]);
        return await db.availableMonth(new Date(Date.UTC(date[0], date[1] - 1, date[2])),new Date(Date.UTC(date[0], date[1] - 1, date[2]+1));
    }

    function validateEmail(email) {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        return re.test(email);
    }

    async function setDayFull(ws, msg) {
        if (!msg["date"]) {
            throw 'Bad Request ("date" is missing)';
        }

        let date = parseDate(msg["date"]);

        try {
            return await db.setDayFull(new Date(Date.UTC(date[0], date[1] - 1, date[2])));
        } catch (e) {
            console.error(e);
            
            throw "Server Error (DB access failed)";
        }
    }
    
    async function setDayStatus(ws, msg) {
        if (!msg["date"]) {
            throw 'Bad Request ("date" is missing)'
        }
        
        let date = parseDate(msg["date"]);
        
        if (msg["status"] == null) {
            throw 'Bad Request ("status" is missing)'
        }
        
        if (!["empty", "booked", "full"].includes(msg["status"])) {
            throw 'Bad Request ("status" must be one of "empty", "booked" or "full")'
        }
        
        try {
            await db.setDayStatus(new Date(date[0], date[1] - 1, date[2]), msg["status"]);
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

                        getAvailable: getAvailable,
                        getAvailableMonth: getAvailableMonth,
                        
                        setDayStatus: setDayStatus
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
