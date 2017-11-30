'use strict';

import * as React from "react";
import * as ReactDOM from "react-dom";
import { CalendarView } from "./components/calendarview.jsx"
import { ListView } from "./components/listview.jsx"
import { WSInterface } from "./lib/wsInterface.js";


const ws = new WSInterface(); //WebSocket Interface

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      viewMode: true, //True = Calendar, False = ListView
      date: new Date(Date.now()), //Todays Date

      //cBookings
      //uBookings
    };
  }

  /* Function to change the viewmode between
    */
  changeMode() {
    this.setState({
      viewMode: !viewMode
    });
  }

  handelClickCalendar() {
    this.changeMode()
  }

  handelClickList() {}

  /*
    * Renders the diffrent views depending in the viewMode
    */
  renderView() {
    if (this.state.viewMode) {
      return (<div>
        <CalendarView date={this.state.date} onClick={() => handelClickCalendar()}/>
      </div>)
    } else {
      return (< div > <button onClick={() => changeMode()}>Tillbaka till Kalender</button>
      <ListView onClick={() => handelClickList()}/>
    </div>)
    }
  }

  render() {
    return (<div className="App">
      <header className="App-header"></header>
      {this.renderView.bind(this)()}
    </div>);
  }
}

ReactDOM.render(<App/>, document.getElementById('root'));
