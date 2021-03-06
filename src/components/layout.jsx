import React from "react"; // if: import React, { Component } from 'react';

import { Locale } from "../lib/locale";
import { Calendar } from "./calendar.jsx";
import { WSInterface } from "../lib/wsInterface";

const ws = new WSInterface();

if (!Locale.isDefaultLocaleSet()) {
    Locale.setDefaultLocale(new Locale("sv", "SE"));
}

class Layout extends React.Component {
    render() { // return of render is the 1 div that is in "root"
        return (
            <div>
                <Header />
                <UserForms />
            </div>
        );
    }
}

class Header extends React.Component {
    render() {
        return(
            <div>
                <h1> Welcome to Snerikes Table Booking! <br /> </h1>
            </div>
        );
    }
}

class UserForms extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            amountGuests: '2',  // initially set to 2 persons
            date: new Date(Date.now()),
            time: "18.00",
            calDate: null
        };
    }
    changeAmount(newAmount) {
        this.setState({ amountGuests: newAmount });
    }
    changeTime(newTime) {
        if (this.state.date != 0) {
            this.setState({ time: newTime });
            var str = newTime.split('.');
            var newDate = this.state.date;
            newDate.setHours(parseFloat(str[0]));
            newDate.setMinutes(parseFloat(str[1]));
            newDate.toUTCString();
            this.setState({ date: newDate });
        }
    }
    changeName(newName) {
        this.name = newName;
    }
    changeEmail(newEmail) {
        this.email = newEmail;
    }
    changeText(newText) {
        this.text = newText;
    }
    changeDate(newDate) {
        var str = this.state.time.split('.');
        newDate.setHours(parseFloat(str[0]));
        newDate.setMinutes(parseFloat(str[1]));
        newDate.toUTCString();
        this.setState({ date: newDate });
    }
    isDateAvailable(newDate) {
        const date = newDate;
        ws.send(
            {
                request: "reserveTables",
                date: `${ date.getFullYear() }-${ date.getMonth()+1 }-${ date.getDate() }`,
                amountGuests: this.state.amountGuests
            },
            (msg) => {
                var changeDate = new Date(newDate);
                this.changeDate(changeDate); // date is available, change it!
                this.setState({ calDate: newDate });
            },
            (err) => {
                window.alert("date not available.. Choose another date:");
                this.setState({ calDate: null });
            }
        );
    }
    sendBooking() {
        if (this.state.date == 0) {
            window.alert("chosen date is not available.. Choose another date to proceed:");
        }
        else {
            ws.send({
                request: "addBooking",
                booking: {
                    amountGuests: this.state.amountGuests,
                    date: this.state.date,
                    name: this.name,
                    email: this.email,
                    text: this.text
                }
            }, (msg) => {
                if (msg["result"] === "ok") {
                    window.alert("Booking request was successfully sent. Await confirmation email");
                    location.reload();
                }
                else {
                    window.alert("Booking request was unsuccessfully sent.. Try again");
                }
            });
        }
    }
    render() {
        console.log(this.state.amountGuests);
        console.log(this.state.date);
        return (
            <div>
                <p> Begin by entering how many people you are and then choose an available date</p>
                <SubmitForm changeAmount={ this.changeAmount.bind(this) } placeholder={ 2 } />
                <p> Currently showing available dates for { this.state.amountGuests } guests </p>
                <Calendar
                      selectedDate={ this.state.calDate }
                      onDaySelected={ (date) => this.isDateAvailable(date) }
                      transformDate={ (calendarDate) => {
                          const date = calendarDate.getDate();
                          ws.send({
                              request: "getAvailable",
                              date: `${ date.getFullYear() }-${ date.getMonth()+1 }-${ date.getDate() }`,
                              amountGuests: this.state.amountGuests
                          },
                          (msg) => {
                              if (msg["available"] === false) {
                                  calendarDate.setStatusColor("#FF8080");
                              } else {
                                  calendarDate.setStatusColor("#000000");
                              }
                          });
                      } } />
                <MiscForms
                        changeTime = { this.changeTime.bind(this) }
                        changeName = { this.changeName.bind(this) }
                        changeEmail= { this.changeEmail.bind(this) }
                        changeText = { this.changeText.bind(this) }
                        sendBooking= { this.sendBooking.bind(this) }
                />
            </div>
        );
    }
}

class SubmitForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {value: ''};
  }
  handleChange(e) {
    this.setState({value: e.target.value});
  }
  handleSubmit(e) {
    this.props.changeAmount(this.state.value);
    e.preventDefault(); //NEEDED
  }
  render() {
    return (
      <form onSubmit={this.handleSubmit.bind(this)}>
        <label>
          Enter amount of guests:
          <input value={this.state.value} onChange={this.handleChange.bind(this)} />
        </label>
        <input type="submit" value="Update" />
      </form>
    );
  }
}

class MiscForms extends React.Component {
    constructor(props) {
        super(props);
        this.state = {time: "18.00", name: '', email: '', text: ''};
    }
    handleTimeChange(e) {
        this.setState({ time: e.target.value });
    }
    handleNameChange(e) {
        this.setState({ name: e.target.value });
    }
    handleEmailChange(e) {
        this.setState({ email: e.target.value });
    }
    handleTextChange(e) {
        this.setState({ text: e.target.value });
    }
    handleSubmit(e) {
        this.props.changeTime(this.state.time);
        this.props.changeName(this.state.name);
        this.props.changeEmail(this.state.email);
        this.props.changeText(this.state.text);
        this.props.sendBooking();
        e.preventDefault(); //NEEDED
    }

    render() {
        return (
            <div>
                <form onSubmit={ this.handleSubmit.bind(this) }>
                    <label>
                        Time of arrival:
                        <select value={ this.state.value } onChange={ this.handleTimeChange.bind(this) }>
                            <option value="18.00"> 18.00 </option>
                            <option value="18.30"> 18.30 </option>
                            <option value="19.00"> 19.00 </option>
                            <option value="19.30"> 19.30 </option>
                        </select>
                    </label>
                    <label>
                        Name:
                        <input type="text" value={ this.state.value } onChange={ this.handleNameChange.bind(this) } />
                    </label>
                    <label>
                        Email:
                        <input type="text" value={ this.state.value } onChange={ this.handleEmailChange.bind(this) } />
                    </label>
                    <input type="submit" value="Book" />
                    <label>
                        <br></br>
                        Comment:
                        <br></br>
                        <textarea type="text" value={ this.state.value } cols="40" rows="5" onChange={ this.handleTextChange.bind(this) } />
                    </label>
                </form>
            </div>
        );
      }
}

export { Layout };
