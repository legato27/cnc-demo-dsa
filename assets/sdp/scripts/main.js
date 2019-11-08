var modAnalytics = (function ($) { /* jshint ignore:line */
  'use strict';

  /* GENERIC */
  var init = function () {
    $(document).on('click', '[data-track-label]', onElementClicked);
  };

  var onElementClicked = function () {
    var data = {
      event: $(this).attr('data-track-event') || $(this).parents('[data-track-event]').attr('data-track-event'),
      eventCategory: $(this).attr('data-track-category') || $(this).parents('[data-track-category]').attr('data-track-category'),
      eventAction: $(this).attr('data-track-action') || $(this).parents('[data-track-action]').attr('data-track-action'),
      eventLabel: $(this).attr('data-track-label'),
    };

    if ($(this).attr('data-track-extra') || $(this).parents('[data-track-extra]').attr('data-track-extra')) {
      data = _.assignIn(data, JSON.parse($(this).attr('data-track-extra') || $(this).parents('[data-track-extra]').attr('data-track-extra')));
    }

    if (_.some([data.event, data.eventCategory, data.eventAction, data.eventLabel], _.isEmpty)) {
      return;
    }

    if (window.dataLayer) {
      window.dataLayer.push(data);
    }
  };

  var pageTrack = function (data) {
    if (window.dataLayer) {
      window.dataLayer.push(_.assignIn({
        event: 'PageTrack',
      }, data));
    }
  };

  var eventTrack = function (data) {
    if (window.dataLayer) {
      window.dataLayer.push(data);
    }
  };

  return {
    init: init,
    pageTrack: pageTrack,
    eventTrack: eventTrack,
  };
})(jQuery);

var helper = (function ($) {
  'use strict';

  var pageLoaderTimeoutID;
  // Convert Degress to Radians
  var Deg2Rad = function (deg) {
    return deg * Math.PI / 180;
  };

  var PythagorasEquirectangular = function (lat1, lon1, lat2, lon2) {
    lat1 = Deg2Rad(lat1);
    lat2 = Deg2Rad(lat2);
    lon1 = Deg2Rad(lon1);
    lon2 = Deg2Rad(lon2);
    var R = 6371; // km
    var x = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2);
    var y = (lat2 - lat1);
    var d = Math.sqrt(x * x + y * y) * R;
    return d;
  };

  var getNearest = function (latitude, longitude, locations) {
    var mindif = 99999;
    var closest;

    for (var index = 0; index < locations.length; ++index) {
      var dif = PythagorasEquirectangular(latitude, longitude, locations[index].lat, locations[index].lng);
      if (dif < mindif) {
        closest = index;
        mindif = dif;
      }
    }

    // return the nearest location
    return locations[closest];
  };

  var getGeolocation = function (callback, timeout) {
    var options = {
      enableHighAccuracy: true,
      timeout: timeout || 5000,
      maximumAge: 60000
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        callback({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      }, function (error) {
        callback(error);
      }, options);
    } else {
      // Fallback for no geolocation
      callback(null);
    }
  };

  var svgIcon = function (iconName, className, hasPadding) {
    var iconContainer = ($('.svgiconContainer').val() !== undefined) ? $('.svgiconContainer').val() + '/' : '/images/icons/icons.svg';
    var icon = ($('.svgiconName').val() !== undefined) ? $('.svgiconName').val() : iconName;
    var html = '<svg class="icon icon-{{icon}} hide ' + (hasPadding ? 'padding' : '') + '"><use xlink: href="' + iconContainer + '#icon-{{icon}}"></svg>';

    html = html.replace(/{{icon}}/ig, icon);
    html = html.replace(/hide/ig, className || '');
    return html;
  };

  var qs = function (key) {
    var qs = Qs.parse(location.search, {
      ignoreQueryPrefix: true
    });
    return key ? qs[key] : qs;
  };

  var checkTabsAccessibilities = function (tab) {
    $('ul.tabs').find('.tab').each(function () {
      var $tablink = $(this).find('a');
      $tablink.attr({
        'aria-selected': $tablink.hasClass('active'),
        'tabindex': $tablink.hasClass('active') ? 0 : ''
      });
      if ($(this).hasClass('disabled')) {
        $(this).find('a').attr('tabindex', -1);
      }
    });
    $('.tabpanel').each(function () {
      $(this).attr('aria-hidden', true);
      if (tab) {
        tab.attr('aria-hidden', false);
        tab.attr('tabindex', -1).focus();
      } else {
        $(this).attr('aria-hidden', $(this).css('display') === 'block' ? false : true);
      }
    });
  };

  var inputFieldEditRestoreState = function ($input, restoreValue) {

    var $parent = $input.parents('.input-field__editable');
    $parent.removeClass('editing');
    $('.input-field__editable').removeClass('editing-disabled');

    $input.attr('readonly', 'true');
    $input.attr('aria-readonly', 'true');

    $input.parents('.input-field').find('.input-field__save').hide();
    $input.parents('.input-field').find('.input-field__edit').show();

    if (restoreValue) {
      $input.val($input.data('oValue'));
      $input.parents('.input-field').removeClass('input-field-error');
      $input.parents('form').removeClass('form-error');
      $input.parents('form').find('.notes').remove();
    } else {
      $input.data('oValue', $input.val());
    }

    $input.blur();

    $(document).off('click', window.inputFieldEditDocumentClick);
    $(document).focus();
  };

  var selectWrapperInputFocusClick = _.debounce(function () {
    var $input = $(this);
    var $selectWrapper = $input.parent('.select-wrapper');
    var $select = $input.siblings('select');
    var $slickslide = $input.parents('.slick-slide');

    $selectWrapper.toggleClass('open');
    if (!$selectWrapper.hasClass('open')) {
      $input.trigger('close');
    } else {
      $input.trigger('open');
      $select.trigger('open');

      $input.off('touchstart', selectWrapperInputFocusClick).on('touchstart', selectWrapperInputFocusClick);
      $input.off('close', selectWrapperInputClose).on('close', selectWrapperInputClose);
      $input.attr('aria-expanded', true);

      if ($select.attr('data-select-class')) {
        $selectWrapper.addClass($select.attr('data-select-class'));
      }

      if ($slickslide.length) {
        setTimeout(function() {
          var bottom = $input.siblings('.dropdown-content').offset().top + $input.siblings('.dropdown-content').outerHeight();
          if (bottom > Math.min($('.brand-footer').offset().top, $('.global-footer').offset().top) - 32) {
            $slickslide.addClass('extra-margin-bottom');
            $slickslide.velocity({
              'margin-bottom': bottom - (Math.min($('.brand-footer').offset().top, $('.global-footer').offset().top) - 80),
            });
          }
        }, 200);
      }
    }

    $input.siblings('.dropdown-content').css('top', $input.outerHeight() + 1);

  }, 300, {
    leading: true,
    trailing: false,
  });

  var selectWrapperInputClose = function () {
    var $input = $(this);
    var $slickslide = $input.parents('.slick-slide');

    $input.parent().removeClass('open');
    $input.attr('aria-expanded', false);
    $input.siblings('select').trigger('close');
    $input.off('touchstart', selectWrapperInputFocusClick);
    $input.off('close', selectWrapperInputClose);
    setTimeout(function () {
      $input.blur();
    }, 200);

    if ($slickslide.length && $slickslide.hasClass('extra-margin-bottom')) {
      $slickslide.removeClass('extra-margin-bottom');
      $slickslide.velocity({
        'margin-bottom': 0,
      });
    }
  };

  var onRestrictCharacters = function (e) {
    return e.metaKey || // cmd/ctrl
      e.which <= 0 || // arrow keys
      e.which === 8 || // delete key
      /[\-a-zA-Z\\.]/.test(String.fromCharCode(e.which));
  };

  var onUneditable = function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if ($(this).data('val')) {
      $(this).val($(this).data('val'));
    }
    return false;
  };

  var materialUpdate = function (cb) {
    $('select').material_select(); /* jshint ignore:line */
    $('input.select-dropdown').each(function () {
      var $parent = $(this).parent();
      var $select = $parent.find('select');

      // added accessibility fix
      $(this).attr('role', $select.attr('role'));
      $(this).attr('aria-haspopup', true);
      $(this).attr('aria-expanded', false);
      $(this).attr('aria-labelledby', $parent.closest('.input-field').find('label').attr('id'));
    });

    /* Tabs accessibilities fixed */
    checkTabsAccessibilities();
    $('ul.tabs').tabs({
      onShow: checkTabsAccessibilities
    });

    setTimeout(function () {
      // material select
      $('.select-wrapper').css('z-index','90').each(function (i, elm) {
        var $icon = $(elm).siblings('.icon-chevron-down');
        $(elm).prepend($icon);
        $(elm).find('.caret').remove();
      });
      $('.select-wrapper input').off('focus click', selectWrapperInputFocusClick).on('focus click', selectWrapperInputFocusClick);

      $('input[type=number],.input-numbers-only').off('keypress', onRestrictNumbers).on('keypress', onRestrictNumbers);
      $('input[type=tel]').off('keypress', onRestrictTel).on('keypress', onRestrictTel);
      $('input[name=bdate]').off('keypress', onRestrictDate).on('keypress',onRestrictDate);

      // allow characters only
      $('.input-characters-only').off('onpaste keypress', onRestrictCharacters).on('onpaste keypress', onRestrictCharacters);

      // update on uneditable fields
      $('input.uneditable').each(function (i, elm) {
        $(elm).off('keypress change keydown', onUneditable).on('keypress change keydown', onUneditable);
      });

      // update label state
      $('.input-field input').each(function () {
        if (_.isEmpty($(this).val())) {
          $(this).siblings('label').removeClass('active');
        } else {
          $(this).siblings('label').addClass('active');
        }
      });

      $('.radio-group').on('change','input[type=radio]', function(e) {
        var value = e.target.value;
        var radioGroup = $(this).closest('.radio-group');
        var options = $(radioGroup).find('input[type=radio]');
        options.each(function() {
          if ($(this).val()===value) {
            $(this).parent().removeClass('muted');
          } else {
            $(this).parent().addClass('muted');
          }
        });
      })

      $('.is-percentage').on('change', function() {
        var value = $(this).val();
        if (value && !isNaN(value)) {
          $(this).val(value+'%');
        }
      });

      $('input.is-number').keyup(function(event){
        if(event.which >= 37 && event.which <= 40){
          event.preventDefault();
        }
  
        var $this = $(this),
            split = $this.val().split('.'),
            num = split[0].replace(/,/gi, '').split('').reverse().join(''),
            num2 = RemoveRougeChar(num.replace(/(.{3})/g,"$1,").split('').reverse().join('')),
            num3 = split.length>1 ? num2+'.'+split[1]:num2;
  
        $this.val(num3);
      });

      $('input.num-with-comma').on('change', function() {
        this.value = numberWithCommas(Number(this.value),2);
      })

      $('input').each(function() {
        $(this).on('focus', function() {
          var $this = $(this);
          if (!$this.hasClass('select-dropdown') && !$this.hasClass('others-input')) {
            $this.addClass('in-focus');
            var eventHandler = function(e) {
              // console.log('eventhandler');
              if ($(e.target).hasClass('in-focus')) return;
              $this.removeClass('in-focus');
              $this.trigger('blur');
              $(document).off('touchstart', eventHandler);
            }
            $(document).on('touchstart', eventHandler);
          }
        })
      })

      if (cb) {
        cb();
      }
    }, 10);
  };

  var lastScreenSize = null;
  var screenSize = function () {
    var _lastScreenSize;
    if ($(window).width() >= 1201) {
      // desktop
      _lastScreenSize = lastScreenSize;
      lastScreenSize = 3;
      window.isDesktopXLSize = true;
      window.isDesktopSize = true;
      window.isTabletSize = false;
      window.isMobileSize = false;
    } else if ($(window).width() >= 993) {
      // desktop
      _lastScreenSize = lastScreenSize;
      lastScreenSize = 2;
      window.isDesktopXLSize = false;
      window.isDesktopSize = true;
      window.isTabletSize = false;
      window.isMobileSize = false;
    } else if ($(window).width() >= 601) {
      // tablet
      _lastScreenSize = lastScreenSize;
      lastScreenSize = 1;
      window.isDesktopXLSize = false;
      window.isDesktopSize = false;
      window.isTabletSize = true;
      window.isMobileSize = false;
    } else {
      // mobile
      _lastScreenSize = lastScreenSize;
      lastScreenSize = 0;
      window.isDesktopXLSize = false;
      window.isDesktopSize = false;
      window.isTabletSize = false;
      window.isMobileSize = true;
    }
    return {
      current: lastScreenSize,
      hasChanged: _lastScreenSize !== lastScreenSize
    };
  };

  var getScreenSize = function () {
    if ($(window).width() >= 1201) {
      // desktop xl
      return 3;
    } else if ($(window).width() >= 993) {
      // desktop
      return 2;
    } else if ($(window).width() >= 601) {
      // tablet
      return 1;
    } else {
      // mobile
      return 0;
    }
  };

  var freezeBody = function () {
    $('body').data('scrollTop', 0);
    if (window.pageYOffset) {
      $('body').data('scrollTop', window.pageYOffset);
    }

    $('html, body').addClass('freezeBody');
  };

  var unfreezeBody = function () {
    if (!$('html').hasClass('freezeBody')) {
      return;
    }

    $('html, body').height('').removeClass('freezeBody');

    window.scrollTo(0, $('body').data('scrollTop'));
    window.setTimeout(function () {
      $.removeData($('body')[0], 'scrollTop');
    });
  };

  var debug = function () {
    if (helper.qs('debug')) {
      console.log(arguments);
    }
  };

  var disableElement = function ($elm) {
    $elm.addClass('disabled');
    $elm.attr('aria-disabled', true);
    $elm.data('initial-tabindex', $elm.attr('tabindex'));
    $elm.attr('tabindex', -1);

    var $focusableEls = $elm.find('a, object, button, :input, iframe, [tabindex]');
    $focusableEls.each(function (i, felm) {
      var $felm = $(felm);
      $felm.data('initial-tabindex', $felm.attr('tabindex'));
      $felm.attr('tabindex', -1);
    });
  };

  var enableElement = function ($elm) {
    $elm.removeClass('disabled');
    $elm.removeAttr('aria-disabled', '');
    if ($elm.data('initial-tabindex') === undefined) {
      $elm.data('initial-tabindex', 0);
    }
    $elm.data('initial-tabindex', $elm.data('initial-tabindex') === '-1' ? 0 : $elm.data('initial-tabindex'));
    $elm.attr('tabindex', $elm.data('initial-tabindex'));

    var $focusableEls = $elm.find('a, object, button, :input, iframe, [tabindex]');
    $focusableEls.each(function (i, felm) {
      var $felm = $(felm);
      if ($felm.data('initial-tabindex') === undefined) {
        $felm.data('initial-tabindex', 0);
      }
      $felm.attr('tabindex', $felm.data('initial-tabindex') || 0);
    });
  };

  var trapTabbing = function ($elm) {
    var $focusableEls = $elm.find('a, object, button, :input, iframe, [tabindex]');
    var firstFocusableEl = $focusableEls.first()[0];
    var lastFocusableEl = $focusableEls.last()[0];
    var KEYCODE_TAB = 9;

    $elm.focus();
    var keydownTabbing = function (e) {
      if (e.key === 'Tab' || e.keyCode === KEYCODE_TAB) {
        if (e.shiftKey) /* shift + tab */ {
          if (document.activeElement === firstFocusableEl) {
            lastFocusableEl.focus();
            e.preventDefault();
          }
        } else /* tab */ {
          if (document.activeElement === lastFocusableEl) {
            firstFocusableEl.focus();
            e.preventDefault();
          }
        }
      }
    };

    $(document).off('keydown', keydownTabbing);
    $(document).on('keydown', keydownTabbing);
  };

  var toggleAttributes = function ($elm, attr, valuesArray) {
    if ($elm.attr(attr) === valuesArray[0]) {
      $elm.attr(attr, valuesArray[1]);
    } else {
      $elm.attr(attr, valuesArray[0]);
    }
  };

  var isElementInViewport = function (el) {
    if (typeof jQuery === 'function' && el instanceof jQuery) {
      el = el[0];
    }
    var rect = el.getBoundingClientRect();

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  var isElementPartialInViewport = function (el, offset) {
    if (typeof jQuery === 'function' && el instanceof jQuery) {
      el = el[0];
    }
    if (!el) {
      return false;
    }

    var rect = el.getBoundingClientRect();
    var defaultBoundingOffset = {
      top: 0,
      bottom: 0
    };
    var boundingOffset = _.defaults(offset, defaultBoundingOffset);

    return (
      (rect.top > boundingOffset.bottom || rect.bottom > boundingOffset.top) &&
      rect.top < document.documentElement.clientHeight
    );
  };

  var responsiveImage = function (options) {
    var html = '';
    html += '<picture class="' + (!_.isEmpty(options.pictureClassName) ? options.pictureClassName : '') + '">';
    if (!_.isEmpty(options.mobile) || !_.isEmpty(options.mobile2x)) {
      html += '<source';
      html += ' media="(max-width: 992px)"';
      html += ' srcset="';
      if (!_.isEmpty(options.mobile)) {
        html += options.mobile + ' 1x';
      }
      if (!_.isEmpty(options.mobile2x)) {
        html += ',';
        html += options.mobile2x + ' 2x';
      }
      html += '"';
      html += '>';
    }
    if (!_.isEmpty(options.desktop) || !_.isEmpty(options.desktop2x)) {
      html += '<source';
      html += ' srcset="';
      if (!_.isEmpty(options.desktop)) {
        html += options.desktop + ' 1x';
      }
      if (!_.isEmpty(options.desktop2x)) {
        html += ', ';
        html += options.desktop2x + ' 2x,';
      }
      html += '"';
      html += '>';
    }
    html += '<img';
    if (isDesktopSize) {
      html += ' src="' + (!_.isEmpty(options.desktop2x) ? options.desktop2x : options.desktop) + '"';
    } else {
      html += ' src="' + (!_.isEmpty(options.mobile2x) ? options.mobile2x : options.mobile) + '"';
    }
    html += ' alt="' + (!_.isEmpty(options.alt) ? options.alt : 'Lorem Ipsum') + '"';
    html += ' aria-label="' + (!_.isEmpty(options.alt) ? options.alt : 'Lorem Ipsum') + '"';
    html += ' onerror="' + 'this.onerror=null;this.src=\'' + (!_.isEmpty(options.onerror) ? options.defaulImg : options.defaulImg) + ';\'' + '"';
    html += ' class="' + (!_.isEmpty(options.className) ? options.className : '') + '" width="' + (!_.isEmpty(options.width) ? options.width : '') + '"';
    html += '>';
    html += '</picture>';
    return html;
  };

  var setEqualHeight = function () {
    if (isDesktopSize || isTabletSize) {
      if ($('.equalheight').length) {
        $('.equalheight .card').css({
          height: 'auto'
        });
        $('.equalheight').each(function () {
          if ($(this).attr('data-equalheight-class')) {
            var viewport = $(this).attr('data-equalheight-viewport');
            if (_.isEmpty(viewport) || !viewport) {
              $(this).find('.' + $(this).attr('data-equalheight-class')).matchHeight();
            } else if (viewport.indexOf('desktop') !== -1 && isDesktopSize) {
              $(this).find('.' + $(this).attr('data-equalheight-class')).matchHeight();
            } else if (viewport.indexOf('tablet') !== -1 && isTabletSize) {
              $(this).find('.' + $(this).attr('data-equalheight-class')).matchHeight();
            }

            return;
          }

          if ($(this).hasClass('by-row')) {
            var chunk = _.chunk($(this).find('.card'), isDesktopSize ? (isDesktopXLSize ? 4 : 3) : 2);
            _.each(chunk, function (rowArr) {
              $(rowArr).matchHeight();
            });
          } else {
            $(this).find('.card').matchHeight({
              byRow: false,
              property: 'height'
            });
          }
        });
      }
    } else {
      $('.equalheight').each(function () {
        if ($(this).attr('data-equalheight-class')) {
          $(this).find('.' + $(this).attr('data-equalheight-class')).css({
            height: 'auto'
          });

          return;
        }

        $(this).find('.card').css({
          height: 'auto'
        });
      });
    }
  };

  var setEqualWidth = function ($elms, options) {
    options = options ? options : {};

    $elms.css({
      width: 'auto'
    });
    if (isDesktopSize || isTabletSize) {
      var mw = 0;
      $elms.each(function (i, elm) {
        if ($(elm).width() > mw) {
          mw = $(elm).width();
        }
      });
      if (options.minWidth) {
        mw = mw < options.minWidth ? options.minWidth : mw;
      }
      $elms.width(mw);
    }
  };

  var scrollToElement = function ($elm, options) {
    options ? options : {};
    var defaultOptions = {
      offset: '0'
    };

    options = _.assignIn(defaultOptions, options);
    $elm.velocity('scroll', options);
  };

  var showButtonLoader = function (button, isShowing) {
    if (isShowing) {
      button
        .addClass('loading')
        .attr('disabled', true);
    } else {
      button
        .removeClass('loading')
        .removeAttr('disabled');
    }
  };

  var getCurrentBrand = function () {
    for (var i = 0; i < window.allBrands.length; i++) {
      var brand = window.allBrands[i];

      if ($('body').hasClass('brand-' + brand)) {
        return brand;
      }
    }
    return 'cnc';
  };

  var markerTemplate = function (states) {
    var type = states || 'default';
    var template = [
      '<svg height="49" viewBox="0 0 32 49" width="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
      '<filter id="a" height="921.1%" width="256.4%" x="-78.2%" y="-410.6%"><feGaussianBlur in="SourceGraphic" stdDeviation="5.47433036"/></filter>',
      '<g fill="none" fill-rule="evenodd"><rect fill="#001c2d" filter="url(#a)" height="4" rx="2" width="21" x="6" y="33"/><path d="m16 24c-6.627417 0-12-5.372583-12-12s5.372583-12 12-12 12 5.372583 12 12-5.372583 12-12 12zm0 0h1v13h-1z" fill="{{ color }}" fill-rule="nonzero"/></g>',
      '</svg>'
    ].join('\n');

    return template.replace('{{ color }}', window.brandPropsMapping[getCurrentBrand()].color[type === 'default' ? 'markerDefault' : 'primary']);
  };


  var colorLuminance = function (color, luminosity) {
    // validate hex string
    color = new String(color).replace(/[^0-9a-f]/gi, ''); /* jshint ignore:line */
    if (color.length < 6) {
      color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
    }
    luminosity = luminosity || 0;

    // convert to decimal and change luminosity
    var newColor = '#',
      c, i, black = 0,
      white = 255;
    for (i = 0; i < 3; i++) {
      c = parseInt(color.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(black, c + (luminosity * white)), white)).toString(16);
      newColor += ('00' + c).substr(c.length);
    }
    return newColor;
  };

  var guid = function () {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  };

  var stopAllVideos = function () {
    _.each($('[data-player-ref]'), function (elm) {
      var $elm = $(elm);
      var $ref = $('#' + $(elm).attr('data-player-ref'));
      var player = $elm.data('player');
      if (player && $ref && $ref.length) {
        if (player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          player.pauseVideo();
        }
      }
    });
  };

  var initYouTubeElm = function (options) {
    if (!options) {
      throw new Error('options undefined');
    }

    if (!options.$con) {
      throw new Error('options.$con undefined');
    }

    if (!options.id) {
      throw new Error('options.id undefined');
    }

    if (!options.videoId) {
      throw new Error('options.videoId undefined');
    }

    var defaultOptions = {
      host: 'https://www.youtube.com',
      playerVars: {
        enablejsapi: 1,
        rel: 0,
        showinfo: 0,
        loop: 0,
        iv_load_policy: 3, /* jshint ignore:line */
      },
    };
    options = _.assignIn(defaultOptions, options);

    var player = new window.YT.Player(options.id, options);

    options.$con.attr('data-player-ref', options.id);
    options.$con.data('player', player);
  };

  var currencyFormat = function (num, n, x) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return num.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&,'); /* jshint ignore:line */
  };

  var pageLoader = function (isShow) {
    if (isShow) {
      if (!$('.pageloader').length) {
        pageLoaderTimeoutID = setTimeout(function() {
          $('body').append('<div class="pageloader"></div>');
          freezeBody();
        }, 100);
      }
    } else {
      clearTimeout(pageLoaderTimeoutID);
      if ($('.pageloader').length) {
        $('.pageloader').remove();
        unfreezeBody();
      }
    }
  };

  var updateState = function (type, data) {
    var state = History.getState();
    state.data = _.assignIn(helper.qs(), data);
    var url = '';
    var index = 0;
    var qsExisted = false;
    _.each(state.data, function (v, k) {
      if (v && !_.isEmpty(v)) {
        url += (!index ? '?' : '&') + k + '=' + v;
        index++;
      }

      if (helper.qs(k)) {
        qsExisted = true;
      }
    });
    url = !_.isEmpty(url) ? url : location.origin + location.pathname;

    switch(type) {
      case 'push':
        History.pushState(state.data, $('title').text(), url);
        break;
      case 'replace':
        if (qsExisted) {
          History.replaceState(state.data, $('title').text(), url);
        } else {
          History.pushState(state.data, $('title').text(), url);
        }
        break;
    }
  };

  var objectFit = function ($images, options) {
    $images.each(function(i, img) {
      options = options || {};
      var $img = $(img);
      var $parent = options.parent ? $img.parents(options.parent) : $img.parent();

      var multipler = 1;

      if (isDesktopSize) {
        if (!$img.data('desktop-ratio')) {
          $img.data('desktop-ratio', options.desktopRatio ? options.desktopRatio : 18/5);
        }

        multipler = Math.max($parent.height() / ($parent.width() / $img.data('desktop-ratio')), multipler);

        if (multipler) {
          $img.css({
            'transform-origin': '0 0',
            transform: 'scale(' + multipler + ')',
          });
        }
      } else {
        $img.css({
          'transform-origin': '',
          transform: '',
        });
      }
    });
  };

  return {
    getNearest: getNearest,
    getGeolocation: getGeolocation,
    svgIcon: svgIcon,
    qs: qs,
    materialUpdate: materialUpdate,
    screenSize: screenSize,
    getScreenSize: getScreenSize,
    freezeBody: freezeBody,
    unfreezeBody: unfreezeBody,
    debug: debug,
    trapTabbing: trapTabbing,
    disableElement: disableElement,
    enableElement: enableElement,
    toggleAttributes: toggleAttributes,
    isElementInViewport: isElementInViewport,
    isElementPartialInViewport: isElementPartialInViewport,
    inputFieldEditRestoreState: inputFieldEditRestoreState,
    responsiveImage: responsiveImage,
    setEqualHeight: setEqualHeight,
    setEqualWidth: setEqualWidth,
    scrollToElement: scrollToElement,
    showButtonLoader: showButtonLoader,
    getCurrentBrand: getCurrentBrand,
    markerTemplate: markerTemplate,
    colorLuminance: colorLuminance,
    guid: guid,
    stopAllVideos: stopAllVideos,
    initYouTubeElm: initYouTubeElm,
    currencyFormat: currencyFormat,
    pageLoader: pageLoader,
    updateState: updateState,
    selectWrapperInputFocusClick: selectWrapperInputFocusClick,
    objectFit: objectFit,
  };
})(jQuery);

$(function () {
  'use strict';

  var modules = _.pickBy(window, function (value, key) {
    return _.startsWith(key, 'mod');
  });

  _.each(modules, function (mod) {
    if (mod && mod.init && mod.priorityLoad) {
      mod.init();
    }
  });

  _.each(modules, function (mod) {
    if (mod && mod.init && (!mod.priorityLoad || mod.priorityLoad === false)) {
      mod.init();
    }
  });

  var onWindowResize = function () {
    var result = helper.screenSize();
    _.each(modules, function (mod) {
      if (mod && mod.resize) {
        mod.resize(result);
      }
    });
  };
  $(window).on('resize', _.debounce(onWindowResize, 100));
  onWindowResize();

  var onWindowLoad = function() {
    _.each(modules, function(mod) {
      if (mod && mod.load) {
        mod.load();
      }
    });
  };
  $(window).on('load', onWindowLoad);

  var onWindowScroll = function() {
    _.each(modules, function(mod) {
      if (mod && mod.scroll) {
        mod.scroll($(window).scrollTop());
      }
    });
  };
  $(window).on('scroll', onWindowScroll);

  var onStateChange = function() {
    _.each(modules, function(mod) {
      if (mod && mod.statechange) {
        mod.statechange();
      }
    });
  };
  $(window).on('statechange', onStateChange);
});

helper.screenSize();

var modActions = (function($) {
  'use strict';

  var $con;

  /* GENERIC */
  var init = function() {
    $con = $('.sdp');

    if (!$con.length) {
      return;
    }

    btnEvents();
  };

  var btnEvents = function() {

  };

  return {
    init: init
  };
})(jQuery);

var modBase = (function($) {
  'use strict';

  var $con,
      $scroller;

  /* GENERIC */
  var init = function() {
    $con = $('.sdp'),
    $scroller = $con.find('.scroller-anchor');

    if (!$con.length) {
      return;
    }

    initStickyHeader();
    fixBSAccordion();

    if ($scroller.length) {
      initSnap();
    }

    headerStepTick();
    headerBackBtn();
  };

  var bsComponents = function() {
    $('.collapse').collapse()
  };

  var initStickyHeader = function() {
    $(window).scroll(function() {
      var height = $(window).scrollTop();
      if(height > 1) {
        //$('header').css({"position": "fixed"});
        $('header').addClass('sticky');
        $('body').css('padding-top','102px');
      } else{
        $('header').removeClass('sticky');
        if (!$('#top-error') || !$('#top-error').height()) {
          $('body').css('padding-top','0');
        } else {
          $('body').css('padding-top','50px');
        }
      }
    });

  };

  var fixBSAccordion = function() {
    var collapseBody = $con.find('.accordion .collapse-body');

    collapseBody.css('padding','20px 24px');
  };

  var initSnap = function() {
    $(window).scroll(function(e) {
      var scroller = $('.scroller'),
        scrollerAnchor = $(".scroller-anchor"),
        scroller_anchor = scrollerAnchor.offset().top - 30,
        scrollTop = $(this).scrollTop();

      if (scrollTop >= scroller_anchor && scroller.css('position') != 'fixed') {
        scroller.addClass('sticky');
        scrollerAnchor.css('height', '90px');
        scroller.next('.vehicle-lists').css('padding-top','160px');
      }
      else if (scrollTop < scroller_anchor && scroller.css('position') != 'relative')  {
        scroller.removeClass('sticky');
        scrollerAnchor.css('height', '0px');
        scroller.next('.vehicle-lists').css('padding-top','');
      }
    });
  };

  var headerStepTick = function() {
    var headerSteps = $con.find('header .steps');

  }

  var headerBackBtn = function() {
    var btnBack = $('header').find('.btn-back');

    if ( $con.hasClass('step-1') ) {
      btnBack.attr('href','../../index.html');
    }
    else if ( $con.hasClass('step-2') ) {
      btnBack.attr('href','step-1.html');
    }
    else if ( $con.hasClass('step-3') ) {
      btnBack.attr('href','step-2.html');
    }
    else if ( $con.hasClass('step-4') ) {
      btnBack.attr('href','step-3.html');
    }
    else if ( $con.hasClass('step-5') ) {
      btnBack.attr('href','step-4.html');
    }
    else if ( $con.hasClass('step-6') ) {
      btnBack.attr('href','step-5.html');
    }
  };

  return {
    init: init
  };
})(jQuery);

var modForms = (function($) {
  'use strict';

  var $con,
      $uploadDocs,
      $uploadItems,
      $thumbnail,
      $btnRemove,
      $linkIcon,
      $linkText;

  /* GENERIC */
  var init = function() {
    $con = $('.form-init'),
    $uploadDocs = $con.find('.upload-docs'),
    $uploadItems = $uploadDocs.find('.upload-docs--item'),
    $thumbnail = $uploadItems.find('.thumbnail'),
    $btnRemove = $uploadItems.find('.btn-remove'),
    $linkIcon = $uploadItems.find('.icon-link'),
    $linkText = $uploadItems.find('.link-text');

    if (!$con.length) {
      return;
    }

    // initWebcamJS();
    // uploadDocuments();
    // disabledItems();
    // initAdressPrimary();
    // initMailingAddress();
  };

  var initWebcamJS = function() {
    if ($uploadDocs.length) {
      Webcam.set({
        width: 600,
        height: 450,
        image_format: 'jpeg',
        jpeg_quality: 90
      });

      Webcam.attach('.camera');
    }
  };

  var uploadDocuments = function() {
    $linkIcon.on('click', function(e) {
      e.preventDefault();
      var $this = $(this);
      var name = $this.parents('.upload-docs--item').attr('name');
      // alert(name);
      Webcam.reset();
      Webcam.set({
        width: 600,
        height: 450,
        image_format: 'jpeg',
        jpeg_quality: 90
      });

      Webcam.attach('.camera');
      
      Webcam.snap( function(data_uri) {
        // display results in page
        var imgData = $('<img src="'+data_uri+'" class="materialboxed"/>');
        sessionStorage.setItem(name, data_uri);
        $this.parent().find('.thumbnail').html(imgData);
        $this.parents('.upload-docs--item').addClass('with-attachment');
        // alert(name);
      });
    });
    
    $linkText.on('click', function(e) {
      e.preventDefault();
      var $this = $(this);
      var name = $this.parents('.upload-docs--item').attr('name');

      Webcam.reset();
      Webcam.set({
        width: 600,
        height: 450,
        image_format: 'jpeg',
        jpeg_quality: 90
      });

      Webcam.attach('.camera');
      
      Webcam.snap( function(data_uri) {
        // display results in page
        var imgData = $('<img src="'+data_uri+'" class="materialboxed"/>');
        sessionStorage.setItem(name, data_uri);
        $this.parent().find('.thumbnail').html(imgData);
        $this.parents('.upload-docs--item').addClass('with-attachment');
      });
    });

    $btnRemove.on('click', function(e) {
      e.preventDefault();
      var $this = $(this);
      var name = $this.parents('.upload-docs--item').removeClass('with-attachment').attr('name');
      sessionStorage.removeItem(name);
      $this.parent().find('.thumbnail').empty();
    });
  };

  var disabledItems = function() {
    $('[type=radio]:disabled').parent().addClass('is-disabled');
  };

  var initAdressPrimary = function() {
    var addressPrimary = $con.find('.address-primary'),
        postalCode = $('#postalCode');

    // postalCode.focusout(function(){
    //   $(this).siblings('.d-none').removeClass('d-none');
    // });
  };

  return {
    init: init
  };
})(jQuery);

var modLanding = (function($) {
  'use strict';

  var $con;

  var init = function() {
    $con = $('.slds-landing--inner');
    if (!$con.length) {
      return;
    }
    sessionStorage.clear();
  }

  return {
    init: init,
  };
})(jQuery);



var modStep1 = (function($) {
  'use strict';

  var $con,
      $salutation,
      $gender,
      $postalCode,
      $primaryAddress,
      $postalCode2,
      $mailingAddress,
      edit=false,
      $icFront;

  /* GENERIC */
  var init = function() {
    $con = $('.step-1'),
    $salutation = $con.find('#salutation'),
    $gender = $con.find('#gender'),
    $postalCode = $con.find('#postalCode'),
    $primaryAddress = $con.find('#primaryAddress'),
    $postalCode2 = $con.find('#postalCode2'),
    $mailingAddress = $con.find('#mailingAddress');
    $icFront = $con.find('#icFront');

    if (!$con.length) {
      return;
    }

    initSalutation();
    initInputFile();
    initMobile();
    initBirthdate();
    initPostal();
    initMailingAddress();
    initData();
    initEdit();

    $con.find('input').on('change', function() {
      handleButtonUI();
      // showTopError('The network connection is lost.');
    });
  };

  var initSalutation = function() {
    var inputRadio = $salutation.find('input[type=radio]');

    inputRadio.on('change', function() {
      var _this = $(this),
        value = _this.val();

      if (value == 'Mr') {
        $gender.find('#male').trigger('click').parent().addClass('active').removeClass('muted');
        $gender.find('#female').parent().removeClass('active').addClass('muted');
      } else if (value == 'Mrs') {
        $gender.find('#female').trigger('click').parent().addClass('active').removeClass('muted');
        $gender.find('#male').parent().removeClass('active').addClass('muted');;
      } else if (value == 'Ms') {
        $gender.find('#female').trigger('click').parent().addClass('active').removeClass('muted');
        $gender.find('#male').parent().removeClass('active').addClass('muted');;
      } else if (value == 'Mdm') {
        $gender.find('#female').trigger('click').parent().addClass('active').removeClass('muted');
        $gender.find('#male').parent().removeClass('active').addClass('muted');;
      } else if (value == 'Dr') {
        $gender.find('input[type=radio]').parent().removeClass('active').removeClass('muted');
      }
    });
  };

  var initInputFile = function() {
    $('input[type=file]').on('change', function() {
      readImg(this);
      // $(this).prop('disabled', true);
    }).on('click', function(e) {
      if ($(this).next('.thumbnail').find('img').attr('src')) {
        e.preventDefault();
      }
    });

    $('.btn-remove').on('click', function(e) {
      e.preventDefault();
      var $this = $(this);
      var name = $this.parents('.upload-docs--item').removeClass('with-attachment').attr('name');
      $this.parent().find('input[type=file]').val('');
      sessionStorage.removeItem(name);
      $this.parent().find('.thumbnail img').attr('src','');
    });
  }

  var readImg = function(input) {
    if (input.files.length) {
      var reader = new FileReader();
      reader.onload = function(e) {
        $(input).next('.thumbnail').find('img').attr('src', e.target.result);
        sessionStorage.setItem($(input).attr('name'), e.target.result);
        $(input).parents('.upload-docs--item').addClass('with-attachment');
      }
      reader.readAsDataURL(input.files[0]);
    }
  }

  var initMobile = function() {
    var mobile = $('#idMobile2');
    mobile.on('blur', function() {
      var check = this.value.match('^(\\+|6|8|9)(\\d{7,})','g');
      if (check || this.value==='') {
        this.setCustomValidity('');
        if ($(this).siblings('label').length) {
          $(this).siblings('label').css('color','#516173');
        } else {
          $(this).parent().siblings('label').css('color','#516173');
          $(this).siblings('.currency').css('color','#516173');
        }
        
      } else {
        this.setCustomValidity('Invalid format');
        if ($(this).siblings('label').length) {
          $(this).siblings('label').css('color','#fc6c6c');
        } else {
          $(this).parent().siblings('label').css('color','#fc6c6c');
          $(this).siblings('.currency').css('color','#fc6c6c');
        }
      }
      handleButtonUI();
    });
  }

  var initBirthdate = function() {
    var bdate = $('input[name=bdate]');

    bdate.bind('keyup','keydown', function(e){
      if(e.which !== 8) {
        var numChars = bdate.val().length;

        if(numChars === 2 || numChars === 5) {
          var thisVal = bdate.val();
          thisVal += '/';
          bdate.val(thisVal);
        }
      }
    });

    bdate.on('blur', function() {
      if (this.value) {
        if (!moment(this.value,'DD/MM/YYYY').isValid()) {
          this.setCustomValidity('Please enter a valid birthdate');
          $(this).prev('label').css('color', '#fc6c6c');
        } else {
          this.setCustomValidity('');
          $(this).prev('label').css('color', '#516173');
        }
        handleButtonUI();
      }
    });
  };

  var initPostal = function() {
    $postalCode.find('input[name=postal]').on('blur', function(e) {
      var check = this.value.match('\\d{6}');
      if (!this.value) {
        this.setCustomValidity('');
        $primaryAddress.find('.d-block').removeClass('d-block').addClass('d-none');
        $('#idStreet').val('');
        $('#idFloorUnit').val('');
      } else if (check) {
        this.setCustomValidity('');
        $primaryAddress.find('.d-none').removeClass('d-none').addClass('d-block');
        $('#idStreet').val('Blk 402 Sin Ming Avenue');
        $('#idFloorUnit').val('#12-345');
      } else {
        this.setCustomValidity('Invalid postal code');
        $primaryAddress.find('.d-block').removeClass('d-block').addClass('d-none');
        $('#idStreet').val('');
        $('#idFloorUnit').val('');
      }
      changeLabelColor(e)
      handleButtonUI();
    }).on('keydown', onRestrictLength6);
  };

  var initMailingAddress = function() {
    var btnAddMailing = $('#btnAddMailing'),
        addMailing = $('.address-mailing'),
        btnRemoveMailing = addMailing.find('#btnRemoveMailing'),
        postal2 = $('#idPostal2'),
        street2 = $('#idStreet2'),
        floorUnit2 = $('#idFloorUnit2'),
        buildingName2 =$('#idBuildingName2');
        
    btnAddMailing.on('click', function(e) {
      e.preventDefault();
      $(this).addClass('d-none');
      postal2.prop('disabled', false);
      street2.prop('disabled', false);
      floorUnit2.prop('disabled', false);
      buildingName2.prop('disabled', false);
      addMailing.removeClass('d-none');
    });

    btnRemoveMailing.on('click', function(e) {
      e.preventDefault();
      btnAddMailing.removeClass('d-none');
      addMailing.addClass('d-none');
      postal2.prop('disabled', true);
      street2.prop('disabled', true).parent().removeClass('d-block').addClass('d-none');
      floorUnit2.prop('disabled', true).parent().removeClass('d-block').addClass('d-none');
      buildingName2.prop('disabled', true).parent().removeClass('d-block').addClass('d-none');
    });

    $postalCode2.find('input[name=postal2]').on('blur', function(e) {
      var check = this.value.match('\\d{6}');
      if (!this.value) {
        this.setCustomValidity('');
        $mailingAddress.find('.d-block').removeClass('d-block').addClass('d-none');
      } else if (check) {
        this.setCustomValidity('');
        $mailingAddress.find('.d-none').removeClass('d-none').addClass('d-block');
      } else {
        this.setCustomValidity('Invalid postal code');
        $mailingAddress.find('.d-block').removeClass('d-block').addClass('d-none');
      }
      changeLabelColor(e)
      handleButtonUI();
    }).on('keydown', onRestrictLength6);
  }
  
  var initData = function() {
    $('.upload-docs--item').each(function(index,element){
      var name = $(element).attr('name');
      var img = sessionStorage.getItem(name);
      if (img) {
        $(element).addClass('with-attachment');
        $(element).find('.thumbnail img').attr('src', img);
      }
    });

    var data = JSON.parse(sessionStorage.getItem("customerDetails"));
    if (data) {
      $('input[name=salutation]').each(function() {
        if ($(this).val()===data.salutation) $(this).trigger('click');
      });
      $('#idFname').val(data.fname);
      $('#idLname').val(data.lname);
      $('#idMobile2').val(data.mobile2);
      $('#bdate').val(data.bdate);
      $('input[name=gender]').each(function() {
        if ($(this).val()===data.gender) $(this).trigger('click');
      });
      $('input[name=maritalStatus]').each(function() {
        if ($(this).val()===data.maritalStatus) $(this).trigger('click');
      });
      $('#idPostal').val(data.postal).trigger('keyup');
      $('#idStreet').val(data.street);
      $('#idFloorUnit').val(data.floor);
      $('#idBuildingName').val(data.building);

      if (data.postal2) {
        $('#btnAddMailing').click();
        $('#idPostal2').val(data.postal2).trigger('keyup');
        $('#idStreet2').val(data.street2);
        $('#idFloorUnit2').val(data.floor2);
        $('#idBuildingName2').val(data.building2);
      }
    }
  }

  var initEdit = function() {
    var url = new URL(window.location.href);
    edit = url.searchParams.get('edit') === 'true';
    if (edit) {
      $('#mainHeader').addClass('d-none');
      $('.editHeader').removeClass('d-none');
      $('#mainBtn').addClass('d-none');
      $('#editBtn').removeClass('d-none');
    } else {
      $('#mainHeader').removeClass('d-none');
      $('.editHeader').addClass('d-none');
      $('#mainBtn').removeClass('d-none');
      $('#editBtn').addClass('d-none');
    }
  }

  var submitCustomerDetails = function() {
    var data = getFormData($('#customerDetailsForm'));
    if (!data.postal2) {
      data.street2 = '';
      data.floor2 = '';
      data.building2 = '';
    }
    sessionStorage.setItem('customerDetails', JSON.stringify(data));
    if (edit) {
      window.location = 'step-6.html';
    } else {
      window.location = 'step-2.html';
    }
  }

  var checkForm = function() {
    var data = getFormData($('#customerDetailsForm'));
    return (data.salutation && data.fname && data.lname && data.bdate && data.gender && data.maritalStatus && data.postal && !$('#customerDetailsForm :invalid').length);
  }

  var handleButtonUI = function() {
    var check = checkForm();
    if (check) {
      $('#mainBtn').prop('disabled',false);
      hideTopError();
    } else {
      $('#mainBtn').prop('disabled',true);
      if ($('#customerDetailsForm :invalid').length) {
        showTopError('There are fields with errors.');
      } else {
        hideTopError();
      }
    }
  }

  return {
    init: init,
    submitCustomerDetails: submitCustomerDetails,
  };
})(jQuery);

var modStep2 = (function($) {
  'use strict';

  var $con,
      $purchaseCOE,
      $packageCOE,
      $bidsCOE,
      $chargedRebateCOE,
      $openCategoryCOE,
      $openCatOption,
      $registrationNo,
      $vehicleTotalPrice,
      $vehicleListPrice,
      $vehicleAddOns,
      $modalAddOns,
      $regNumberMethod,
      $roadTaxPrice,
      $vehicleTax,
      $vehicleOthers,
      $conModal,
      $modalFooter,
      $listAddon,
      $listAddonAdd,
      $lisdAddonIcon;
  
  var carDetails = {
    model: "Cerato 1.6A SR SX G335",
    colour: "Horizon Blue",
    trim: "Saturn Black",
    coe: "Category A",
    vehicleListItems: [
      "10 Year Engine Warranty (T&C apply)",
      "5 Years Unlimited Mileage Warranty (T&C apply)",
      "IU Installation",
      "Number Plate",
      "Floor Mat",
      "Motrex PIO for Cerato 1.6 A",
    ],
  };
  var tax = [
    {
      name: "VES Surcharge/Rebate",
      price: 10000
    },
    {
      name: "Registration Fee",
      price: 0
    },
    {
      name: "Road Tax",
      months: 6,
      price: 0
    },
    
  ]
  var total,vehicleListPrice;
  var COEPrice = 25000;
  var guaranteedCOEPrice = 3000;
  var offpeakPrice = -17000;
  var withCOE,guaranteedCOE,offpeak,roadTax12;
  var registrationNo;
  var vehiclePrice = 88999;
  var roadTaxPrice = 742.90;
  var discountsTotal = 0;
  var addons = [];
  var addonList = [
    {
      title: "Main Accessories",
      icon: "../../assets/sdp/images/icons/accessories.svg",
      items: [
        {
           "name": "EUROSTYLE WIRELESS ENTERTAINMENT SYSTEM",
           "price": 1200
        },
        {
           "name": "SONY XAV AX100 MULTIMEDIA HEADUNIT",
           "price": 699
        },
        {
           "name": "MOTREX WITH 3 YEARS WARRANTY",
           "price": 680
        },
        {
           "name": "MOTREX PIO FOR CERATO 1.6 A",
           "price": 640
        },
        {
           "name": "MOTREX DIO FOR CERATO",
           "price": 650
        },
        {
           "name": "15 INCH SPORT RIMS FOR CERATO 1.6 A L",
           "price": 300
        },
        {
           "name": "16 INCH SPORT RIMS FOR CERATO 1.6 EX",
           "price": 340
        }
      ],
    },
    {
      title: "Additional Accessories",
      icon: "../../assets/sdp/images/icons/accessories.svg",
      items: [
        {
           "name": "REVERSE SENSOR 4X",
           "price": 480
        },
        {
           "name": "FRONT SENSOR",
           "price": 120
        },
        {
           "name": "RIKECOOL PREMIUM 28 (CERATO / OPTIMA/ STONIC)",
           "price": 180
        },
        {
           "name": "REMOTE ALARM",
           "price": 200
        },
        {
           "name": "MAGENTIC WINDOW SHADES -4PCS (CERATO K3 )",
           "price": 65
        },
        {
           "name": "BOOT LID INNER COVER",
           "price": 18
        },
        {
           "name": "GARMIN DRIVE 51 NAVIGATION SYSTEM",
           "price": 137
        },
        {
           "name": "BLACKVUE DR590-2CH",
           "price": 255
        },
        {
           "name": "CERATO BOOTLID SPOILER",
           "price": 90
        }
      ],
    },
    {
      title: "Insurance Credits",
      icon: "../../assets/sdp/images/icons/insurance.svg",
      items: [
        {
           "name": "3RD YEAR INSURANCE CREDIT $200",
           "price": 200
        },
        {
           "name": "4TH YEAR INSURANCE CREDIT $100",
           "price": 100
        }
      ],
    },
    {
      title: "Service",
      icon: "../../assets/sdp/images/icons/service.svg",
      items: [
        {
           "name": "1 YEAR FREE SERVICING PLAN  UP TO 20,000KM. NON TRANSFERABLE, NON REFUNDABLE AND NON EXTENDABLE.\n",
           "price": 507
        },
        {
           "name": "2 YEARS CARE SERVICE PLAN  UP TO 40,000KM. NON TRANSFERABLE, NON REFUNDABLE AND NON EXTENDABLE.\n\t",
           "price": 1121
        },
        {
           "name": "3 YEARS CARE SERVICE PLAN  UP TO 60,000KM.NON TRANSFERABLE, NON REFUNDABLE AND NON EXTENDABLE.\n\t",
           "price": 1497
        },
        {
           "name": "4 YEARS CARE SERVICE PLAN  UP TO 80,000KM.NON TRANSFERABLE, NON REFUNDABLE AND NON EXTENDABLE.\n",
           "price": 2101
        },
        {
           "name": "5 YEARS CARE SERVICE PLAN  UP TO 100,000KM.NON TRANSFERABLE, NON REFUNDABLE AND NON EXTENDABLE.\n\t",
           "price": 2477
        },
        {
           "name": "TOP-UP FOR KIA CERATO EXTENDED CARE BUNDLE (WORTH $1,800) VALID FOR 5 YR FROM DATE OF REG",
           "price": 1800
        }
      ],
    },
    {
      title: "Warranty",
      icon: "../../assets/sdp/images/icons/warranty.svg",
      items: [
        {
           "name": "5 YEAR UNLIMITED MILEAGE WARRANTY (T&C APPLY)",
           "price": 0
        },
        {
           "name": "10 YEAR ENGINE WARRANTY (T&C APPLY)",
           "price": 0
        },
        {
           "name": "5YRS/150,000KM WARRANTY WHICHEVER COMES FIRST ( T&C APPLY)",
           "price": 0
        },
        {
           "name": "10 YR LITHIUM-ION BATTERY WARRANTY / 200,000KM WHICHEVER COMES EARLIER (T&C APPLY)",
           "price": 0
        },
        {
           "name": "FREE 100,000KM OR 3 YEARS WARRANTY ( WHICHEVER COMES FIRST)-LCR",
           "price": 0
        },
        {
           "name": "FREE 150,000KM OR 5 YEARS WARRANTY ( WHICHEVER COMES FIRST)-LCR",
           "price": 0
        },
        {
           "name": "5YRS/150,000KM WARRANTY WHICHEVER COMES FIRST ( T&C APPLY)",
           "price": 0
        },
        {
           "name": "FREE 100,000KM OR 3 YEARS WARRANTY ( WHICHEVER COMES FIRST)",
           "price": 0
        }
      ],
    },
    {
      title: "Promotions & Discounts",
      icon: "../../assets/sdp/images/icons/promotion.svg",
      items: [
        {
           "name": "IN HOUSE FINANCE @2.78% FOR 4 YRS",
           "price": 0
        },
        {
           "name": "IN HOUSE FINANCE @ 2.78% FOR 5 YRS",
           "price": 0
        },
        {
           "name": "IN HOUSE FINANCE @ 2.78% FOR 6 YRS",
           "price": 0
        },
        {
           "name": "IN HOUSE FINANCE @ 2.78% FOR 7 YRS",
           "price": 0
        },
        {
           "name": "DISCOUNT FOR IN-HOUSE USED CAR TRADE-IN (CAT B)",
           "price": 0
        },
        {
           "name": "DISCOUNT FOR IN HOUSE FINANCE & INSURANCE ( CAT A )",
           "price": 0
        },
        {
           "name": "DISCOUNT FOR IN HOUSE FINANCE & INSURANCE (CAT B)",
           "price": 0
        },
        {
           "name": "DISCOUNT FOR IN HOUSE USED CAR TRADE IN (CAT A)",
           "price": 0
        },
        {
           "name": "DISCOUNT FOR IN HOUSE USED CAR TRADE IN (CAT B)",
           "price": 0
        }
     ]
  }]
  
  /* GENERIC */
  var init = function() {
    $con = $('.step-2'),
    $purchaseCOE = $con.find('#purchaseWithCOE');
    $packageCOE = $con.find('#packageCOE');
    $bidsCOE = $con.find('#numberCEObids');
    $chargedRebateCOE = $con.find('#chargedRebateCOE');
    $openCategoryCOE = $con.find('#openCategoryCOE');
    $openCatOption = $openCategoryCOE.find('#openCatOption');
    $registrationNo = $con.find('#registrationNumber');
    $vehicleTotalPrice = $con.find('#vehicleTotalPrice');
    $vehicleListPrice = $con.find('#vehicleListPrice');
    $vehicleAddOns = $con.find('#vehicleAddOns');
    $modalAddOns = $con.find('#modalAddOns');
    $regNumberMethod = $con.find('#regNumberMethod');
    $roadTaxPrice = $con.find('#roadTaxPrice');
    $vehicleTax = $con.find('#vehicleTax');
    $vehicleOthers = $con.find('#vehicleOthers');
    $modalFooter = $modalAddOns.find('.modal-footer');
    $listAddon = $modalAddOns.find('.list-addon');
    $listAddonAdd = $listAddon.find('.list-addon--add');
    $lisdAddonIcon = $listAddon.find('.list-addon--icon');

    if (!$con.length) {
      return;
    }

    $('.toast').toast({delay: 3000});

    initCarDetails();
    initPurchaseCOE();
    initCEOChargedRebate();
    initRegNumberMethod();
    initRoadTax();
    vehicleOthers();
    initOpenCategory();
    modalAddOns();
    calculateVehicleTotal();
  };

  var initCarDetails = function() {
    $('#model').text(carDetails.model);
    $('#colour').text(carDetails.colour);
    $('#trim').text(carDetails.trim);
    $('#coeCategory').text(carDetails.coe);
  }

  var initPurchaseCOE = function() {
    var inputRadio = $purchaseCOE.find('input[type=radio]');

    $packageCOE.find('[type=radio]').on('change', function(e) {
      var value = $(this).val();
      if (value === 'Guaranteed') {
        guaranteedCOE = true;
        $('#guaranteedCOETopUp').removeClass('d-none');
        carDetails.vehicleListItems.push("Guaranteed COE Top up");
      } else {
        guaranteedCOE = false;
        $('#guaranteedCOETopUp').addClass('d-none');
        carDetails.vehicleListItems.splice(carDetails.vehicleListItems.indexOf("Guaranteed COE Top up"),1);
      }
      calculateVehicleTotal();
    })

    inputRadio.on('change', function(e) {
      e.preventDefault();
      var _this = $(this),
          value = _this.val();
      
      if (value == 'Yes') {
        withCOE = true;

        // package
        $packageCOE.find('.btn-radio-tick').removeClass('is-disabled').removeClass('muted');
        $packageCOE.find('[type=radio]').prop('disabled', false);
        $('#guaranteedCOETopUp').addClass('d-none');
        
        // number of coe bids
        // $bidsCOE.removeClass('is-disabled');
        $bidsCOE.find('input[type=radio]').prop('disabled', false).parent().removeClass('is-disabled').addClass('muted');
        $bidsCOE.find('#bid6').prop('checked',true).parent().addClass('active');
        
        // coe charged
        $chargedRebateCOE.removeClass('is-disabled');
        $chargedRebateCOE.find('#coeCharged').prop('disabled', false);
        
        // open category coe option
        $openCategoryCOE.removeClass('is-disabled');
        $openCategoryCOE.find('#openCatOption').prop('disabled', false);
        
      }
      else if (value == 'No') {
        withCOE = false;
        guaranteedCOE = false;

        // package
        $packageCOE.find('.btn-radio-tick').addClass('is-disabled').removeClass('muted');
        $packageCOE.find('[type=radio]').prop('disabled', true).parent().removeClass('active');

        // number of coe bids
        // $bidsCOE.addClass('is-disabled');
        $bidsCOE.find('input[type=radio]').prop('disabled', true).parent().removeClass('active').addClass('is-disabled');

        // coe charged
        $chargedRebateCOE.addClass('is-disabled');
        $chargedRebateCOE.find('#coeCharged').prop('disabled', true);

        // open category coe option
        $openCategoryCOE.addClass('is-disabled');
        $openCategoryCOE.find('#openCatOption').prop('disabled', true);
        $openCatOption.prop('checked',false);

        $('#openCategoryCOE1').addClass('d-none').find('input').val('');
        $('#openCategoryCOE2').addClass('d-none').find('input').val('');

      }

      calculateVehicleTotal();
    });
    $('input[name=purchaseWithCOE][value=Yes]').click();
    $('input[name=packageCOE][value=Non-Guaranteed]').click();
  };

  var initOpenCategory = function() {
    $openCatOption.on('change', function(e) {
      if (e.target.checked) {
        $chargedRebateCOE.addClass('is-disabled');
        $chargedRebateCOE.find('#coeCharged').prop('disabled', true);
        $chargedRebateCOE.find('.currency').removeAttr('style');

        $('#openCategoryCOE1').removeClass('d-none');
        $('#openCategoryCOE2').removeClass('d-none');
      } else {

        $chargedRebateCOE.removeClass('is-disabled');
        $chargedRebateCOE.find('#coeCharged').prop('disabled', false);

        $('#openCategoryCOE1').addClass('d-none').find('input').val('');
        $('#openCategoryCOE2').addClass('d-none').find('input').val('');
      }
    });
  };

  var initCEOChargedRebate = function() {
    

  };

  var initRoadTax = function() {
    $vehicleTax.find('[name=road-tax]').on('change',function() {
      if ($(this).val() === '6months') {
        $roadTaxPrice.text('Inclusive');
        roadTax12 = false;
        var data = _.find(tax, {name:"Road Tax"});
        data.months = 6;
        data.price = 0;
      } else {
        $roadTaxPrice.text("$"+numberWithCommas(roadTaxPrice,2));
        roadTax12 = true;
        var data = _.find(tax, {name:"Road Tax"});
        data.months = 12;
        data.price = roadTaxPrice;
      }
      calculateVehicleTotal();
    })
  };

  var calculateVehicleTotal = function() {
    var addonsTotal = calculateAddonsTotal();
    var taxTotal = calculateTaxTotal();
    vehicleListPrice = Number(vehiclePrice) + Number(guaranteedCOE? guaranteedCOEPrice:0) + Number(offpeak? offpeakPrice:0);
    total = Number(vehicleListPrice) + Number(addonsTotal) + Number(withCOE? COEPrice:0) - discountsTotal + Number(taxTotal);
    $vehicleListPrice.find('.h3 .currency').text(numberWithCommas(vehicleListPrice,2));
    $vehicleTotalPrice.find('.currency').text(numberWithCommas(total,2));
  }

  var calculateTaxTotal = function() {
    return tax.reduce((sum,current) => sum+=Number(current.price),0);
  }

  var displayAddons = function() {
    var addonsTotal = calculateAddonsTotal();
    var $listDelete = $vehicleAddOns.find('.list-delete').html('');

    $vehicleAddOns.find('.total-price').text(numberWithCommas(addonsTotal,2));
    $vehicleAddOns.find('.price-wrap').removeClass('d-none');
  
    addons.forEach(addon => {
      var html = '';
      html += '<div class="list-delete--item">';
      html += '<a class="list-delete--icon">';
      html += '<svg class="icon icon-delete" role="img" aria-hidden="true">';
      html += '<use xlink:href="../../assets/sdp/images/icons/icons.svg#icon-delete"></use>';
      html += '</svg>';
      html += '</a>';
      html += `<div class="list-delete--desc">${addon.name}</div>`;
      html += `<div class="list-delete--price ml-auto">$<span class="currency">${addon.price}</span></div>`;
      html += '</div>';

      $listDelete.append(html);
    });

    $listDelete.find('.list-delete--icon').on('click', function(e) {
      var name = $(this).siblings('.list-delete--desc').text();
      deleteAddon(name);
      $('.toast').toast('show');
      displayAddons();
      calculateVehicleTotal();
    });
  }

  var calculateAddonsTotal = function() {
    //loop thru addons array and calculate price
    $('.addon-no').text(addons.length);
    var total = addons.reduce((total,current) => total += Number(current.price),0);
    $('.addon-total').text('').text(numberWithCommas(total,2));
    return total;
  }

  var initRegNumberMethod = function() {

    $registrationNo.find('[type=radio]').on('change', function() {
      var value = $(this).val();
      if (value === 'Off Peak') {
        offpeak = true;
        $('#offPeakCar').removeClass('d-none');
        $('#roadTax12').click();
      } else {
        offpeak = false;
        $('#offPeakCar').addClass('d-none');0
      }
      calculateVehicleTotal();
    });

    $regNumberMethod.find('.card-header').click(function() {
      $('#regNoHelper').addClass('d-none');
    })

    $regNumberMethod.find('#headingFive5').off('click').click(function(e) {
      $(this).closest('.card').next('.helper-text').toggleClass('d-none');
    });

    $regNumberMethod.find('.card-header').on('click', function() {
      var id = $(this).attr('id');
      registrationNo = $(this).find('h5').text().trim();
      $('input[name=usedCarRegNo]').prop('disabled', true);

      if (id === 'headingTwo2') {
        $('#usedCarRegNo1').prop('disabled', false);
        if ($('#headingTwo2 > a').attr('aria-expanded') === 'false') {
          $('#retentionFee').removeClass('d-none').addClass('d-flex');
          tax.push({
            name: "Retention Fee",
            price: 100
          });
        } else {
          $('#retentionFee').addClass('d-none').removeClass('d-flex');
          _.remove(tax,{name:"Retention Fee"});
        }
      } else if (id === 'headingThree3') {
        $('#usedCarRegNo2').prop('disabled', false);
        if ($('#headingThree3 > a').attr('aria-expanded') === 'false') {
          $('#retentionFee').removeClass('d-none').addClass('d-flex');
          tax.push({
            name: "Retention Fee",
            price: 100
          });
        } else {
          $('#retentionFee').addClass('d-none').removeClass('d-flex');
          _.remove(tax,{name:"Retention Fee"});
        }
      } else if (id === 'headingFour4') {
        $('#usedCarRegNo3').prop('disabled', false);
      } else {
        $('#retentionFee').addClass('d-none').removeClass('d-flex');
        _.remove(tax,{name:"Retention Fee"});
      }
      $regNumberMethod.find('input').val('');
      calculateVehicleTotal();
    });
  };

  var vehicleOthers = function() {
    var btnBox = $vehicleOthers.find('.btn-box');

    btnBox.each(function() {
      var btnAdd = $(this).find('.btn-add'),
          btnClear = $(this).find('.input-field a'),
          input = $(this).find('input'),
          $this = $(this);

      btnAdd.click(function(e) {
        e.preventDefault();
        $(this).addClass('d-none').text('Add');
        $(this).parents('.btn-box').find('.input-field.d-none').removeClass('d-none');
        input.focus();
      });

      btnClear.click(function(e) {
        // console.log('btn clear click');
        e.preventDefault();
        input.val('').focus();
        // btnAdd.removeClass('d-none');
        // $(this).parents('.btn-box').find('.input-field').addClass('d-none');
        calculateDiscounts();
        calculateVehicleTotal();
      });

      input.on('change', function() {
        handleDiscount(btnAdd, btnClear, input);
      }).on('keyup', function(e) {
        if (e.which === 13) {
          handleDiscount(btnAdd, btnClear, input);
        }
      }).on('focus', function() {
        input.addClass('input-focus');
        $(document).on('mousedown touchstart', inputOthersHandler);
      }).on('blur', function() {
        if (!input.val()) {
          handleDiscount(btnAdd, btnClear, input);
        }
      });

      var inputOthersHandler = function() {
        if ($(this).hasClass('input-focus') || $(this).hasClass('clear')) return;
        $(document).off('mousedown touchstart', inputOthersHandler);
        input.removeClass('input-focus').trigger('blur');
      }
    });
    // $(document).on('click', ':not(.clear, .btn-add, .others-input)', blurEvent);
  };

  var handleDiscount = function(btnAdd, btnClear, input) {
    btnClear.parent().addClass('d-none');
    btnAdd.removeClass('d-none');
    btnAdd.text(input.val()?'-$'+numberWithCommas(Number(input.val()),2):'Add');
    calculateDiscounts();
    calculateVehicleTotal();
  }

  var calculateDiscounts = function() {
    discountsTotal = 0;
    $vehicleOthers.find('input').each(function() {
      var num = Number($(this).val().split(',').join(''));
      if (!isNaN(num)) {
        discountsTotal += num;
      }
    });
  };

  var modalAddOns = function() {

    // create addons
    addonList.forEach((category, index) => {
      var html = '';
      html += `<div class="card">`;
      html += `<div class="card-header" role="tab" id="heading${index}">`;
      html += `<a class="collapsed d-flex align-items-center" data-toggle="collapse" href="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}" >`;
      html += `<img src="${category.icon}" width="40px" height="40px"/>`;
      html += `<h5 class="flex-grow-1">${category.title}</h5>`;
      html += `<svg class="icon icon-chevron-down icon-arrow" role="img" aria-hidden="true">
      <use xlink:href="../../assets/sdp/images/icons/icons.svg#icon-chevron-down"></use>
      </svg>`;
      html += `</a>`;
      html += `</div>`;
      html += `<div id="collapse${index}" class="collapse" role="tabpanel" aria-labelledby="heading${index}">`;
      html += `<div class="collapse-body">`;

      category.items.forEach((item,index) => {
        html += `<div class="list-addon d-flex align-items-center">`;
        html += `<div class="list-addon--text flex-grow-1">`;
        html += _.capitalize(item.name);
        html += `</div>`;
        html += `<div class="list-addon--price">$<span class="price">${item.price}</span></div>`;
        html += `<div class="list-addon--icon">`;
        html += `<button class="btn-circle deal">`;
        html += `<svg class="icon icon-deal" role="img" aria-hidden="true">`;
        html += `<use xlink:href="../../assets/sdp/images/icons/icons.svg#icon-deal"></use>`;
        html += `</svg>`;      
        html += `</button>`;
        html += `</div>`;
        html += `<div class="list-addon--add">`;
        html += `<button class="btn-circle add">`;
        html += `<svg class="icon icon-add " role="img" aria-hidden="true">`;
        html += `<use xlink:href="../../assets/sdp/images/icons/icons.svg#icon-add"></use>`;
        html += `</svg>`;
        html += `</button>`;
        html += `</div>`;
        html += `</div>`;
      });
      
      html += `</div>`;
      html += `</div>`;
      html += `</div>`;

      $('#accordionAddOns').append(html);
    });

    // add click events for each item
    $('.list-addon').each(function() {
      var $addon = $(this);
      $addon.on('click', '.btn-circle', function(e) {
        var name = $addon.find('.list-addon--text').text();
        var price = $addon.find('.price').text();
        e.preventDefault();
        if ($(this).hasClass('deal')) {
          if ($(this).hasClass('active')) {
            //remove from array
            deleteAddon(name);
          } else {
            //make the other button not active
            deleteAddon(name);
            //add item but not price
            addons.push({
              name: name,
              price: 0
            });
            $(this).addClass('active');
          }
        } else {
          if ($(this).hasClass('active')) {
            deleteAddon(name);
          } else {
            //make the other button not active
            deleteAddon(name);
            //add item and price
            addons.push({
              name: name,
              price: price
            });
            $(this).addClass('active');
          }
        }
        calculateAddonsTotal();
      });
    });

    // add click event for done button
    $modalFooter.find('button').on('click', function(e) {
      e.preventDefault();
      displayAddons();
      calculateVehicleTotal();
    });
  };

  var deleteAddon = function(name) {
    addons = addons.filter(addon => addon.name !== name);
    $('.list-addon').each(function() {
      var text = $(this).find('.list-addon--text').text();
      if (text === name) {
        $(this).find('.btn-circle').removeClass('active');
        return false;
      }
    });
  }

  var submitVehiclePurchase = function() {
    var data = getFormData($('#vehiclePurchaseForm'));
    data.addons = addons;
    data.carDetails = carDetails;
    data.tax = tax;
    data.registrationNo = registrationNo;
    data.total = numberWithCommas(total,2);
    data.vehicleListPrice = numberWithCommas(vehicleListPrice,2);
    
    sessionStorage.setItem('vehiclePurchase', JSON.stringify(data));
    window.location = 'step-3.html';
  }

  return {
    init: init,
    submitVehiclePurchase: submitVehiclePurchase
  };
})(jQuery);

var modStep3 = (function($) {
  'use strict';

  var $con,
      $payment,
      terms = 0,
      inst = 0,
      edit = false;

  /* GENERIC */
  var init = function() {
    $con = $('.step-3');
    $payment = $con.find('#payment');

    if (!$con.length) {
      return;
    }

    initFinance();
    initInsurance();
    setTimeout(function() {
      initData();
    },500);
    initEdit();
  };

  var initFinance = function() {
    var $financeCompany = $('#financeCompany');
    setTimeout(function() {
      $financeCompany.find('input').prop('disabled',true);
      $('#finAmt').val('').prop('disabled',true);
      $('#rate').val('').prop('disabled',true);
      $('#mthInst').val('').prop('disabled',true);
      $('input[name=terms]').prop('disabled',true);
      $('.btn-radio-circ').addClass('is-disabled');
      $('#finAndRate, #monthlyInstalment').addClass('disabled');
    },200);

    $('#rate').on('focus', function() {
      $(this).prev('.currency').text('');
    }).on('blur', function() {
      if (!$(this).val()) $(this).prev('.currency').text('%');
    });

    $('input[name=terms]').on('change', function() {
      terms = Number($(this).val());
      calculateInstalment();
    });

    $('input[name=payment]').on('change', function(e) {
      var value = $(this).val();
      if (value === 'full') {
        $('#inHouse').prop('checked',false);
        $financeCompany.find('input,select').prop('disabled',true);
        $financeCompany.find('.select-wrapper').addClass('disabled');
        $('#finAmt').val('').prop('disabled',true);
        $('#rate').val('').prop('disabled',true);
        $('#mthInst').val('').prop('disabled',true);
        $('#finAndRate, #monthlyInstalment').addClass('disabled');
        $('#terms').find('[name=terms]').prop('disabled',true);
        $('#terms').find('.btn-radio-circ').addClass('is-disabled').removeClass('muted').removeClass('active');
        $('#finCoIn,#finCoOut').val('').addClass('d-none');
      } else {
        $financeCompany.find('input,select').prop('disabled',false);
        $financeCompany.find('.select-wrapper').removeClass('disabled');
        $('#finAmt').prop('disabled',false);
        $('#rate').prop('disabled',false);
        $('#mthInst').prop('disabled',false);
        $('#mthInst').prop('readonly',true);
        $('#finAndRate, #monthlyInstalment').removeClass('disabled');
        $('#inHouse').prop('checked',false).trigger('click');
        $('#terms').find('[name=terms]').prop('disabled',false);
        $('#terms').find('.btn-radio-circ').removeClass('is-disabled').removeClass('muted').removeClass('active');
      }
    });

    initFilterSelect($('#finCoOutInput'), $('#finCoOutList'));

    $('select[name=finCo]').on('change', function() {
      if ($(this).val()) {
        $financeCompany.find('.select-wrapper').addClass('selected');
      }
    });

    $('#finAmt').on('blur', function() {
      var value = $(this).val();
      if (value) {
        calculateInstalment();
      }
    })
    
    $('#rate').on('blur', function() {
      var value = $(this).val();
      if (value) {
        calculateInstalment();
      }
    });
    
    $('#rate').off('keyup', onRestrictNumbers).on('keyup', onRestrictNumbers);

    $('#inHouse').on('change', function(e) {
      if (this.checked) {
        $('#finCoIn').removeClass('d-none');
        $('#finCoIn').find('select').prop('disabled',false).val('');
        $('#finCoOut').addClass('d-none');
        $('#finCoOut').find('input').prop('disabled',true).val('');
        
      } else {
        $('#finCoIn').addClass('d-none');
        $('#finCoIn').find('select').prop('disabled',true).val('');
        $('#finCoOut').removeClass('d-none');
        $('#finCoOut').find('input').prop('disabled',false).val('');
      }
      $financeCompany.find('.select-wrapper').removeClass('selected').find('input').val('Select');
    });
  }

  var initInsurance = function() {
    var $insuranceCompany = $('#insCo');
    // setTimeout(function() {
    //   $('#newInsCo').trigger('change');
    //   $('select[name=newInsCo]').parent().css('z-index','91');
    // },500);

    $insuranceCompany.find('select').on('change',function() {
      if ($(this).val()) {
        $(this).closest('.select-wrapper').addClass('selected');
      }
    });

    $('#oldInsCoCheck').on('change', function() {
      if (this.checked) {
        $('#oldInsCoText').removeClass('d-none');
        $('#oldInsCo').addClass('d-none');
      } else {
        $('#oldInsCoText').addClass('d-none');
        $('#oldInsCo').removeClass('d-none');
      }
    });

    $('#ncd').on('focus', function() {
      $(this).prev('.currency').text('');
    }).on('blur', function() {
      if (!$(this).val()) $(this).prev('.currency').text('%');
    });

    initFilterSelect($('#newInsCo'),$('#newInsCoList'));
    initFilterSelect($('#oldInsCoInput'),$('#oldInsCoList'));
  }

  var submitFinanceInsurance = function() {
    var data = getFormData($('#financeInsuranceForm'));
    sessionStorage.setItem('financeInsurance', JSON.stringify(data));
    if (edit) {
      window.location = 'step-6.html';
    } else {
      window.location = 'step-4.html';
    }
  }
  
  var initData = function() {
    var data = JSON.parse(sessionStorage.getItem("financeInsurance"));
    if (data) {
      $('#payment').find('input').each(function() {
        if ($(this).val()===data.payment) {
          $(this).trigger('click');
        }
      });
      if (data.inHouse !== "on" && data.payment === 'loan') $('#inHouse').trigger('click');
      $('#financeCompany').find('.select-dropdown li').each(function() {
        if ($(this).find('span').text() === data.finCo) {
          $(this).trigger('click');
        }
      });
      $('#finAmt').val(data.finAmt);
      $('#rate').val(data.rate).prev('.currency').text('');
      $('input[name=terms]').each(function() {
        if ($(this).val()===data.terms) {
          $(this).trigger('click');
        }
      });

      $('#newInsCo').find('.select-dropdown li').each(function() {
        if ($(this).find('span').text() === data.newInsCo) {
          $(this).trigger('click');
        }
      });

      if (data.oldInsCo) {
        $('#oldInsCo').find('.select-dropdown li').each(function() {
          if ($(this).find('span').text() === data.oldInsCo) {
            $(this).trigger('click');
          }
        });
      } else {
        $('#oldInsCoCheck').trigger('click');
        $('#oldInsCoText').find('input').val(data.oldInsCoText);
      }

      $('#ncd').val(data.ncd).prev('.currency').text('');
      $('input[name=insPackage]').each(function() {
        if ($(this).val() === data.insPackage) {
          $(this).trigger('click');
        }
      })
      $('#payable').val(data.payable);
    }

  }

  var initEdit = function() {
    var url = new URL(window.location.href);
    edit = url.searchParams.get('edit') === 'true';
    if (edit) {
      $('#mainHeader').addClass('d-none');
      $('.editHeader').removeClass('d-none');
      $('#mainBtn').addClass('d-none');
      $('#editBtn').removeClass('d-none');
    } else {
      $('#mainHeader').removeClass('d-none');
      $('.editHeader').addClass('d-none');
      $('#mainBtn').removeClass('d-none');
      $('#editBtn').addClass('d-none');
    }
  }

  var calculateInstalment = function() {
    var rate = Number($('#rate').val().replace('%',''));
    var amt = Number($('#finAmt').val().replace('$','').replace(',',''));
    
    if (rate && !isNaN(rate) && amt && !isNaN(amt) && terms && !isNaN(terms)) {
      inst = (((rate/100)*terms*amt)+amt)/(terms*12);
      $('#mthInst').val(numberWithCommas(inst,2));
    }

  }

  return {
    init: init,
    submitFinanceInsurance: submitFinanceInsurance,
  };
})(jQuery);

var modStep4 = (function($) {
  'use strict';

  var $con,
      edit=false,
      $makes,
      $make,
      makes=[
        "Alfa Romeo",
        "Aston Martin",
        "Audi",
        "Bentley",
        "BMW",
        "BMW Alpina",
        "BMW M Series",
        "Brabus",
        "Chrysler",
        "Citroen",
        "DS",
        "Ferrari",
        "Fiat Professional Ford",
        "Genesis",
        "Golden Dragon",
        "Hino",
        "Honda",
        "Hyundai",
        "Infiniti",
        "Isuzu",
        "Jaguar",
        "Jeep",
        "Kia",
        "Koenigsegg",
        "Maxus",
        "Mazda",
        "McLaren",
        "Mercedes-Benz",
        "MINI",
        "Mitsubishi",
        "Nissan",
        "Opel",
        "Pagani",
        "Perodua",
        "Peugeot",
        "Porsche",
        "Renault",
        "Rolls-Royce",
        "SEAT",
        "Skoda",
        "Ssanyong",
        "Subaru",
        "Suzuki",
        "Tesla",
        "Toyota",
        "Volkswagen",
        "Volvo",
      ];
  var init = function() {
    $con = $('.step-4');
    $makes = $con.find('#makes');
    $make = $con.find('#make');
    if (!$con.length) {
      return;
    }
    
    initFilterSelect($('#usedVehicleFinanceCo'), $('#usedVehicleFinanceCoList'));
    initMakes();
    initData();
    initEdit();
  }

  var initMakes = function() {
    makes.forEach(function(make) {
      var li = '<li>'+make+'</li>';
      $makes.append(li);
    });
    initFilterSelect($make, $makes);
  }

  var initData = function() {
    var data = JSON.parse(sessionStorage.getItem('tradeIn'));
    if (data) {
      $('#make').val(data.make);
      $('#model').val(data.model);
      $('#regNo').val(data.regNo);
      $('#tradeValue').val(data.tradeValue);
      $('#gms').val(data.gms);
      $('#usedVehicleFinanceCo').val(data.usedVehicleFinanceCo);
      $('#settlementAmt').val(data.settlementAmt);
    }
  }

  var initEdit = function() {
    var url = new URL(window.location.href);
    edit = url.searchParams.get('edit') === 'true';
    if (edit) {
      $('#mainHeader').addClass('d-none');
      $('.editHeader').removeClass('d-none');
      $('#mainBtn').addClass('d-none');
      $('#editBtn').removeClass('d-none');
    } else {
      $('#mainHeader').removeClass('d-none');
      $('.editHeader').addClass('d-none');
      $('#mainBtn').removeClass('d-none');
      $('#editBtn').addClass('d-none');
    }
  }

  var submitTradeIn = function() {
    var data = getFormData($('#tradeInForm'));
    sessionStorage.setItem('tradeIn', JSON.stringify(data));
    if (edit) {
      window.location = 'step-6.html';
    } else {
      window.location = 'step-5.html';
    }
  }

  var skip = function() {
    sessionStorage.removeItem('tradeIn');
    window.location = 'step-5.html';
  }

  return {
    init: init,
    submitTradeIn: submitTradeIn,
    skip: skip,
  };
})(jQuery);

var modStep5 = (function($) {
  'use strict';

  var $con,
      offsetMonths = 1,
      limitMonths = 12,
      $deliveryFrom = $('#deliveryFrom'),
      $deliveryTo = $('#deliveryTo'),
      now = moment();

  var init = function() {
    $con = $('.step-5');
    if (!$con.length) {
      return;
    }

    initDeliveryFrom();
  }

  var initDeliveryFrom = function() {
    generateDateButtons($deliveryFrom, now, true);
    $deliveryFrom.find('input[type=radio]').on('change', function(e) {
      $deliveryTo.removeClass('d-none').find('.btn-group-toggle').html('');
      if ($(e.target).val()) {
        var date = moment($(e.target).parent().text().trim(),"MMM YY");
        generateDateButtons($deliveryTo, date.add(offsetMonths,'months'));
        $deliveryTo.find('input[name=deliveryTo]').each(function() {
          if ($(this).val()===date.format('MMM YY')) $(this).trigger('click');
        });
      } else {
        $deliveryTo.addClass('d-none');
      }
    })
  }

  var generateDateButtons = function(target, dateStart, from) {
    var $container = target.find('.btn-group-toggle');
    var name = from ? 'deliveryFrom':'deliveryTo';
    for (let index = 0; index < limitMonths; index++) {
      var date = dateStart.clone().add(index, 'months');
      var dateStr= date.format('MMM YY');
      $container.append(`<label class="btn btn-radio-tick">
        <input type="radio" name="${name}" value="${dateStr}" autocomplete="off">${dateStr}
      </label>`);
    }
  }

  var submitDeposit = function() {
    var data = getFormData($('#depositForm'));
    sessionStorage.setItem('deposit', JSON.stringify(data));
    window.location = 'step-6.html';
  }

  return {
    init: init,
    submitDeposit: submitDeposit,
  };
})(jQuery);

var modStep6 = (function($) {
  'use strict';

  var $con;

  /* GENERIC */
  var init = function() {
    $con = $('.step-6');

    if (!$con.length) {
      return;
    }

    $('.upload-docs--item').each(function(index,element){
      var name = $(element).attr('name');
      var img = sessionStorage.getItem(name);
      if (img) {
        var imgData = $('<img src="'+img+'" class="materialboxed"/>');
        $(element).find('.thumbnail').html(imgData);
      }
    });

    initCustomerDetails();
    initVehiclePurchase();
    initFinanceInsurance();
    initTradeIn();
    initDeposit();
  };

  var initCustomerDetails = function() {
    var data =  JSON.parse(sessionStorage.getItem('customerDetails'));
    if (data) {
      var address1 = data.street+" "+data.floor+"<br>Singapore "+data.postal+"<br>"+data.building;
      var address2;
      
      if (data.postal2) {
        address2 = data.street2+" "+data.floor2+"<br>Singapore "+data.postal2+"<br>"+data.building2;
      } else {
        address2 = 'Same as Registered Address';
      }
  
      $('#mainAddress').html(address1);
      $('#mailAddress').html(address2);
      _.each(data, function(value,key) {
       
        //salutation
        if (key === 'salutation') {
          $('#salutation').text(value);
        }
  
        //first name
        if (key === 'fname') {
          $('#fname').text(value);
        }
  
        //surname/lastname
        if (key === 'lname') {
          $('#surname').text(value);
        }
  
        //secondary contact
        if (key === 'mobile2') {
          $('#secondaryContact').text(value);
        }
  
        //date of birth
        if (key === 'bdate') {
          $('#dob').text(value);
        }
  
        //gender
        if (key === 'gender') {
          $('#sex').text(value);
        }
  
        //marital status
        if (key === 'maritalStatus') {
          $('#marital').text(value);
        }
  
      });
    }
  };

  var initVehiclePurchase = function() {
    var data = JSON.parse(sessionStorage.getItem('vehiclePurchase'));
    if (data) {
      $('#reviewCOE').text(data.carDetails.coe);
      $('#reviewPurchaseWithCOE').text(data.purchaseWithCOE)
      $('#reviewNumOfBids').text(data.numBids);
      $('#reviewPackage').text(data.packageCOE);
      $('#reviewOpenCatOption').text(data.openCatOption? data.openCatOption:'Not Selected');
      $('#reviewCOECharged').text(data.coeCharged? '$'+data.coeCharged:'-');
      $('#reviewRegType').text(data.registrationType);
      $('#reviewRegNo').text(data.registrationNo);
      $('#reviewUsedCarRegNo').text(data.usedCarRegNo? data.usedCarRegNo.toUpperCase():'-');
      $('#openCatCOE').text(data.openCatCOE? '$'+data.openCatCOE:'-');
      $('#openCatPremium').text(data.openCatPremium? '$'+data.openCatPremium:'-');

      $('#reviewModel').text(data.carDetails.model);
      $('#reviewColour').text(data.carDetails.colour);
      $('#reviewTrim').text(data.carDetails.trim);

      //vehicle list items
      var $vehicleListPrice = $('#vehicleListPrice');
      var vlpCardBody = $vehicleListPrice.find('.card-body');
      var vehicleListItems = data.carDetails.vehicleListItems;
      vehicleListItems.push(`Service Credits $${data.serviceCredits}. WEF for 2 years based on date of registration. Non refundable & non transferable.`);
      vehicleListItems.forEach(item => {
        var html='';
        html += '<div class="card-item">';
        html += '<span class="dot">•</span>';
        html += `<span class="item">${item}</span>`;
        html += '</div>';
      
        vlpCardBody.append(html);
      });
      $vehicleListPrice.find('.review-total-price').text('$'+data.vehicleListPrice);

      //addons
      var $addons = $('#addons');
      var addonCardBody = $addons.find('.card-body');
      var addonTotal = 0;
      data.addons.forEach(addon => {
        addonTotal += Number(addon.price);
        var html='';
        html += '<div class="card-item">';
        html += '<span class="dot">•</span>';
        html += `<span class="item">${addon.name}</span>`;
        html += `<span class="item-price">$${numberWithCommas(Number(addon.price),2)}</span>`;
        html += '</div>';
        addonCardBody.append(html);
      });
      $addons.find('.review-total-price').text('$'+numberWithCommas(addonTotal,2));

      //tax
      var $tax = $('#tax');
      var taxCardBody = $tax.find('.card-body');
      var taxTotal = 0;
      data.tax.forEach(item => {
        var price = Number(item.price) ? '$'+numberWithCommas(Number(item.price),2):'Inclusive';
        taxTotal += Number(item.price);
        var html = '';
        html += '<div class="card-item">';
        html += '<span class="dot">•</span>';
        html += `<span class="item">${item.name}</span>`;
        html += `<span class="item-price">${price}</span>`;
        html += '</div>';
        taxCardBody.append(html);
      });
      $tax.find('.review-total-price').text('$'+numberWithCommas(taxTotal,2));

      //others
      var $others = $('#others');
      var othersCardBody = $others.find('.card-body');
      var accessoriesDiscount = data.accessoriesDiscount? Number(data.accessoriesDiscount.split(',').join('')):0;
      var promoDiscount = data.promoDiscount? Number(data.promoDiscount.split(',').join('')):0;
      var coeRefund = data.coeRefund? Number(data.coeRefund.split(',').join('')):0;
      var discountTotal = accessoriesDiscount + promoDiscount + coeRefund;
      var discountsData = [
        {
          name: "Accessories Discount (if applicable)",
          price: accessoriesDiscount? '-$'+numberWithCommas(accessoriesDiscount,2):"-"
        },
        {
          name: "Promo Discount (if applicable)",
          price: promoDiscount? '-$'+numberWithCommas(promoDiscount,2):"-"
        },
        {
          name: "COE Refund (if applicable)",
          price: coeRefund? '-$'+numberWithCommas(coeRefund,2):"-"
        },
      ];
      $others.find('.review-total-price').text(discountTotal? '-$'+numberWithCommas(discountTotal,2):'$0');
      discountsData.forEach(item => {
        var html='';
        html += '<div class="card-item">';
        html += '<span class="dot">•</span>';
        html += `<span class="item">${item.name}</span>`;
        html += `<span class="item-price">${item.price}</span>`;
        html += '</div>';
        othersCardBody.append(html);
      });

      //grand total
      var grandTotal = Number(data.vehicleListPrice.split(',').join('')) + addonTotal + taxTotal - discountTotal;
      $('.grand-total-amount').text('$'+numberWithCommas(grandTotal,2));
      
    }
  };

  var initFinanceInsurance = function() {
    var data =  JSON.parse(sessionStorage.getItem('financeInsurance'));
    if (data) {
      $('#finCo').text(data.finCo? data.finCo:'-');
      $('#finAmt').text(data.finAmt? '$'+data.finAmt:'-');
      $('#terms').text(data.terms? data.terms+" years":'-');
      $('#rate').text(data.rate? data.rate:'-');
      $('#mthInst').text(data.mthInst? '$'+data.mthInst:'-');
      $('#newInsCo').text(data.newInsCo? data.newInsCo:'-');
      $('#oldInsCo').text(data.oldInsCo? data.oldInsCo:data.oldInsCoText?data.oldInsCoText:'-');
      $('#payable').text(data.payable? '$'+numberWithCommas(Number(data.payable),2):'-');
      $('#ncd').text(data.ncd? data.ncd:'-');
      $('#insPackage').text(data.insPackage? data.insPackage:'-');
    }
  }

  var initTradeIn = function() {
    var data =  JSON.parse(sessionStorage.getItem('tradeIn'));
    if (data) {
      $('#make').text(data.make? data.make:'-');
      $('#model').text(data.model? data.model:'-');
      $('#regNo').text(data.regNo? data.regNo:'-');
      $('#tradeInValue').text(data.tradeValue? '$'+data.tradeValue:'-');
      $('#gms').text(data.gms? '$'+data.gms:'-');
      $('#usedVehicleFinanceCo').text(data.usedVehicleFinanceCo? data.usedVehicleFinanceCo:'-');
      $('#settlementAmt').text(data.settlementAmt? '$'+data.settlementAmt:'-');
    } else {
      $('#make').text('-');
      $('#model').text('-');
      $('#regNo').text('-');
      $('#tradeInValue').text('-');
      $('#gms').text('-');
      $('#settlementAmt').text('-');
    }
  }
  
  var initDeposit = function() {
    var data =  JSON.parse(sessionStorage.getItem('deposit'));
    if (data) { 
      $('#vehDeposit').text(data.vehDeposit? '$'+data.vehDeposit:'-');
      $('#coeDeposit').text(data.coeDeposit? '$'+data.coeDeposit:'-');
      $('#instructions').text(data.instructions? data.instructions:'-');
      $('#deliveryPeriod').text((data.deliveryFrom && data.deliveryTo)? data.deliveryFrom+' - '+data.deliveryTo:'-');
    }
  }

  var generatePDF = function(num) {
    if (num === 1) {
      window.open('../../assets/sdp/Sale Agreement PDF-James.pdf','_blank');
      window.location = '../../index.html';
    } else if (num === 2) {
      window.open('../../assets/sdp/Sale Agreement PDF -offpeak-Isabelle.pdf','_blank');
      window.location = '../../index.html';
    }
  }
  return {
    init: init,
    generatePDF: generatePDF,
  };
})(jQuery);

var modSalesforce = (function($) {
  'use strict';

  var $con;

  var init = function() {
    $con = $('.salesforce');
    if (!$con.length) {
      return;
    }
    sessionStorage.clear();
  }

  return {
    init: init,
  };
})(jQuery);

var modTest = (function($) {
  'use strict';

  var $con;

  /* GENERIC */
  var init = function() {
    $con = $('.test');

    if (!$con.length) {
      return;
    }
  };

  return {
    init: init
  };
})(jQuery);

var modGlobal = (function ($) { /* jshint ignore:line */
  'use strict';

  /* GENERIC */
  var init = function () {
    moment.locale('en-AU');
    window.allBrands = ['cnc', 'kia'];
    window.brandPropsMapping = {
      cnc: {
        fontfamily: '"WhitneyBook", "Helvetica Neue", Helvetica, Arial, sans-serif',
        color: {
          primary: '#00619e',
          markerDefault: '#545e75'
        }
      },
      kia: {
        fontfamily: '"Kia", Tahoma, sans-serif',
        color: {
          primary: '#bb162b',
          markerDefault: '#3e4b61'
        }
      }
    };

    if (window.navigator.userAgent) {
      var ua = window.navigator.userAgent;
      var msie = ua.indexOf('MSIE ');

      if (msie > 0) {
        // IE 10 or older => return version number
        $('html').addClass('ie ie-' + parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10));
      }

      var trident = ua.indexOf('Trident/');
      if (trident > 0) {
        // IE 11 => return version number
        var rv = ua.indexOf('rv:');
        $('html').addClass('ie ie-' + parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10));
      }

      var edge = ua.indexOf('Edge/');
      if (edge > 0) {
        // Edge (IE 12+) => return version number
        $('html').addClass('ie ie-' + parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10));
      }
    }

    $.extend({
      getQueryParameters: function (str) {
        if (str.indexOf('http') !== -1) {
          str = str.split('?')[1];
        }
        return (str || document.location.search).replace(/(^\?)/, '').split('&').map(function (n) {
          return n = n.split('='), this[n[0]] = n[1], this;
        }.bind({}))[0];
      }
    });

    window.debugMode = helper.qs('debug') === 'true';
    helper.materialUpdate();
    objectFitImages();

    // added this for IE11 SVG issue
    svg4everybody({
      nosvg: true, // shiv <svg> and <use> elements and use image fallbacks
      polyfill: true // polyfill <use> elements for External Content
    });

    var channel = 'app';
    if (helper.qs('channel') !== undefined) {
      channel = helper.qs('channel');
    }
    window.isApp = false;
    if ((channel === 'app' || helper.qs('sc_device') === 'mobile') && (/endusers/).test(window.location.href)) {
      window.isApp = true;
      $('html').addClass('app');
      $('body').removeClass(function (i, className) {
        return (className.match(/(^|\s)brand-\S+/g) || []).join(' ');
      });
      $('.brand-header, .brand-footer, .global-header, .global-footer, .app-hide').each(function(i, elm) {
        if (!$(elm).hasClass('web-only')) {
          $(elm).remove();
        }
      });
    } else {
      $('.app-only').remove();
    }

    /* Password Masking Toggle */
    $(document).on('click', '.btn-toggle-password', function (e) {
      e.preventDefault();
      var $input = $('input[id$="' + $(this).data('ref') + '"]');
      helper.toggleAttributes($input, 'type', ['password', 'text']);
      if ($input.attr('type') === 'text') {
        $(this).addClass('btn-toggle-password-hide');
      } else {
        $(this).removeClass('btn-toggle-password-hide');
      }

      return false;
    });

    // trim input on blur
    $(document).on('blur', 'input', function () {
      if ($(this).attr('type') === 'text' ||
        $(this).attr('type') === 'email' ||
        $(this).attr('type') === 'number' ||
        $(this).attr('type') === 'tel' ||
        $(this).hasClass('trim')) {
        $(this).val(_.trimEnd($(this).val()));
      }
    });

    $(document).on('keydown', 'input', function(e) {
      if (e.which === 13) {
        e.preventDefault();
        return false;
      }
    })

    /* Save and Edit input-field */
    $(document).on('click', '.input-field__edit', function (e) {
      e.preventDefault();

      var $parent = $(this).parents('.input-field__editable');
      $parent.addClass('editing');
      $('.input-field__editable').not($parent).addClass('editing-disabled');
      var $input = $(this).parents('.input-field').find('input');
      $input.removeAttr('readonly aria-readonly');
      $input[0].setSelectionRange(999, 999);
      $input.data('oValue', $input.val());

      window.inputFieldEditDocumentClick = function (e) {
        if ($(e.target).parents('.input-field__editable').length) {
          e.preventDefault();
          return false;
        }
        if (!$(e.target).parents('.input-field__save').length) {
          helper.inputFieldEditRestoreState($input, true);
        }
        $(document).off('click', window.inputFieldEditDocumentClick);
      };

      $(document).on('click', window.inputFieldEditDocumentClick);

      $(this).hide();
      $(this).siblings('.input-field__save').show();

      setTimeout(function () {
        $input.focus();
      }, 100);

      return false;
    });

    $(document).on('focusout', '.input-field__save', function (e) {
      if (!$(e.relatedTarget).parents('.input-field__editable').length) {
        helper.inputFieldEditRestoreState($(e.relatedTarget).parents('.input-field__editable').find('input'), true);
      }
    });

    $(document).on('click', '.input-field__save', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      $(this).parents('form').submit();
      return false;
    });

    /* Preferred Showroom Map with Events - Registration Events */
    $(document).on('change', 'select.preferred_showroom', function (e) {
      e.preventDefault();
      var cacheEventDate = $('select.eventdate');
      var keyOptionsObjs = JSON.parse($('.hiddenPreferredDate').val()),
        selectedOptions = $(this).find(':selected').data('key'),
        keyRef = cacheEventDate.data('ref'),
        options = '';

      if (selectedOptions === keyRef) {
        return;
      }

      for (var i = 0; i < keyOptionsObjs.length; i++) {
        if (keyOptionsObjs[i].showroomname === selectedOptions) {
          for (var j = 0; j < keyOptionsObjs[i].dateslots.length; j++) {
            options += '<option>' + keyOptionsObjs[i].dateslots[j] + '</option>';
          }
          break;
        }
      }

      cacheEventDate.find('option').not(':first').remove();
      cacheEventDate.append(options).removeAttr('disabled');
      if (selectedOptions === '') {
        cacheEventDate.attr('disabled', 'disabled');
      }
      cacheEventDate.material_select('destroy'); /* jshint ignore:line */
      helper.materialUpdate();
      cacheEventDate.data('ref', selectedOptions);
      var $icon = $('.select-wrapper.eventdate').siblings('.icon-chevron-down');
      $('.select-wrapper.eventdate').prepend($icon);
      $('.select-wrapper.eventdate').find('.caret').remove();
      $('.select-wrapper.eventdate input').off('click', helper.selectWrapperInputFocusClick).on('click', helper.selectWrapperInputFocusClick);
    });

    $(document).on('blur', 'input.select-dropdown', function () {
      $(this).parent().removeClass('open');
    });

    /* Auto resize for <textarea> when resize */
    var onMouseupTextarea = function () {
      $(document).off('mouseup', onMouseupTextarea);
      window.$mousedownTextarea.trigger('resize');
    };

    $(document).on('mousedown', 'textarea', function (e) {
      window.$mousedownTextarea = $(e.currentTarget);
      $(document).off('mouseup', onMouseupTextarea).on('mouseup', onMouseupTextarea);
    });

    /* Show hide for checkbox on toggle */
    $(document).on('change', '[type="checkbox"]', function () {
      if ($(this).attr('data-ref') && $('.' + $(this).attr('data-ref')).length) {
        var $elm = $('.' + $(this).attr('data-ref'));
        if ($elm.length) {
          $elm.toggleClass('hide');
          if ($elm.parents('.slick-slider').length) {
            $elm.parents('.slick-slider').slick('setOption', '', '', true);
          } else {
            $(window).trigger('resize');
          }
        }
      }
    });

    $(document).on('focus', 'input[type=text], input[type=tel], textarea', function() {
      if (!$(this).prop('readonly') && $(this).is(':valid') || $(this).hasClass('money')) {
        if ($(this).siblings('label').length) {
          $(this).siblings('label').css('color','#0A9CFB');
        } else {
          $(this).parent().siblings('label').css('color','#0A9CFB');
          $(this).siblings('.currency').css('color','#0A9CFB');
        }
      } else if ($(this).is(':invalid') && !$(this).hasClass('money')) {
        if ($(this).siblings('label').length) {
          $(this).siblings('label').css('color','#fc6c6c');
        } else {
          $(this).parent().siblings('label').css('color','#fc6c6c');
          $(this).siblings('.currency').css('color','#fc6c6c');
        }
      }
      $('.hiddendiv.common').css('display','block');
    });

    $(document).on('blur', 'input[type=text], input[type=tel], textarea', function() {
      if ($(this).is(':valid') || $(this).hasClass('money')) {
        if ($(this).siblings('label').length) {
          $(this).siblings('label').css('color','#516173');
        } else {
          $(this).parent().siblings('label').css('color','#516173');
          $(this).siblings('.currency').css('color','#212529');
        }
      } else {
        if ($(this).siblings('label').length) {
          $(this).siblings('label').css('color','#fc6c6c');
        } else {
          $(this).parent().siblings('label').css('color','#fc6c6c');
          $(this).siblings('.currency').css('color','#fc6c6c');
        }
      }
      $('.hiddendiv.common').css('display','none');
    });

    $(document).on('keyup', 'input[type=text], input[type=tel], textarea', function(e) {
      changeLabelColor(e)
    });

    $('.skip-main').on('click keydown', function(e) {

      if ((e.type === 'keydown' && (e.keyCode === 13 || e.keyCode === 32)) || e.type === 'click') {
        var $content = $('.brand-header').next();
        if (!$content.length) {
          $content = $('.global-header').next();
        }
        if (!$content.length) {
          return;
        }

        e.preventDefault();

        $content
          .attr('tabindex', -1)
          .on('blur focusout', function() {
            $(this).removeAttr('tabindex');
          })
          .focus();

        return false;
      }
    });

    resize();
  };

  /* PUBLIC */
  var resize = function () {
    if (isDesktopSize) {
      $('a[href^=tel]').on('click', function (e) {
        e.preventDefault();
        return false;
      });
    }

    helper.setEqualHeight();
  };

  var scroll = _.debounce(function () {
    window.lastScrollPosition = $(window).scrollTop();
  }, 100);

  return {
    init: init,
    resize: resize,
    scroll: scroll,
  };
})(jQuery);

var modStyleGuide = (function($) {
  'use strict';

  var $con;

  /* GENERIC */
  var init = function() {
    $con = $('.styleguide');

    if (!$con.length) {
      return;
    }

    $('#myTab a').on('click', function(e) {
      e.preventDefault();
      $(this).tab('show');
    });
  };

  return {
    init: init
  };
})(jQuery);

var numberWithCommas = function(number,decimal) {
  var parts = number.toFixed(decimal).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

var getFormData= function($form) {
  var unindexed_array = $form.serializeArray();
  var indexed_array = {};

  $.map(unindexed_array, function(n, i){
      indexed_array[n['name']] = n['value'];
  });

  return indexed_array;
}

var RemoveRougeChar = function(convertString){
  if(convertString.substring(0,1) == ","){
    return convertString.substring(1, convertString.length)
  }
  return convertString;
}

// allow only numbers for input types
var onRestrictNumbers = function (e) {
  // console.log(e.which);
  return e.metaKey || // cmd/ctrl
    e.which <= 0 || // arrow keys
    e.which === 46 || // decimal point
    // e.which === 110 || // decimal point
    e.which === 8 || // delete key
    /[0-9]/.test(String.fromCharCode(e.which)); // numbers
};

var onRestrictLength6 = function(e) {
  console.log(typeof e.target.value, e.target.value.length);
  return e.metaKey || // cmd/ctrl
  e.which <= 0 || // arrow keys
  e.which === 8 || // delete key
  e.target.value.length < 6;
}

var onRestrictTel = function (e) {
  return e.metaKey || // cmd/ctrl
    e.which <= 0 || // arrow keys
    e.which === 43 || // + sign
    e.which === 8 || // delete key
    /[0-9]/.test(String.fromCharCode(e.which)); // numbers
};

var onRestrictDate = function (e) {
  return e.metaKey || // cmd/ctrl
    e.which <= 0 || // arrow keys
    e.which === 8 || // delete key
    /[0-9]/.test(String.fromCharCode(e.which)); // numbers
};

var changeLabelColor = function(e) {
  if ($(e.target).hasClass('money')) return;
  if ($(e.target).is(':invalid')) {
    $(e.target).siblings('label').css('color','#fc6c6c');
  } else {
    if ($(e.target).is(':focus')) {
      $(e.target).siblings('label').css('color','#0a9cfb');
    } else {
      $(e.target).siblings('label').css('color','#516173');
    }
  }
}

var initFilterSelect = function(input, list) {
  var id = input.attr('id');
  list.find('li').on('click', function() {
    input.val($(this).text());
    $(this).siblings().each(function() {
      $(this).removeClass('selected');
    });
    $(this).addClass('selected');
    list.addClass('d-none');
  });
  input.on('keyup', function() {
    var filter = this.value.toUpperCase();
    list.find('li').each(function() {
      if ($(this).text().toUpperCase().indexOf(filter) > -1) {
        $(this).removeClass('d-none');
      } else {
        $(this).addClass('d-none');
      }
    });
  });
  input.on('focus', function() {
    list.removeClass('d-none');
    $(document).on('focusin click touchstart', handler);
  });
  input.closest('.form-group').addClass('relative');

  var handler = function(e) {
    if ($(e.target).closest('#'+id).length || $(e.target).parent().hasClass('select-list')|| $(e.target).hasClass('select-dropdown')) return;
    $(document).off('focusin click touchstart', handler);
    list.addClass('d-none');
    input.trigger('blur');
  }
}

var showTopError = function(message) {
  $('#top-error').text(message).css('height', '50px').css('opacity','1');
  $('#mainHeader').css('top','50px');
  if (!$('#mainHeader').hasClass('sticky')) {
    $('body').css('padding-top', '50px');
  }
}

var hideTopError = function() {
  $('#top-error').text('').css('height', '0').css('opacity','0');
  $('#mainHeader').css('top','0');
  if (!$('#mainHeader').hasClass('sticky')) {
    $('body').css('padding-top', '0');
  }
}