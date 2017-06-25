var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var moment = require('moment');

// 定时器
var schedule = require('node-schedule');

var bing = require('./utils/bingUtils.js');
var db = require('./utils/dbUtils.js');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

var BING_MARKETS = ["ar-xa", "bg-bg", "cs-cz", "da-dk", "de-at", "de-ch", "de-de", "el-gr", "en-a", "en-ca", "en-gb", "en-id", "en-ie", "en-in", "en-my", "en-nz", "en-ph", "en-sg", "en-us", "en-xa", "en-za", "es-ar", "es-cl", "es-es", "es-mx", "es-us", "es-xl", "et-ee", "fi-fi", "fr-be", "fr-ca", "fr-ch", "fr-fr", "he-il", "hr-hr", "hu-h", "it-it", "ja-jp", "ko-kr", "lt-lt", "lv-lv", "nb-no", "nl-be", "nl-nl", "pl-pl", "pt-br", "pt-pt", "ro-ro", "ru-r", "sk-sk", "sl-sl", "sv-se", "th-th", "tr-tr", "uk-ua", "zh-cn", "zh-hk", "zh-tw"];
let k = 0;
/**
 * 每隔30秒检测bing数据
 */
schedule.scheduleJob('*/30 * * * * *', () => {
    let mkt = BING_MARKETS[k];
    k = k < BING_MARKETS.length - 1 ? ++k : 0
    let config = {
        ids: 0,
        n: 1,
        format: 'js',
        mkt: mkt
    }
    if (mkt == 'zh-cn') {
        let tasks = [bing.fetchPicture(config), bing.fetchStory()];
        Promise.all(tasks).then(ret => {
            return bing.convert(mkt, ret)
        }).then(ret => {
            db.get('bing', {
                enddate: ret.enddate,
                filename: ret.filename,
                mkt: mkt
            }).then(rows => {
                if (rows.length == 0) {
                    db.set('bing', ret)
                } else {
                    let images = rows[0]
                    db.update('bing', {
                        mkt: mkt + ',' + images['mkt']
                    }, {
                        id: images.id
                    })
                }
            })
        })

    } else {
        bing.fetchPicture(config).then(ret => {
            return bing.convert(mkt, ret)
        }).then(ret => {
            db.get('bing', {
                enddate: ret.enddate,
                filename: ret.filename,
                mkt: mkt
            }).then(rows => {
                if (rows.length == 0) {
                    db.set('bing', ret)
                } else {
                    let images = rows[0]
                    db.update('bing', {
                        mkt: mkt + ',' + images['mkt']
                    }, {
                        id: images.id
                    })
                }
            })
        })
    }
    //console.log(moment().format('YYYY-MM-DD HH:mm:ss'))
})


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;