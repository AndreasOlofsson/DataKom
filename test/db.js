const db     = require("../server/db.js");

module.exports = () => {
    db().then(it => global.db = it);
    global.
    global.sync = function(promise) {
        promise.then(it => console.log(it)).catch(err => console.error(err));
        return undefined;
    }
};