module.exports = function (config) {
    'use strict';

    config.set({

        basePath: '../',


        files: [],  // Supplied by grunt
        exclude: [],

        preprocessors: {
            'tests/fixtures/**/*.html': ['html2js'],
            'src/**/*.js': ['coverage']
        },

        //client: {
        //    reporter: 'html',
        //    ui: 'bdd'
        //},
        frameworks: ['mocha', 'chai'],
        reporters: ['mocha', 'progress', 'coverage'],

        port: 9877,
        colors: true,
        browsers: [],

        logLevel: config.LOG_INFO,

        coverageReporter: {
            dir: 'tests/coverage',
            instrumenter: {
                'src/**/*.js': ['istanbul']
            },
            reporters: [
                {type: 'html', subdir: 'report-html'},
                {type: 'lcov', subdir: 'report-lcov'},
                {type: 'lcovonly', subdir: '.', file: 'report-lcovonly.txt'},
            ]
        }
    });
};