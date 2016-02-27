module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    var _package = grunt.file.readJSON('./package.json');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
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
                src: ['test/**/*.js']
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
                        "test",
                        "build",
                        "crush",
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
                src: ['Gruntfile.js', 'src/**/*.js']
            }
        }
    })
    ;

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-json-generator');
//    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.loadNpmTasks('grunt-mocha-test');


    grunt.registerTask('test', ['babel', 'less']); // TODO Automate running test in browser
    grunt.registerTask('default', ['clean', 'jshint', 'babel', 'less', 'concat', 'uglify', 'cssmin', 'json_generator', 'copy:lib']);


    //////////////
    ////// Helpers


};