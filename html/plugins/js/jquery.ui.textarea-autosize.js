(function($) {
	"use strict";

	function _autosize() {
		var $t = $(this);
		$t.css('height', 'auto').outerHeight($t.prop('scrollHeight'));
	}

	var evts = 'input.autosize change.autosize';
	$.fn.autosize = function() {
		return $(this).off(evts).on(evts, _autosize).css({
			'overflow-y': 'hidden',
			'resize': 'none'
		}).trigger('input');
	};

	$(window).on('load', function() {
		$('textarea[autosize]').autosize();
	});

})(jQuery);
