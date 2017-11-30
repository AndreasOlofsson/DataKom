'use strict';

import * as React from "react";
import * as ReactDOM from "react-dom";
import {CalendarView} from "./components/calendarview.jsx"
import {ListView} from "./components/listview.jsx"
import {WSInterface} from "./lib/wsInterface.js";

const ws = new WSInterface(); //WebSocket Interface

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      viewMode: false, //True = Calendar, False = ListView
      date: new Date(Date.now()), //Todays Date
      uBookings: [
        {
          name: "Valter",
          lastname: "Gådin"
          ppl: 5,
        }, {
          name: "Melker",
          lastname: "Forsell"
          ppl: 4,
        }
      ],
      cBookings: [
        {
          name: "Andreas",
          lastname: "Olofsson"
          ppl: 3,
        }, {
          name: "Gustav",
          lastname: "Janer"
          ppl: 10,
        }
      ],
    };
  }

  /* Function to change the viewmode between
    */
  changeMode() {
    this.setState({
      viewMode: !this.state.viewMode
    });
  }

  handleClickCalendar(date) {
    //TODO: LÄGG till så att hämta bokningar för dagen
    //TODO: Uppdatera uBookings & cBookings för den dagen
    //alert(date)
    this.changeMode();
  }

  /*
  * handleClick, removes a not yet handled booking to the confirmed cue
  */
  handleClickConfirm(i) {
    const uBookings = this.state.uBookings.slice();
    const cBookings = this.state.cBookings.slice();
    const toConfirm = uBookings.splice(i, 1)[0];
    cBookings.push(toConfirm);

    //TODO: LÄGG till så att databasen ändrar sig

    this.setState({uBookings: uBookings, cBookings: cBookings});
  }

  handleClickDelete(i) {
    if (confirm("Are you sure you want to remove this booking?")) {
      const cBookings = this.state.cBookings.slice();
      cBookings.splice(i, 1);

      //TODO: LÄGG till så att databasen ändrar sig

      this.setState({cBookings: cBookings});
    }
    else return;
  }

  /*
    * Renders the diffrent views depending in the viewMode
    */
  renderView() {
    if (this.state.viewMode) {
      return (<div>
        <CalendarView date={this.state.date} onClick={this.handleClickCalendar.bind(this)}/>
      </div>)
    } else {
      return (<div className="list-container">
        <button id="back-button" onClick={() => this.changeMode()}>Tillbaka</button>
        <h1>{this.state.date.toDateString()}</h1>
        <ListView data1={this.state.uBookings} data2={this.state.cBookings} clickConfirm={this.handleClickConfirm.bind(this)} clickDelete={this.handleClickDelete.bind(this)}/>
      </div>)
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
