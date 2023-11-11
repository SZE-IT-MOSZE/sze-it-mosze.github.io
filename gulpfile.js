//gulpfile.js
var gulp = require("gulp"), pug = require('gulp-pug');

function pugToHtml(){
   return gulp.src('src')
  .pipe(pug({
     pretty: true
  }))
  .pipe(gulp.dest('dest'));
}
exports.pugToHtml = pugToHtml;