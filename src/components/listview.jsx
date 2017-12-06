import * as React from 'react';
import {BookingButton} from './bookingbutton.jsx';

class ListView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      clickConfirm: this.props.clickConfirm,
      clickDelete: this.props.clickDelete
    };
  }

  buttonList(confirmed) {
    if (this.props.data.length === 0) {
      return;
    }
    const bookings = this.props.data.slice();
    const func = confirmed
      ? this.state.clickDelete
      : this.state.clickConfirm;

    const bText = confirmed
      ? "delete"
      : "confirm";

    const list = bookings.map((booking, i) =>
     <BookingButton title={this.props.data[i].name}
                    text={"Efternamn: " + this.props.data[i].lastname}
                    bText={bText}
                    func={() => func(i)}
                    key={this.props.data[i].name}/>);
    return list;
  }

  render() {
    return (<div>
      <div id="unconfirmed-list" className="lists">
        <h2>Unconfirmed</h2>
        {/*this.buttonList(false)*/}
      </div>

      <div id="confirmed-list" className="lists">
        <h2>Confirmed</h2>
        {/*this.buttonList(true)*/}
      </div>
    </div>);
  }
}

export {
  ListView
};
