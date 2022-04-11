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
		
		var $p = $('.ui-popup:visible'), c = $p.data('popup');
		if (c && c.trigger == el) {
			return;
		}

		$('.ui-popup').hide();
		$(document).unbind('click', __click);
	}
	
	function __ajaxError(xhr, status, err) {
		if (xhr && xhr.responseJSON) {
			return JSON.stringify(xhr.responseJSON, null, 2);
		}
	
		msg = '';
		if (err) {
			msg += err + '\n';
		}
		
		return msg || 'Server Error';
	}

	function __align($p, trigger, position) {
		var $t = $(trigger), tw = $t.outerWidth(), th = $t.outerHeight();

		var $a = $p.find('.ui-popup-arrow').hide(), pw = $p.outerWidth(), ph = $p.outerHeight();

		if (trigger == window) {
			var left = (tw - pw) / 2, top = (th - pw) / 2;
			$p.css({
				position: 'fixed',
				left: (left < 10 ? 10 : left),
				top: (top < 10 ? 10 : top)
			});
			return;
		}

		var p = $t.offset(), $w = $(window);
		console.log(p.left, p.top, tw, th, pw, ph);

		switch (position) {
		case 'top left':
			p.top -= (ph + 11); // arrow height
			p.left -= (pw - 50);
			$a.attr('class', 'ui-popup-arrow dn hr1 vb');
			break;
		case 'top right':
			p.top -= (ph + 11); // arrow height
			p.left += (tw - 50);
			$a.attr('class', 'ui-popup-arrow dn hl1 vb');
			break;
		case 'top center':
			p.top -= (ph + 11); // arrow height
			p.left += (tw - pw) / 2;
			$a.attr('class', 'ui-popup-arrow dn hc vb');
			break;
		case 'top':
			p.top -= (ph + 11); // arrow height
			var x = p.left + (tw - pw) / 2;
			if (x > $w.scrollLeft()) {
				p.left = x;
				$a.attr('class', 'ui-popup-arrow dn hc vb');
			} else {
				p.left += (tw - 50);
				$a.attr('class', 'ui-popup-arrow dn hl1 vb');
			}
			break;
		case 'bottom left':
			p.top += th + 11; // arrow height
			p.left -= (pw - 50);
			$a.attr('class', 'ui-popup-arrow up hr1 vt');
			break;
		case 'bottom right':
			p.top += th + 11; // arrow height
			p.left += (tw - 50);
			$a.attr('class', 'ui-popup-arrow up hl1 vt');
			break;
		case 'bottom center':
			p.top += th + 11; // arrow height
			p.left += (tw - pw) / 2;
			$a.attr('class', 'ui-popup-arrow up hc vt');
			break;
		case 'bottom':
			p.top += th + 11; // arrow height
			var x = p.left + (tw - pw) / 2;
			if (x > $w.scrollLeft()) {
				p.left = x;
				$a.attr('class', 'ui-popup-arrow up hc vt');
			} else {
				p.left += (tw - 50);
				$a.attr('class', 'ui-popup-arrow up hl1 vt');
			}
			break;
		case 'left down':
			p.left -= (pw + 11); // arrow width
			p.top -= 20;
			$a.attr('class', 'ui-popup-arrow rt hr vt1');
			break;
		case 'left up':
			p.left -= (pw + 11); // arrow width
			p.top = p.top - ph + th + 20;
			$a.attr('class', 'ui-popup-arrow rt hr vb1');
			break;
		case 'left middle':
			p.left -= (pw + 11); // arrow width
			p.top -= (ph / 2 - 20);
			$a.attr('class', 'ui-popup-arrow rt hr vm');
			break;
		case 'left':
			p.left -= (pw + 11); // arrow width
			var y = p.top - (ph / 2 - 20);
			if (y > $w.scrollTop()) {
				p.top = y;
				$a.attr('class', 'ui-popup-arrow rt hr vm');
			} else {
				p.top -= 20;
				$a.attr('class', 'ui-popup-arrow rt hr vt1');
			}
			break;
		case 'right down':
			p.left += tw + 11; // arrow width
			p.top -= 20;
			$a.attr('class', 'ui-popup-arrow lt hl vt1');
			break;
		case 'right up':
			p.left += tw + 11; // arrow width
			p.top = p.top - ph + th + 20;
			$a.attr('class', 'ui-popup-arrow lt hl vb1');
			break;
		case 'right middle':
			p.left += tw + 11; // arrow width
			p.top -= (ph / 2 - 20);
			$a.attr('class', 'ui-popup-arrow lt hl vm');
			break;
		case 'right':
			p.left += tw + 11; // arrow width
			var y = p.top - (ph / 2 - 20);
			if (y > $w.scrollTop()) {
				p.top = y;
				$a.attr('class', 'ui-popup-arrow lt hl vm');
			} else {
				p.top -= 20;
				$a.attr('class', 'ui-popup-arrow lt hl vt1');
			}
			break;
		case 'auto':
		default:
			var x = p.left + (pw/2) - $w.scrollLeft(), y = p.top + (ph/2) - $w.scrollTop();
			if (y > $w.height() / 2 && p.top - ph - 11 >= 0) {
				p.top -= (ph + 11); // arrow height
				p.left += (tw - pw) / 2;
				$a.attr('class', 'ui-popup-arrow dn hc vb');
			} else {
				p.top += th + 11; // arrow height
				p.left += (tw - pw) / 2;
				$a.attr('class', 'ui-popup-arrow up hc vt');
			}
			break;
		}

		$p.css({
			position: 'absolute',
			top: p.top + "px",
			left: p.left + "px"
		});
		$a.show();
	}
	
	function _toggle(c, trigger) {
		var $p = $("#" + c.id); 
		if ($p.is(':hidden')) {
			_show(c, trigger);
			return;
		}

		if (c.trigger === trigger) {
			_hide(c);
			return;
		}

		_show(c, trigger);
	}

	function _show(c, trigger) {
		$('.ui-popup').hide();

		var $p = $("#" + c.id).show();

		if (!c.loaded) {
			c.showing = trigger || window;
			__align($p, c.showing, c.position);
			_load(c);
			return;
		}

		c.trigger = trigger || window;
		__align($p, c.trigger, c.position);
		$p.children(".ui-popup-content")
			.hide().css('visibility', 'visible')
			[c.transition || 'slideDown']();

		if (c.trigger !== window && c.clickHide) {
			$(document).click(__click);
		}
	}
	
	function _hide(c) {
		var $p = $('#' + c.id);
		if ($p.is(':visible')) {
			$p.hide();
			$(document).unbind('click', __click);
		}
	}

	function _load(c) {
		var $p = $('#' + c.id), $pc = $p.children(".ui-popup-content");

		$pc.html('<div class="ui-popup-loading"></div>');
		$.ajax({
			url: c.url, 
			data: c.params,
			dataType: 'html',
			method: c.method || 'GET',
			success: function(html) {
				$pc.css('visibility', 'hidden').html(html);
			},
			error: function(xhr, status, err) {
				$pc.css('visibility', 'hidden').html(c, (c.ajaxError || __ajaxError)(xhr, status, err));
			},
			complete: function(xhr, status) {
				c.loaded = true;
				if (c.showing) {
					if ($p.is(':visible')) {
						_show(c, c.showing);
					}
					c.trigger = c.showing;
					delete c.showing;
				}
			}
		});
	}

	function _update(c, o) {
		if (o) {
			$.extend(c, o, { id: c.id });
		}
	}

	function _callback(c, args) {
		if (typeof(c.callback) == 'function') {
			c.callback.apply(window, args);
		}
	}

	function __api(c) {
		return {
			callback: function() {
				_callback(c, arguments);
			},
			update: function(o) {
				_update(o);
				return this;
			},
			load: function() {
				_load(c);
				return this;
			},
			toggle: function(trigger) {
				_toggle(c, trigger || window);
				return this;
			},
			show: function(trigger) {
				_show(c, trigger);
				return this;
			},
			hide: function() {
				_hide(c);
				return this;
			}
		};
	}

	$.popup = function(c) {
		c = c || {};
		if (typeof c == 'string') {
			c = { id: c };
		}
		if (!c.id) {
			c.id = $('.ui-popup:visible').attr('id');
		}
		if (!c.id) {
			return;
		}

		var $p = $('#' + c.id);

		if ($p.length > 0) {
			var o = $p.data('popup');
			c = $.extend(o, c, { id: o.id });
			return __api(c); 
		}

		$p = $('<div class="ui-popup">').attr('id', c.id).css('display', 'none')
			.append($('<div class="ui-popup-arrow">'))
			.append($('<i class="ui-popup-close">&times;</i>'))
			.append($('<div class="ui-popup-content">'))
			.appendTo('body');

		if (c.cssClass) {
			$p.addClass(c.cssClass);
		}

		$p.find('.ui-popup-close').click(function() { _hide(c); });

		$p.data('popup', c);
		if (c.content) {
			$(c.content).detach().appendTo($p.children(".ui-popup-content"));
			c.loaded = true;
			delete c.content;
			return __api(c);
		}

		if (c.autoload && c.url) {
			_load(c);
		}

		return __api(c); 
	};
})(jQuery);
