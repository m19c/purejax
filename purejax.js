(function() {
  'use strict';

  var rootNode = document.getElementsByTagName('script')[0] || document.head,
      jpCount  = 0,
      jpPrefix = '___pj',
      isArray;

  isArray = (Array.isArray) ? Array.isArray : function (value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  };

  function xhr() {
    if (window.XMLHttpRequest) {
      return new window.XMLHttpRequest();
    }

    return window.ActiveXObject('Microsoft.XMLHTTP');
  }

  function extend() {
    var index, key;

    for (index = 1; index < arguments.length; index++) {
      for (key in arguments[index]) {
        if (arguments[index].hasOwnProperty(key)) {
          arguments[0][key] = arguments[index][key];
        }
      }
    }

    return arguments[0];
  }

  function paramify(data, delimiter) {
    delimiter = (typeof delimiter === 'undefined') ? true : delimiter;
    delimiter = (delimiter) ? '?' : '';
    data      = data || {};

    var result = [],
        key, value, index;

    for (key in data) {
      if (!data.hasOwnProperty(key)) {
        continue;
      }

      value = data[key];

      if (isArray(value)) {
        for (index = 0; index < value.length; index++) {
          result.push(encodeURIComponent(key) + '[]=' + encodeURIComponent(value[index]));
        }
      } else {
        result.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
      }
    }

    result = result.join('&');

    return ((result.length > 0) ? delimiter : '') + result;
  }

  /**
   * @param  {number} ms
   * @return {Error}
   */
  function createTimeoutError(ms) {
    var error = new Error('Timeout of ' + ms + ' reached');

    error.timeout        = ms;
    error.isTimeoutError = true;

    return error;
  }

  function jsonp(options, callback) {
    jpCount++;

    var id     = jpPrefix + jpCount,
        script = document.createElement('script'),
        current;

    function cleanUp() {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      window[id] = function () {};

      if (current) {
        clearTimeout(current);
      }
    }

    window[id] = function (data) {
      cleanUp();
      callback(null, data);
    };

    if (options.timeout) {
      current = setTimeout(function () {
        cleanUp();
        callback(createTimeoutError(options.timeout), null);
      }, options.timeout);
    }

    script.setAttribute('type', 'text/javascript');

    options.params.callback = id;
    script.setAttribute('src', options.url + paramify(options.params));

    rootNode.parentNode.insertBefore(script, rootNode);

    return function cancel() {
      if (window[id]) {
        cleanUp();
      }
    };
  }

  function http(options, callback) {
    var request, send, current, isTimeoutTriggered;

    request = xhr();

    if (options.timeout) {
      current = setTimeout(function () {
        isTimeoutTriggered = true;
        callback(createTimeoutError(options.timeout), null);
        request.abort();
      }, options.timeout);
    }

    request.onreadystatechange = function () {
      if (true === isTimeoutTriggered) {
        return;
      }

      if (request.readyState < 4) {
        return;
      }

      var statusCode = parseInt(request.status, 10),
          error;

      if (statusCode >= 200 && statusCode < 300) {
        callback(null, request.responseText);
      } else {
        error = new Error('Invalid status code "' + statusCode + '"');
        error.statusCode = statusCode;

        callback(error, null);
      }

      if (current) {
        clearTimeout(current);
      }
    };

    if ('GET' === options.method) {
      request.open('GET', options.url + paramify(options.params), true);
    } else if ('POST' === options.method) {
      request.open('POST', options.url);
      request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      send = paramify(options.params, false);
    }

    request.send(send);
  }

  /**
   * @return {Promise|void}
   */
  function purejax(options, callback) {
    options = extend({
      url: null,
      method: 'GET',
      timeout: 7000,
      cache: false,
      params: {},

      // just available on xhr requests
      headers: {},
      jsonp: false
    }, options);

    options.method = options.method.toUpperCase();

    if (false === options.cache) {
      options.params._ = (+new Date());
    }

    var isPromiseAvailable = ('Promise' in window);

    if (isPromiseAvailable && !callback) {
      return new Promise(function (resolve, reject) {
        purejax(options, function (error, response) {
          if (error) {
            return reject(error);
          }

          resolve(response);
        });
      });
    }

    if (!isPromiseAvailable && typeof callback !== 'function') {
      throw new Error('Invalid callback obtained');
    }

    return ((true === options.jsonp) ? jsonp : http)(options, callback);
  }

  if (typeof define === 'function' && define.amd) {
    define('purejax', purejax);
  } else {
    window.purejax = purejax;
  }
})();