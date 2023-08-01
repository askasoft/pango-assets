(function($) {
	"use strict";

	var _cssHidden = {
		position: 'absolute',
		top: '-9999px',
		left: '-9999px'
	};

	var _xhrOK = (function() {
		var input = document.createElement('input'),
			xhr = new XMLHttpRequest();
		input.type = 'file';
		return ('multiple' in input)
			&& typeof (xhr.upload) != 'undefined'
			&& typeof (FileList) != 'undefined'
			&& typeof (File) != 'undefined';
	})();

	function addFiles(fs, fadd) {
		if (fs) {
			if (typeof (fs) == "string") {
				fs = $(fs);
			}

			if ($.isArray(fs)) {
				$.each(fs, function(i, f) {
					fadd(f);
				});
			} else {
				$.each(fs, function(n, f) {
					if ($.isArray(f)) {
						$.each(f, function(i, f) {
							fadd(f, n);
						});
					} else {
						fadd(f, n);
					}
				});
			}
		}
	}

	function addParams(ps, padd) {
		if (ps) {
			function _addParams(n, v) {
				if ($.isArray(v)) {
					$.each(v, function(i, v) {
						padd(n, v);
					});
				} else {
					padd(n, v);
				}
			}

			if ($.isArray(ps)) {
				$.each(ps, function(i, d) {
					_addParams(d.name, d.value);
				});
			} else {
				$.each(ps, function(n, v) {
					_addParams(n, v)
				});
			}
		}
	}

	// jquery ajax wrapper
	function ajax(s) {
		var data = new FormData();

		addParams(s.data, function(n, v) {
			data.append(n, v);
		});

		addFiles(s.file, function(f, n) {
			if (f instanceof FileList) {
				$.each(f, function(i, f) {
					data.append(n, f);
				});
				return;
			}

			if (f instanceof File) {
				data.append(n, f);
				return;
			}

			var $f = $(f);
			n = n || $f.attr('name');
			$.each($f.prop('files'), function(i, f) {
				data.append(n, f);
			});
		});

		s = $.extend({}, s, {
			cache: false,
			contentType: false,
			processData: false,
			data: data
		});
		delete s.file;

		var xhr = $.ajaxSettings.xhr();
		var ufp = s.uprogress, dfp = s.dprogress;
		if (ufp || dfp) {
			if (ufp) {
				xhr.upload.addEventListener('progress', function(e) {
					if (e.lengthComputable) {
						ufp(e.loaded, e.total);
					}
				});
				delete s.uprogress;
			}

			if (dfp) {
				xhr.addEventListener('progress', function(e) {
					if (e.lengthComputable) {
						dfp(e.loaded, e.total);
					}
				});
				delete s.dprogress;
			}
		}

		xhr.addEventListener('readystatechange', function(e) {
			switch (xhr.readyState) {
			case XMLHttpRequest.HEADERS_RECEIVED:
				var cd = xhr.getResponseHeader('Content-Disposition');
				if (cd) {
					xhr.responseType = 'arraybuffer';
					var cds = cd.split(';');
					$.each(cds, function(i, v) {
						var sp = v.indexOf('=');
						if (sp > 0) {
							let k = v.substring(0, sp).trim().toLowerCase();
							if (k == 'filename' || k == 'filename*') {
								var fn = v.substring(sp+1).trim();
								if (fn.length > 1 && fn.charAt(0) == '"' && fn.charAt(fn.length-1) == '"') {
									fn = fn.substring(1, fn.length-1);
								}
								if (k == 'filename*') {
									var cp = fn.indexOf("''");
									if (sp >= 0) {
										fn = fn.substring(cp + 2);
									}
								}
								fn = decodeURIComponent(fn);
								if (!xhr.download || k == 'filename*') {
									xhr.download = fn;
								}
							}
						}
					});
					if (!xhr.download) {
						xhr.download = cd;
					}
				}
				break;
			case XMLHttpRequest.DONE:
				if (xhr.download) {
					var blob = new Blob([xhr.response]),
						url = window.URL.createObjectURL(blob),
						$a = $('<a>', { download: xhr.download, href: url }).css(_cssHidden);
					
					$('body').append($a);
					$a.get(0).click();
					setTimeout(function() {
						window.URL.revokeObjectURL(url);
						$a.remove();
					}, 200);
				}
				break;
			}
		});
		s.xhr = function() {
			return xhr;
		};

		return $.ajax(s);
	}

	function createIFrame(s) {
		var id = "ajaf_if_" + s.id;
		return $('<iframe>', { id: id, name: id, src: s.secureUrl }).css(_cssHidden).appendTo('body');
	}

	function createForm(s) {
		var id = 'ajaf_form_' + s.id;

		var $form = $('<form>', {
			id: id,
			name: id,
			action: s.url,
			method: s.method,
			target: 'ajaf_if_' + s.id
		}).css(_cssHidden).appendTo('body');

		addParams(s.data, function(n, v) {
			$('<input type="hidden">')
				.attr('name', n)
				.val(v)
				.appendTo($form);
		});

		$form.files = [];
		if (s.file) {
			$form.attr({
				method: 'POST',
				encoding: 'multipart/form-data',
				enctype: 'multipart/form-data'
			});

			addFiles(s.file, function(f, n) {
				var $f = $(f), $c = $f.clone().insertAfter($f);

				n = n || $f.attr('name');
				$f.attr({
					id: '',
					name: n
				}).appendTo($form);

				$form.files.push({ real: $f, copy: $c });
			});
		}

		return $form;
	}

	function httpData(xhr, type) {
		var data = type == "xml" ? xhr.responseXML : xhr.responseText;

		switch (type) {
		case "script":
			// If the type is "script", eval it in global context
			$.globalEval(data);
			break;
		case "json":
			// Get the JavaScript object, if JSON is used.
			data = $.parseJSON(data);
			break;
		case "html":
			// evaluate scripts within html
			$("<div>").html(data).evalScripts();
			break;
		}

		return data;
	}

	function ajaf(s) {
		s = $.extend({
			method: 'POST',
			forceAjaf: false,
			forceAjax: false
		}, s);

		if (s.forceAjax || ((_xhrOK) && !s.forceAjaf)) {
			return ajax(s);
		}

		s = $.extend({
			id: new Date().getTime(),
			secureUrl: 'javascript:false',
		}, s);

		var $if = createIFrame(s),
			$form = createForm(s),
			done = false, xhr = {};

		// Wait for a response to come back
		function callback(timeout) {
			if (done) {
				return;
			}
			done = true;

			var status = timeout == "timeout" ? "error" : "success";
			try {
				var ioe = $if.get(0);
				var doc = ioe.contentWindow.document || ioe.contentDocument || window.frames[ioe.id].document;
				if (doc && doc.body) {
					if (s.selector) {
						xhr.responseText = $(doc.body).find(s.selector).html();
					} else {
						var fc = doc.body.firstChild;
						var tn = (fc && fc.tagName) ? fc.tagName.toUpperCase() : "";
						if (tn == "TEXTAREA") {
							xhr.responseText = fc.value;
						} else if (tn == "PRE") {
							xhr.responseText = $(fc).text();
						} else {
							xhr.responseText = doc.body.innerHTML;
						}
					}
				}
				xhr.responseXML = (doc && doc.XMLDocument) ? doc.XMLDocument : doc;
			} catch (e) {
				status = "error";
				if (s.error) {
					s.error(xhr, status, e);
				}
			}

			// Recover real files
			$.each($form.files, function(i, f) {
				f.real.attr({
					id: f.copy.attr('id'),
					name: f.copy.attr('name')
				}).insertAfter(f.copy);
				f.copy.remove();
			});
			$form.remove();

			switch (status) {
			case "timeout":
				if (s.error) {
					s.error(xhr, status);
				}
				break;
			case "success":
				// Make sure that the request was successful or not modified
				try {
					// process the data (runs the xhr through httpData regardless of callback)
					var data = httpData(xhr, s.dataType);

					// If a local callback was specified, fire it and pass it the data
					if (s.success) {
						s.success(data, xhr);
					}
				} catch (e) {
					if (s.error) {
						s.error(xhr, status, e);
					}
				}
				break;
			}

			try {
				// The request was completed
				if (s.complete) {
					s.complete(xhr, status);
				}
			} finally {
				//clear up the created iframe after file uploaded.
				$if.unbind();
				setTimeout(function() {
					$if.remove();
				}, 100);
				xhr = null;
			}
		};

		// timeout checker
		if (s.timeout > 0) {
			setTimeout(function() {
				// Check to see if the request is still happening
				if (!done) {
					callback("timeout");
				}
			}, s.timeout);
		}

		// fake progress
		var fudp = s.uprogress || s.dprogress;
		if (fudp) {
			var loaded = 0;
			function _fake_progress() {
				fudp(loaded < 95 ? ++loaded : loaded, 100);
				if (!done) {
					setTimeout(_fake_progress, 10 + loaded);
				}
			}
			setTimeout(_fake_progress, 10);
		}

		if (s.beforeSend) {
			s.beforeSend(xhr, s);
		}

		// submit
		try {
			$form.submit();
		} catch (e) {
			if (s.error) {
				s.error(xhr, "send", e);
			}
		}

		$if.on('load', callback);
		return xhr;
	};

	$.ajaf = ajaf;

})(jQuery);

(function($) {
	"use strict";

	$.copyToClipboard = function(s) {
		if (window.clipboardData) {
			// ie
			clipboardData.setData('Text', s);
			return;
		}

		var $t = $('<textarea>')
			.css({ width: 0, height: 0 })
			.text(s)
			.appendTo('body');

		$t.get(0).select();

		document.execCommand('copy');

		$t.remove();
	};
})(jQuery);

/**
 * Cookie plugin
 *
 * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

/**
 * Create a cookie with the given name and value and other optional parameters.
 *
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Set the value of a cookie.
 * @example $.cookie('the_cookie', 'the_value', { expires: 7, path: '/', domain: 'jquery.com', secure: true });
 * @desc Create a cookie with all available options.
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Create a session cookie.
 * @example $.cookie('the_cookie', null);
 * @desc Delete a cookie by passing null as value. Keep in mind that you have to use the same path and domain
 *       used when the cookie was set.
 *
 * @param String name The name of the cookie.
 * @param String value The value of the cookie.
 * @param Object options An object literal containing key/value pairs to provide optional cookie attributes.
 * @option Number|Date expires Either an integer specifying the expiration date from now on in days or a Date object.
 *                             If a negative value is specified (e.g. a date in the past), the cookie will be deleted.
 *                             If set to null or omitted, the cookie will be a session cookie and will not be retained
 *                             when the the browser exits.
 * @option String path The value of the path atribute of the cookie (default: path of page that created the cookie).
 * @option String domain The value of the domain attribute of the cookie (default: domain of page that created the cookie).
 * @option Boolean secure If true, the secure attribute of the cookie will be set and the cookie transmission will
 *                        require a secure protocol (like HTTPS).
 * @type undefined
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */

/**
 * Get the value of a cookie with the given name.
 *
 * @example $.cookie('the_cookie');
 * @desc Get the value of a cookie.
 *
 * @param String name The name of the cookie.
 * @return The value of the cookie.
 * @type String
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */

(function($) {
	"use strict";

	$.cookie = function(name, value, options) {
		options = $.extend({}, $.cookie.defaults, options);
		if (typeof value != 'undefined') { // name and value given, set cookie
			if (value === null) {
				value = '';
				options.expires = -1;
			}
			var expires = '';
			if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
				var date;
				if (typeof options.expires == 'number') {
					date = new Date();
					date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
				} else {
					date = options.expires;
				}
				expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
			}
			// NOTE Needed to parenthesize options.path and options.domain
			// in the following expressions, otherwise they evaluate to undefined
			// in the packed version for some reason...
			var path = options.path ? '; path=' + (options.path) : '';
			var domain = options.domain ? '; domain=' + (options.domain) : '';
			var secure = options.secure ? '; secure' : '';
			document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
		} else { // only name given, get cookie
			var cookieValue = null;
			if (document.cookie && document.cookie != '') {
				var cookies = document.cookie.split(';');
				for (var i = 0; i < cookies.length; i++) {
					var cookie = cookies[i].replace(/^[\s\u3000\u0022]+|[\s\u3000\u0022]+$/g, '');
					// Does this cookie string begin with the name we want?
					if (cookie.substring(0, name.length + 1) == (name + '=')) {
						cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
						break;
					}
				}
			}
			return cookieValue;
		}
	};

	$.cookie.defaults = {};

	$.jcookie = function(name, value, options) {
		if (typeof value != 'undefined') { // name and value given, set cookie
			$.cookie(name, btoa(JSON.stringify(value)), options);
		} else {
			try {
				return JSON.parse(atob($.cookie(name)));
			} catch (ex) {
				return {};
			}
		}
	};

})(jQuery);

(function($) {
	"use strict";

	$.fn.disable = function(state) {
		return this.each(function() {
			this.disabled = state;
		});
	};
})(jQuery);
(function($) {
	"use strict";

	$.jcss = function(url) {
		if ($('link[href="' + url + '"]').size()) {
			return false;
		}
		$('<link>').attr({ type: 'text/css', rel: 'stylesheet', href: url }).appendTo('head');
		return true;
	};
})(jQuery);

(function($) {
	"use strict";

	var jss = {};

	$.jscript = function(url, callback) {
		if (jss[url]) {
			return false;
		}

		$.getScript(url, callback);
		return true;
	};

	// enable script cache
	$.enableScriptCache = function() {
		$.ajaxPrefilter(function(options, org, xhr) {
			if (options.dataType == 'script' || org.dataType == 'script') {
				options.cache = true;
			}
		});
	}
})(jQuery);

(function($) {
	"use strict";

	$.queryArrays = function(s, f) {
		var qs = [], i = s.indexOf('#');
		if (i >= 0) {
			s = s.substring(0, i);
		}

		i = s.indexOf('?');
		if (i >= 0) {
			s = s.substring(i + 1);
		}

		var ss = s.split('&');
		for (i = 0; i < ss.length; i++) {
			var pv = ss[i].split('=');
			var n = decodeURIComponent(pv[0]);
			if (f == null || f == n) {
				qs.push({
					name: n,
					value: pv.length > 1 ? decodeURIComponent(pv[1]) : ''
				});
			}
		}
		return qs;
	};

	$.queryParams = function(s) {
		var qs = {}, i = s.indexOf('#');
		if (i >= 0) {
			s = s.substring(0, i);
		}

		i = s.indexOf('?');
		if (i >= 0) {
			s = s.substring(i + 1);
		}

		var ss = s.split('&');
		for (i = 0; i < ss.length; i++) {
			var pv = ss[i].split('=');
			var n = decodeURIComponent(pv[0]);
			qs[n] = pv.length > 1 ? decodeURIComponent(pv[1]) : '';
		}
		return qs;
	};

	$.addQueryParams = function(u, p) {
		var i = u.indexOf('#');
		if (i >= 0) {
			u = u.substring(0, i);
		}

		i = u.indexOf('?');
		if (i >= 0) {
			p = $.extend($.queryParams(u), p);
			u = u.substring(0, i);
		}
		return u + '?' + $.param(p);
	};

})(jQuery);
(function($) {
	"use strict";

	$.fn.replaceClass = function(s, t) {
		return this.removeClass(s).addClass(t);
	};
})(jQuery);
(function($) {
	"use strict";

	function collapse($f, t) {
		if (!$f.hasClass('collapsed')) {
			$f.addClass('collapsed').children(':not(legend)')[t || 'slideUp']();
		}
	}

	function expand($f, t) {
		if ($f.hasClass('collapsed')) {
			$f.removeClass('collapsed').children(':not(legend)')[t || 'slideDown']();
		}
	}

	$.fn.fieldset = function(config, transition) {
		config = config || {};
		return this.each(function() {
			var $f = $(this);
			if (!$f.data('fieldset')) {
				var $l = $f.children('legend'), c = config.collapsed && !($f.hasClass('collapsed'));
				$f.data('fieldset', config).addClass('ui-fieldset' + (c ? ' collapsed' : ''));
				$l.click(function() {
					var $f = $(this).closest('fieldset');
					if ($f.hasClass('collapsed')) {
						expand($f);
					} else {
						collapse($f);
					}
				});

				c = $f.hasClass('collapsed');
				$f.children(':not(legend)')[c ? 'hide' : 'show']();
			}

			switch (config) {
			case 'collapse':
				collapse($f, transition);
				break;
			case 'expand':
				expand($f, transition);
				break;
			}
		});
	};

	// FIELDSET DATA-API
	// ==================
	$(window).on('load', function() {
		$('[data-spy="fieldset"]').fieldset();
	});
})(jQuery);
(function($) {
	"use strict";

	$.fn.focusme = function() {
		var f = false;
		$(this).each(function() {
			var $i = $(this);
			if (f) {
				$i.removeAttr('focusme');
				return;
			}

			var a = $i.attr('focusme');
			$i.removeAttr('focusme');

			var $a;
			if (a == 'true') {
				$a = $i.find('input,select,textarea,button').not(':hidden,:disabled,[readonly]').eq(0);
				if ($a.length < 1) {
					$a = $i.find('a').not(':hidden,:disabled').eq(0);
					if ($a.length < 1) {
						$a = $i;
					}
				}
			} else if (a != '' && a != 'false') {
				$a = $i.find(a).eq(0);
			}
			
			if ($a && $a.length) {
				f = true;
				var $w = $(window), st = $w.scrollTop(), sl = $w.scrollLeft();
				$a.focus();
				$(window).scrollTop(st).scrollLeft(sl);
			}
		});
	};

	$(window).on('load', function() {
		$('[focusme="true"]').focusme();
	});

})(jQuery);
(function($) {
	"use strict";

	$(window).on('load', function() {
		$('input[data-action], button[data-action]').off('click.action').on('click.action', function() {
			$(this).closest('form').attr('action', $(this).data('action'));
		});
	});

})(jQuery);

(function($) {
	"use strict";

	$.fn.changeValue = function(v) {
		var o = this.val();

		this.val(v);
		if (o != v) {
			this.trigger('change');
		}
	};

	$.fn.values = function(vs, trigger) {
		if (vs) {
			for (var n in vs) {
				var v = vs[n];
				this.find(':input[name="' + n + '"]').each(function() {
					var $t = $(this);
					switch ($t.attr('type')) {
					case 'button':
					case 'file':
					case 'submit':
					case 'reset':
						break;
					case 'checkbox':
						var va = $.isArray(v) ? v : [ v ];
						var oc = $t.prop('checked'), nc = $.inArray($t.val(), va) >= 0;
						$t.prop('checked', nc);
						if (trigger && nc != oc) {
							$t.trigger('change');
						}
						break;
					case 'radio':
						var oc = $t.prop('checked'), nc = ($t.val() == v);
						$t.prop('checked', nc);
						if (trigger && nc && !oc) {
							$t.trigger('change');
						}
						break;
					default:
						trigger ? $t.changeValue(v) : $t.val(v);
						break;
					}
				});
			}
			return this;
		}

		var m = {}, a = this.serializeArray();
		$.each(a, function(i, v) {
			var ov = m[v.name];
			if (ov === undefined) {
				m[v.name] = v.value;
				return;
			}
			if ($.isArray(ov)) {
				ov.push(v.value);
				return;
			}
			m[v.name] = [ov, v.value];
		});
		return m;
	};

})(jQuery);

/**
 * jQuery lightbox plugin
 * This jQuery plugin was inspired and based on 
 *  Lightbox 2 by Lokesh Dhakar (http://www.huddletogether.com/projects/lightbox2/)
 *  jQuery LightBox by Leandro Vieira Pinho (http://leandrovieira.com/projects/jquery/lightbox/)
 */

(function($) {
	"use strict";

	$.lightbox = {
		// Event to bind
		bindEvent: 'click.lightbox',

		// Configuration related to overlay
		overlayBgColor: '#000',		// (string) Background color to overlay; inform a hexadecimal value like: #RRGGBB. Where RR, GG, and BB are the hexadecimal values for the red, green, and blue values of the color.
		overlayOpacity: 0.8,		// (integer) Opacity value to overlay; inform: 0.X. Where X are number from 0 to 9

		// Configuration related to navigation
		fixedNavigation: false,		// (boolean) Boolean that informs if the navigation (next and prev button) will be fixed or not in the interface.
		loopNavigation: false,		// (boolean) Boolean that loop the navigation.

		// Configuration related to images
		textBtnPrev: '&lsaquo;',		// (string) the text of prev button
		textBtnNext: '&rsaquo;',		// (string) the text of next button
		textBtnClose: '&times;',		// (string) the text of close button

		// Configuration related to container image box
		containerBorderSize: 10,			// (integer) If you adjust the padding in the CSS for the container, #lightbox-imagebox, you will need to update this value
		containerResizeSpeed: 400,		// (integer) Specify the resize duration of container image. These number are miliseconds. 400 is default.

		// Configuration related to texts in caption. For example: 'Image # / $' -> 'Image 2 of 8'.
		textPager: '# / $',	// (string) #: Image No.  $: Total Images

		// Configuration related to keyboard navigation
		keyToClose: 'c',		// (string) (c = close) Letter to close the jQuery lightbox interface. Beyond this letter, the letter X and the SCAPE key is used to.
		keyToPrev: 'p',		// (string) (p = previous) Letter to show the previous image
		keyToNext: 'n'		// (string) (n = next) Letter to show the next image.
	};

	/**
	 * $ is an alias to jQuery object
	 */
	$.fn.lightbox = function(settings) {
		// Settings to configure the jQuery lightbox plugin how you like
		settings = $.extend({}, $.lightbox, settings);

		// Caching the jQuery object with all elements matched
		var $jos = this; // This, in this context, refer to jQuery object

		/**
		 * Initializing the plugin calling the start function
		 *
		 * @return boolean false
		 */
		function _initialize() {
			_start(this, $jos); // This, in this context, refer to object (link) which the user have clicked
			return false; // Avoid the browser following the link
		}

		/**
		 * Start the jQuery lightbox plugin
		 *
		 * @param object objClicked The object (link) whick the user have clicked
		 * @param object $jos The jQuery object with all elements matched
		 */
		function _start(objClicked, $jos) {
			$('body').addClass('lightbox-open');

			// Call the function to create the markup structure; style some elements; assign events in some elements.
			_set_interface();

			// Unset image active information
			settings.images = [];
			settings.active = 0;

			// Add an Array (as many as we have), with href and title atributes, inside the Array that storage the images references		
			for (var i = 0; i < $jos.length; i++) {
				var el = $jos[i];
				if (el.tagName == 'A') {
					settings.images.push([el.getAttribute('href'), el.getAttribute('title')]);
				} else if (el.tagName == 'IMG') {
					settings.images.push([el.getAttribute('src'), el.getAttribute('alt')]);
				}
				if (el == objClicked) {
					settings.active = i;
				}
			}

			// Call the function that prepares image exibition
			_set_image_to_view();
		}

		/**
		 * Create the jQuery lightbox plugin interface
		 */
		function _set_interface() {
			// Apply the HTML markup into body tag
			$('body').append('<div id="lightbox-overlay"></div>'
				+ '<div id="lightbox-lightbox">'
				+ '<div id="lightbox-imagebox">'
				+ '<img id="lightbox-image">'
				+ '<div style="" id="lightbox-nav">'
				+ '<a href="#" id="lightbox-btn-prev">'
				+ '<span id="lightbox-txt-prev">' + settings.textBtnPrev + '</span>'
				+ '</a>'
				+ '<a href="#" id="lightbox-btn-next">'
				+ '<span id="lightbox-txt-next">' + settings.textBtnNext + '</span>'
				+ '</a>'
				+ '</div>'
				+ '<a href="#" id="lightbox-loading"></a>'
				+ '</div>'
				+ '<div id="lightbox-statusbox">'
				+ '<div id="lightbox-image-caption"></div>'
				+ '<div id="lightbox-image-number"></div>'
				+ '<a href="#" id="lightbox-btn-close">' + settings.textBtnClose + '</a>'
				+ '</div>'
				+ '</div>');

			// Style overlay and show it
			$('#lightbox-overlay').css({
				backgroundColor: settings.overlayBgColor,
				opacity: settings.overlayOpacity,
			}).fadeIn();

			// set lightbox-imagebox line-height to center image
			_on_resize();

			// Assigning click events in elements to close overlay
			$('#lightbox-overlay, #lightbox-lightbox').click(_finish);

			// Assign the _finish function to lightbox-loading and lightbox-btn-close objects
			$('#lightbox-loading, #lightbox-btn-close').click(_finish);

			// Assign the prev/next handler to prev/next button
			$('#lightbox-btn-prev').click(_on_prev);
			$('#lightbox-btn-next').click(_on_next);

			// If window was resized, calculate the new overlay dimensions
			$(window).on('resize', _on_resize);

			// Enable keyboard navigation
			$(document).keydown(_keyboard_action);
		}

		/**
		 * set lightbox-imagebox line-height to center image
		 */
		function _on_resize() {
			$('#lightbox-imagebox').css('line-height', ($('#lightbox-imagebox').innerHeight() - 2) + 'px');
		}

		/**
		 * navigate to prev image
		 */
		function _on_prev() {
			if (settings.images.length < 1) {
				return true;
			}

			if (settings.active > 0) {
				settings.active--;
				_set_image_to_view();
				return false;
			}

			if (settings.loopNavigation) {
				settings.active = settings.images.length - 1;
				_set_image_to_view();
				return false;
			}
		}

		/**
		 * navigate to next image
		 */
		function _on_next() {
			if (settings.images.length < 1) {
				return true;
			}

			if (settings.active < settings.images.length - 1) {
				settings.active++;
				_set_image_to_view();
				return false;
			}

			if (settings.loopNavigation) {
				settings.active = 0;
				_set_image_to_view();
				return false;
			}
		}

		/**
		 * Prepares image exibition; doing a image's preloader to calculate it's size
		 */
		function _set_image_to_view() {
			// Show the loading
			$('#lightbox-loading').show();
			$('#lightbox-image, #lightbox-statusbox').hide();
			$('#lightbox-nav')[settings.fixedNavigation ? 'addClass' : 'removeClass']('lightbox-fixed');

			// Image preload process
			var img = new Image();
			img.onload = function() {
				$('#lightbox-image').attr('src', settings.images[settings.active][0]);

				// Perfomance an effect in the image container resizing it
				_show_image();

				//	clear onLoad, IE behaves irratically with animated gifs otherwise
				img.onload = function() { };
			};
			img.src = settings.images[settings.active][0];
		};


		/**
		 * Show the prepared image
		 */
		function _show_image() {
			$('#lightbox-loading').hide();
			$('#lightbox-image').fadeIn(function() {
				_show_image_data();
				_set_navigation();
			});
			_preload_neighbor_images();
		};

		/**
		 * Show the image information
		 */
		function _show_image_data() {
			if (settings.images.length > 0) {
				$('#lightbox-image-caption').html(settings.images[settings.active][1]);

				var tpm = {
					'#': settings.active + 1,
					"$": settings.images.length
				};

				$('#lightbox-image-number').html(settings.textPager.replace(/[\#\$]/g, function(c) {
					return tpm[c];
				}));
			}
			$('#lightbox-statusbox').slideDown('fast');
		}

		/**
		 * Display the button navigations
		 */
		function _set_navigation() {
			// Show the prev button, if not the first image in set
			$('#lightbox-btn-prev')[((settings.loopNavigation && settings.images.length > 1) || settings.active > 0) ? 'addClass' : 'removeClass']('lightbox-has-prev');

			// Show the next button, if not the last image in set
			$('#lightbox-btn-next')[((settings.loopNavigation && settings.images.length > 1) || settings.active < settings.images.length - 1) ? 'addClass' : 'removeClass']('lightbox-has-next');
		}

		/**
		 * Perform the keyboard actions
		 */
		function _keyboard_action(evt) {
			var keycode = evt.keyCode,
				escapeKey = evt.DOM_VK_ESCAPE || 27,
				key = String.fromCharCode(keycode).toLowerCase();

			// Verify the keys to close the ligthBox
			if ((key == settings.keyToClose) || (key == 'x') || (keycode == escapeKey)) {
				return _finish();
			}

			// Verify the key to show the previous image
			if ((key == settings.keyToPrev) || (keycode == 37)) {
				return _on_prev();
			}

			// Verify the key to show the next image
			if ((key == settings.keyToNext) || (keycode == 39)) {
				return _on_next();
			}
		}

		/**
		 * Preload prev and next images being showed
		 */
		function _preload_neighbor_images() {
			if (settings.images.length) {
				var p = settings.active - 1, n = settings.active + 1;
				(new Image()).src = settings.images[p < 0 ? settings.images.length - 1 : p][0];
				(new Image()).src = settings.images[n >= settings.images.length ? 0 : n][0];
			}
		}

		/**
		 * Remove overlay
		 */
		function _remove_overlay() {
			$('#lightbox-overlay').remove();
		}

		/**
		 * Remove jQuery lightbox plugin HTML markup
		 */
		function _finish() {
			$(document).off('keydown', _keyboard_action);
			$(window).off('resize', _on_resize);

			$('#lightbox-lightbox').remove();
			$('#lightbox-overlay').fadeOut(_remove_overlay);

			$('body').removeClass('lightbox-open');
			return false;
		}

		// Return the jQuery object for chaining. The off method is used to avoid click conflict when the plugin is called more than once
		return this.off(settings.bindEvent).on(settings.bindEvent, _initialize);
	};
})(jQuery);
(function($) {
	"use strict";

	function _clearTimeout($el) {
		//if this element has delayed mask scheduled then remove it
		var t = $el.data("_mask_timeout");
		if (t) {
			clearTimeout(t);
			$el.removeData("_mask_timeout");
		}

		//if this element has unmask timeout scheduled then remove it
		t = $el.data("_unmask_timeout");
		if (t) {
			clearTimeout(t);
			$el.removeData("_unmask_timeout");
		}
	}

	function _stopEvent(evt) {
		evt.preventDefault();
		evt.stopPropagation();
	}

	function doMask($el, c) {
		if ($el.isLoadMasked()) {
			unMask($el);
		} else {
			_clearTimeout($el);
		}

		var $lm = $('<div class="ui-loadmask">');
		if (c.cssClass) {
			$lm.addClass(c.cssClass);
		}

		var $ll = $('<div class="ui-loadmask-load">');
		if (c.content) {
			$lm.append($(c.content));
		} else {
			var $li = $('<div class="ui-loadmask-icon">'),
				$lt = $('<div class="ui-loadmask-text">');

			$ll.append($li).append($lt);

			if (c.html || c.text) {
				$ll.addClass('ui-loadmask-hasmsg');
				if (c.html) {
					$lt.html(c.html);
				} else {
					$lt.text(c.text);
				}
			}
			$lm.append($ll);
		}

		if ($el.css("position") == "static") {
			$el.addClass("ui-loadmasked-relative");
		}
		if (c.mask) {
			$el.append($('<div class="ui-loadmask-mask"></div>'));
		}

		$el.append($lm).addClass("ui-loadmasked");

		if (c.timeout > 0) {
			$el.data("_unmask_timeout", setTimeout(function() {
				unMask($el);
			}, c.timeout));
		}
		if (c.keyboard) {
			$el.on('keydown.loadmask', _stopEvent);
		}
	}

	function unMask($el) {
		_clearTimeout($el);

		$el.off('.loadmask');
		$el.find(".ui-loadmask-mask, .ui-loadmask").remove();
		$el.removeClass("ui-loadmasked ui-loadmasked-relative");
	}

	$.loadmask = {
		defaults: {
			cssClass: '',		// css class for the mask element
			mask: true,			// add mask layer
			keyboard: true,		// add keydown event handler for the mask element to prevent input
			delay: 0,			// delay in milliseconds before element is masked. If unloadmask() is called before the delay times out, no mask is displayed. This can be used to prevent unnecessary mask display for quick processes.
			timeout: 0,			// timeout in milliseconds for automatically unloadmask
		}
	};

	/**
	 * Displays loading mask over selected element(s). Accepts both single and multiple selectors.
	 * @param content  html content that will be add to the loadmask
	 * @param html  html message that will be display
	 * @param text  text message that will be display (html tag will be escaped)
	 */
	$.fn.loadmask = function(c) {
		if (typeof (c) == 'string') {
			c = { text: c };
		}
		c = $.extend({}, $.loadmask.defaults, c);
		return this.each(function() {
			var $el = $(this);
			if (c.delay > 0) {
				$el.data("_mask_timeout", setTimeout(function() {
					doMask($el, c);
				}, c.delay));
			}
			else {
				doMask($el, c);
			}
		});
	};

	/**
	 * Removes mask from the element(s). Accepts both single and multiple selectors.
	 */
	$.fn.unloadmask = function() {
		return this.each(function() {
			unMask($(this));
		});
	};

	/**
	 * Checks if a single element is masked. Returns false if mask is delayed or not displayed. 
	 */
	$.fn.isLoadMasked = function() {
		return this.hasClass("ui-loadmasked");
	};
})(jQuery);
// jQuery Nice Select - v1.1.0
// https://github.com/hernansartorio/jquery-nice-select
// Made by Hernán Sartorio
// Modified by Frank Wang

(function($) {
	"use strict";

	function __document_click(evt) {
		if ($(evt.target).closest('.ui-nice-select').length === 0) {
			$('.ui-nice-select').removeClass('open');
		}
	}

	function __dropdown_keydown(evt) {
		var $dropdown = $(this);
		var $focused_option = $($dropdown.find('.focus') || $dropdown.find('ui li.selected'));

		switch (evt.keyCode) {
		case 32: // Space
		case 13: // Enter
			if ($dropdown.hasClass('open')) {
				$focused_option.trigger('click');
			} else {
				$dropdown.trigger('click');
			}
			return false;
		case 40: // Down
			if (!$dropdown.hasClass('open')) {
				$dropdown.trigger('click');
			} else {
				var $next = $focused_option.nextAll('li:not(.disabled)').first();
				if ($next.length > 0) {
					$dropdown.find('.focus').removeClass('focus');
					$next.addClass('focus');
				}
			}
			return false;
		case 38: // Up
			if (!$dropdown.hasClass('open')) {
				$dropdown.trigger('click');
			} else {
				var $prev = $focused_option.prevAll('li:not(.disabled)').first();
				if ($prev.length > 0) {
					$dropdown.find('.focus').removeClass('focus');
					$prev.addClass('focus');
				}
			}
			return false;
		case 27: // Esc
			if ($dropdown.hasClass('open')) {
				$dropdown.trigger('click');
			}
			break;
		case 9: // Tab
			if ($dropdown.hasClass('open')) {
				return false;
			}
		}
	}

	function __dropdown_click(evt) {
		evt.stopPropagation();

		var $dropdown = $(this);

		$('.ui-nice-select').not($dropdown).removeClass('open');
		$dropdown.toggleClass('open');

		if ($dropdown.hasClass('open')) {
			$dropdown.find('li');
			$dropdown.find('.focus').removeClass('focus');
			$dropdown.find('.selected').addClass('focus');

			// Close when clicking outside
			$(document).on('click.nice_select', __document_click);
		} else {
			$dropdown.focus();

			// Unbind existing events in case that the plugin has been initialized before
			$(document).off('.nice_select');
		}
	}

	function __dropdown_option_click() {
		var $option = $(this);
		var $dropdown = $option.closest('.ui-nice-select');

		$dropdown.find('.selected').removeClass('selected');
		$option.addClass('selected');

		var text = $option.data('display') || $option.text();
		$dropdown.find('.current').text(text);

		$dropdown.prev('select').val($option.data('value')).trigger('change');
	}

	function update() {
		this.each(function() {
			var $select = $(this);
			var $dropdown = $select.next('.ui-nice-select');

			if ($dropdown.length) {
				$dropdown.remove();
				create_nice_select($select);

				if ($dropdown.hasClass('open')) {
					$select.next().trigger('click');
				}
			}
		});
	}

	function destroy() {
		this.each(function() {
			var $select = $(this);
			var $dropdown = $select.next('.ui-nice-select');

			if ($dropdown.length) {
				$dropdown.remove();
				$select.css('display', '');
			}
		});
		if ($('.ui-nice-select').length == 0) {
			$(document).off('.nice_select');
		}
	}

	function no_css_pointer_events() {
		// Detect CSS pointer-events support, for IE <= 10. From Modernizr.
		var style = document.createElement('a').style;
		style.cssText = 'pointer-events:auto';
		if (style.pointerEvents !== 'auto') {
			$('html').addClass('ui-nice-select-no-csspointerevents');
		}
	}

	function create_nice_select($select) {
		var $options = $select.find('option'),
			$selected = $select.find('option:selected'),
			$current = $('<span class="current"></span>'),
			$ul = $('<ul></ul>'),
			$dropdown = $('<div></div>')
				.addClass('ui-nice-select')
				.addClass($select.attr('class') || '')
				.addClass($select.attr('disabled') ? 'disabled' : '')
				.attr('tabindex', $select.attr('disabled') ? null : ($select.attr('tabindex') || '0'))
				.append($current, $ul);

		$current.text($selected.data('display') || $selected.text());

		$options.each(function() {
			var $option = $(this);

			$ul.append($('<li></li>')
				.attr('data-value', $option.val())
				.attr('data-display', ($option.data('display') || null))
				.addClass(
					($option.is(':selected') ? ' selected' : '') +
					($option.is(':disabled') ? ' disabled' : ''))
				.text($option.text())
			);
		});

		// Open, close
		$dropdown.click(__dropdown_click);

		// Keyboard events
		$dropdown.keydown(__dropdown_keydown);

		// Option click
		$dropdown.on('click', 'li:not(.disabled)', __dropdown_option_click);

		$select.after($dropdown);
	}

	var api = {
		'update': update,
		'destroy': destroy
	};

	$.fn.niceSelect = function(method) {
		// Methods
		if (typeof method == 'string') {
			api[method].apply(this);
			return this;
		}

		// Hide native select
		this.hide();

		// Create custom markup
		this.each(function() {
			var $s = $(this);
			if ($s.next().hasClass('ui-nice-select')) {
				update.apply($s);
			} else {
				create_nice_select($s);
			}
		});

		return this;
	};

	// niceSelect DATA-API
	// ==================
	$(window).on('load', function() {
		no_css_pointer_events();
		$('[data-spy="niceSelect"]').niceSelect();
	});

})(jQuery);
(function($) {
	var ArrowClasses = {
		'top left': 'dn hr1 vb',
		'top right': 'dn hl1 vb',
		'top center': 'dn hc vb',
		'bottom left': 'up hr1 vt',
		'bottom right': 'up hl1 vt',
		'bottom center': 'up hc vt',
		'left bottom': 'rt hr vt1',
		'left top': 'rt hr vb1',
		'left middle': 'rt hr vm',
		'right bottom': 'lt hl vt1',
		'right top': 'lt hl vb1',
		'right middle': 'lt hl vm'
	};

	function _position($p, $t, position) {
		var tw = $t.outerWidth(), th = $t.outerHeight(), p = $t.offset();
		var pw = $p.outerWidth(), ph = $p.outerHeight();

		switch (position) {
		case 'top left':
			p.top -= (ph + 11);
			p.left -= (pw - 50);
			break;
		case 'top right':
			p.top -= (ph + 11);
			p.left += (tw - 50);
			break;
		case 'top center':
			p.top -= (ph + 11);
			p.left += (tw - pw) / 2;
			break;
		case 'bottom left':
			p.top += th + 11;
			p.left -= (pw - 50);
			break;
		case 'bottom right':
			p.top += th + 11;
			p.left += (tw - 50);
			break;
		case 'bottom center':
			p.top += th + 11;
			p.left += (tw - pw) / 2;
			break;
		case 'left bottom':
			p.left -= (pw + 11);
			p.top -= 20;
			break;
		case 'left top':
			p.left -= (pw + 11);
			p.top += th - ph + 20;
			break;
		case 'left middle':
			p.left -= (pw + 11);
			p.top -= (ph - th) / 2;
			break;
		case 'right bottom':
			p.left += tw + 11;
			p.top -= 20;
			break;
		case 'right top':
			p.left += tw + 11;
			p.top += th - ph + 20;
			break;
		case 'right middle':
			p.left += tw + 11;
			p.top -= (ph - th) / 2;
			break;
		}

		return p;
	}

	function _in_screen($p, p) {
		var $w = $(window),
			wt = $w.scrollTop(), wl = $w.scrollLeft(),
			wb = wt + $w.height(), wr = wl + $w.width(),
			pr = p.left + $p.outerWidth(), pb = p.top + $p.outerHeight();

		return p.left >= wl && p.left <= wr
			&& p.top >= wt && p.top <= wb
			&& pr >= wl && pr <= wr
			&& pb >= wt && pb <= wb;
	}

	function _positions($p, $t, ps) {
		for (var i = 0; i < ps.length; i++) {
			var p = _position($p, $t, ps[i]);
			p.position = ps[i];
			if (_in_screen($p, p)) {
				return p;
			}
			ps[i] = p;
		}
		return ps[0];
	}

	function _center($p, $w) {
		var p = {
			left: $w.scrollLeft() + ($w.outerWidth() - $p.outerWidth()) / 2,
			top: $w.scrollTop() + ($w.outerHeight() - $p.outerHeight()) / 2
		};

		p.left = (p.left < 10 ? 10 : p.left);
		p.top = (p.top < 10 ? 10 : p.top);
		return p;
	}

	function _align($p, trigger, position) {
		$p.css({
			display: 'block',
			visibility: 'hidden'
		});

		var p, ac, $a = $p.find('.ui-popup-arrow').hide();
		if (position == 'center') {
			p = _center($p, $(window));
		} else {
			var $t = $(trigger);

			ac = ArrowClasses[position];
			if (ac) {
				p = _position($p, $t, position);
			} else {
				switch (position) {
				case 'top':
					p = _positions($p, $t, ['top center', 'top left', 'top right']);
					break;
				case 'bottom':
					p = _positions($p, $t, ['bottom center', 'bottom left', 'bottom right']);
					break;
				case 'left':
					p = _positions($p, $t, ['left middle', 'left bottom', 'left top']);
					break;
				case 'right':
					p = _positions($p, $t, ['right middle', 'right bottom', 'right top']);
					break;
				//case 'auto':
				default:
					p = _positions($p, $t, [
						'bottom center', 'bottom left', 'bottom right',
						'right middle', 'right bottom', 'right top',
						'top center', 'top left', 'top right',
						'right middle', 'right bottom', 'right top'
					]);
					break;
				}
				ac = ArrowClasses[p.position];
			}
		}

		$p.css({
			top: p.top,
			left: p.left,
			visibility: 'visible'
		});
		if (ac) {
			$a.attr('class', 'ui-popup-arrow ' + ac).show();
		}
	}

	function _masker() {
		return $('.ui-popup-mask');
	}
	function _active() {
		return $('.ui-popup-wrap:visible>.ui-popup-frame>.ui-popup');
	}
	function _wrapper($c) {
		return $c.parent().parent('.ui-popup-wrap');
	}
	function _data($c) {
		return $c.data('popup');
	}

	function toggle($c, trigger) {
		trigger = trigger || window;
		var $p = _wrapper($c);
		if ($p.is(':hidden')) {
			show($c, trigger);
			return;
		}

		if (_data($c).trigger === trigger) {
			hide($c);
			return;
		}

		show($c, trigger);
	}

	function hide($c) {
		var $p = _wrapper($c);
		if ($p.is(':visible')) {
			$c.trigger('hide.popup');
			$p.hide();
			$(document).off('.popup');
			$(window).off('.popup');
			$c.trigger('hidden.popup');
		}
		_masker().hide();
	}

	function show($c, trigger) {
		hide(_active());

		var $p = _wrapper($c), c = _data($c);

		if (c.mask) {
			_masker().show();
		}

		if (c.loaded || !c.ajax.url) {
			_show($p, $c, c, trigger);
			return;
		}

		c.showing = trigger || window;
		load($c, c);
	}

	function _bind(c) {
		$(document).off('.popup');
		if (c.mouse) {
			$(document).on('click.popup', __doc_click);
		}
		if (c.keyboard) {
			$(document).on('keydown.popup', __doc_keydown);
		}
		if (c.resize) {
			$(window).on('resize.popup', __doc_resize);
		}
	}

	function _show($p, $c, c, trigger) {
		$c.trigger('show.popup');

		$p.find('.ui-popup-closer').toggle(c.closer);

		c.trigger = trigger || window;

		_align($p, c.trigger, c.position);

		$p.children('.ui-popup-frame').hide()[c.transition](function() {
			$c.trigger('shown.popup');
			_bind(c);
		}).focus();
	}

	function __doc_click(evt) {
		if ($(evt.target).closest('.ui-popup-wrap').length) {
			return;
		}
		hide(_active());
	}

	function __doc_keydown(evt) {
		if (evt.keyCode == 27) { // Esc
			hide(_active());
		}
	}

	function __doc_resize() {
		var $c = _active(), $p = _wrapper($c), c = _data($c);
		_align($p, c.trigger, c.position);
	}

	function load($c, c) {
		var $p = _wrapper($c);

		c = $.extend(_data($c), c);

		if (c.loader) {
			$c.html('<div class="ui-popup-loader"></div>');
			_align($p, c.showing, c.position);
		}

		_load($p, $c, c);
	}

	function _load($p, $c, c) {
		var seq = ++c.sequence;

		$p.addClass('loading').find('.ui-popup-closer, .ui-popup-arrow').hide();

		$c.trigger('load.popup');

		$.ajax($.extend({}, c.ajax, {
			success: function(data, status, xhr) {
				if (seq == c.sequence) {
					c.ajaxDone.call($c, data, status, xhr);
					$c.find('[popup-dismiss="true"]').click(function() {
						hide($c);
						return false;
					});
					c.loaded = true;
					$c.trigger('loaded.popup', data);
				}
			},
			error: function(xhr, status, err) {
				if (seq == c.sequence) {
					c.ajaxFail.call($c, xhr, status, err);
					$c.trigger('failed.popup');
				}
			},
			complete: function() {
				$p.removeClass('loading');
				if (seq == c.sequence && c.showing) {
					_show($p, $c, c, c.showing);
					delete c.showing;
				}
			}
		}));
	}

	function _ajaxFail(xhr, status, err) {
		var $c = $(this), $e = $('<div class="ui-popup-error">');

		if (xhr.responseJSON) {
			$e.addClass('json').text(JSON.stringify(xhr.responseJSON, null, 4));
		} else if (xhr.responseText) {
			$e.html(xhr.responseText);
		} else {
			$e.text(err || status || 'Server error!');
		}

		$c.empty().append($e);
	}

	function _ajaxDone(data, status, xhr) {
		$(this).html(xhr.responseText);
	}

	function update($c, c) {
		if (c) {
			c = $.extend(_data($c), c);
			var $p = _wrapper($c);
			if (!$p.is(':hidden')) {
				_bind(c);
				_masker().toggle(c.mask);
			}
		}
	}

	function trigger($c, evt) {
		var a = [].slice.call(arguments, 2);
		$(_data($c).trigger).trigger(evt, a);
	}

	function destroy($c) {
		_wrapper($c).remove();
	}

	function _camelCase(s) {
		s = s.charAt(0).toLowerCase() + s.slice(1);
		return s.replace(/[-_](.)/g, function(m, g) {
			return g.toUpperCase();
		});
	}

	function _options($c) {
		var fs = ['ajax-done', 'ajax-fail'];
		var bs = ['loaded', 'autoload', 'mask', 'loader', 'closer', 'mouse', 'keyboard', 'resize'];

		var c = {};
		$.each($c[0].attributes, function(i, a) {
			var p = a.name.substring(0, 6),
				n = a.name.substring(6),
				v = a.value;

			if ('popup-' != p || !v) {
				return;
			}

			if ($.inArray(n, fs) >= 0) {
				c[_camelCase(n)] = new Function(v);
				return;
			}

			if ($.inArray(n, bs) >= 0) {
				v = (v === 'true');
			}

			if ('ajax-' == n.substring(0, 5)) {
				c.ajax ||= {};
				c.ajax[_camelCase(n.substring(5))] = v;
			} else {
				c[_camelCase(n)] = v;
			}
		});
		return c;
	}

	function _init($c, c) {
		if (_masker().length == 0) {
			$('<div class="ui-popup-mask">').appendTo('body');
		}

		var $p = _wrapper($c);
		if ($p.length) {
			update($c, c);
			return;
		}

		c = $.extend({ sequence: 0 }, $.popup.defaults, _options($c), c);

		var $f = $('<div class="ui-popup-frame" tabindex="0">')
			.append($('<div class="ui-popup-arrow">'))
			.append($('<i class="ui-close circle ui-popup-closer"></i>').click(function() {
				hide($c);
			}));

		$p = $('<div class="ui-popup-wrap">').append($f).appendTo('body');

		if (c.cssClass) {
			$p.addClass(c.cssClass);
		}

		$c.appendTo($f).data('popup', c).addClass('ui-popup').show();

		if (c.ajax.url) {
			c.loaded = false;
			if (c.autoload) {
				_load($p, $c, c);
			}
		} else {
			c.loaded = true;
			$c.find('[popup-dismiss="true"]').click(function() {
				hide($c);
				return false;
			});
		}
	}

	var api = {
		load: load,
		show: show,
		hide: hide,
		toggle: toggle,
		update: update,
		trigger: trigger,
		destroy: destroy
	};

	$.fn.popup = function(c) {
		var args = [].slice.call(arguments);
		return this.each(function() {
			var $c = $(this);

			if (typeof (c) == 'string') {
				var p = _data($c);
				if (!p) {
					_init($c);
				}
				args[0] = $c;
				api[c].apply($c, args);
				return;
			}

			_init($c, c);
		});
	};

	$.popup = function() {
		var $c = _active();
		$c.popup.apply($c, arguments);
		return $c;
	};

	$.popup.defaults = {
		position: 'auto',
		transition: 'slideDown',
		mask: false,
		loader: false,
		closer: false,
		mouse: true,
		keyboard: true,
		resize: true,
		ajax: {},
		ajaxDone: _ajaxDone,
		ajaxFail: _ajaxFail
	};

	// POPUP DATA-API
	// ==================
	$(window).on('load', function() {
		$('[data-spy="popup"]').popup();
		$('body').on('click.popup', '[popup-target]', function(evt) {
			evt.stopPropagation();
			var $t = $(this), c = _options($t);
			$($t.attr('popup-target')).popup(c).popup('toggle', this);
		});
	});

})(jQuery);
(function($) {
	"use strict";

	$.fn.scrollIntoView = function(speed, easing, callback) {
		if (!this.length) {
			return this;
		}

		var $e = this.first(), $w = $(window), eo = $e.offset(),
			wh = $w.height(), ww = $w.width(),
			st = $w.scrollTop(), sb = st + wh, sl = $w.scrollLeft(), sr = sl + ww,
			et = eo.top, eh = $e.outerHeight(), eb = et + eh,
			el = eo.left, ew = $e.outerWidth(), er = el + ew,
			x = sl > er ? el : (sr < el ? (ew > ww ? el : el - (ww - ew)) : -1),
			y = st > eb ? et : (sb < et ? (eh >= wh ? et : et - (wh - eh)) : -1);

		var ss = {};
		if (x >= 0) { ss.scrollLeft = x; }
		if (y >= 0) { ss.scrollTop = y; }
		$('html').animate(ss, speed, easing, callback);
		return this;
	};

})(jQuery);
(function($) {
	"use strict";

	$.fn.selectText = function() {
		var $t = $(this);
		if ($t.length) {
			var doc = document, el = $t.get(0);
			if (doc.body.createTextRange) {
				var r = doc.body.createTextRange();
				r.moveToElementText(el);
				r.select();
			} else if (window.getSelection) {
				var ws = window.getSelection(), r = doc.createRange();
				r.selectNodeContents(el);
				ws.removeAllRanges();
				ws.addRange(r);
			}
		}
	};

})(jQuery);
﻿// jQuery simple color picker
// https://github.com/rachel-carvalho/simple-color-picker
// Modified by Frank Wang

(function($) {
	"use strict";

	$.simpleColorPicker = {
		defaults: {
			colorsPerLine: 8,
			colors: ['#000000', '#444444', '#666666', '#999999', '#cccccc', '#eeeeee', '#f3f3f3', '#ffffff'
				, '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff'
				, '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc'
				, '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd'
				, '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0'
				, '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7', '#a64d79'
				, '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47'
				, '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d', '#4C1130'],
			showEffect: 'show',
			hideEffect: 'hide'
		}
	};

	function positionAndShowBox($txt, $box) {
		var pos = $txt.offset(), tw = $txt.outerWidth(), bw = $box.outerWidth();

		var left = tw > bw ? pos.left : pos.left - (bw - tw);

		$box.css({
			left: left < 0 ? 0 : left,
			top: pos.top + $txt.outerHeight()
		});

		showBox($box);
	}

	function showBox($box) {
		var opts = $box.data('opts');
		$box[opts.showEffect]();
		$(document).on('click.simple_color_picker', function() {
			hideBox($box);
		});
	}

	function hideBox($box) {
		var opts = $box.data('opts');
		$box[opts.hideEffect]();
		$(document).off('.simple_color_picker');
	}

	function initBox($txt, opts) {
		var $box = $('<div>', {
			'id': 'color_picker_' + ($txt.attr('id') || new Date().getTime()),
			'class': 'ui-simple-color-picker'
		}).hide().appendTo('body');

		var $ul;
		for (var i = 0; i < opts.colors.length; i++) {
			if (i % opts.colorsPerLine == 0) {
				$ul = $('<ul>');
				$box.append($ul);
			}

			var c = opts.colors[i];
			$ul.append($('<li>', {
				'style': 'background-color: ' + c,
				'title': c
			}));
		}

		$box.data('opts', opts);
		$txt.data('simpleColorPicker', $box);
		return $box;
	}

	var api = {
		destroy: function() {
			this.each(function() {
				var $box = $(this).data('simpleColorPicker');
				if ($box) {
					$box.remove();
				}
			}).off('.simple_color_picker').removeData('simpleColorPicker');
		}
	};

	$.fn.simpleColorPicker = function(options) {
		// Methods
		if (typeof options == 'string') {
			api[options].apply(this);
			return this;
		}

		return this.each(function() {
			var $txt = $(this),
				opts = $.extend({}, $.simpleColorPicker.defaults, options),
				$box = initBox($txt, opts);

			$box.find('li').click(function() {
				if ($txt.is('input')) {
					$txt.val($(this).attr('title'));
				}
				$txt.trigger('change', $(this).attr('title'));
				hideBox($box);
			});

			$box.click(function(evt) {
				evt.stopPropagation();
			});

			$txt.on('click.simple_color_picker', function() {
				setTimeout(function() {
					positionAndShowBox($txt, $box);
				})
			});

			if ($txt.is('input')) {
				$txt.on('focus.simple_color_picker', function() {
					positionAndShowBox($txt, $box);
				});
			}
		});
	};

	// COLOR-PICKER DATA-API
	// ==================
	$(window).on('load', function() {
		$('[data-spy="simpleColorPicker"]').simpleColorPicker();
	});

})(jQuery);
(function($) {
	'use strict';

	function sortable_click(evt) {
		var $e = $(evt.target),
			col = $e.data('sortCol') || $e.text(),
			dir = $e.data('sortDir') || '';

		if ($e.hasClass('sorted')) {
			dir = $e.hasClass('asc') ? 'desc' : 'asc';
		}

		$(this).trigger('sort.sortable', [ col, dir ]);
	}

	$.fn.sortable = function(api, col, dir) {
		if (api == 'sorted') {
			this.find('.sortable').removeClass('sorted desc asc')
				.filter('[data-sort-col="' + col + '"]').addClass('sorted ' + (dir || 'asc'));
			return this;
		}
		return this.addClass('ui-sortable').off('click.sortable').on('click.sortable', '.sortable', sortable_click);
	};

	// SORTABLE DATA-API
	// ==================
	$(window).on('load', function() {
		$('[data-spy="sortable"]').sortable();
	});
})(jQuery);
(function($) {
	"use strict";

	function _autosize() {
		var $t = $(this);
		$t.css('height', 'auto').height($t.prop('scrollHeight'));
	}

	$.fn.autosize = function() {
		$(this).off('input.autosize').on('input.autosize', _autosize).css({
			'overflow-y': 'hidden',
			'resize': 'none'
		});
		_autosize.call(this);
	};

	$(window).on('load', function() {
		$('textarea[autosize]').autosize();
	});

})(jQuery);
(function($) {
	"use strict";

	function _enterfire(evt) {
		if (evt.ctrlKey && evt.which == 13) {
			var $t = $(this), ef = $t.attr('enterfire');
			if (ef == 'form' || ef == 'submit' || ef == 'true') {
				$t.closest('form').submit();
			} else {
				$(ef).click();
			}
		}
	}

	$.fn.enterfire = function() {
		$(this).off('keyup.enterfire').on('keyup.enterfire', _enterfire);
	};

	$(window).on('load', function() {
		$('textarea[enterfire]').enterfire();
	});

})(jQuery);
(function($) {
	"use strict";

	$.fn.textClear = function() {
		return this.each(function() {
			var $t = $(this);
			if ($t.hasClass('ui-has-textclear')) {
				return;
			}

			$t.addClass('ui-has-textclear');

			var $i = $('<i class="ui-close ui-textclear"></i>');
			$i.insertAfter($t).click(function() {
				if ($t.val() != '') {
					$t.val('').trigger('change');
					if ($t.attr('textclear') == 'focus') {
						$t.focus();
					}
				}
			});
		});
	};
	
	// DATA-API
	// ==================
	$(window).on('load', function () {
		$('[textclear]').textClear();
	});
})(jQuery);
// jQuery toast plugin created by Kamran Ahmed copyright MIT license 2015 (modified by Frank Wang)
(function($) {
	"use strict";

	function setOptions(os, base, options) {
		var o = {};

		if ((typeof options === 'string') || $.isArray(options)) {
			o.text = options;
		} else {
			o = options;
		}
		$.extend(os, base, o);
	}

	function setup($t, os) {
		$t = $t || $('<div class="ui-toast-single"></div>');

		$t.empty();

		// For the loader on top
		$t.append($('<span class="ui-toast-loader"></span>'));

		if (os.closeable) {
			$t.append($('<span class="ui-toast-close">&times;</span>'));
		}

		var sm = os.html ? 'html' : 'text';
		if (os.heading) {
			$t.append($('<h2 class="ui-toast-heading">')[sm](os.heading));
		}

		if ($.isArray(os.text)) {
			var $ul = $('<ul class="ui-toast-ul">');
			$.each(os.text, function(i, t) {
				if (t) {
					$ul.append($('<li class="ui-toast-' + sm + '">')[sm](t));
				}
			});
			$t.append($ul);
		} else {
			$t.append($('<div class="ui-toast-' + sm + '">')[sm](os.text));
		}

		if (os.bgColor !== false) {
			$t.css("background-color", os.bgColor);
		}

		if (os.textColor !== false) {
			$t.css("color", os.textColor);
		}

		if (os.textAlign) {
			$t.css('text-align', os.textAlign);
		}

		if (os.icon !== false) {
			$t.addClass('ui-toast-has-icon ui-toast-icon-' + os.icon);
		}

		if (os['class'] !== false) {
			$t.addClass(os['class'])
		}

		return $t;
	}

	function position(os) {
		var $c = $(".ui-toast-wrap"),
			sp = os.position,
			op = {
				left: 'auto',
				top: 'auto',
				right: 'auto',
				bottom: 'auto'
			};

		if (typeof sp === 'object') {
			$.extend(op, sp);
		} else {
			switch (sp) {
			case 'mid center':
				op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
				op.top = ($(window).outerHeight() / 2) - $c.outerHeight() / 2;
				break;
			case 'bottom':
				op.bottom = 5;
				op.left = 20;
				op.right = 20;
				break;
			case 'bottom center':
				op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
				op.bottom = 20;
				break;
			case 'bottom left':
				op.bottom = 20;
				op.left = 20;
				break;
			case 'bottom right':
				op.bottom = 20;
				op.right = 20;
				break;	
			case 'top':
				op.top = 5;
				op.left = 20;
				op.right = 20;
				break;
			case 'top center':
				op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
				op.top = 20;
				break;
			case 'top left':
				op.top = 20;
				op.left = 20;
				break;
			//case 'top right':
			default:
				op.top = 20;
				op.right = 20;
				break;
			}
		}
		$c.css(op);
	}

	function bindToast($t, os) {
		$t.unbind();

		if (canAutoHide(os)) {
			$t.on('shown.toast', function() {
				showLoader($t, os);
				bindHover($t, os);
			});
		}

		$t.find('.ui-toast-close').on('click', function(e) {
			e.preventDefault();
			transitionOut($t, os);
		});

		if (typeof os.beforeShow == 'function') {
			$t.on('show.toast', function() {
				os.beforeShow($t);
			});
		}

		if (typeof os.afterShown == 'function') {
			$t.on('shown.toast', function() {
				os.afterShown($t);
			});
		}

		if (typeof os.beforeHide == 'function') {
			$t.on('hide.toast', function() {
				os.beforeHide($t);
			});
		}

		if (typeof os.afterHidden == 'function') {
			$t.on('hidden.toast', function() {
				os.afterHidden($t);
			});
		}

		if (typeof os.onClick == 'function') {
			$t.on('click', function() {
				os.onClick($t);
			});
		}
	}

	function addToDom($t, os) {
		var $c = $('.ui-toast-wrap'),
			sn = os.stack;

		if ($c.length === 0) {
			$c = $('<div></div>', {
				"class": "ui-toast-wrap",
				"role": "alert",
				"aria-live": "polite"
			});
			$('body').append($c);

		} else if (!sn || isNaN(parseInt(sn, 10))) {
			$c.empty();
		}

		$c.find('.ui-toast-single:hidden').remove();

		$c.append($t);

		if (sn && !isNaN(parseInt(sn), 10)) {
			var _prevToastCount = $c.find('.ui-toast-single').length,
				_nextToastCount = _prevToastCount - sn;

			if (_nextToastCount > 0) {
				$c.find('.ui-toast-single').slice(0, _nextToastCount).remove();
			}
		}
	}

	function canAutoHide(os) {
		return (os.hideAfter !== false) && !isNaN(parseInt(os.hideAfter, 10));
	}

	function showLoader($t, os) {
		if (os.loader) {
			// 400 is the default time that jquery uses for fade/slide
			// Divide by 1000 for milliseconds to seconds conversion
			var transition = 'width ' + (os.hideAfter - 400) / 1000 + 's ease-in';

			$t.find('.ui-toast-loader').css({
				'width': '100%',
				'-webkit-transition': transition,
				'transition': transition,
				'background-color': os.loaderBg
			});
		}
	}

	function hideLoader($t, os) {
		if (os.loader) {
			$t.find('.ui-toast-loader').css({
				'width': '0%',
				'-webkit-transition': 'none',
				'transition': 'none'
			});
		}
	}

	function setHideTimer($t, os) {
		$t.data('timer', setTimeout(function() {
			$t.off('mouseenter mouseleave').removeData('timer');
			transitionOut($t, os);
		}, os.hideAfter));
	}

	function clearHideTimer($t) {
		var tm = $t.data('timer');
		if (tm) {
			clearTimeout(tm);
		}
	}

	function bindHover($t, os) {
		if (os.stopHideOnHover) {
			$t.hover(function() {
				clearHideTimer($t);
				hideLoader($t, os);
			}, function() {
				setHideTimer($t, os);
				showLoader($t, os);
			});
		}
	}

	function transitionIn($t, os) {
		var tm = 'show';

		switch (os.transition) {
		case 'fade':
			tm = 'fadeIn';
			break;
		case 'slide':
			tm = 'slideDown';
			break;
		}

		$t.hide().trigger('show.toast')[tm](function() {
			$t.trigger('shown.toast');
		});
	}

	function transitionOut($t, os) {
		var tm = 'hide';

		switch (os.transition) {
		case 'fade':
			tm = 'fadeOut';
			break;
		case 'slide':
			tm = 'slideUp';
			break;
		}

		$t.trigger('hide.toast')[tm](function() {
			$t.trigger('hidden.toast');
		});
	}

	function Toast(options) {
		var os = {}, // options
			$t; // toast-single

		setOptions(os, $.toast.defaults, options);
		$t = setup($t, os);
		addToDom($t, os);
		position(os);
		bindToast($t, os);
		transitionIn($t, os);

		if (canAutoHide(os)) {
			setHideTimer($t, os);
		}

		var api = {
			reset: function(resetWhat) {
				if (resetWhat === 'all') {
					$('.ui-toast-wrap').remove();
				} else {
					$t.remove();
				}
			},

			update: function(options) {
				setOptions(os, {}, options);
				setup($t, os);
				bindToast($t, os);
			},

			clsose: function() {
				transitionOut($t, os);
			}
		};

		return api;
	}

	$.toast = Toast;

	$.toast.defaults = {
		icon: false,
		text: '',
		heading: '',
		loader: true,
		transition: 'fade',
		closeable: true,
		hideAfter: 5000,
		stopHideOnHover: true,
		stack: 5,
		position: 'top right',
		bgColor: false,
		textColor: false,
		textAlign: 'left',
		loaderBg: '#9EC600'
	};

})(jQuery);
(function($) {
	"use strict";

	$.fn.totop = function() {
		$(this).each(function() {
			var $t = $(this), $w = $(window);

			$t.click(function() {
				$('html,body').animate({ scrollTop: 0 }, 'slow');
			}).css({ cursor: 'pointer' });

			$w.scroll(function() {
				$t.toggle($w.scrollTop() > $w.height());
			});
		});
	};

	$(window).on('load', function() {
		$('[totop="true"]').totop();
	});

})(jQuery);
﻿(function($) {
	"use strict";

	function init($t) {
		$t.find('li').removeClass('node leaf').children('.item').off('.treeview').each(function() {
			var $i = $(this), $n = $i.parent();
			if ($i.next('ul').length) {
				$n.addClass('node');
				$i.on('click.treeview', function() {
					_toggle($n);
				});
			} else {
				$n.addClass('leaf');
			}
		});
	}

	function _collapse($n) {
		$n.addClass('collapsed').children('.item').next().slideUp();
	}

	function _expand($n) {
		$n.removeClass('collapsed').children('.item').next().slideDown();
	}

	function _toggle($n) {
		$n.hasClass('collapsed') ? _expand($n) : _collapse($n);
	}

	function collapse($t, $n) {
		_collapse($n || $t.find('li:not(.collapsed .leaf)'));
	}

	function expand($t, $n) {
		_expand($n || $t.find('li.collapsed'));
	}

	function toggle($t, $n) {
		_toggle($n || $t.find('li:not(.leaf)'));
	}

	function unbind($t) {
		$t.find('li').removeClass('node').children('.item').off('.treeview');
	}

	var api = {
		'collapse': collapse,
		'expand': expand,
		'toggle': toggle,
		'destroy': unbind
	};

	$.fn.treeview = function(method, target) {
		// Methods
		if (typeof method == 'string') {
			api[method].call(this, target);
			return this;
		}

		init(this);
		return this;
	};

	// TREEVIEW DATA-API
	// ==================
	$(window).on('load', function() {
		$('ul[data-spy="treeview"]').treeview();
	});

})(jQuery);
(function($) {
	"use strict";

	var isAdvancedUpload = function() {
		var div = document.createElement('div');
		return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
	}();

	var UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	function _filesize(n, p) {
		var i = 0, l = UNITS.length - 1;
		while (n >= 1024 && i < l) {
			n = n / 1024
			i++
		}

		p = Math.pow(10, p || 2);
		return '(' + Math.round(n * p) / p + ' ' + UNITS[i] + ')';
	}

	function _filename(fn) {
		var u = fn.lastIndexOf('/');
		var w = fn.lastIndexOf('\\');
		var i = u > w ? u : w;
		return fn.substr(i + 1);
	}

	function _filetype(s) {
		var i = s.indexOf('/');
		return (i >= 0) ? s.slice(0, i) : s;
	}

	function _show_item($u, fi) {
		if (!fi) {
			return;
		}

		var uc = $u.data('uploader'),
			fid = fi.id || fi.path || fi.name,
			fnm = _filename(fi.name || fi.path || fi.id),
			fsz = fi.size,
			fct = _filetype(fi.type || '');

		var $fit = $('<div>').addClass('ui-uploader-item').insertAfter($u.children('.ui-uploader-sep')),
			$fid = $('<input>').attr('type', 'hidden').attr('name', uc.name).addClass('ui-uploader-fid').appendTo($fit),
			$ftx = $('<span>').addClass('ui-uploader-text').appendTo($fit),
			$fim = $('<div>').addClass('ui-uploader-image').appendTo($fit);

		$fid.val(fid || '');

		fnm = fnm || fid || $u.children('.ui-upload-file').val();
		var durl;
		if (uc.dnloadUrl && fid) {
			durl = uc.dnloadUrl.replace(uc.dnloadHolder, encodeURIComponent(fid));
		}

		if (fnm) {
			var ii = uc.cssIcons[fct] || uc.cssIcons['file'];
			var s = '<i class="' + ii + ' ui-uploader-icon"></i> ' + fnm + ' ' + _filesize(fsz);
			if (durl) {
				$('<a>').attr('href', durl).html(s).appendTo($ftx);
			} else {
				$('<span>').html(s).appendTo($ftx);
			}
		}

		$ftx.append($('<i>').addClass('ui-uploader-remove fa fa-remove').click(function() {
			$(this).closest('.ui-uploader-item').fadeOut(function() {
				$(this).remove();
			});
			$u.find('.ui-uploader-error').hide().empty();
		}));

		if (durl && fct == 'image') {
			$('<a>', { href: durl })
				.append($('<img>', { src: durl }))
				.appendTo($fim)
				.fadeIn();
		}
	}

	function _ajaxDone(d) {
		if (d) {
			var r = d.result || d.files, $u = $(this);
			if (r && !$u.children('.ui-uploader-file').prop('multiple')) {
				$u.children('.ui-uploader-item').remove();
			}

			if ($.isArray(r)) {
				for (var i = 0; i < r.length; i++) {
					_show_item($u, r[i]);
				}
			} else {
				_show_item($u, r);
			}
		}
	}

	function _ajaxFail(xhr, status, e) {
		$(this).children('.ui-uploader-error')
			.empty()
			.text(e ? (e + "") : (xhr ? xhr.responseText : status))
			.show();
	}

	function _init($u, uc) {
		$u.addClass('ui-uploader').data('uploader', uc);

		var loading = false,
			$uf = $u.children('.ui-uploader-file'),
			$ub = $u.children('.ui-uploader-btn'),
			$ue = $u.children('.ui-uploader-error'),
			$us = $u.children('.ui-uploader-sep'),
			$up = $('<div class="ui-uploader-progress" style="display: none">')
				.addClass(uc.cssProgress)
				.append($('<div class="ui-uploader-progressbar" style="width: 0%">').addClass(uc.cssProgressBar))
				.insertAfter($ub.length > 0 ? $ub : $uf);

		if ($ue.length < 1) {
			$ue = $('<div class="ui-uploader-error"></div>').insertAfter($up);
		}
		$ue.hide();

		if ($us.length < 1) {
			$us = $('<div class="ui-uploader-sep"></div>').insertAfter($ue);
		}

		uc.name ||= $uf.attr('name');
		uc.uploadName ||= $uf.attr('name') || uc.name;

		// functions
		function _set_progress(v) {
			$up.children('.ui-uploader-progressbar').css({ width: v + '%' });
		}

		function __start_upload() {
			loading = true;

			($ub.length ? $ub : $uf).hide();
			$ue.hide().empty();

			_set_progress(0);
			$up.show();
		}

		function __end_upload() {
			loading = false;

			$up.hide();
			_set_progress(0);

			$uf.val("");
			($ub.length ? $ub : $uf).show();
		}

		function __upload_on_progress(loaded, total) {
			var p = Math.round(loaded * 100 / total);
			_set_progress(p);
		}

		function __upload_on_success(data, status, xhr) {
			uc.ajaxDone.call($u, data, status, xhr);
			$u.trigger('uploaded.uploader', data);
		}

		function __upload_on_error(xhr, status, e) {
			uc.ajaxFail.call($u, xhr, status, e);
		}

		function __ajaf_upload(file) {
			__start_upload();

			var ud = {};
			$u.find('.ui-uploader-data').each(function() {
				var $i = $(this);
				ud[$i.attr('name')] = $i.val();
			});
			$.extend(ud, uc.uploadData);

			$.ajaf({
				url: uc.uploadUrl,
				data: ud,
				file: file,
				dataType: 'json',
				forceAjaf: uc.forceAjaf,
				uprogress: __upload_on_progress,
				success: __upload_on_success,
				error: __upload_on_error,
				complete: __end_upload
			});
		}

		function __file_on_change() {
			if (loading || $uf.val() == "") {
				return;
			}

			var f = {}; f[uc.uploadName] = $uf;
			__ajaf_upload(f);
		}

		function __file_on_drop(e) {
			e.preventDefault();
			if (loading) {
				return;
			}

			var fs = e.originalEvent.dataTransfer.files;
			if (fs.length) {
				var f = {}; f[uc.uploadName] = $uf.prop('multiple') ? fs : fs.item(0);
				__ajaf_upload(f);
			}
		}

		// event handler
		$uf.change(function() {
			setTimeout(__file_on_change, 10);
		});

		$ub.click(function(e) {
			e.preventDefault();
			$uf.trigger('click');
			return false;
		});

		// drap & drop
		if (isAdvancedUpload) {
			$u.addClass('ui-uploader-draggable')
				.on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
					e.preventDefault();
					e.stopPropagation();
				})
				.on('dragover dragenter', function() {
					$u.addClass('ui-uploader-dragover');
				})
				.on('dragleave dragend drop', function() {
					$u.removeClass('ui-uploader-dragover');
				})
				.on('drop', __file_on_drop);
		}
	}

	function _options($u) {
		var ks = [
			'name',
			'forceAjaf',
			'uploadUrl',
			'uploadName',
			'dnloadUrl',
			'dnloadHolder'
		];
		var ds = ['uploadData'];
		var fs = ['ajaxDone', 'ajaxFail'];

		var c = {};
		$.each(ks, function(i, k) {
			var v = $u.data(k);
			if (v) {
				if ($.inArray(k, ds) >= 0) {
					if (typeof (v) == 'string') {
						try {
							v = JSON.parse(v);
						} catch (e) {
							return;
						}
					}
				} else if ($.inArray(k, fs) >= 0) {
					v = new Function(v);
				}
				c[k] = v;
			}
		});
		return c;
	}

	// UPLOADER FUNCTION
	// ==================
	$.uploader = {
		defaults: {
			forceAjaf: false,
			dnloadHolder: '$',

			// bootstrap3/4 css
			cssProgress: 'progress',
			cssProgressBar: 'progress-bar progress-bar-info progress-bar-striped',

			// fontawesome4 css
			cssIcons: {
				image: 'fa fa-file-image-o',
				video: 'fa fa-file-video-o',
				file: 'fa fa-clip'
			},

			ajaxDone: _ajaxDone,
			ajaxFail: _ajaxFail
		}
	};

	$.fn.uploader = function(c) {
		return this.each(function() {
			var $u = $(this), uc = $u.data('uploader');
			if (uc) {
				$.extend(uc, c);
				return;
			}

			uc = $.extend({}, $.uploader.defaults, _options($u), c);
			_init($u, uc);
		});
	};

	// UPLOADER DATA-API
	// ==================
	$(window).on('load', function() {
		$('[data-spy="uploader"]').uploader();
	});

})(jQuery);
(function($) {
	"use strict";

	$.each({
		zoomIn: { opacity: 'show' },
		zoomOut: { opacity: 'hide' },
	}, function(name, props) {
		$.fn[name] = function(speed, easing, callback) {
			var opt = $.speed(speed, easing, callback);
			var old = opt.step;
			opt.step = function(s) {
				$(this).css({ transform: 'scale(' + s + ')' });
				if (old) {
					old.call(this, s);
				}
			};
			return this.animate(props, opt);
		};
	});

})(jQuery);
!function(m){"use strict";var e,t,v={position:"absolute",top:"-9999px",left:"-9999px"},b=(e=document.createElement("input"),t=new XMLHttpRequest,e.type="file","multiple"in e&&void 0!==t.upload&&"undefined"!=typeof FileList&&"undefined"!=typeof File);function x(e,i){e&&("string"==typeof e&&(e=m(e)),m.isArray(e)?m.each(e,function(e,t){i(t)}):m.each(e,function(o,e){m.isArray(e)?m.each(e,function(e,t){i(t,o)}):i(e,o)}))}function y(e,i){function o(o,e){m.isArray(e)?m.each(e,function(e,t){i(o,t)}):i(o,e)}e&&(m.isArray(e)?m.each(e,function(e,t){o(t.name,t.value)}):m.each(e,function(e,t){o(e,t)}))}m.ajaf=function(r){if((r=m.extend({method:"POST",forceAjaf:!1,forceAjax:!1},r)).forceAjax||b&&!r.forceAjaf)return s=r,i=new FormData,y(s.data,function(e,t){i.append(e,t)}),x(s.file,function(e,o){e instanceof FileList?m.each(e,function(e,t){i.append(o,t)}):e instanceof File?i.append(o,e):(e=m(e),o=o||e.attr("name"),m.each(e.prop("files"),function(e,t){i.append(o,t)}))}),delete(s=m.extend({},s,{cache:!1,contentType:!1,processData:!1,data:i})).file,n=m.ajaxSettings.xhr(),t=s.uprogress,o=s.dprogress,(t||o)&&(t&&(n.upload.addEventListener("progress",function(e){e.lengthComputable&&t(e.loaded,e.total)}),delete s.uprogress),o)&&(n.addEventListener("progress",function(e){e.lengthComputable&&o(e.loaded,e.total)}),delete s.dprogress),n.addEventListener("readystatechange",function(e){switch(n.readyState){case XMLHttpRequest.HEADERS_RECEIVED:var t=n.getResponseHeader("Content-Disposition");t&&(n.responseType="arraybuffer",o=t.split(";"),m.each(o,function(e,t){var o,i,a=t.indexOf("=");0<a&&("filename"!=(o=t.substring(0,a).trim().toLowerCase())&&"filename*"!=o||(1<(t=t.substring(a+1).trim()).length&&'"'==t.charAt(0)&&'"'==t.charAt(t.length-1)&&(t=t.substring(1,t.length-1)),"filename*"==o&&(i=t.indexOf("''"),0<=a)&&(t=t.substring(i+2)),t=decodeURIComponent(t),n.download&&"filename*"!=o)||(n.download=t))}),n.download||(n.download=t));break;case XMLHttpRequest.DONE:var o,i,a;n.download&&(o=new Blob([n.response]),i=window.URL.createObjectURL(o),a=m("<a>",{download:n.download,href:i}).css(v),m("body").append(a),a.get(0).click(),setTimeout(function(){window.URL.revokeObjectURL(i),a.remove()},200))}}),s.xhr=function(){return n},m.ajax(s);r=m.extend({id:(new Date).getTime(),secureUrl:"javascript:false"},r),l="ajaf_if_"+(s=r).id;var i,n,t,o,e,a,s,l,c=m("<iframe>",{id:l,name:l,src:s.secureUrl}).css(v).appendTo("body"),d=(e="ajaf_form_"+(l=r).id,a=m("<form>",{id:e,name:e,action:l.url,method:l.method,target:"ajaf_if_"+l.id}).css(v).appendTo("body"),y(l.data,function(e,t){m('<input type="hidden">').attr("name",e).val(t).appendTo(a)}),a.files=[],l.file&&(a.attr({method:"POST",encoding:"multipart/form-data",enctype:"multipart/form-data"}),x(l.file,function(e,t){var e=m(e),o=e.clone().insertAfter(e);t=t||e.attr("name"),e.attr({id:"",name:t}).appendTo(a),a.files.push({real:e,copy:o})})),a),u=!1,f={};function p(e){if(!u){u=!0;var t="timeout"==e?"error":"success";try{var o,i,a=c.get(0),n=a.contentWindow.document||a.contentDocument||window.frames[a.id].document;n&&n.body&&(r.selector?f.responseText=m(n.body).find(r.selector).html():(i=(o=n.body.firstChild)&&o.tagName?o.tagName.toUpperCase():"",f.responseText="TEXTAREA"==i?o.value:"PRE"==i?m(o).text():n.body.innerHTML)),f.responseXML=n&&n.XMLDocument?n.XMLDocument:n}catch(e){t="error",r.error&&r.error(f,t,e)}switch(m.each(d.files,function(e,t){t.real.attr({id:t.copy.attr("id"),name:t.copy.attr("name")}).insertAfter(t.copy),t.copy.remove()}),d.remove(),t){case"timeout":r.error&&r.error(f,t);break;case"success":try{var s=function(e,t){var o="xml"==t?e.responseXML:e.responseText;switch(t){case"script":m.globalEval(o);break;case"json":o=m.parseJSON(o);break;case"html":m("<div>").html(o).evalScripts()}return o}(f,r.dataType);r.success&&r.success(s,f)}catch(e){r.error&&r.error(f,t,e)}}try{r.complete&&r.complete(f,t)}finally{c.unbind(),setTimeout(function(){c.remove()},100),f=null}}}0<r.timeout&&setTimeout(function(){u||p("timeout")},r.timeout);var h,g=r.uprogress||r.dprogress;g&&(h=0,setTimeout(function e(){g(h<95?++h:h,100),u||setTimeout(e,10+h)},10)),r.beforeSend&&r.beforeSend(f,r);try{d.submit()}catch(e){r.error&&r.error(f,"send",e)}return c.on("load",p),f}}(jQuery),function(t){"use strict";t.copyToClipboard=function(e){window.clipboardData?clipboardData.setData("Text",e):((e=t("<textarea>").css({width:0,height:0}).text(e).appendTo("body")).get(0).select(),document.execCommand("copy"),e.remove())}}(jQuery),function(d){"use strict";d.cookie=function(e,t,o){if(o=d.extend({},d.cookie.defaults,o),void 0===t){var i=null;if(document.cookie&&""!=document.cookie)for(var a=document.cookie.split(";"),n=0;n<a.length;n++){var s=a[n].replace(/^[\s\u3000\u0022]+|[\s\u3000\u0022]+$/g,"");if(s.substring(0,e.length+1)==e+"="){i=decodeURIComponent(s.substring(e.length+1));break}}return i}null===t&&(t="",o.expires=-1);var r="",l=(o.expires&&("number"==typeof o.expires||o.expires.toUTCString)&&("number"==typeof o.expires?(l=new Date).setTime(l.getTime()+24*o.expires*60*60*1e3):l=o.expires,r="; expires="+l.toUTCString()),o.path?"; path="+o.path:""),c=o.domain?"; domain="+o.domain:"",o=o.secure?"; secure":"";document.cookie=[e,"=",encodeURIComponent(t),r,l,c,o].join("")},d.cookie.defaults={},d.jcookie=function(e,t,o){if(void 0!==t)d.cookie(e,btoa(JSON.stringify(t)),o);else try{return JSON.parse(atob(d.cookie(e)))}catch(e){return{}}}}(jQuery),function(){"use strict";jQuery.fn.disable=function(e){return this.each(function(){this.disabled=e})}}(),function(t){"use strict";t.jcss=function(e){return!t('link[href="'+e+'"]').size()&&(t("<link>").attr({type:"text/css",rel:"stylesheet",href:e}).appendTo("head"),!0)}}(jQuery),function(o){"use strict";var i={};o.jscript=function(e,t){return!i[e]&&(o.getScript(e,t),!0)},o.enableScriptCache=function(){o.ajaxPrefilter(function(e,t,o){"script"!=e.dataType&&"script"!=t.dataType||(e.cache=!0)})}}(jQuery),function(i){"use strict";i.queryArrays=function(e,t){for(var o=[],i=(e=0<=(a=(e=0<=(a=e.indexOf("#"))?e.substring(0,a):e).indexOf("?"))?e.substring(a+1):e).split("&"),a=0;a<i.length;a++){var n=i[a].split("="),s=decodeURIComponent(n[0]);null!=t&&t!=s||o.push({name:s,value:1<n.length?decodeURIComponent(n[1]):""})}return o},i.queryParams=function(e){for(var t={},o=(e=0<=(i=(e=0<=(i=e.indexOf("#"))?e.substring(0,i):e).indexOf("?"))?e.substring(i+1):e).split("&"),i=0;i<o.length;i++){var a=o[i].split("=");t[decodeURIComponent(a[0])]=1<a.length?decodeURIComponent(a[1]):""}return t},i.addQueryParams=function(e,t){var o=e.indexOf("#");return 0<=(o=(e=0<=o?e.substring(0,o):e).indexOf("?"))&&(t=i.extend(i.queryParams(e),t),e=e.substring(0,o)),e+"?"+i.param(t)}}(jQuery),function(){"use strict";jQuery.fn.replaceClass=function(e,t){return this.removeClass(e).addClass(t)}}(),function(n){"use strict";function s(e,t){e.hasClass("collapsed")||e.addClass("collapsed").children(":not(legend)")[t||"slideUp"]()}function r(e,t){e.hasClass("collapsed")&&e.removeClass("collapsed").children(":not(legend)")[t||"slideDown"]()}n.fn.fieldset=function(i,a){return i=i||{},this.each(function(){var e,t,o=n(this);switch(o.data("fieldset")||(e=o.children("legend"),t=i.collapsed&&!o.hasClass("collapsed"),o.data("fieldset",i).addClass("ui-fieldset"+(t?" collapsed":"")),e.click(function(){var e=n(this).closest("fieldset");(e.hasClass("collapsed")?r:s)(e)}),t=o.hasClass("collapsed"),o.children(":not(legend)")[t?"hide":"show"]()),i){case"collapse":s(o,a);break;case"expand":r(o,a)}})},n(window).on("load",function(){n('[data-spy="fieldset"]').fieldset()})}(jQuery),function(a){"use strict";a.fn.focusme=function(){var i=!1;a(this).each(function(){var e,t,o=a(this);i?o.removeAttr("focusme"):(t=o.attr("focusme"),o.removeAttr("focusme"),"true"==t?(e=o.find("input,select,textarea,button").not(":hidden,:disabled,[readonly]").eq(0)).length<1&&(e=o.find("a").not(":hidden,:disabled").eq(0)).length<1&&(e=o):""!=t&&"false"!=t&&(e=o.find(t).eq(0)),e&&e.length&&(i=!0,t=(o=a(window)).scrollTop(),o=o.scrollLeft(),e.focus(),a(window).scrollTop(t).scrollLeft(o)))})},a(window).on("load",function(){a('[focusme="true"]').focusme()})}(jQuery),function(e){"use strict";e(window).on("load",function(){e("input[data-action], button[data-action]").off("click.action").on("click.action",function(){e(this).closest("form").attr("action",e(this).data("action"))})})}(jQuery),function(s){"use strict";s.fn.changeValue=function(e){var t=this.val();this.val(e),t!=e&&this.trigger("change")},s.fn.values=function(e,i){if(e){for(var t in e){var a=e[t];this.find(':input[name="'+t+'"]').each(function(){var e=s(this);switch(e.attr("type")){case"button":case"file":case"submit":case"reset":break;case"checkbox":var t=s.isArray(a)?a:[a],o=e.prop("checked"),t=0<=s.inArray(e.val(),t);e.prop("checked",t),i&&t!=o&&e.trigger("change");break;case"radio":o=e.prop("checked"),t=e.val()==a;e.prop("checked",t),i&&t&&!o&&e.trigger("change");break;default:i?e.changeValue(a):e.val(a)}})}return this}var n={},o=this.serializeArray();return s.each(o,function(e,t){var o=n[t.name];void 0===o?n[t.name]=t.value:s.isArray(o)?o.push(t.value):n[t.name]=[o,t.value]}),n}}(jQuery),function(f){"use strict";f.lightbox={bindEvent:"click.lightbox",overlayBgColor:"#000",overlayOpacity:.8,fixedNavigation:!1,loopNavigation:!1,textBtnPrev:"&lsaquo;",textBtnNext:"&rsaquo;",textBtnClose:"&times;",containerBorderSize:10,containerResizeSpeed:400,textPager:"# / $",keyToClose:"c",keyToPrev:"p",keyToNext:"n"},f.fn.lightbox=function(a){a=f.extend({},f.lightbox,a);var n=this;function s(){f("#lightbox-imagebox").css("line-height",f("#lightbox-imagebox").innerHeight()-2+"px")}function r(){return a.images.length<1||(0<a.active?(a.active--,c(),!1):a.loopNavigation?(a.active=a.images.length-1,c(),!1):void 0)}function l(){return a.images.length<1||(a.active<a.images.length-1?(a.active++,c(),!1):a.loopNavigation?(a.active=0,c(),!1):void 0)}function c(){f("#lightbox-loading").show(),f("#lightbox-image, #lightbox-statusbox").hide(),f("#lightbox-nav")[a.fixedNavigation?"addClass":"removeClass"]("lightbox-fixed");var o=new Image;o.onload=function(){var e,t;f("#lightbox-image").attr("src",a.images[a.active][0]),f("#lightbox-loading").hide(),f("#lightbox-image").fadeIn(function(){var t;0<a.images.length&&(f("#lightbox-image-caption").html(a.images[a.active][1]),t={"#":a.active+1,$:a.images.length},f("#lightbox-image-number").html(a.textPager.replace(/[\#\$]/g,function(e){return t[e]}))),f("#lightbox-statusbox").slideDown("fast"),f("#lightbox-btn-prev")[a.loopNavigation&&1<a.images.length||0<a.active?"addClass":"removeClass"]("lightbox-has-prev"),f("#lightbox-btn-next")[a.loopNavigation&&1<a.images.length||a.active<a.images.length-1?"addClass":"removeClass"]("lightbox-has-next")}),a.images.length&&(e=a.active-1,t=a.active+1,(new Image).src=a.images[e<0?a.images.length-1:e][0],(new Image).src=a.images[t>=a.images.length?0:t][0]),o.onload=function(){}},o.src=a.images[a.active][0]}function d(e){var t=e.keyCode,e=e.DOM_VK_ESCAPE||27,o=String.fromCharCode(t).toLowerCase();return o==a.keyToClose||"x"==o||t==e?u():o==a.keyToPrev||37==t?r():o==a.keyToNext||39==t?l():void 0}function e(){f("#lightbox-overlay").remove()}function u(){return f(document).off("keydown",d),f(window).off("resize",s),f("#lightbox-lightbox").remove(),f("#lightbox-overlay").fadeOut(e),f("body").removeClass("lightbox-open"),!1}return this.off(a.bindEvent).on(a.bindEvent,function(){var e=this,t=n;f("body").addClass("lightbox-open"),f("body").append('<div id="lightbox-overlay"></div><div id="lightbox-lightbox"><div id="lightbox-imagebox"><img id="lightbox-image"><div style="" id="lightbox-nav"><a href="#" id="lightbox-btn-prev"><span id="lightbox-txt-prev">'+a.textBtnPrev+'</span></a><a href="#" id="lightbox-btn-next"><span id="lightbox-txt-next">'+a.textBtnNext+'</span></a></div><a href="#" id="lightbox-loading"></a></div><div id="lightbox-statusbox"><div id="lightbox-image-caption"></div><div id="lightbox-image-number"></div><a href="#" id="lightbox-btn-close">'+a.textBtnClose+"</a></div></div>"),f("#lightbox-overlay").css({backgroundColor:a.overlayBgColor,opacity:a.overlayOpacity}).fadeIn(),s(),f("#lightbox-overlay, #lightbox-lightbox").click(u),f("#lightbox-loading, #lightbox-btn-close").click(u),f("#lightbox-btn-prev").click(r),f("#lightbox-btn-next").click(l),f(window).on("resize",s),f(document).keydown(d),a.images=[];for(var o=a.active=0;o<t.length;o++){var i=t[o];"A"==i.tagName?a.images.push([i.getAttribute("href"),i.getAttribute("title")]):"IMG"==i.tagName&&a.images.push([i.getAttribute("src"),i.getAttribute("alt")]),i==e&&(a.active=o)}return c(),!1})}}(jQuery),function(s){"use strict";function r(e){var t=e.data("_mask_timeout");t&&(clearTimeout(t),e.removeData("_mask_timeout")),(t=e.data("_unmask_timeout"))&&(clearTimeout(t),e.removeData("_unmask_timeout"))}function l(e){e.preventDefault(),e.stopPropagation()}function o(e,t){(e.isLoadMasked()?c:r)(e);var o,i,a=s('<div class="ui-loadmask">'),n=(t.cssClass&&a.addClass(t.cssClass),s('<div class="ui-loadmask-load">'));t.content?a.append(s(t.content)):(o=s('<div class="ui-loadmask-icon">'),i=s('<div class="ui-loadmask-text">'),n.append(o).append(i),(t.html||t.text)&&(n.addClass("ui-loadmask-hasmsg"),t.html?i.html(t.html):i.text(t.text)),a.append(n)),"static"==e.css("position")&&e.addClass("ui-loadmasked-relative"),t.mask&&e.append(s('<div class="ui-loadmask-mask"></div>')),e.append(a).addClass("ui-loadmasked"),0<t.timeout&&e.data("_unmask_timeout",setTimeout(function(){c(e)},t.timeout)),t.keyboard&&e.on("keydown.loadmask",l)}function c(e){r(e),e.off(".loadmask"),e.find(".ui-loadmask-mask, .ui-loadmask").remove(),e.removeClass("ui-loadmasked ui-loadmasked-relative")}s.loadmask={defaults:{cssClass:"",mask:!0,keyboard:!0,delay:0,timeout:0}},s.fn.loadmask=function(t){return"string"==typeof t&&(t={text:t}),t=s.extend({},s.loadmask.defaults,t),this.each(function(){var e=s(this);0<t.delay?e.data("_mask_timeout",setTimeout(function(){o(e,t)},t.delay)):o(e,t)})},s.fn.unloadmask=function(){return this.each(function(){c(s(this))})},s.fn.isLoadMasked=function(){return this.hasClass("ui-loadmasked")}}(jQuery),function(s){"use strict";function t(e){0===s(e.target).closest(".ui-nice-select").length&&s(".ui-nice-select").removeClass("open")}function r(e){var t,o=s(this),i=s(o.find(".focus")||o.find("ui li.selected"));switch(e.keyCode){case 32:case 13:return(o.hasClass("open")?i:o).trigger("click"),!1;case 40:return o.hasClass("open")?0<(t=i.nextAll("li:not(.disabled)").first()).length&&(o.find(".focus").removeClass("focus"),t.addClass("focus")):o.trigger("click"),!1;case 38:return o.hasClass("open")?0<(t=i.prevAll("li:not(.disabled)").first()).length&&(o.find(".focus").removeClass("focus"),t.addClass("focus")):o.trigger("click"),!1;case 27:o.hasClass("open")&&o.trigger("click");break;case 9:if(o.hasClass("open"))return!1}}function l(e){e.stopPropagation();e=s(this);s(".ui-nice-select").not(e).removeClass("open"),e.toggleClass("open"),e.hasClass("open")?(e.find("li"),e.find(".focus").removeClass("focus"),e.find(".selected").addClass("focus"),s(document).on("click.nice_select",t)):(e.focus(),s(document).off(".nice_select"))}function c(){var e=s(this),t=e.closest(".ui-nice-select"),o=(t.find(".selected").removeClass("selected"),e.addClass("selected"),e.data("display")||e.text());t.find(".current").text(o),t.prev("select").val(e.data("value")).trigger("change")}function o(){this.each(function(){var e=s(this),t=e.next(".ui-nice-select");t.length&&(t.remove(),i(e),t.hasClass("open"))&&e.next().trigger("click")})}function i(e){var t=e.find("option"),o=e.find("option:selected"),i=s('<span class="current"></span>'),a=s("<ul></ul>"),n=s("<div></div>").addClass("ui-nice-select").addClass(e.attr("class")||"").addClass(e.attr("disabled")?"disabled":"").attr("tabindex",e.attr("disabled")?null:e.attr("tabindex")||"0").append(i,a);i.text(o.data("display")||o.text()),t.each(function(){var e=s(this);a.append(s("<li></li>").attr("data-value",e.val()).attr("data-display",e.data("display")||null).addClass((e.is(":selected")?" selected":"")+(e.is(":disabled")?" disabled":"")).text(e.text()))}),n.click(l),n.keydown(r),n.on("click","li:not(.disabled)",c),e.after(n)}var a={update:o,destroy:function(){this.each(function(){var e=s(this),t=e.next(".ui-nice-select");t.length&&(t.remove(),e.css("display",""))}),0==s(".ui-nice-select").length&&s(document).off(".nice_select")}};s.fn.niceSelect=function(e){return"string"==typeof e?a[e].apply(this):(this.hide(),this.each(function(){var e=s(this);e.next().hasClass("ui-nice-select")?o.apply(e):i(e)})),this},s(window).on("load",function(){var e;(e=document.createElement("a").style).cssText="pointer-events:auto","auto"!==e.pointerEvents&&s("html").addClass("ui-nice-select-no-csspointerevents"),s('[data-spy="niceSelect"]').niceSelect()})}(jQuery),function(f){var c={"top left":"dn hr1 vb","top right":"dn hl1 vb","top center":"dn hc vb","bottom left":"up hr1 vt","bottom right":"up hl1 vt","bottom center":"up hc vt","left bottom":"rt hr vt1","left top":"rt hr vb1","left middle":"rt hr vm","right bottom":"lt hl vt1","right top":"lt hl vb1","right middle":"lt hl vm"};function p(e,t,o){var i=t.outerWidth(),a=t.outerHeight(),n=t.offset(),s=e.outerWidth(),r=e.outerHeight();switch(o){case"top left":n.top-=r+11,n.left-=s-50;break;case"top right":n.top-=r+11,n.left+=i-50;break;case"top center":n.top-=r+11,n.left+=(i-s)/2;break;case"bottom left":n.top+=a+11,n.left-=s-50;break;case"bottom right":n.top+=a+11,n.left+=i-50;break;case"bottom center":n.top+=a+11,n.left+=(i-s)/2;break;case"left bottom":n.left-=s+11,n.top-=20;break;case"left top":n.left-=s+11,n.top+=a-r+20;break;case"left middle":n.left-=s+11,n.top-=(r-a)/2;break;case"right bottom":n.left+=i+11,n.top-=20;break;case"right top":n.left+=i+11,n.top+=a-r+20;break;case"right middle":n.left+=i+11,n.top-=(r-a)/2}return n}function d(e,t,o){for(var i,a,n,s,r,l,c,d=0;d<o.length;d++){var u=p(e,t,o[d]);if(u.position=o[d],i=e,a=u,c=l=r=s=n=void 0,n=(l=f(window)).scrollTop(),s=l.scrollLeft(),r=n+l.height(),l=s+l.width(),c=a.left+i.outerWidth(),i=a.top+i.outerHeight(),a.left>=s&&a.left<=l&&a.top>=n&&a.top<=r&&s<=c&&c<=l&&n<=i&&i<=r)return u;o[d]=u}return o[0]}function a(e,t,o){e.css({display:"block",visibility:"hidden"});var i,a,n,s=e.find(".ui-popup-arrow").hide();if("center"==o)a=e,(n={left:(n=f(window)).scrollLeft()+(n.outerWidth()-a.outerWidth())/2,top:n.scrollTop()+(n.outerHeight()-a.outerHeight())/2}).left=n.left<10?10:n.left,n.top=n.top<10?10:n.top,i=n;else{var r,l=f(t);if(r=c[o])i=p(e,l,o);else{switch(o){case"top":i=d(e,l,["top center","top left","top right"]);break;case"bottom":i=d(e,l,["bottom center","bottom left","bottom right"]);break;case"left":i=d(e,l,["left middle","left bottom","left top"]);break;case"right":i=d(e,l,["right middle","right bottom","right top"]);break;default:i=d(e,l,["bottom center","bottom left","bottom right","right middle","right bottom","right top","top center","top left","top right","right middle","right bottom","right top"])}r=c[i.position]}}e.css({top:i.top,left:i.left,visibility:"visible"}),r&&s.attr("class","ui-popup-arrow "+r).show()}function n(){return f(".ui-popup-mask")}function s(){return f(".ui-popup-wrap:visible>.ui-popup-frame>.ui-popup")}function r(e){return e.parent().parent(".ui-popup-wrap")}function l(e){return e.data("popup")}function u(e){var t=r(e);t.is(":visible")&&(e.trigger("hide.popup"),t.hide(),f(document).off(".popup"),f(window).off(".popup"),e.trigger("hidden.popup")),n().hide()}function o(e,t){u(s());var o=r(e),i=l(e);i.mask&&n().show(),i.loaded||!i.ajax.url?g(o,e,i,t):(i.showing=t||window,v(e,i))}function h(e){f(document).off(".popup"),e.mouse&&f(document).on("click.popup",t),e.keyboard&&f(document).on("keydown.popup",i),e.resize&&f(window).on("resize.popup",m)}function g(e,t,o,i){t.trigger("show.popup"),e.find(".ui-popup-closer").toggle(o.closer),o.trigger=i||window,a(e,o.trigger,o.position),e.children(".ui-popup-frame").hide()[o.transition](function(){t.trigger("shown.popup"),h(o)}).focus()}function t(e){f(e.target).closest(".ui-popup-wrap").length||u(s())}function i(e){27==e.keyCode&&u(s())}function m(){var e=s(),t=r(e),e=l(e);a(t,e.trigger,e.position)}function v(e,t){var o=r(e);(t=f.extend(l(e),t)).loader&&(e.html('<div class="ui-popup-loader"></div>'),a(o,t.showing,t.position)),b(o,e,t)}function b(e,i,a){var n=++a.sequence;e.addClass("loading").find(".ui-popup-closer, .ui-popup-arrow").hide(),i.trigger("load.popup"),f.ajax(f.extend({},a.ajax,{success:function(e,t,o){n==a.sequence&&(a.ajaxDone.call(i,e,t,o),i.find('[popup-dismiss="true"]').click(function(){return u(i),!1}),a.loaded=!0,i.trigger("loaded.popup",e))},error:function(e,t,o){n==a.sequence&&(a.ajaxFail.call(i,e,t,o),i.trigger("failed.popup"))},complete:function(){e.removeClass("loading"),n==a.sequence&&a.showing&&(g(e,i,a,a.showing),delete a.showing)}}))}function x(e,t){t&&(t=f.extend(l(e),t),r(e).is(":hidden")||(h(t),n().toggle(t.mask)))}function y(e){return(e=e.charAt(0).toLowerCase()+e.slice(1)).replace(/[-_](.)/g,function(e,t){return t.toUpperCase()})}function w(e){var a=["ajax-done","ajax-fail"],n=["loaded","autoload","mask","loader","closer","mouse","keyboard","resize"],s={};return f.each(e[0].attributes,function(e,t){var o=t.name.substring(0,6),i=t.name.substring(6),t=t.value;"popup-"==o&&t&&(0<=f.inArray(i,a)?s[y(i)]=new Function(t):(0<=f.inArray(i,n)&&(t="true"===t),"ajax-"==i.substring(0,5)?(s.ajax||={},s.ajax[y(i.substring(5))]=t):s[y(i)]=t))}),s}function k(e,t){0==n().length&&f('<div class="ui-popup-mask">').appendTo("body");var o,i=r(e);i.length?x(e,t):(t=f.extend({sequence:0},f.popup.defaults,w(e),t),o=f('<div class="ui-popup-frame" tabindex="0">').append(f('<div class="ui-popup-arrow">')).append(f('<i class="ui-close circle ui-popup-closer"></i>').click(function(){u(e)})),i=f('<div class="ui-popup-wrap">').append(o).appendTo("body"),t.cssClass&&i.addClass(t.cssClass),e.appendTo(o).data("popup",t).addClass("ui-popup").show(),t.ajax.url?(t.loaded=!1,t.autoload&&b(i,e,t)):(t.loaded=!0,e.find('[popup-dismiss="true"]').click(function(){return u(e),!1})))}var C={load:v,show:o,hide:u,toggle:function(e,t){t=t||window,!r(e).is(":hidden")&&l(e).trigger===t?u(e):o(e,t)},update:x,trigger:function(e,t){var o=[].slice.call(arguments,2);f(l(e).trigger).trigger(t,o)},destroy:function(e){r(e).remove()}};f.fn.popup=function(t){var o=[].slice.call(arguments);return this.each(function(){var e=f(this);"string"==typeof t?(l(e)||k(e),o[0]=e,C[t].apply(e,o)):k(e,t)})},f.popup=function(){var e=s();return e.popup.apply(e,arguments),e},f.popup.defaults={position:"auto",transition:"slideDown",mask:!1,loader:!1,closer:!1,mouse:!0,keyboard:!0,resize:!0,ajax:{},ajaxDone:function(e,t,o){f(this).html(o.responseText)},ajaxFail:function(e,t,o){var i=f(this),a=f('<div class="ui-popup-error">');e.responseJSON?a.addClass("json").text(JSON.stringify(e.responseJSON,null,4)):e.responseText?a.html(e.responseText):a.text(o||t||"Server error!"),i.empty().append(a)}},f(window).on("load",function(){f('[data-spy="popup"]').popup(),f("body").on("click.popup","[popup-target]",function(e){e.stopPropagation();var e=f(this),t=w(e);f(e.attr("popup-target")).popup(t).popup("toggle",this)})})}(jQuery),function(p){"use strict";p.fn.scrollIntoView=function(e,t,o){var i,a,n,s,r,l,c,d,u,f;return this.length&&(i=this.first(),s=p(window),a=i.offset(),c=s.height(),n=s.width(),f=(u=s.scrollTop())+c,r=(s=s.scrollLeft())+n,u=(l=a.top)+(d=i.outerHeight())<u?l:f<l?c<=d?l:l-(c-d):-1,f={},0<=(d=(l=a.left)+(c=i.outerWidth())<s?l:r<l?n<c?l:l-(n-c):-1)&&(f.scrollLeft=d),0<=u&&(f.scrollTop=u),p("html").animate(f,e,t,o)),this}}(jQuery),function(a){"use strict";a.fn.selectText=function(){var e,t,o,i=a(this);i.length&&(e=document,i=i.get(0),e.body.createTextRange?((o=e.body.createTextRange()).moveToElementText(i),o.select()):window.getSelection&&(t=window.getSelection(),(o=e.createRange()).selectNodeContents(i),t.removeAllRanges(),t.addRange(o)))}}(jQuery),function(s){"use strict";function a(e,t){var o,i=e.offset(),a=e.outerWidth(),n=t.outerWidth(),n=n<a?i.left:i.left-(n-a);t.css({left:n<0?0:n,top:i.top+e.outerHeight()}),a=(o=t).data("opts"),o[a.showEffect](),s(document).on("click.simple_color_picker",function(){r(o)})}function r(e){var t=e.data("opts");e[t.hideEffect](),s(document).off(".simple_color_picker")}s.simpleColorPicker={defaults:{colorsPerLine:8,colors:["#000000","#444444","#666666","#999999","#cccccc","#eeeeee","#f3f3f3","#ffffff","#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#0000ff","#9900ff","#ff00ff","#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc","#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd","#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0","#cc0000","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79","#990000","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47","#660000","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4C1130"],showEffect:"show",hideEffect:"hide"}};var e={destroy:function(){this.each(function(){var e=s(this).data("simpleColorPicker");e&&e.remove()}).off(".simple_color_picker").removeData("simpleColorPicker")}};s.fn.simpleColorPicker=function(i){return"string"==typeof i?(e[i].apply(this),this):this.each(function(){var e=s(this),t=s.extend({},s.simpleColorPicker.defaults,i),o=function(e,t){for(var o,i=s("<div>",{id:"color_picker_"+(e.attr("id")||(new Date).getTime()),class:"ui-simple-color-picker"}).hide().appendTo("body"),a=0;a<t.colors.length;a++){a%t.colorsPerLine==0&&(o=s("<ul>"),i.append(o));var n=t.colors[a];o.append(s("<li>",{style:"background-color: "+n,title:n}))}return i.data("opts",t),e.data("simpleColorPicker",i),i}(e,t);o.find("li").click(function(){e.is("input")&&e.val(s(this).attr("title")),e.trigger("change",s(this).attr("title")),r(o)}),o.click(function(e){e.stopPropagation()}),e.on("click.simple_color_picker",function(){setTimeout(function(){a(e,o)})}),e.is("input")&&e.on("focus.simple_color_picker",function(){a(e,o)})})},s(window).on("load",function(){s('[data-spy="simpleColorPicker"]').simpleColorPicker()})}(jQuery),function(i){"use strict";function a(e){var e=i(e.target),t=e.data("sortCol")||e.text(),o=e.data("sortDir")||"";e.hasClass("sorted")&&(o=e.hasClass("asc")?"desc":"asc"),i(this).trigger("sort.sortable",[t,o])}i.fn.sortable=function(e,t,o){return"sorted"==e?(this.find(".sortable").removeClass("sorted desc asc").filter('[data-sort-col="'+t+'"]').addClass("sorted "+(o||"asc")),this):this.addClass("ui-sortable").off("click.sortable").on("click.sortable",".sortable",a)},i(window).on("load",function(){i('[data-spy="sortable"]').sortable()})}(jQuery),function(t){"use strict";function e(){var e=t(this);e.css("height","auto").height(e.prop("scrollHeight"))}t.fn.autosize=function(){t(this).off("input.autosize").on("input.autosize",e).css({"overflow-y":"hidden",resize:"none"}),e.call(this)},t(window).on("load",function(){t("textarea[autosize]").autosize()})}(jQuery),function(o){"use strict";function e(e){var t;e.ctrlKey&&13==e.which&&("form"==(t=(e=o(this)).attr("enterfire"))||"submit"==t||"true"==t?e.closest("form").submit():o(t).click())}o.fn.enterfire=function(){o(this).off("keyup.enterfire").on("keyup.enterfire",e)},o(window).on("load",function(){o("textarea[enterfire]").enterfire()})}(jQuery),function(t){"use strict";t.fn.textClear=function(){return this.each(function(){var e=t(this);e.hasClass("ui-has-textclear")||(e.addClass("ui-has-textclear"),t('<i class="ui-close ui-textclear"></i>').insertAfter(e).click(function(){""!=e.val()&&(e.val("").trigger("change"),"focus"==e.attr("textclear"))&&e.focus()}))})},t(window).on("load",function(){t("[textclear]").textClear()})}(jQuery),function(c){"use strict";function d(e,t,o){var i={};"string"==typeof o||c.isArray(o)?i.text=o:i=o,c.extend(e,t,i)}function u(e,t){(e=e||c('<div class="ui-toast-single"></div>')).empty(),e.append(c('<span class="ui-toast-loader"></span>')),t.closeable&&e.append(c('<span class="ui-toast-close">&times;</span>'));var o,i=t.html?"html":"text";return t.heading&&e.append(c('<h2 class="ui-toast-heading">')[i](t.heading)),c.isArray(t.text)?(o=c('<ul class="ui-toast-ul">'),c.each(t.text,function(e,t){t&&o.append(c('<li class="ui-toast-'+i+'">')[i](t))}),e.append(o)):e.append(c('<div class="ui-toast-'+i+'">')[i](t.text)),!1!==t.bgColor&&e.css("background-color",t.bgColor),!1!==t.textColor&&e.css("color",t.textColor),t.textAlign&&e.css("text-align",t.textAlign),!1!==t.icon&&e.addClass("ui-toast-has-icon ui-toast-icon-"+t.icon),!1!==t.class&&e.addClass(t.class),e}function f(i,a){i.unbind(),p(a)&&i.on("shown.toast",function(){var t,o;e(i,a),t=i,(o=a).stopHideOnHover&&t.hover(function(){var e=t;(e=e.data("timer"))&&clearTimeout(e),e=t,o.loader&&e.find(".ui-toast-loader").css({width:"0%","-webkit-transition":"none",transition:"none"})},function(){h(t,o),e(t,o)})}),i.find(".ui-toast-close").on("click",function(e){e.preventDefault(),g(i,a)}),"function"==typeof a.beforeShow&&i.on("show.toast",function(){a.beforeShow(i)}),"function"==typeof a.afterShown&&i.on("shown.toast",function(){a.afterShown(i)}),"function"==typeof a.beforeHide&&i.on("hide.toast",function(){a.beforeHide(i)}),"function"==typeof a.afterHidden&&i.on("hidden.toast",function(){a.afterHidden(i)}),"function"==typeof a.onClick&&i.on("click",function(){a.onClick(i)})}function p(e){return!1!==e.hideAfter&&!isNaN(parseInt(e.hideAfter,10))}function e(e,t){var o;t.loader&&(o="width "+(t.hideAfter-400)/1e3+"s ease-in",e.find(".ui-toast-loader").css({width:"100%","-webkit-transition":o,transition:o,"background-color":t.loaderBg}))}function h(e,t){e.data("timer",setTimeout(function(){e.off("mouseenter mouseleave").removeData("timer"),g(e,t)},t.hideAfter))}function g(e,t){var o="hide";switch(t.transition){case"fade":o="fadeOut";break;case"slide":o="slideUp"}e.trigger("hide.toast")[o](function(){e.trigger("hidden.toast")})}c.toast=function(e){var t,o,i={},a=(d(i,c.toast.defaults,e),t=u(void 0,i),e=t,a=i,o=c(".ui-toast-wrap"),a=a.stack,0===o.length?(o=c("<div></div>",{class:"ui-toast-wrap",role:"alert","aria-live":"polite"}),c("body").append(o)):a&&!isNaN(parseInt(a,10))||o.empty(),o.find(".ui-toast-single:hidden").remove(),o.append(e),a&&!isNaN(parseInt(a),10)&&0<(e=o.find(".ui-toast-single").length-a)&&o.find(".ui-toast-single").slice(0,e).remove(),i),n=c(".ui-toast-wrap"),a=a.position,s={left:"auto",top:"auto",right:"auto",bottom:"auto"};if("object"==typeof a)c.extend(s,a);else switch(a){case"mid center":s.left=c(window).outerWidth()/2-n.outerWidth()/2,s.top=c(window).outerHeight()/2-n.outerHeight()/2;break;case"bottom":s.bottom=5,s.left=20,s.right=20;break;case"bottom center":s.left=c(window).outerWidth()/2-n.outerWidth()/2,s.bottom=20;break;case"bottom left":s.bottom=20,s.left=20;break;case"bottom right":s.bottom=20,s.right=20;break;case"top":s.top=5,s.left=20,s.right=20;break;case"top center":s.left=c(window).outerWidth()/2-n.outerWidth()/2,s.top=20;break;case"top left":s.top=20,s.left=20;break;default:s.top=20,s.right=20}n.css(s),f(t,i);var r=t,l="show";switch(i.transition){case"fade":l="fadeIn";break;case"slide":l="slideDown"}return r.hide().trigger("show.toast")[l](function(){r.trigger("shown.toast")}),p(i)&&h(t,i),{reset:function(e){("all"===e?c(".ui-toast-wrap"):t).remove()},update:function(e){d(i,{},e),u(t,i),f(t,i)},clsose:function(){g(t,i)}}},c.toast.defaults={icon:!1,text:"",heading:"",loader:!0,transition:"fade",closeable:!0,hideAfter:5e3,stopHideOnHover:!0,stack:5,position:"top right",bgColor:!1,textColor:!1,textAlign:"left",loaderBg:"#9EC600"}}(jQuery),function(o){"use strict";o.fn.totop=function(){o(this).each(function(){var e=o(this),t=o(window);e.click(function(){o("html,body").animate({scrollTop:0},"slow")}).css({cursor:"pointer"}),t.scroll(function(){e.toggle(t.scrollTop()>t.height())})})},o(window).on("load",function(){o('[totop="true"]').totop()})}(jQuery),function(o){"use strict";function i(e){e.addClass("collapsed").children(".item").next().slideUp()}function a(e){e.removeClass("collapsed").children(".item").next().slideDown()}function n(e){(e.hasClass("collapsed")?a:i)(e)}var s={collapse:function(e,t){i(t||e.find("li:not(.collapsed .leaf)"))},expand:function(e,t){a(t||e.find("li.collapsed"))},toggle:function(e,t){n(t||e.find("li:not(.leaf)"))},destroy:function(e){e.find("li").removeClass("node").children(".item").off(".treeview")}};o.fn.treeview=function(e,t){return"string"==typeof e?s[e].call(this,t):this.find("li").removeClass("node leaf").children(".item").off(".treeview").each(function(){var e=o(this),t=e.parent();e.next("ul").length?(t.addClass("node"),e.on("click.treeview",function(){n(t)})):t.addClass("leaf")}),this},o(window).on("load",function(){o('ul[data-spy="treeview"]').treeview()})}(jQuery),function(g){"use strict";var e,m=("draggable"in(e=document.createElement("div"))||"ondragstart"in e&&"ondrop"in e)&&"FormData"in window&&"FileReader"in window,d=["B","KB","MB","GB","TB","PB","EB","ZB","YB"];function a(e,t){var o,i,a,n,s,r,l,c;t&&(o=e.data("uploader"),i=t.id||t.path||t.name,a=t.name||t.path||t.id,n=a.lastIndexOf("/"),r=a.lastIndexOf("\\"),a=a.substr((r<n?n:r)+1),n=t.size,r=t.type||"",t=0<=(t=r.indexOf("/"))?r.slice(0,t):r,r=g("<div>").addClass("ui-uploader-item").insertAfter(e.children(".ui-uploader-sep")),c=g("<input>").attr("type","hidden").attr("name",o.name).addClass("ui-uploader-fid").appendTo(r),s=g("<span>").addClass("ui-uploader-text").appendTo(r),r=g("<div>").addClass("ui-uploader-image").appendTo(r),c.val(i||""),a=a||i||e.children(".ui-upload-file").val(),o.dnloadUrl&&i&&(l=o.dnloadUrl.replace(o.dnloadHolder,encodeURIComponent(i))),a&&(c='<i class="'+(o.cssIcons[t]||o.cssIcons.file)+' ui-uploader-icon"></i> '+a+" "+function(e,t){for(var o=0,i=d.length-1;1024<=e&&o<i;)e/=1024,o++;return t=Math.pow(10,t||2),"("+Math.round(e*t)/t+" "+d[o]+")"}(n),(l?g("<a>").attr("href",l):g("<span>")).html(c).appendTo(s)),s.append(g("<i>").addClass("ui-uploader-remove fa fa-remove").click(function(){g(this).closest(".ui-uploader-item").fadeOut(function(){g(this).remove()}),e.find(".ui-uploader-error").hide().empty()})),l)&&"image"==t&&g("<a>",{href:l}).append(g("<img>",{src:l})).appendTo(r).fadeIn()}function r(i,a){i.addClass("ui-uploader").data("uploader",a);var o=!1,n=i.children(".ui-uploader-file"),s=i.children(".ui-uploader-btn"),r=i.children(".ui-uploader-error"),e=i.children(".ui-uploader-sep"),l=g('<div class="ui-uploader-progress" style="display: none">').addClass(a.cssProgress).append(g('<div class="ui-uploader-progressbar" style="width: 0%">').addClass(a.cssProgressBar)).insertAfter(0<s.length?s:n);function c(e){l.children(".ui-uploader-progressbar").css({width:e+"%"})}function d(){o=!1,l.hide(),c(0),n.val(""),(s.length?s:n).show()}function u(e,t){c(Math.round(100*e/t))}function f(e,t,o){a.ajaxDone.call(i,e,t,o),i.trigger("uploaded.uploader",e)}function p(e,t,o){a.ajaxFail.call(i,e,t,o)}function h(e){o=!0,(s.length?s:n).hide(),r.hide().empty(),c(0),l.show();var t={};i.find(".ui-uploader-data").each(function(){var e=g(this);t[e.attr("name")]=e.val()}),g.extend(t,a.uploadData),g.ajaf({url:a.uploadUrl,data:t,file:e,dataType:"json",forceAjaf:a.forceAjaf,uprogress:u,success:f,error:p,complete:d})}function t(){var e;o||""==n.val()||((e={})[a.uploadName]=n,h(e))}(r=r.length<1?g('<div class="ui-uploader-error"></div>').insertAfter(l):r).hide(),e.length<1&&g('<div class="ui-uploader-sep"></div>').insertAfter(r),a.name||=n.attr("name"),a.uploadName||=n.attr("name")||a.name,n.change(function(){setTimeout(t,10)}),s.click(function(e){return e.preventDefault(),n.trigger("click"),!1}),m&&i.addClass("ui-uploader-draggable").on("drag dragstart dragend dragover dragenter dragleave drop",function(e){e.preventDefault(),e.stopPropagation()}).on("dragover dragenter",function(){i.addClass("ui-uploader-dragover")}).on("dragleave dragend drop",function(){i.removeClass("ui-uploader-dragover")}).on("drop",function(e){var t;e.preventDefault(),o||(e=e.originalEvent.dataTransfer.files).length&&((t={})[a.uploadName]=n.prop("multiple")?e:e.item(0),h(t))})}g.uploader={defaults:{forceAjaf:!1,dnloadHolder:"$",cssProgress:"progress",cssProgressBar:"progress-bar progress-bar-info progress-bar-striped",cssIcons:{image:"fa fa-file-image-o",video:"fa fa-file-video-o",file:"fa fa-clip"},ajaxDone:function(e){if(e){var t=e.result||e.files,o=g(this);if(t&&!o.children(".ui-uploader-file").prop("multiple")&&o.children(".ui-uploader-item").remove(),g.isArray(t))for(var i=0;i<t.length;i++)a(o,t[i]);else a(o,t)}},ajaxFail:function(e,t,o){g(this).children(".ui-uploader-error").empty().text(o?o+"":e?e.responseText:t).show()}}},g.fn.uploader=function(o){return this.each(function(){var i,a,n,s,e=g(this),t=e.data("uploader");t?g.extend(t,o):r(e,g.extend({},g.uploader.defaults,(i=e,a=["uploadData"],n=["ajaxDone","ajaxFail"],s={},g.each(["name","forceAjaf","uploadUrl","uploadName","dnloadUrl","dnloadHolder"],function(e,t){var o=i.data(t);if(o){if(0<=g.inArray(t,a)){if("string"==typeof o)try{o=JSON.parse(o)}catch(e){return}}else 0<=g.inArray(t,n)&&(o=new Function(o));s[t]=o}}),s),o))})},g(window).on("load",function(){g('[data-spy="uploader"]').uploader()})}(jQuery),function(n){"use strict";n.each({zoomIn:{opacity:"show"},zoomOut:{opacity:"hide"}},function(e,a){n.fn[e]=function(e,t,o){var e=n.speed(e,t,o),i=e.step;return e.step=function(e){n(this).css({transform:"scale("+e+")"}),i&&i.call(this,e)},this.animate(a,e)}})}(jQuery);
//# sourceMappingURL=jquery-plugins.min.js.map