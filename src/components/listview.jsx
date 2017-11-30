import * as React from 'react';

function BookingButton(props) {
  return (<button className="BookingButton" onClick={props.onClick}>
    {/* Diffren facts about the booking
        * Date, numOfppl, preorders
        */
    }
  </button>)
}

class ListView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      uBookings: [
        {}
      ],
      cBookings: [{}]
    };
  }

  handelClick() {}

  buttonList() {}

  render() {
    return (
      <div>
        <BookingButton />
      </div>
    );
    //    return (<div id="ulist" class="listtype">
    //      {/* uButtons */}
    //    </div>
    //    <div id="clist" class="listtype">
    //      {/* cButtons */}
    //    </div>
  }
}

export { ListView };
