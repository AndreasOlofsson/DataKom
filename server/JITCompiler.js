const fs      = require('fs');
const pathUtil = require('path');

fs.mkdirsSync = (path) => {
    const parsed = pathUtil.parse(path);

    if (parsed.root !== path) {
        try {
            if (fs.statSync(path).isDirectory()) {
                return;
            }
        } catch (err) {}

        fs.mkdirsSync(parsed.dir);
        fs.mkdirSync(path);
    }
};

class JITCompiler {
    constructor(compiler, cachePath, rootPath = './') {
        this.compiler = compiler;
        this.cachePath = cachePath && pathUtil.resolve(pathUtil.dirname(module.parent.filename), cachePath);
        this.rootPath = pathUtil.resolve(pathUtil.dirname(module.parent && module.parent.filename || './'), rootPath);

        this.includes = [];

        if (this.cachePath) {
            if (!this.cacheObj) {
                try {
                    console.log('---JIT--- reading cache database');
                    this.cacheObj = fs.readFileSync(
                        pathUtil.join(this.cachePath, 'cache.json'),
                        { encoding: 'utf8' });
                    this.cacheObj = JSON.parse(this.cacheObj);
                } catch (e) {
                    this.cacheObj = {};
                }
            }
        }
    }

    include(path) {
        this.includes.push(pathUtil.resolve(pathUtil.dirname(module.parent.filename), path));

        return this;
    }

    require(path) {
        console.log(`request for ${ path }`);

        return new Promise((resolve, reject) => {
            const resolved = this._resolvePath(path);

            if (!resolved) {
                reject(`Couldn't find module '${ path }'`);
            }

            const resolvedCache = this.cachePath && pathUtil.join(this.cachePath, resolved.replace(/:/g, ''));

            fs.stat(resolved, (statErr, stat) => {
                if (statErr) {
                    reject(statErr);
                    return;
                }

                if (this.cacheObj && this.cacheObj[resolved]) {
                    if (new Date(this.cacheObj[resolved].lastModified).getTime() >=
                            new Date(stat.mtime).getTime()) {
                        fs.readFile(
                            resolvedCache,
                            { encoding: 'utf8' },
                            (err, data) => {
                                if (err) {
                                    console.error(`---JIT--- invalid cached version of ${ resolved }, recompiling`);
                                    console.error(err);

                                    compileFile.bind(this)();
                                } else {
                                    resolve(data);
                                }
                            }
                        );

                        return;
                    } else {
                        console.log(`---JIT--- ${ resolved } outdated, recompiling`);
                    }
                }

                compileFile.bind(this)();

                function compileFile() {
                    fs.readFile(
                        resolved,
                        { encoding: 'utf8' },
                        (err, data) => {
                            if (err) {
                                reject(err);
                            } else {
                                let result;

                                try {
                                    result = this.compiler(
                                        data,
                                        resolved,
                                        (err) => {
                                            reject(err)
                                        },
                                        (result) => {
                                            cacheFile.bind(this)(result);

                                            resolve(result);
                                        }
                                    );
                                } catch (err) {
                                    reject(err);
                                }

                                if (result) {
                                    cacheFile.bind(this)(result);

                                    resolve(result);
                                }
                            }
                        }
                    );
                }

                function cacheFile(result) {
                    if (this.cachePath) {
                        try {
                            fs.mkdirsSync(pathUtil.dirname(resolvedCache));

                            fs.writeFile(
                                resolvedCache,
                                result,
                                {encoding: 'utf8'},
                                (err) => {
                                    if (err) {
                                        console.error(err);
                                    }
                                }
                            );
                            this.cacheObj[resolved] =
                                (this.cacheObj[resolved] || {});
                            this.cacheObj[resolved].lastModified = stat.mtime;
                            fs.writeFile(
                                pathUtil.join(this.cachePath, 'cache.json'),
                                JSON.stringify(this.cacheObj),
                                {encoding: 'utf8'},
                                (err) => {
                                    if (err) {
                                        console.error(err);
                                    }
                                }
                            );
                        } catch (err) {
                            console.error(`---JIT--- failed to cache ${ resolved }`);
                            console.error(err);
                        }
                    }
                }
            });
        });
    }

    _resolvePath(path) {
        if (this.resolveCache && this.resolveCache[path]) {
            return this.resolveCache[path];
        }

        let resolved = null;

        this.includes.concat(this._getModulePaths()).find((includePath) => {
            try {
                let resolvedPath = pathUtil.resolve(includePath, path);

                let stat = fs.statSync(resolvedPath);

                if (stat.isFile()) {
                    resolved = resolvedPath;
                    return true;
                } else if (stat.isDirectory()) {
                    let targetFile = './index.js';

                    try {
                        let packageJSON = fs.readFileSync(pathUtil.resolve(includePath, path, './package.json'));
                        packageJSON = JSON.parse(packageJSON);

                        if (packageJSON && packageJSON.main) {
                            targetFile = packageJSON.main;
                        }
                    } catch (_) {}

                    resolvedPath = pathUtil.resolve(includePath, path, targetFile);

                    stat = fs.statSync(resolvedPath);

                    if (stat.isFile()) {
                        resolved = resolvedPath;
                        return true;
                    }
                }
            } catch (_) {}

            try {
                let resolvedPath = pathUtil.resolve(includePath, `${ path }.js`);

                let stat = fs.statSync(resolvedPath);

                if (stat.isFile()) {
                    resolved = resolvedPath;
                    return true;
                }
            } catch(_) {}

            return false;
        });

        if (!this.resolveCache) this.resolveCache = [];

        this.resolveCache[path] = resolved;

        return resolved;
    }

    _getModulePaths() {
        const modulePaths = [this.rootPath];

        for (let path = this.rootPath;;) {
            modulePaths.push(path);

            const dirname = pathUtil.dirname(path);

            if (dirname === path) {
                break;
            }

            path = dirname;
        }

        return modulePaths.map((path) => {
            return pathUtil.resolve(path, './node_modules/')
        });
    }
}

module.exports = JITCompiler;
