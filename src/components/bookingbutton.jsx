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
        <p>{this.props.title}</p>
        <p>{this.props.text}</p>
        <button onClick={this.props.func}>
          {this.props.bText}
        </button>
      </div>);
    } else {
      return (<div className="booking-button" onClick={this.handleExpand}>
        <p>{this.props.title}</p>
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
