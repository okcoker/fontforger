#!/usr/bin/env node

/* eslint-disable no-process-exit */

'use strict';

var fs = require('fs');
var path = require('path');
var colors = require('colors');
var glob = require('glob');
var Program = require('commander').Command;
var fontforger = require('./');

var pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));

var defaultExtensions = [
    'otf',
    'ttf',
    'woff',
    'woff2',
    'eot',
    'svg'
].join(',');

function isBool(value) {
    if (value === true || value === 'true') {
        return true;
    }

    return false;
}

var program = new Program(pkg.name);
program
    .version(pkg.version)
    .usage('/input/path/to/font.ttf [options]')
    .option('-e, --ext [extensions]', 'Comma separated extensions to convert input fonts to. Defaults to "' + defaultExtensions + '"', defaultExtensions)
    .option('-o, --output [path]', 'Output path of converted fonts. Defaults to input path')
    .option('-c, --clean [boolean]', 'Clean output directory before generating new fonts. Must provide separate input and output directories when this option is true. Defaults to false', isBool, false)
    .on('--help', function() {
        console.log('  Examples:');
        console.log();
        console.log('    $ fontforger /path/to/font.ttf');
        console.log('    $ fontforger "/path/to/fonts/**/*.woff" -e ttf,otf -o /path/to/generate/fonts');
        console.log('    $ fontforger "/path/to/fonts/*" -e otf -o /path/to/generate/fonts -c true');
        console.log();
    })
    .parse(process.argv);

var inputPath = program.args[0];

if (!inputPath) {
    program.outputHelp();
    process.exit(0);
}

var outputPath = program.output || inputPath;
// Ignore incorrectly collected file paths when
// your input path ends with an * like the last
// example under the cli usage
var files = glob.sync(inputPath).filter(function(file) {
    return file[file.length - 1] !== '*';
});

if (outputPath[outputPath.length - 1] === '*') {
    outputPath = path.dirname(outputPath);
}

if (!files.length) {
    console.log(colors.yellow('No files found in', inputPath));
    process.exit(0);
}

var options = {
    extensions: program.ext,
    output: path.resolve(outputPath),
    clean: program.clean
};

fontforger.generate(files, options).then(function() {
    return console.log(colors.green('Done!'));
}).catch(function(err) {
    console.log('Error running fontforger!');
    console.log(colors.red(err));
});
