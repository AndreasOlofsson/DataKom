const pathUtils = require('path');

const restrictions = [];
const authenticators = [];
const usersByIDs   = {};
const usersByNames = {};

module.exports = {
    restrict: function (path, types = ['default']) {
        path = pathUtils.normalize(path);
        
        if (!Array.isArray(types)) {
            types = [types];
        }
        
        restrictions.push({
            path: path,
            types: types
        });
    },
    addAuthenticator: function (func) {
        authenticators.push(func);
    },
    authenticate: function (username, password) {
        const user = usersByNames[username] || {
            username: username,
            id: 'todo',
            types: []
        };
        
        authenticators.forEach((authenticator) => {
            const result = authenticator(username, password);
            
            if (result) {
                if (Array.isArray(result)) {
                    result.forEach((type) => {
                        user.types.push(type);
                    });
                } else {
                    user.types.push(type);
                }
            }
        });
        
        if (user.types !== []) {
            usersByNames[username] = user;
            usersByIDs[user.id]    = user;
        }
    },
    canAccess: function (id, path) {
        path = pathUtils.normalize(path);
        
        const user = usersByIDs[id];
        
        return restrictions.filter((restriction) => {
            if ((restriction.path instanceof RegExp && restriction.path.test(path)) ||
                (!(restriction.path instanceof RegExp) && restriction.path === path ))
            {
                console.log(`matched ${ path }`);
                return restriction.types.filter((type) => {
                    console.log(`${ type } ${ user }`);
                    if (!user || !user.types.includes(type)) {
                        return true;x
                    }
                }).length !== 0;
            }
            
            return false;
        }).length === 0;
    }
};