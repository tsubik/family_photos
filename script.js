"use strict";

var fs = require("fs");
var chokidar = require("chokidar");
var path = require("path");
var exec = require("child_process").exec;
var execSync = require("child_process").execSync;
var imagesDir;
var outputDir;
var croppedDir;
var processedDir;
var tempDir;

run();

function run() {
    processArgs();
    checkArgs();
    checkDirs();
    processImagesDir(imagesDir);

    chokidar.watch(path.join(imagesDir, "*.pnm"), {depth: 0}).on("add", multicrop);
    chokidar.watch(path.join(croppedDir, "*.pnm"), {depth: 0}).on("add", convertToJpg);

    process.on("exit", exitHandler.bind(null, {cleanUp: true}));
    process.on("SIGINT", exitHandler.bind(null, {exit: true}));
    process.on("uncaughtException", exitHandler.bind(null, {exit: true}));
}

function processArgs() {
    process.argv.forEach(function (val, index) {
        if (val === "--images-dir") {
            imagesDir = process.argv[index+1];
            processedDir = path.join(imagesDir, "processed");
            croppedDir = path.join(imagesDir, "cropped");
            tempDir = path.join(imagesDir, "tmp");
        } else if (val === "--output-dir") {
            outputDir = process.argv[index+1];
        }
    });
}

function checkArgs() {
    if (!imagesDir) {
        throw new Error("Please provide --images-dir");
    }

    if (!outputDir) {
        throw new Error("Please provide --output-dir");
    }
}

function checkDirs() {
    if (!fs.existsSync(imagesDir)) {
        throw new Error("Images dir doesn't exist");
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    if (!fs.existsSync(croppedDir)) {
        fs.mkdirSync(croppedDir);
    }

    if (!fs.existsSync(processedDir)) {
        fs.mkdirSync(processedDir);
    }

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
}

function processImagesDir() {
    var files = fs.readdirSync(imagesDir);

    files.forEach(function (file) {
        if (path.extname(file) === ".pnm") {
            multicrop(path.join(imagesDir, file));
        }
    });
}

function multicrop(file) {
    var outputFile = path.join(tempDir, path.basename(file));

    console.log("Multicrop ", file, outputFile);
    exec("./multicrop -u 1 -d 50 -b white " + file + " " + outputFile, function (error) {
        if (error) {
            throw new Error("Error while multi cropping: " + error);
        } else {
            var processedFile = path.join(processedDir, path.basename(file));

            exec("mv " + file + " " + processedFile);
            exec("mv " + tempDir + "/* " + croppedDir);
        }
    });
}

function convertToJpg(file) {
    var outputFile = path.join(outputDir, path.basename(file, ".pnm")) + ".jpg";

    console.log("Converting file to jpg", file);
    exec("convert -quality 90 " + file + " " + outputFile, function (error) {
        if (error) {
            throw new Error("Error while converting to jpeg: " + error);
        } else {
            exec("rm " + file);
        }
    });
}

function exitHandler(options, error) {
    if (options.cleanUp) {
        cleanUp();
    }

    if (options.exit) {
        process.exit();
    }

    if (error) {
        console.log(error.stack);
    }
}

function cleanUp() {
    console.log("Cleaning up");
    execSync("rm -rf " + croppedDir);
    execSync("rm -rf " + tempDir);
    process.exit();
}
