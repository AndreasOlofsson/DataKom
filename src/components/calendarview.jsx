'use strict';

import * as React from "react";
import {Calendar} from "./calendar.jsx";

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
                          onDaySelected={(date) => this.props.onClick(date)}
                          transformDate={(calendarDate) => {
                              console.log(calendarDate.getDate())

                              if (calendarDate.getDate().getDate()%2 === 0) {
                                  calendarDate.setStatusColor("#FF0000");
                              } else {
                                  calendarDate.setStatusColor("#00FF00");
                              }
                            }
                        }
                      />);
    }
}

export {
    CalendarView
};
