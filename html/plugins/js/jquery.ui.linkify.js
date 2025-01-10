(function($) {
	"use strict";

	$.linkify = function(s, c) {
		c = $.extend({}, $.linkify.defaults, c);
		return s.replace(c.regexp, '<a href="$1" target="' + c.target + '">' + c.prepend + '$1' + c.append + '</a>');
	};
	
	$.linkify.defaults = {
		// URLs starting with http://, https://
		regexp: /(\bhttps?:\/\/[\w!\?\/\+\-_~=;\.,\*&@#\$%\(\)'\[\]]+)/gim,
		target: '_blank',
		prepend: '',
		append: ''
	};

	$.fn.linkify = function(c) {
		return this.each(function() {
			var $t = $(this), h = $.linkify($t.html(), c);
			$t.html(h).removeAttr('linkify');
		});
	};


	// ==================
	$(window).on('load', function() {
		$('[linkify]').linkify();
	});
})(jQuery);
