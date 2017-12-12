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
                                //console.log(calendarDate.getDate())
                                if(this.props.availableMonth != null) {
                                    let temp = new Date(calendarDate.getDate());
                                    temp.setHours(1);
                                    console.log(this.props.availableMonth);
                                    console.log(temp.toISOString());
                                    if (this.props.availableMonth[temp.toISOString()] === "booked") {
                                        calendarDate.setStatusColor("#0F0");
                                    } else if (this.props.availableMonth[temp.toISOString()] === "full") {
                                        calendarDate.setStatusColor("#F00");
                                    }
                                }
                            }
                        }
                      />);
    }
}

export {
    CalendarView
};
