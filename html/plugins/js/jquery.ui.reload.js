(function($) {
	"use strict";

	$(window).on('load', function() {
		$('[reload]').off('click.reload').on('click.reload', function() {
			location.reload();
			return false;
		});
	});

})(jQuery);
