(function($) {
	"use strict";

	var E = 'click.checkorder';

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
		$t.find(":checkbox").off(E).on(E, _click);
	}

	// ==================
	$(window).on('load', function() {
		$('.ui-checks.ordered').checkorder();
	});
})(jQuery);
