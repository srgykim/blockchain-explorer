'use strict';

var gulp = require('gulp');
var watch = require('gulp-watch');
var sass = require('gulp-sass');
var maps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var del = require('del');

// var uglify = require('gulp-uglify');
// var notify = require("gulp-notify");
// var cleanCSS = require("gulp-clean-css");


var options = {
  src: 'src',
  public: 'public'
}


gulp.task('watch-scss',function(){
    gulp.watch(options.public + '/scss/*.scss', ['compileSass']);
});

gulp.task('scssconcat', function() {
  return gulp.src(['./public/scss/variables.scss',
  								 '!./public/scss/style.scss',
                   './public/scss/base.scss',
                   './public/scss/!(variables)*.scss'])
    .pipe(concat('style.scss'))
    .pipe(gulp.dest('./public/scss/'));
});

gulp.task('compileSass',['scssconcat'], function() {
	return gulp.src([options.public + '/scss/style.scss',])
		.pipe(maps.init())
		.pipe(sass().on('error', swallowError))
		.pipe(maps.write('./'))
		.pipe(gulp.dest(options.public + '/styles'));
});

function swallowError (error) {
  console.log(error.toString())
  this.emit('end')
}
