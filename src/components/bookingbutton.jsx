import * as React from 'react';

class BookingButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      expanded: false,
    };

    this.handleExpand = this.handleExpand.bind(this)
  }

  handleExpand() {
    this.setState({
      expanded: !this.state.expanded
    });
  }

  renderView() {
    if (this.state.expanded) {
      return (<div className="booking-button-expanded" onClick={this.handleExpand}>
        <p>{this.props.data.name}</p>
        <p>{"Antal: " + this.props.data.number}</p>
        <p>{"Email: " + this.props.data.email}</p>
        <p>{"Fritext: " + this.props.data.text}</p>
        <button onClick={this.props.funcConfirm}>
            {this.props.bText}
        </button>
        <button onClick={this.props.funcDelete}>
          Delete
      </button>
      </div>);
    } else {
      return (<div className="booking-button" onClick={this.handleExpand}>
        <p>{this.props.data.name}</p>
      </div>);
    }
  }

  render() {
    return (<div>{this.renderView()}</div>);
  }
}

export {
  BookingButton
};
