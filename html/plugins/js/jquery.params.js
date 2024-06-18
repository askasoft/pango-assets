(function($) {
	"use strict";

	function get_search(s) {
		var i = s.indexOf('#');
		if (i >= 0) {
			s = s.substring(0, i);
		}

		i = s.indexOf('?');
		if (i >= 0) {
			s = s.substring(i + 1);
		}
		return s;
	}

	$.queryArrays = function(s, f) {
		var qa = [], ss = get_search(s).split('&');

		for (var i = 0; i < ss.length; i++) {
			var p = ss[i].split('='),
				k = decodeURIComponent(p[0]),
				v = p.length > 1 ? decodeURIComponent(p[1]) : '';

			if (!f || f == k) {
				qa.push({
					name: k,
					value: v
				});
			}
		}
		return qa;
	};

	$.queryParams = function(s) {
		var qs = {}, ss = get_search(s).split('&');

		for (var i = 0; i < ss.length; i++) {
			var p = ss[i].split('='),
				k = decodeURIComponent(p[0]),
				v = p.length > 1 ? decodeURIComponent(p[1]) : '';
			if (k in qs) {
				if (!$.isArray(qs[k])) {
					qs[k] = [ qs[k] ];
				}
				qs[k].push(v);
			} else {
				qs[k] = v;
			}
		}
		return qs;
	};

})(jQuery);
