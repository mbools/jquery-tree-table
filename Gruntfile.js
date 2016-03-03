module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    var _package = grunt.file.readJSON('./package.json');

    grunt.initConfig({
        pkg: _package,
        concat: {
            options: {
                separator: '///'
            },
            dist: {
                files: [
                    {
                        src: ['build/**/*.js'],
                        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
                    },
                    {
                        src: ['build/**/*.css'],
                        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.css'
                    }
                ]
            }
        },
        less: {
            options: {},
            files: {
                expand: true,
                cwd: 'src/',
                dest: 'build',
                ext: '.css',
                src: ['**/*.less']
            }
        },
        lesslint: {
            options: {
                csslint: {
                    'box-sizing' : false, // We're not supporting IE6/7 so this rule is not important
                    'adjoining-classes': false, // Another IE6 rule we don't need
                },
            },
            src: ['src/**/*.less']
        },
        cssmin: {
            dist: {
                files: {
                    'dist/<%= pkg.name %>-<%= pkg.version %>.min.css': 'dist/<%= pkg.name %>-<%= pkg.version %>.css'
                }

            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                compress: {
                    global_defs: {
                        "DEBUG": false
                    },
                    dead_code: true
                }
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
                }
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    captureFile: 'results.txt',
                    quiet: false,
                    clearRequireCache: false
                },
                src: ['tests/**/*.js']
            }
        },
        babel: {
            options: {
                sourceMap: true,
                presets: ['babel-preset-es2015']
            },
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: 'src/',
                        src: ['*.js'],
                        dest: 'build/'
                    }
                ]
            }
        },
        json_generator: {
            dist: {
                dest: "bower.json",
                options: {
                    name: "<%= pkg.name %>",
                    version: "<%= pkg.version %>",
                    description: "<%= pkg.description %>",
                    //"main": [
                    //    "dist/"
                    //],
                    repository: _package.repository,
                    dependencies: _package.dependencies,
                    keywords: _package.keywords,
                    //"optionalDependencies": {
                    //    // If you don't use jquery-ui you must include the jquery-ui-widget.x.x.x.min.js included in this package
                    //    "jquery-ui": ">=1.10.0"
                    //},
                    license: "<%= pkg.license %>",
                    ignore: [  // Should use a function to exlude all but dist I guess
                        "**/.*",
                        "node_modules",
                        "bower_components",
                        "tests",
                        "build",
                        "lib",
                        "README.md",
                        "results.txt"
                    ]
                }
            }
        },
        copy: {
            lib: {
                files: [
                    {
                        expand: true,
                        cwd: 'lib/',
                        src: ['*.min.js'],
                        dest: 'dist/'
                    }
                ]
            }
        },
        clean: {
            tmp: {
                src: ['build', 'dist']
            }
        },
        jshint: {
            options: {
                esversion: 6
            },
            dist: {
                src: ['Gruntfile.js', 'src/**/*.js', 'tests/**/*-test.js']
            }
        },
        jsdoc: {
            dist: {
                src: ['src/**/*.js'],
                options: {
                    destination: 'doc',
                    readme: 'README.md'
                }
            }
        },
        connect: {
            dev: {
                options: {
                    port: 8008,
                    protocol: 'http',
                    hostname: '*',
                    base: './',
                    keepalive: true
                }
            }
        },
        karma: {
            options: {
                configFile: 'tests/karma.config.js',
                files: [
                    'node_modules/chai/chai.js',

                    'bower_components/jquery/dist/jquery.js',

                    'lib/jquery-ui-widget.1.11.4.js',

                    'build/**/*.js',
                    'tests/**/*-test.js',
                    'tests/fixtures/**/*.html'
                ],
            },
            dev: {  // for developer watched testing
                browsers: ['PhantomJS', 'Firefox', 'Chrome'],
                singleRun: false,
                autoWatch: true,
            },
            test: { // Single shot testing
                browsers: ['PhantomJS', 'Firefox', 'Chrome'],
                singleRun: true,
                autoWatch: false,
            },
            dist: { // Distribution build testing
                singleRun: true,
                autoWatch: false,
                browsers: ['PhantomJS'],
            },
            CI: {   // CI build testing
                singleRun: true,
                autoWatch: false,
                browsers: ['PhantomJS'],
            }
        }
    });


    require('load-grunt-tasks')(grunt);

    grunt.registerTask('serve', ['clean', 'babel', 'less', 'karma:dev']);
    grunt.registerTask('test', ['clean', 'babel', 'less', 'karma:test']);
    grunt.registerTask('default', ['clean', 'jshint', 'jsdoc', 'babel', 'less', 'lesslint', 'concat', 'uglify', 'cssmin', 'karma:dist', 'json_generator', 'copy:lib']);
};