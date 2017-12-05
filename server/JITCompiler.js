const fs      = require('fs');
const pathUtil = require('path');

fs.mkdirsSync = (path) => {
    const parsed = pathUtil.parse(path);
    
    if (parsed.root !== path) {
        try {
            if (fs.statSync(path).isDirectory()) {
                return;
            }
        } catch (err) {
            if (err.errno !== -4058) {
                throw err;
            }
        }
        
        fs.mkdirsSync(parsed.dir);
        fs.mkdirSync(path);
    }
};

class JITCompiler {
    constructor(compiler, cachePath) {
        this.compiler = compiler;
        this.cachePath = cachePath && pathUtil.resolve(pathUtil.dirname(module.parent.filename), cachePath);
        
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
        let resolved;
        try {
            resolved = require.resolve(path);
        } catch (_) {}
        
        if (!resolved) {
            this.includes.find((includePath) => {
                const includedPath = pathUtil.resolve(includePath, path);
                
                try {
                    if (fs.statSync(includedPath).isFile()) {
                        resolved = includedPath;
                        return true;
                    }
                } catch (_) {}
                
                try {
                    if (fs.statSync(includedPath + '.js').isFile()) {
                        resolved = includedPath + '.js';
                        return true;
                    }
                } catch (_) {}
                
                return false;
            });
        }
        
        return new Promise((resolve, reject) => {
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
}

module.exports = JITCompiler;