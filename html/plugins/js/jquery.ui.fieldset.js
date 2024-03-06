(function($) {
	"use strict";

	function _collapse($f, t) {
		t = t || $f.data('fieldset').hideTransition || 'slideUp'; 
		$f.addClass('collapsed')
			.trigger('collapse.fieldset')
			.children(':not(legend)')[t](function() {
				$f.trigger('collapsed.fieldset');
			});
	}

	function _expand($f, t) {
		t = t || $f.data('fieldset').showTransition || 'slideDown';
		$f.removeClass('collapsed')
			.trigger('expand.fieldset')
			.children(':not(legend)')[t](function() {
				$f.trigger('expanded.fieldset');
			});
	}

	function collapse($f, t) {
		if (!$f.hasClass('collapsed')) {
			_collapse($f, t);
		}
	}

	function expand($f, t) {
		if ($f.hasClass('collapsed')) {
			_expand($f, t);
		}
	}

	function toggle($f) {
		$f.hasClass('collapsed') ? _expand($f) : _collapse($f);
	}

	function _on_legend_click() {
		toggle($(this).closest('fieldset'));
	}

	function _init($f, c) {
		c = $.extend({}, $.fieldset.defaults, c);

		var h = c.collapsed || $f.hasClass('collapsed');

		$f.data('fieldset', c).addClass('ui-fieldset' + (h ? ' collapsed' : ''));
		$f.children('legend').on('click', _on_legend_click);
		$f.children(':not(legend)')[h ? 'hide' : 'show']();
	}

	var api = {
		collapse: collapse,
		expand: expand,
		toggle: toggle
	};

	$.fieldset = {
		defaults: {
			showTransition: 'slideDown',
			hideTransition: 'slideUp'
		}
	};

	$.fn.fieldset = function(c) {
		var args = [].slice.call(arguments);

		return this.each(function() {
			var $f = $(this);
			if (typeof (c) == 'string') {
				if (!$f.data('fieldset')) {
					_init($f);
				}
				args[0] = $f;
				api[c].apply($f, args);
				return;
			}

			_init($f, c);
		});
	};

	// FIELDSET DATA-API
	// ==================
	$(window).on('load', function() {
		$('[data-spy="fieldset"]').fieldset();
	});
})(jQuery);
