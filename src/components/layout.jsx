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
            amountGuests: '1',  // initially set to 1 person
            date: new Date(Date.now()),
            time: "18.00",
            name: '',
            email: ''
        };
    }
    changeAmount(newAmount) {
        this.setState({ amountGuests: newAmount });
    }
    changeDate(newDate) {
        var str = this.state.time.split('.');
        newDate.setHours(parseFloat(str[0]));
        newDate.setMinutes(parseFloat(str[1]));
        newDate.toUTCString();
        this.setState({ date: newDate });
    }
    changeTime(newTime) {
        this.setState({ time: newTime });
        var str = newTime.split('.');
        var newDate = this.state.date;
        newDate.setHours(parseFloat(str[0]));
        newDate.setMinutes(parseFloat(str[1]));
        newDate.toUTCString();
        this.setState({ date: newDate });
    }
    changeName(newName) {
        this.setState({ name: newName });
    }
    changeEmail(newEmail) {
        this.setState({ email: newEmail });
    }
    sendBooking() {
        ws.send({
            request: "addBooking",
            booking: {
                amountGuests: this.state.amountGuests,
                date: this.state.date,
                name: this.state.name,
                email: this.state.email
            }
        }, (msg) => {
            "booking sent"
        }, (err) => {
            "booking unsuccessful"
        });
    }
    render() {
        console.log(this.state.amountGuests);
        console.log(this.state.date);
        console.log(this.state.name);
        console.log(this.state.email);
        return (
            <div>
                <p> Begin by entering how many people you are and then choose an available date</p>
                <SubmitForm changeAmount={this.changeAmount.bind(this)} />
                <p> Currently showing available dates for {this.state.amountGuests} guests </p>
                <Calendar
                      onDaySelected={ (date) => this.changeDate(date) }
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
                <MiscForms
                        changeTime ={this.changeTime.bind(this)}
                        changeName ={this.changeName.bind(this)}
                        changeEmail={this.changeEmail.bind(this)}
                        sendBooking={this.sendBooking.bind(this)}
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
        this.state = {time: "18.00", name: '', email: ''};
    }
    handleTimeChange(e) {
        this.setState({time: e.target.value});
    }
    handleNameChange(e) {
        this.setState({name: e.target.value});
    }
    handleEmailChange(e) {
        this.setState({email: e.target.value});
    }
    handleSubmit(e) {
        this.props.changeTime(this.state.time);
        this.props.changeName(this.state.name);
        this.props.changeEmail(this.state.email);
        this.props.sendBooking();
        e.preventDefault(); //NEEDED
    }

    render() {
        return (
            <div>
                <form onSubmit={this.handleSubmit.bind(this)}>
                    <label>
                        Time of arrival:
                        <select value={this.state.value} onChange={this.handleTimeChange.bind(this)}>
                            <option value="18.00"> 18.00 </option>
                            <option value="18.30"> 18.30 </option>
                            <option value="19.00"> 19.00 </option>
                            <option value="19.30"> 19.30 </option>
                        </select>
                    </label>
                    <label>
                        Name:
                        <input type="text" value={this.state.value} onChange={this.handleNameChange.bind(this)} />
                    </label>
                    <label>
                        Email:
                        <input type="text" value={this.state.value} onChange={this.handleEmailChange.bind(this)} />
                    </label>
                    <input type="submit" value="Book" />
                </form>
            </div>
        );
      }
}

export { Layout };
