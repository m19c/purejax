/**
 * @module purejax
 * @author Marc Binder <marcandrebinder@gmail.com>
 */

'use strict';

var rootNode = document.getElementsByTagName('script')[0] || document.head;
var count = 0;
var prefix = '___pj';
var cacheKey = '_';
var isArray = undefined;
var XMLHttpRequest = window.XMLHttpRequest;
var createActiveXObject = window.ActiveXObject;
var typeMap = {
  '[object Boolean]': 'boolean',
  '[object Number]': 'number',
  '[object String]': 'string',
  '[object Function]': 'function',
  '[object Array]': 'array',
  '[object Date]': 'date',
  '[object RegExp]': 'regexp',
  '[object Object]': 'object',
  '[object Error]': 'error',
  '[object Symbol]': 'symbol'
};
var toString = typeMap.toString;
var hasOwnProperty = typeMap.hasOwnProperty;

isArray = Array.isArray ? Array.isArray : function isArrayPolyfill(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
};

function type(value) {
  if (value === null) {
    return value + '';
  }

  return typeof value === 'object' || typeof value === 'function' ? typeMap[toString.call(value)] || 'object' : typeof value;
}

function isPlainObject(value) {
  if (type(value) !== 'object' || value.nodeType || value !== null && value === value.window) {
    return false;
  }

  if (value.constructor && !hasOwnProperty.call(value.constructor.prototype, 'isPrototypeOf')) {
    return false;
  }

  return true;
}

function extend() {
  var options;
  var name;
  var src;
  var copy;
  var copyIsArray;
  var clone;
  var target = arguments[0] || {};
  var index = 1;
  var length = arguments.length;
  var deep = false;

  if (type(target) === 'boolean') {
    deep = target;
    target = arguments[index] || {};
    index++;
  }

  if (type(target) !== 'object' && type(target) !== 'function') {
    target = {};
  }

  for (; index < length; index++) {
    options = arguments[index];

    if (options !== null) {
      for (name in options) {
        src = target[name];
        copy = options[name];

        if (target === copy) {
          continue;
        }

        copyIsArray = isArray(copy);
        if (deep && copy && (isPlainObject(copy) || copyIsArray)) {
          if (copyIsArray) {
            copyIsArray = false;
            clone = src && isArray(src) ? src : [];
          } else {
            clone = src && isPlainObject(src) ? src : {};
          }

          target[name] = extend(deep, clone, copy);
        } else if (copy !== undefined) {
          target[name] = copy;
        }
      }
    }
  }

  return target;
}

function xhr() {
  if (XMLHttpRequest) {
    return new XMLHttpRequest();
  }

  return createActiveXObject('Microsoft.XMLHTTP');
}

function paramify(data, delimiter) {
  var result = [];
  var key;
  var value;
  var index;

  delimiter = typeof delimiter === 'undefined' ? true : delimiter;
  delimiter = delimiter ? '?' : '';
  data = data || {};

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

  return (result.length > 0 ? delimiter : '') + result;
}

/**
 * @param  {number} ms
 * @return {Error}
 */
function createTimeoutError(ms) {
  var error = new Error('Timeout of ' + ms + ' reached');

  error.timeout = ms;
  error.isTimeoutError = true;

  return error;
}

function jsonp(options, callback) {
  var id;
  var script = document.createElement('script');
  var current;

  count++;

  id = id = prefix + count;

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
  var request;
  var send;
  var current;
  var isTimeoutTriggered;

  request = xhr();

  if (options.timeout) {
    current = setTimeout(function () {
      isTimeoutTriggered = true;
      callback(createTimeoutError(options.timeout), null);
      request.abort();
    }, options.timeout);
  }

  request.onreadystatechange = function () {
    var statusCode;
    var error;

    if (isTimeoutTriggered) {
      return;
    }

    if (request.readyState < 4) {
      return;
    }

    statusCode = parseInt(request.status, 10);

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

  if (options.method === 'GET') {
    request.open('GET', options.url + paramify(options.params), true);
  } else if (options.method === 'POST') {
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
  var isPromiseAvailable = ('Promise' in window);

  options = extend({
    url: null,
    method: 'GET',
    timeout: 7000,
    cache: false,
    params: {},
    headers: {},
    jsonp: false
  }, options);

  options.method = options.method.toUpperCase();

  if (!options.cache) {
    options.params[cacheKey] = +new Date();
  }

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

  return (options.jsonp ? jsonp : http)(options, callback);
}

exports['default'] = purejax;