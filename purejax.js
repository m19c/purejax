(function () {
  'use strict';

  var isPromiseAvailble = ('Promise' in window);

  function xhr() {

  }

  /**
   * @param  {object}   options
   * @param  {function} callback
   * @return {object|Promise}
   */
  function purejax(options, callback) {

  }

  if (typeof define === 'function' && define.amd) {
    define('purejax', purejax);
  } else {
    window.purejax = purejax;
  }
})();