import * as React from 'react';
import {BookingButton} from './bookingbutton.jsx';

class ListView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      clickDelete: this.props.clickDelete,
      clickConfirm: this.props.clickConfirm
    };
  }

  buttonList(confirmed) {
    if (this.props.data === null || this.props.data.length === 0) {
      return;
    }
    const bookings = this.props.data.slice();
    const bText = confirmed
      ? "Unconfirm"
      : "Confirm";

    const list = bookings
        .filter((booking) => confirmed === (booking.status === "confirmed"))
        .map((booking, i) =>
            <BookingButton data={booking}
                           bText={bText}
                           funcConfirm={() => this.state.clickConfirm(i)}
                           funcDelete={() => this.state.clickDelete(i)}
                           key={this.props.data[i].name}/>);
    return list;
  }

  render() {
    return (<div>
      <div id="unconfirmed-list" className="lists">
        <h2>Unconfirmed</h2>
        {this.buttonList(false)}
      </div>

      <div id="confirmed-list" className="lists">
        <h2>Confirmed</h2>
        {this.buttonList(true)}
      </div>
    </div>);
  }
}

export {
  ListView
};
