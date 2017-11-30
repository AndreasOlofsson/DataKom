'use strict';

import * as React from "react";
import { Calendar } from "./calendar.jsx";

class CalendarView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      date: this.props.date
    };
  }

  render() {
    return (<Calendar year={this.state.date.getFullYear()}
                      month={this.state.date.getMonth() + 1}
                      onDaySelected={(date) => console.log(date)}
                      //transformDate
                      //Locale
    />);
  }
}

export { CalendarView };
