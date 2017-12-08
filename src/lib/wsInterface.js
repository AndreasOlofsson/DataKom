class WSInterface {
    constructor() {
        this.ws = new WebSocket(`ws://${window.location.host}/ws`);
        this.callbacks = [];

        this.ws.onmessage = msg => {
            try {
                msg = JSON.parse(msg.data);
            } catch (e) {
                console.error("Failed to parse JSON");
                console.error(msg);
                return;
            }

            if (msg["result"] != "ok") {
                console.error("An error occurred");
                console.error(msg);
                return;
            }

            if (!msg || !msg["_id"]) {
                console.error("Invalid message");
                console.error(msg);
                return;
            }

            const callback = this.callbacks[msg["_id"] - 1];

            if (callback) {
                callback(msg);
                delete this.callbacks[msg["_id"] - 1];
            }
        };
    }

    send(data, callback) {
        data["_id"] = this.callbacks.push(callback);

        if (this.ws.readyState !== 1) {
            if (this.queue) {
                this.queue.push(JSON.stringify(data));
            } else {
                this.queue = [JSON.stringify(data)];
            }

            this.ws.onopen = event => {
                this.queue.forEach(data => {
                    this.ws.send(data);
                });
            };
        } else {
            this.ws.send(JSON.stringify(data));
        }
    }
}

export {WSInterface};
