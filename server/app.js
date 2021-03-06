"use strict";

// Includes

const config = require("./config.js");

const express = require("express");
const http = require("http");
const mime = require("mime-types");
const pathUtils = require("path");

const dbInterface = require("./db.js");
const restriction = require("./restriction");

const JITCompiler = require("./JITCompiler.js");

// Program variables

let debug = false;
let dev = false;
let port = 80;

// Parsing arguments

const argv = (() => {
    let scriptArgs = false;
    return process.argv.filter(val => {
        if (val === "--") {
            scriptArgs = true;
            return false;
        }
        return scriptArgs;
    });
})();

argv.forEach(val => {
    if (val === "--debug") {
        debug = true;
        console.log("--- in debug mode ---");
    } else if (val === "--dev") {
        dev = true;
        console.log("--- in development mode ---");
    } else if (val.startsWith("--port=")) {
        port = val.substr("--port=".length);
    } else {
        console.log(`Unknown argument '${val}'.`);
        process.exit(-1);
    }
});

// Main section

const app = express();

let db;

//restriction.restrict('/whole.html', 'default');

app.set("port", process.env.PORT || port);

app.use((req, res, next) => {
    if (!restriction.canAccess('', req.path)) {
        console.log(`denied access to ${ req.path }`);
        res.render(pathUtils.join(__dirname, '../public/err/403.html'));
    } else {
        next();
    }
});

app.use(express.static("public"));
app.use(express.static("build"), (req, res, next) => {
    res.setHeader("Content-Type", mime.lookup(req.url));
    next();
});

app.engine('html', require('ejs').renderFile);

if (dev) {
    const babel = require("babel-core");

    const jit = new JITCompiler(
        (code, path, err, callback) => {
            const transformedCode = babel.transform(require + code, {
                presets: path.endsWith(".jsx") ? ["env", "stage-2", "react"] : ["env", "stage-2"]
            }).code;

            const pathDir = pathUtils.dirname(path);

            const wrappedCode = `(function() {
var process = {
    env: {
        NODE_ENV: 'development'
    }
};
var module = new class Module {
    constructor() {
        this.id = ${JSON.stringify(path)};
        this.exports = {};
        this.parent = null;
    }
};
var require = function(path) {
    const pathMatch = path.match(/^(\\.\\.?)?\\/(.*)/);

    if (pathMatch) {
        path = \`\${
            pathMatch[1] ?
            \`/require/\${
                require.__dirname
            }/\${
                pathMatch[1] === '..' ? '../' : ''
            }\`
            : ''
        }\${ pathMatch[2] }\`;
    } else {
        path = \`/node_modules/\${ path }\`
    }

    let xhr = new XMLHttpRequest();
    xhr.open("GET", path, false);
    xhr.send(null);

    if (xhr.status == 200) {
        var module = eval(xhr.responseText);
        return module.exports;
    } else {
        throw xhr.statusText;
    }
};
require.__dirname = ${JSON.stringify(pathDir)};
module.require = require;
(function(exports, module, mod, require, self, __filename, __dirname) {
${transformedCode}
})(module.exports, module, module, require, { require: require }, ${JSON.stringify(
                path
            )}, ${JSON.stringify(pathDir)});
return module;
})();`;

            return wrappedCode;
        },
        "../jit-cache/",
        "../"
    );

    jit.include("../src/");

    app.use((req, res, next) => {
        const regex = /^\/*(require-rel|require|node_modules)\/+(.*)/;

        const path = decodeURI(req.path);

        const match = path.match(regex);

        if (match) {
            let path = match[2];

            if (match[1] === "require-rel") {
                path = `./${path}`;
            } else if (match[1] === "require") {
                path = `/${path}`;
                if (path.match(/\/[A-Z]:(.*)/)) {
                    path = path.substr(1);
                }
            }

            jit
                .require(path)
                .then(result => {
                    res.setHeader("Content-type", "application/javascript");
                    res.end(result);
                })
                .catch(err => {
                    console.error(err);
                    next();
                });
        } else if (path.endsWith(".js")) {
            jit
                .require(`./${path}`)
                .then(result => {
                    res.setHeader("Content-type", "application/javascript");
                    res.end(result);
                })
                .catch(() => {
                    jit
                        .require(`./${path}x`)
                        .then(result => {
                            res.setHeader("Content-type", "application/javascript");
                            res.end(result);
                        })
                        .catch((err) => {
                            console.error(err);
                            next();
                        });
                });
        } else {
            next();
        }
    });
}

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
});

process.on('uncaughtException', (err) => {
    console.error(err);
});

(async function() {
    try {
        db = await dbInterface();
    } catch (e) {
        console.log(e);
        process.exit(-1);
    }

    console.log("DB connected");

    const server = http.createServer(app);

    require("./ws.js")(server, db);

    server.listen(app.get("port"), () => console.log(`Listening on port ${app.get("port")}`));
})();
