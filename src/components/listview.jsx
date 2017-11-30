import * as React from 'react';

class ListView extends React.Component {
  uButtonList(clickConfirm) {
    const uBookings = this.props.data1;
    const cBookings = this.props.data2;

    const uList = uBookings.map((uBooking, i) =>
    <button key={uBooking.name}
            className="booking-button"
            onClick={() => clickConfirm(i)}>
      {uBooking.name + " " + uBooking.lastname}
    </button>);

    return uList;
  }

  cButtonList(clickDelete) {
    const cBookings = this.props.data2;
    const cList = cBookings.map((cBooking, i) =>
      <button key={cBooking.name}
              className="booking-button"
              onClick={() => clickDelete(i)}>
        {cBooking.name + " " + cBooking.lastname}
      </button>);

    //TODO: Add the real stuff to output
    //TODO: Handle the onClicks

    return cList;
  }

  render() {
    return (<div>
      <div id="unconfirmed-list" className="lists">
        <h2>Unconfirmed</h2>
        {this.uButtonList((i) => this.props.clickConfirm(i))}
      </div>

      <div id="confirmed-list" className="lists">
        <h2>Confirmed</h2>
        {this.cButtonList((i => this.props.clickDelete(i)))}
      </div>
    </div>);
  }
}

export {
  ListView
};
