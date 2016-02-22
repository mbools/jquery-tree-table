module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: '///'
            },
            dist: {
                src: ['build/**/*.js'],
                dest: 'build/<%= pkg.name %>.js.unified'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>'],
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
                }
                ,
                src: ['test/**/*.js']
            }
        },
        babel: {
            options: {
                sourceMap: true,
                presets: ['babel-preset-es2015']
            }
            ,
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
            },
            css: {
                files: [
                    {
                        expand: true,
                        cwd: 'src/',
                        src: ['*.css'],
                        dest: 'dist/'
                    }
                ]
            }
        }
    })
    ;

    grunt.loadNpmTasks('grunt-contrib-uglify');
//    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.loadNpmTasks('grunt-mocha-test');


    grunt.registerTask('test', ['babel', 'copy:css']); // TODO Automate running test in browser
    grunt.registerTask('default', ['babel', 'concat', 'uglify', 'copy:lib', 'copy:css']);
}