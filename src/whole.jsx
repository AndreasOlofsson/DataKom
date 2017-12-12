'use strict';

import * as React from "react";
import * as ReactDOM from "react-dom";
import {CalendarView} from "./components/calendarview.jsx";
import {ListView} from "./components/listview.jsx";
import {WSInterface} from "./lib/wsInterface.js";

const ws = new WSInterface(); //WebSocket Interface

class App extends React.Component {
    constructor(props) {
        super(props);
        //states
        var date = new Date(Date.now());
        this.state = {
            viewMode: true, //True = Calendar, False = ListView
            date: date, //Todays Date
            status: "",
            /*
            Bookings
            name: name,
            email: email,
            date: date,
            number: numPeople,
            text: text,
            status: "" pending//confirmed
            //emails: [], Kanske
            */
            availableMonth: null,
            bookings: null
        };

        this.importForMonth(date);
    }

    /* Function to change the viewmode between
    */
    changeMode() {
        this.setState({
            viewMode: !this.state.viewMode
        });
    }

    /** Imports the bookings from the database
    * @param date The date which the bookings are imported
    */
    importForDate(date) {
        let temp = new Date(date);
        let status;
        temp.setHours(1);

        ws.send({
            request: "getBookingsDate",
            date: `${temp.getFullYear()}-${temp.getMonth() + 1}-${temp.getDate()}`
        }, (msg) => {
            //console.log(`callback ${ msg }`);
            if (msg["bookings"]) {
                var bookings = msg["bookings"];

                console.log(0);
                if (this.state.availableMonth != null) {
                    if (this.state.availableMonth[temp.toISOString()] != null) {
                        status = this.state.availableMonth[temp.toISOString()];
                    }
                }

                this.setState({bookings: bookings, date: temp, status: status});
            }
        });
    }

    /**
    * @param date a date for which the month-data is imported
    */
    importForMonth(date) {
        ws.send({
            request: "getAvailableMonth",
            date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        }, (msg) => {
            if (msg["days"]) {
                let days = msg["days"];
                this.setState({availableMonth: days});
            }
        });
    }

    /** Handles click in the calendarview
    * Calls function to load bookings and update this.date and this.bookings
    * @param date Date object from the Calendar, i.e. the pressed date
    */
    handleClickCalendar(date) {
        //console.log(date);
        //console.log("" + date.getFullYear() + (date.getMonth() + 1) + date.getDate());
        this.changeMode();
        this.importForDate(date); //Overwrites old bookings
    }

    /**
    * Confirmes or unconfirmes a booking and updates the database
    * @param i index för bookningen i den arrayen state.props
    */
    handleClickConfirm(i) {
        let bookings = this.state.bookings.slice();

        //Sends to databasen
        ws.send({
            request: "setBookingStatus",
            bookingID: bookings[i]._id,
            status: bookings[i].status === "pending"
                ? "confirmed"
                : "pending"
        }, (msg) => {/* TODO Add callback to change the array */
            const toConfirm = bookings.splice(i, 1)[0];
            toConfirm.status = toConfirm.status === "pending"
                ? "confirmed"
                : "pending";
            bookings.splice(i, 0, toConfirm);
            this.setState({bookings: bookings});
        });
    }

    /**
    * @param i index för bookningen i den arrayen state.props
    */
    handleClickDelete(i) {
        if (confirm("Are you sure you want to remove this booking?")) {
            let bookings = this.state.bookings.slice();
            console.log(bookings[i]._id);

            //Sends to database
            ws.send({
                request: "removeBooking",
                bookingID: bookings[i]._id
            }, (msg) => {
                let removed = bookings.splice(i, 1);

                this.setState({bookings: bookings});
            });
        }
    }

    handleClickSetDayStatus() {
        const status = this.state.status === "full"
            ? "booked"
            : "full";

            console.log(status);

        ws.send({
            request: "setDayStatus",
            date: `${this.state.date.getFullYear()}-${this.state.date.getMonth() + 1}-${this.state.date.getDate()}`,
            status: `${status}`
        }, (msg) => {
            this.importForMonth(this.state.date);
        });
    }

    /* Renders the diffrent views depending in the viewMode
    */
    renderView() {
        if (this.state.viewMode) {
            return (<div>
                <CalendarView date={this.state.date}
                              availableMonth={this.state.availableMonth}
                              onClick={this.handleClickCalendar.bind(this)}
                              availableMonth={this.state.availableMonth}/>
            </div>);
        } else {
            return (<div className="list-container">
                <button id="back-button" onClick={() => this.changeMode()}>Tillbaka</button>
                <h1>{this.state.date.toDateString()}</h1>
                <button onClick={this.handleClickSetDayStatus.bind(this)}
                            className={"toggle-" + this.state.status}>Toggle Day Done</button>
                <ListView data={this.state.bookings}
                          clickConfirm={this.handleClickConfirm.bind(this)}
                          clickDelete={this.handleClickDelete.bind(this)}/>
            </div>);
        }
    }

    render() {
        return (<div className="app">
            <header className="app-header"></header>
            {this.renderView()}
        </div>);
    }
}

ReactDOM.render(<App/>, document.getElementById('root'));
