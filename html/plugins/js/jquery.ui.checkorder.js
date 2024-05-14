(function($) {
	"use strict";

	var E = 'click.checkorder',
		DS = 'dragstart.checkorder',
		DE = 'dragend.checkorder',
		DO = 'dragover.checkorder',
		DL = 'dragleave.checkorder',
		DP = 'drop.checkorder';

	var _d;
	function _dragstart() {
		_d = this;
	}
	function _dragend() {
		_d = null;
	}
	function _dragover(e) {
		e.preventDefault();
		$(this).addClass('dragover');
	}
	function _dragleave() {
		$(this).removeClass('dragover');
	}

	function _drop() {
		if (_d && _d !== this) {
			var $l = $(this), $t = $(this).parent();
			if ($t.children('label').filter(function() { return this === _d; }).length) {
				$(_d).find(':checkbox').prop('checked', $l.find(':checkbox').prop('checked'));
				$(_d).insertBefore($l);
			}
		}
		$(this).removeClass('dragover');
	}

	function _click() {
		var $c = $(this), $l = $c.closest('label'), $h = $c.closest('.ui-checks').find('hr');
		$l.fadeOut(200, function() {
			if ($c.is(':checked')) {
				$l.insertBefore($h);
			} else {
				$l.insertAfter($h);
			}
			$l.fadeIn(200);
		});
	}

	$.fn.checkorder = function() {
		var $t = $(this), $h = $t.find('hr');
		if ($h.length == 0) {
			$t.prepend($('<hr>'));
		}
		$t.off('.checkorder')
			.on(E, ":checkbox", _click)
			.on(DS, "label", _dragstart)
			.on(DE, "label", _dragend)
			.on(DO, "label", _dragover)
			.on(DL, "label", _dragleave)
			.on(DP, "label", _drop);
		$t.children('label').prop('draggable', true);
	}

	// ==================
	$(window).on('load', function() {
		$('.ui-checks.ordered').checkorder();
	});
})(jQuery);
