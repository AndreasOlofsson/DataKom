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

    this.state = {
      viewMode: false, //True = Calendar, False = ListView
      date: new Date(Date.now()), //Todays Date
      /*
            name: name,
            email: email,
            date: date,
            number: numPeople,
            text: text,
            status: "" pending//confirmed
            //emails: [], Kanske
      */
      /*
      bookings: [
        {
          name: "Valter Gådin",
          email: "valter94@live.se",
          number: 5,
          confirmed: false
        }, {
          name: "Melker Forsell",
          email: "melker_fotboll@hotmail.com",
          number: 4,
          confirmed: false
        }, {
          name: "Andreas Olofsson",
          email: "SnyggAndreas@gmail.com",
          number: 3,
          confirmed: true
        }, {
          name: "Gustav Janer",
          email: "Gustav@Janer.se",
          number: 10,
          confirmed: true
        }
      ]
      */
      bookings: null
    };
  }

  /* Function to change the viewmode between
    */
  changeMode() {
    this.setState({
      viewMode: !this.state.viewMode
    });
  }

  /* Handles click in the calendarview
   * Calls function to load bookings and update this.date and this.bookings
    */
  handleClickCalendar(date) {
    console.log(date);
    console.log("" + date.getFullYear() + (date.getMonth() + 1) + date.getDate());
    //TODO: LÄGG till så att hämta bokningar för dagen

    ws.send({
      request: "getBookingsDate",
      date: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    }, (msg) => {
        console.log(`callback ${ msg }`);
      if (msg["bookings"]) {

        var bookings = msg["bookings"];

        this.setState({bookings: bookings});
      }
    });

    this.setState({date: date})
    this.changeMode();
  }

  /*handleClick, removes a not yet handled booking to the confirmed cue
    */
  handleClickConfirm(i) {
    let bookings = this.state.bookings.slice();
    const toConfirm = bookings.splice(i, 1)[0];
    toConfirm.confirmed = true;
    bookings.splice(i, 0, toConfirm[0]);

    //    console.log("index: " + i);
    //    console.log(toConfirm.name + ", status: " + toConfirm.confirmed);

    //TODO: LÄGG till så att databasen ändrar sig
    this.setState({bookings: bookings});
  }

  /* Function to delete a booking
   */
  handleClickDelete(i) {
    if (confirm("Are you sure you want to remove this booking?")) {
      let bookings = this.state.bookings.slice();
      let removed = bookings.splice(i, 1);
      console.log(removed[0].name);

      //TODO: LÄGG till så att databasen ändrar sig
      this.setState({bookings: bookings});
    }
  }

  /* Imports the bookings from the database
    */
  importForDate() {
    //TODO: fix so that all bokings are loaded for a specified date "this.state.date"
    //into this.bookings
  }

  testLog() {
    const bookings = this.state.bookings.slice();
    console.log("Längd: " + bookings.length);
    for (let i = 0; i < bookings.length; i++) {
      this.handleClickConfirm(i);
      console.log("Index [" + i + "]:" + bookings[i].confirmed);
    }
    console.log("--");
  }

  /* Renders the diffrent views depending in the viewMode
    */
  renderView() {
    if (this.state.viewMode) {
      return (<div>
        <CalendarView date={this.state.date} onClick={this.handleClickCalendar.bind(this)}/>
      </div>);
    } else {
      return (<div className="list-container">
        <button id="back-button" onClick={() => this.changeMode()}>Tillbaka</button>
        <h1>{this.state.date.toDateString()}</h1>
        <ListView data={this.state.bookings} clickConfirm={this.handleClickConfirm.bind(this)} clickDelete={this.handleClickDelete.bind(this)}/>
      </div>);
    }
  }

  render() {
    return (<div className="app">
      <header className="app-header"></header>
      {this.renderView()}
      <button onClick={() => this.testLog()}>debug</button>
    </div>);
  }
}

ReactDOM.render(<App/>, document.getElementById('root'));
