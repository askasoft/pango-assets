(function($) {
	"use strict";

	var ws = /[\s\u0085\u00a0\u2000\u3000]/g;

	function split(s) {
		var ss = s.split(ws), rs = [];
		for (var i = 0; i < ss.length; i++) {
			if (ss[i].length) {
				rs.push(ss[i])
			}
		}
		return rs;
	}

	function index_any(s, ks) {
		var i = 0;
		while (s.length > 0) {
			for (var j = 0; j < ks.length; j++) {
				if (s.substring(0, ks[j].length) == ks[j]) {
					return [i, ks[j]]
				}
			}
			s = s.substring(1);
			i++;
		}
		return false;
	}

	function markup(node, c) {
		switch (node.nodeType) {
		case 3: // Text Node
			var r = index_any(node.nodeValue, c.markups);
			if (r) {
				var m = node.splitText(r[0]);
				m.splitText(r[1].length);
				$(m).wrap(c.wrap);
				return 1;
			}
			break;
		case 1: // Element Node
			if (node.childNodes && !c.ignore.test(node.tagName)) {
				for (var i = 0; i < node.childNodes.length; i++) {
					i += markup(node.childNodes[i], c);
				}
			}
			break;
		}
		return 0;
	}

	$.markup = {
		defaults: {
			ignore: /(script|style|mark)/i,
			wrap: '<mark></mark>',
		}
	};

	$.fn.markup = function(o) {
		if (typeof(o) == 'string') {
			o = { markup: o };
		}
		return this.each(function() {
			var $t = $(this), c = $.extend({}, $.markup.defaults, o);

			c.markups ||= split(c.markup || $t.attr('markup') || '');
			if (c.markups.length) {
				markup(this, c);
			}
			$t.removeAttr('markup');
		});
	};


	// ==================
	$(window).on('load', function() {
		$('[markup]').markup();
	});
})(jQuery);
