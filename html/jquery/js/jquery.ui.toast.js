// jQuery toast plugin created by Kamran Ahmed copyright MIT license 2015 (modified by Frank Wang)
(function($) {
	function Toast(options) {
		var os = {}, // options
			$t; // toast-single

		function prepareOptions(options, options_to_extend) {
			var e = options_to_extend || {},
				o = {};

			if ((typeof options === 'string') || $.isArray(options)) {
				o.text = options;
			} else {
				o = options;
			}
			$.extend(os, e, o);
		}

		function setup() {
			$t = $t || $('<div class="ui-toast-single"></div>');

			$t.empty();

			// For the loader on top
			$t.append($('<span class="ui-toast-loader"></span>'));

			if (os.closeable) {
				$t.append($('<span class="ui-toast-close">&times;</span>'));
			}

			var sm = os.html ? 'html' : 'text';
			if (os.heading) {
				$t.append($('<h2 class="ui-toast-heading">')[sm](os.heading));
			}

			if ($.isArray(os.text)) {
				var $ul = $('<ul class="ui-toast-ul">');
				for (var i = 0; i < os.text.length; i++) {
					$ul.append($('<li class="ui-toast-li" id="ui-toast-item-' + i + '">')[sm](os.text[i]));
				}
				$t.append($ul);
			} else {
				$t.append($('<span>')[sm](os.text));
			}

			if (os.bgColor !== false) {
				$t.css("background-color", os.bgColor);
			};

			if (os.textColor !== false) {
				$t.css("color", os.textColor);
			};

			if (os.textAlign) {
				$t.css('text-align', os.textAlign);
			}

			if (os.icon !== false) {
				$t.addClass('ui-toast-has-icon ui-toast-icon-' + os.icon);
			}

			if (os['class'] !== false) {
				$t.addClass(os['class'])
			}
		}

		function position() {
			var $c = $(".ui-toast-wrap"),
				sp = os.position,
				op = {
					left: 'auto',
					top: 'auto',
					right: 'auto',
					bottom: 'auto'
				};
			
			if (typeof sp === 'object') {
				$.extend(op, sp);
			} else {
				switch (sp) {
				case 'mid-center':
					op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
					op.top = ($(window).outerHeight() / 2) - $c.outerHeight() / 2;
					break;
				case 'bottom':
					op.bottom = 5;
					op.left = 20;
					op.right = 20;
					break;
				case 'bottom-center':
					op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
					op.bottom = 20;
					break;
				case 'bottom-left':
					op.bottom = 20;
					op.left = 20;
					break;
				case 'bottom-right':
					op.bottom = 20;
					op.right = 20;
					break;	
				case 'top':
					op.top = 5;
					op.left = 20;
					op.right = 20;
					break;
				case 'top-center':
					op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
					op.top = 20;
					break;
				case 'top-left':
					op.top = 20;
					op.left = 20;
					break;
				case 'top-right':
				default:
					op.top = 20;
					op.right = 20;
					break;
				}
			}
			$c.css(op);
		}

		function bindToast() {
			$t.on('afterShown', function() {
				processLoader();
			});

			$t.find('.ui-toast-close').on('click', function(e) {
				e.preventDefault();
				transitionOut();
			});

			if (typeof os.beforeShow == 'function') {
				$t.on('beforeShow', function() {
					os.beforeShow($t);
				});
			}

			if (typeof os.afterShown == 'function') {
				$t.on('afterShown', function() {
					os.afterShown($t);
				});
			}

			if (typeof os.beforeHide == 'function') {
				$t.on('beforeHide', function() {
					os.beforeHide($t);
				});
			}

			if (typeof os.afterHidden == 'function') {
				$t.on('afterHidden', function() {
					os.afterHidden($t);
				});
			}

			if (typeof os.onClick == 'function') {
				$t.on('click', function() {
					os.onClick($t);
				});
			}
		}

		function addToDom() {
			var $c = $('.ui-toast-wrap'),
				sn = os.stack;

			if ($c.length === 0) {
				$c = $('<div></div>', {
					"class": "ui-toast-wrap",
					"role": "alert",
					"aria-live": "polite"
				});

				$('body').append($c);

			} else if (!sn || isNaN(parseInt(sn, 10))) {
				$c.empty();
			}

			$c.find('.ui-toast-single:hidden').remove();

			$c.append($t);

			if (sn && !isNaN(parseInt(sn), 10)) {
				var _prevToastCount = $c.find('.ui-toast-single').length,
					_nextToastCount = _prevToastCount - sn;

				if (_nextToastCount > 0) {
					$c.find('.ui-toast-single').slice(0, _nextToastCount).remove();
				}
			}
		}

		function canAutoHide() {
			return (os.hideAfter !== false) && !isNaN(parseInt(os.hideAfter, 10));
		}

		function processLoader() {
			// Show the loader only, if auto-hide is on and loader is demanded
			if (!canAutoHide() || os.loader === false) {
				return false;
			}

			var loader = $t.find('.ui-toast-loader');

			// 400 is the default time that jquery uses for fade/slide
			// Divide by 1000 for milliseconds to seconds conversion
			var transitionTime = (os.hideAfter - 400) / 1000 + 's';
			var loaderBg = os.loaderBg;

			var style = loader.attr('style') || '';
			style = style.substring(0, style.indexOf('-webkit-transition')); // Remove the last transition definition

			style += '-webkit-transition: width ' + transitionTime + ' ease-in; \
					  -o-transition: width ' + transitionTime + ' ease-in; \
					  transition: width ' + transitionTime + ' ease-in; \
					  background-color: ' + loaderBg + ';';

			loader.attr('style', style).addClass('ui-toast-loaded');
		}

		function animate() {
			transitionIn();

			if (canAutoHide()) {
				setTimeout(function() {
					transitionOut();
				}, os.hideAfter);
			}
		}

		function transitionIn() {
			var tm = 'show';

			switch (os.transition) {
			case 'fade':
				tm = 'fadeIn';
				break;
			case 'slide':
				tm = 'slideDown';
				break;
			}

			$t.hide().trigger('beforeShow')[tm](function() {
				$t.trigger('afterShown');
			});
		}

		function transitionOut() {
			var tm = 'hide';

			switch (os.transition) {
			case 'fade':
				tm = 'fadeOut';
				break;
			case 'slide':
				tm = 'slideUp';
				break;
			}

			$t.trigger('beforeHide')[tm](function() {
				$t.trigger('afterHidden');
			});
		}

		prepareOptions(options, $.toast.defaults);
		setup();
		addToDom();
		position();
		bindToast();
		animate();

		var api = {
			reset: function(resetWhat) {
				if (resetWhat === 'all') {
					$('.ui-toast-wrap').remove();
				} else {
					$t.remove();
				}
			},
	
			update: function(options) {
				prepareOptions(options);
				setup();
				bindToast();
			},
	
			clsose: function() {
				transitionOut();
			}
		};

		return api;
	}

	$.toast = Toast;

	$.toast.defaults = {
		icon: false,
		text: '',
		heading: '',
		loader: true,
		transition: 'fade',
		closeable: true,
		hideAfter: 5000,
		stack: 5,
		position: 'top-right',
		bgColor: false,
		textColor: false,
		textAlign: 'left',
		loaderBg: '#9EC600'
	};

})(jQuery);
