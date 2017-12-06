const WebSocket = require('ws');

module.exports = (server, db) => {
    const wss = new WebSocket.Server({ server });

    function sendJSON(ws, data) {
        ws.send(JSON.stringify(data));
    }

    async function getAvailable(ws, msg) {
        if (msg["date"]) {
            let date = msg["date"];

            if (typeof date !== "string") {
                throw "Bad Request (\"date\" is not a string)";
            }

            date = date.split("-");

            if (date.length !== 3) {
                throw "Bad Request (\"date\" must be in the format \"YYYY-MM-DD\")";
            }

            let available;

            try {
                available = await db.dayAvailable(new Date(Date.UTC(date[0], date[1] - 1, date[2])));
            } catch (e) {
                throw "Server Error (DB access failed)"
            }

            return {
                "available": available
            };
        } else {
            throw "bad request (\"date\" missing)";
        }
    }

    function getBookingsDate(ws, msg){
      if (msg["getBookingsDate"]) {
      var date = msg["getBookingsDate"];
      let bookings;
      try{
        bookings = await db.getBookings(new Date(date.year, date.month -1, date.day),new Date(date.year, date.month -1, date.day,23,00));
      }catch (e) {
          throw "Server Error (DB access failed)"
      }
      return {
          "bookings": bookings
      };
  } else {
      throw "bad request (\"bookings\" missing)";
  }
}

    function removeBooking(id){
      //ta bort bokning
    }

    function confirmBooking(id){
      //ändra status till booking
    }

    function unConfirmBooking(id){
      //ändra status till booking
    }

    function getDaysWithBooking(year,month){

      //array true eller false
    }
  //  function editBooking()






    function validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    function validDate(date) {
        if (typeof date !== 'string') {
            throw 'Bad Request ("date" is not a string)';
        }

        date = date.split('-');

        if (date.length !== 3) {
            throw 'Bad Request ("date" must be in the format "YYYY-MM-DD")';
        }
        return true;
    }

    async function addBooking(ws, msg) {
        if (msg['booking']) {
            let booking = msg['booking'];
            console.log(booking);
            if (booking.name.length < 1) {
                throw 'Name is required';
            }
            if (!validateEmail(booking.email)) {
                throw 'not valid emailadress!';
            }

            try {
                booking = await db.addBooking(
                    booking.name,
                    booking.email,
                    booking.date,
                    booking.amountGuests,
                    booking.text
                );
            } catch (e) {
                throw 'Server Error (DB access failed)';
            }
            return booking;
}
}



    async function addBooking(ws, msg) {
        if (msg["booking"]) {
            return {
                "msg": "test"
            };

        } else {
            throw "bad request (\"booking\" missing)";
        }
    }


    async function markDayAsFull(ws, msg) {
        if (msg['markDayAsFull']) {
            let date = msg['markDayAsFull'];
            if (validDate(date)) {
                try {
                    response = await db.markDayAsFull(date);
                } catch (e) {
                    throw 'Server Error (DB access failed)';
                }
            }
        } else {
            throw 'Error markDayAsFull';
        }
    }


    wss.on('connection', (ws, req) => {
        ws.on('message', (msg) => {
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
