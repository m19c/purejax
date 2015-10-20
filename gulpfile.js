var gulp = require('gulp');
var eslint = require('gulp-eslint');
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var sequence = require('gulp-sequence');
var uglify = require('gulp-uglify');
var notify = require('gulp-notify');
var cleanUp = require('gulp-clean');
var transpilers = [
  { type: 'amd', suffix: '.amd' },
  { type: 'amdStrict', suffix: '.amd-strict' },
  { type: 'common', suffix: '' },
  { type: 'commonStrict', suffix: '.strict' },
  { type: 'ignore', suffix: '.ignore' },
  { type: 'system', suffix: '.system' },
  { type: 'umd', suffix: '.umd' },
  { type: 'umdStrict', suffix: '.umd-strict' }
];

transpilers.forEach(function eachTranspiler(transpiler) {
  gulp.task(`transpile.${transpiler.type}`, function transpilerTask() {
    return gulp
      .src(['purejax.js'])
      .pipe(babel({
        modules: transpiler.type
      }))
      .pipe(rename(`purejax${transpiler.suffix}.js`))
      .pipe(gulp.dest('dist'))
      .pipe(notify('File "<%= file.relative %>" successfully tranpsiled!'))
    ;
  });
});

gulp.task('minify', function minify() {
  return gulp
    .src(['dist/*.js'])
    .pipe(uglify({
      mangle: false,
      compress: true
    }))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('dist'))
  ;
});

gulp.task('transpile', function transpile(done) {
  sequence(['clean'], transpilers.map((item) => `transpile.${item.type}`), 'minify')(done);
});

gulp.task('clean', function clean() {
  return gulp
    .src('dist/**/*.js', { read: false })
    .pipe(cleanUp())
  ;
});

gulp.task('dev', function dev() {
  gulp.watch(['purejax.js'], ['transpile']);
});

gulp.task('lint', function lint() {
  return gulp
    .src(['purejax.js', 'test/**/*.js', 'gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
  ;
});

gulp.task('test', ['lint']);

gulp.task('default', ['test']);