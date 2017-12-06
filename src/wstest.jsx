'use strict';

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Locale } from "./lib/locale";
import { Calendar } from "./components/Calendar.jsx";

import { WSInterface } from "./lib/wsInterface";

const ws = new WSInterface();

if (!Locale.isDefaultLocaleSet()) {
    Locale.setDefaultLocale(new Locale("sv", "SE"));
}

class App extends React.Component {
    constructor(props) {
        super(props);
        
        this.state = {
            date: new Date(Date.now())
        };
    }
    
    render() {
        return (
            <Calendar year={ this.state.date.getFullYear() }
                      month={ this.state.date.getMonth()+1 }
                      onDaySelected={ (date) => console.log(date) }
                      transformDate={ (calendarDate) => {
                          const date = calendarDate.getDate();
                          ws.send({
                              request: "getAvailable",
                              date: `${ date.getFullYear() }-${ date.getMonth()+1 }-${ date.getDate() }`
                          },
                          (msg) => {
                              if (msg["available"] === false) {
                                  calendarDate.setStatusColor("#FF8080");
                              }
                          });
                      } } />
        );
    }
}

const app = <App />;

ReactDOM.render(
    app,
    document.getElementById('root')
);