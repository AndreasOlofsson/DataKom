'use strict';

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Layout } from "./components/layout.jsx";
import { HelloWorld } from "./components/test.jsx";

class App extends React.Component {
    render() {
        return (
            <Layout />
        );
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root')
);
