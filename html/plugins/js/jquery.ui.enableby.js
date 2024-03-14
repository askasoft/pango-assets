(function($) {
	"use strict";

	$.fn.enableby = function(s) {
		$(this).each(function() {
			var $a = $(this),
				b = s || $a.attr('enableby'),
				t = b, f = '',
				i = b.indexOf(' ');

			if (i > 0) {
				t = b.substring(0, i);
				f = b.substring(i+1);
			}

			if ($(b).length) {
				$(t).on('change', f, function() {
					$a.prop('disabled', $(b).filter(':checked').length == 0);
				});
				
				$(b).first().trigger('change');
			} else {
				$a.prop('disabled', true);
			}
		});
	};


	// ==================
	$(window).on('load', function() {
		$('[enableby]').enableby();
	});
})(jQuery);
