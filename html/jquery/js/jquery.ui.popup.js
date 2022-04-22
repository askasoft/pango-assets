(function($) {
	function __click(evt) {
		var el = evt.target;
		if (!el || el.tagName == "HTML") {
			return;
		}

		var $e = $(el);
		if ($e.hasClass('ui-popup') || $e.closest('.ui-popup').length) {
			return;
		}

		var $c = $('.ui-popup:visible>.ui-popup-content'), c = $c.data('popup');
		if (c && c.trigger && c.trigger !== window) {
			// check event element is inside the trigger
			while (el) {
				if (c.trigger === el) {
					return;
				}
				el = el.parentNode;
			}
		}

		_hide($c);
		$(document).off('click.popup');
	}

	function __ajaxError($c, xhr, status, err) {
		var html = xhr.responseJSON 
			? JSON.stringify(xhr.responseJSON, null, 4)
			: (xhr.responseText || err || status);

		$c.empty().append($('<div class="ui-popup-error">').html(html));
	}

	function __ajaxRender($c, data, status, xhr) {
		$c.html(data);
	}

	var ArrowClasses = {
		'top left': 'dn hr1 vb',
		'top right': 'dn hl1 vb',
		'top center': 'dn hc vb',
		'bottom left': 'up hr1 vt',
		'bottom right': 'up hl1 vt',
		'bottom center': 'up hc vt',
		'left bottom': 'rt hr vt1',
		'left top': 'rt hr vb1',
		'left middle': 'rt hr vm',
		'right bottom': 'lt hl vt1',
		'right top': 'lt hl vb1',
		'right middle': 'lt hl vm'
	};

	function __position($p, $t, position) {
		var tw = $t.outerWidth(), th = $t.outerHeight(), p = $t.offset();
		var pw = $p.outerWidth(), ph = $p.outerHeight();

		switch (position) {
		case 'top left':
			p.top -= (ph + 11);
			p.left -= (pw - 50);
			break;
		case 'top right':
			p.top -= (ph + 11);
			p.left += (tw - 50);
			break;
		case 'top center':
			p.top -= (ph + 11);
			p.left += (tw - pw) / 2;
			break;
		case 'bottom left':
			p.top += th + 11;
			p.left -= (pw - 50);
			break;
		case 'bottom right':
			p.top += th + 11;
			p.left += (tw - 50);
			break;
		case 'bottom center':
			p.top += th + 11;
			p.left += (tw - pw) / 2;
			break;
		case 'left bottom':
			p.left -= (pw + 11);
			p.top -= 20;
			break;
		case 'left top':
			p.left -= (pw + 11);
			p.top = p.top - ph + th + 20;
			break;
		case 'left middle':
			p.left -= (pw + 11);
			p.top -= (ph / 2 - 20);
			break;
		case 'right bottom':
			p.left += tw + 11;
			p.top -= 20;
			break;
		case 'right top':
			p.left += tw + 11;
			p.top = p.top - ph + th + 20;
			break;
		case 'right middle':
			p.left += tw + 11;
			p.top -= (ph / 2 - 20);
			break;
		}

		return p;
	}

	function __in_screen($p, p) {
		var $w = $(window),
			wt = $w.scrollTop(), wl = $w.scrollLeft(),
			wb = wt + $w.height(), wr = wl + $w.width(),
			pr = p.left + $p.outerWidth(), pb = p.top + $p.outerHeight();

		return p.left >= wl && p.left <= wr
			&& p.top >= wt && p.top <= wb
			&& pr >= wl && pr <= wr
			&& pb >= wt && pb <= wb;
	}

	function __positions($p, $t, ps) {
		for (var i = 0; i < ps.length; i++) {
			var p = __position($p, $t, ps[i]);
			p.position = ps[i];
			if (__in_screen($p, p)) {
				return p;
			}
			ps[i] = p;
		}
		return ps[0];
	}

	function __align($p, trigger, position) {
		var $a = $p.find('.ui-popup-arrow').hide();
		if (position == 'center') {
			$p.addClass('ui-popup-center').css({
				top: '50%',
				left: '50%'
			});
			return;
		}

		$p.removeClass('ui-popup-center');

		var $t = $(trigger), ac = ArrowClasses[position];
		if (ac) {
			p = __position($p, $t, position);
		} else {
			switch (position) {
			case 'top':
				p = __positions($p, $t, ['top center', 'top left', 'top right']);
				break;
			case 'bottom':
				p = __positions($p, $t, ['bottom center', 'bottom left', 'bottom right']);
				break;
			case 'left':
				p = __positions($p, $t, ['left middle', 'left bottom', 'left top']);
				break;
			case 'right':
				p = __positions($p, $t, ['right middle', 'right bottom', 'right top']);
				break;
			case 'auto':
			default:
				p = __positions($p, $t, [
					'bottom center', 'bottom left', 'bottom right',
					'right middle', 'right bottom', 'right top',
					'top center', 'top left', 'top right',
					'right middle', 'right bottom', 'right top'
				]);
				break;
			}
			ac = ArrowClasses[p.position];
		}

		$p.css({
			position: 'absolute',
			top: p.top,
			left: p.left
		});
		$a.attr('class', 'ui-popup-arrow ' + ac).show();
	}

	function __mypop($c) {
		return $c.parent('.ui-popup');
	}

	function _toggle($c, trigger) {
		trigger = trigger || window;
		var $p = __mypop($c);
		if ($p.is(':hidden')) {
			_show($c, trigger);
			return;
		}

		var c = $c.data('popup');
		if (c.trigger === trigger) {
			_hide($c);
			return;
		}

		_show($c, trigger);
	}

	function _show($c, trigger) {
		_hide($('.ui-popup:visible>.ui-popup-content'));

		var $p = __mypop($c).show(), c = $c.data('popup');

		if (!c.loaded) {
			if (c.showing) {
				c.showing = trigger || c.showing;
			} else {
				c.showing = trigger || window;
				_load($c, c);
			}
			return;
		}

		$c.trigger('show.popup');

		c.trigger = trigger || window;
		__align($p, c.trigger, c.position);
		$c.hide().css('visibility', 'visible')[c.transition](function() {
			$c.trigger('shown.popup');
			if (c.clickHide == true || c.clickHide == 'true') {
				$(document).on('click.popup', __click);
			}
		});
	}

	function _hide($c) {
		var $p = __mypop($c);
		if ($p.is(':visible')) {
			$c.trigger('hide.popup');
			$p.hide();
			$(document).off('click.popup');
			$c.trigger('hidden.popup');
		}
	}

	function _load($c, c) {
		var $p = __mypop($c);

		c = $.extend($c.data('popup'), c);

		$c.html('<div class="ui-popup-loading"></div>');
		if (c.showing) {
			__align($p, c.showing, c.position);
		}
		$c.trigger('load.popup');

		$.ajax({
			url: c.url,
			data: c.data,
			dataType: c.dataType,
			method: c.method,
			success: function(data, status, xhr) {
				$c.css('visibility', 'hidden');
				(c.ajaxRender || __ajaxRender)($c, data, status, xhr);
			},
			error: function(xhr, status, err) {
				$c.css('visibility', 'hidden');
				(c.ajaxError || __ajaxError)($c, xhr, status, err);
			},
			complete: function() {
				c.loaded = true;
				$c.trigger('loaded.popup');
				if (c.showing) {
					if ($p.is(':visible')) {
						_show($c, c.showing);
					}
					delete c.showing;
				}
			}
		});
	}

	function _update($c, o) {
		if (o) {
			$.extend($c.data('popup'), o);
		}
	}

	function _callback($c) {
		var c = $c.data('popup');
		if (typeof(c.callback) == 'function') {
			c.callback.apply(c.trigger, [].slice.call(arguments, 1));
		}
	}

	function __camelCase(s) {
		s = s.charAt(0).toLowerCase() + s.slice(1);
		return s.replace(/[-_](.)/g, function(m, g) {
			return g.toUpperCase();
		});
	}

	function __options($c) {
		var ks = [
			'url',
			'method',
			'data',
			'data-type',
			'position',
			'transition',
			'click-hide',
			'callback',
			'ajaxRender',
			'ajaxError'
		];
		var fs = ['callback', 'ajaxRender', 'ajaxError'];

		var c = {};
		$.each(ks, function(i, k) {
			var s = $c.attr('popup-' + k);
			if (s !== undefined && s !== null && s != '') {
				k = __camelCase(k);
				if ($.inArray(k, fs) >= 0) {
					s = new Function(s);
				}
				c[k] = s;
			}
		})
		return c;
	}

	function __init($c, c) {
		var $p = __mypop($c);
		if ($p.length) {
			_update($c, c);
			return;
		}

		c = $.extend({}, $.popup.defaults, __options($c), c);

		$p = $('<div class="ui-popup">').css({ 'display': 'none' })
			.append($('<div class="ui-popup-arrow">'))
			.append($('<i class="ui-popup-close">&times;</i>'))
			.appendTo('body');

		if (c.cssClass) {
			$p.addClass(c.cssClass);
		}

		$p.find('.ui-popup-close').click(function() {
			_hide($c);
		});

		$c.appendTo($p).data('popup', c).addClass('ui-popup-content').css({ 'display': 'block' });

		if (c.url) {
			c.loaded = false;
			if (c.autoload) {
				_load($c);
			}
		} else {
			c.loaded = true;
		}
	}

	var api = {
		load: _load,
		show: _show,
		hide: _hide,
		update: _update,
		toggle: _toggle,
		callback: _callback
	};

	$.fn.popup = function(c) {
		var args = [].slice.call(arguments);
		this.each(function() {
			var $c = $(this);

			if (typeof(c) == 'string') {
				var p = $c.data('popup');
				if (!p) {
					__init($c);
				}
				args[0] = $c;
				api[c].apply($c, args);
				return;
			}

			__init($c, c);
		});
		return this;
	};

	$.popup = function() {
		var $c = $('.ui-popup:visible>.ui-popup-content');
		$c.popup.apply($c, arguments);
		return $c;
	};

	$.popup.defaults = {
		dataType: 'html',
		method: 'GET',
		position: 'auto',
		transition: 'slideDown',
		clickHide: true
	};

	// POPUP DATA-API
	// ==================
	$(window).on('load', function() {
		$('[data-spy="popup"]').popup();
		$('[popup-target]').click(function() {
			var $t = $(this), c = __options($t);
			$($t.attr('popup-target')).popup(c).popup('toggle', this);
		});
	});

})(jQuery);
