'use strict';

const gulp    = require("gulp");
const uglify  = require("gulp-uglify");
const webpack = require("webpack-stream");
const named   = require("vinyl-named");

const webpack_function = webpack({
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /^(\.\/|\/)?node_modules\//,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["env", "stage-2"],
                        compact: true
                    }
                }
            },
            {
                test: /^(\.\/|\/)?node_modules\/.*\.js$/,
                use: { loader: "env-loader" }
            },
            {
                test: /\.jsx$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["env", "react", "stage-2"],
                        compact: true
                    }
                }
            }
        ]
    }
});

gulp.task(
    "build",
    () => {
        gulp.src(["src/*.js", "src/*.jsx"])
            .pipe(named())
            .pipe(webpack_function)
            .pipe(uglify())
            .pipe(gulp.dest("build/"))
    }
);

gulp.task(
    "build-dev",
    () => {
        gulp.src(["src/*.js", "src/*.jsx"])
            .pipe(named())
            .pipe(webpack_function)
            .pipe(gulp.dest("build/"))
    }
);

gulp.task(
    "devbuild",
    () => {
        console.log('Compilation is no longer necessary for development\nrun: npm run start-dev');
    });

gulp.task("default", ["build"]);
