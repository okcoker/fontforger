var exec = require('child_process').exec;
var colors = require('colors');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var debug = require('debug')('fontforger');
var Promise = require('promise');

function fileExists(file) {
    return new Promise(function(resolve) {
        fs.access(file, fs.F_OK, function(err) {
            if (err) {
                resolve(false);
                return;
            }

            resolve(true);
        });
    });
}
function mkdir(pathname) {
    return new Promise(function(resolve, reject) {
        mkdirp(pathname, function(err) {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}

function cleanDir(dir) {
    return new Promise(function(resolve, reject) {
        rimraf(dir, function(err) {
            if (err) {
                console.log(colors.red('File path ' + dir + ' couldn\'t be cleaned.'));
                reject(err);
                return;
            }

            resolve();
        });
    });
}

function convertFont(fontPath, outputPath, extension) {
    return new Promise(function(resolve, reject) {
        var outputName = path.basename(fontPath).split('.')[0];
        var outputFile = outputPath + '/' + outputName + '.' + extension;
        var command = [
            'fontforge',
            '-script "' + path.resolve(__dirname, './generate.pe') + '"',
            fontPath,
            outputName,
            outputPath,
            extension
        ].join(' ');

        fileExists(outputFile).then(function(exists) {
            if (exists) {
                debug(outputFile + ' already exists. Skipping…');
                resolve();
                return;
            }

            debug('Running command: ' + command);

            exec(command, function(error, stdout) {
                debug(stdout);
                if (error) {
                    reject('Could not convert font: ' + fontPath + ' to ' + extension);
                    return;
                }

                resolve();
            });
            return;
        }).catch(reject);
    });
}

function generate(fonts, options) {
    debug('Running on fonts:');
    debug(fonts);

    debug('With options:');
    debug(options);

    var promise = Promise.resolve();

    // Just assuming they're all in the same folder
    var isSamePath = fonts[0] && path.dirname(fonts[0]) === options.output;

    if (options.clean) {
        if (!options.output || isSamePath) {
            return Promise.reject('Input directory can not be the same as output directory when clean option is true.');
        }

        promise = promise.then(function() {
            return cleanDir(options.output + '/*');
        });
    }

    promise = promise.then(function() {
        return mkdir(options.output);
    });

    // Get rid of possible preceding dot
    var formattedExtensions = options.extensions.split(',').map(function(ext) {
        if (ext.charAt(0) === '.') {
            return ext.substr(1);
        }

        return ext;
    });

    debug('Processing fonts: \n' + fonts.join('\n'));

    var operations = fonts.reduce(function(acc, font) {
        var extensionOperations = formattedExtensions.map(function(extension) {
            return convertFont(font, options.output, extension);
        });

        var all = acc.concat(extensionOperations);
        return all;
    }, []);

    return promise.then(function() {
        return Promise.all(operations);
    });
}

module.exports = {
    generate: generate
};
