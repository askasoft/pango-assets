(function($) {
	function createIFrame(s) {
		var id = "ajaf_if_" + s.id;
		return $('<iframe id="' + id + '" name="' + id + '" src="' + s.secureUrl + '"></iframe>')
			.css({
				position: 'absolute',
				top: '-9999px',
				left: '-9999px'
			})
			.appendTo('body');
	}
	
	function createForm(s) {
		var id = 'ajaf_form_' + s.id;

		var $form = $('<form></form>')
			.attr({
				id: id,
				name: id,
				action: s.url,
				method: 'POST',
				target: 'ajaf_if_' + s.id
			})
			.css({
				position: 'absolute',
				top: '-9999px',
				left: '-9999px'
			})
			.appendTo('body');

		$form.files = [];
		
		function addFile($f, n) {
			var $c = $f.clone();
			$c.insertAfter($f);

			n = n || $f.attr('name');
			$f.attr({
				id: '',
				name: n
			})
			.appendTo($form);
			
			$form.files[$form.files.length] = { real: $f, clon: $c};
		}
		
		if (s.file) {
			$form.attr({
				encoding: 'multipart/form-data',
				enctype: 'multipart/form-data'
			});

			if (typeof(s.file) == "string") {
				addFile($(s.file));
			}
			else if ($.isArray(s.file)) {
				for (var i = 0; i < s.file.length; i++) {
					addFile($(s.file[i]));
				}
			}
			else {
				for (var n in s.file) {
					addFile($(s.file[n]), n);
				}
			}
		}
		
		function addParam(n, v) {
			$('<input type="hidden">')
				.attr('name', n)
				.val(v)
				.appendTo($form);
		}

		function addParams(n, v) {
			if ($.isArray(v)) {
				for (var i = 0; i < v.length; i++) {
					addParam(n, v[i]);
				}
			}
			else {
				addParam(n, v);
			}
		}

		if (s.data) {
			if ($.isArray(s.data)) {
				for (var i = 0; i < s.data.length; i++) {
					addParams(s.data[i].name, s.data[i].value);
				}
			}
			else {
				for (var n in s.data) {
					var v = s.data[n];
					if (v) {
						addParams(n, v)
					}
				}
			}
		}

		return $form;
	}

	function httpData(xhr, type) {
		var data = type == "xml" ? xhr.responseXML : xhr.responseText;
		
		if (type == "script") {
			// If the type is "script", eval it in global context
			$.globalEval(data);
		}
		else if (type == "json") {
			// Get the JavaScript object, if JSON is used.
			data = $.parseJSON(data);
		}
		else if (type == "html") {
			// evaluate scripts within html
			$("<div>").html(data).evalScripts();
		}
		
		return data;
	}

	$.ajaf = function(s) {
		// TODO introduce global settings, allowing the client to modify them for all requests, not only timeout
		s = $.extend({
				id: new Date().getTime(),
				secureUrl: 'javascript:false'
			}, s);
		
		var $if = createIFrame(s);
		var $form = createForm(s);
		
		// Watch for a new set of requests
		if (s.start) {
			s.start();
		}

		var done = false, xhr = {};

		// Wait for a response to come back
		var callback = function(timeout) {
			if (done) {
				return;
			}
			done = true;

			var status = timeout == "timeout" ? "error" : "success";
			try {
				var ioe = $if.get(0);
				var	doc = ioe.contentWindow.document || ioe.contentDocument || window.frames[ioe.id].document;
				if (doc && doc.body) {
					if (s.selector) {
						xhr.responseText = $(doc.body).find(s.selector).html();
					}
					else {
						var fc = doc.body.firstChild;
						var tn = (fc && fc.tagName) ? fc.tagName.toUpperCase() : "";
						if (tn == "TEXTAREA") {
							xhr.responseText = fc.value;
						}
						else if (tn == "PRE") {
							xhr.responseText = $(fc).text();
						}
						else {
							xhr.responseText = doc.body.innerHTML;
						}
					}
				}
				xhr.responseXML = (doc && doc.XMLDocument) ? doc.XMLDocument : doc;

				if (typeof(console) != "undefined") {
					console.debug("jquery.ajaf(" + s.url + "): " + (xhr.responseText || xhr.responseXML));
				}
			}
			catch(e) {
				status = "error";
				if (s.error) {
					s.error(xhr, status, e);
				}
			}

			// Revert files
			for (var i = 0; i < $form.files.length; i++) {
				var f = $form.files[i];
				f.real.attr({
					id: f.clon.attr('id'),
					name: f.clon.attr('name')
				}).insertAfter(f.clon);
				f.clon.remove();
			}
			$form.remove();	

			if (status == "timeout") {
				if (s.error) {
					s.error(xhr, status);
				}
			}
			else if (status == "success") {
				// Make sure that the request was successful or not modified
				try {
					// process the data (runs the xhr through httpData regardless of callback)
					var data = httpData(xhr, s.dataType);

					// If a local callback was specified, fire it and pass it the data
					if (s.success) {
						s.success(data, xhr);
					}
				}
				catch(e) {
					if (s.error) {
						s.error(xhr, status, e);
					}
				}
			}

			try {
				// The request was completed
				if (s.complete) {
					s.complete(xhr, status);
				}
			}
			finally {
				//clear up the created iframe after file uploaded.
				$if.unbind();
				setTimeout(function() {
					try {
						$if.remove();
					}
					catch(e) {
						if (typeof(console) != "undefined") {
							console.debug("jquery.ajaf(" + s.url + "): failed to remove " + $if);
						}
					}
				}, 100);
				xhr = null;
			}
		};
		
		if (s.send) {
			s.send(xhr, s);
		}

		// Timeout checker
		if (s.timeout > 0) {
			setTimeout(function(){
				// Check to see if the request is still happening
				if (!done) {
					callback("timeout");
				}
			}, s.timeout);
		}
		
		try {
			$form.submit();
		}
		catch(e) {
			if (s.error) {
				s.error(xhr, "send", e);
			}
		}
		
		$if.load(callback);

		return { abort: function(){} };	
	};
})(jQuery);

(function($) {
	$.copyToClipboard = function(s) {
		if (window.clipboardData) {
			// ie
			clipboardData.setData('Text', s);
			return;
		}

		var $t = $('<textarea>').css({ 'width' : '0px', 'height': '0px' }).text(s);
		$('body').append($t);

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
jQuery.cookie = function(name, value, options) {
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
			}
			else {
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
	}
	else { // only name given, get cookie
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
jQuery.cookie.defaults = {};

jQuery.jcookie = function(name, value, options) {
	if (typeof value != 'undefined') { // name and value given, set cookie
		$.cookie(name, String.encodeBase64(JSON.stringify(value)), options);
	}
	else {
		try {
			return JSON.parse(String.decodeBase64($.cookie(name)));
		}
		catch (ex) {
			return {};
		}
	}
};

(function ($) {
	$.fn.disable = function(state) {
		return this.each(function() {
			this.disabled = state;
		});
	};
})(jQuery);
(function($) {
	$.jcss = function(url) {
		if ($('link[href="' + url + '"]').size()) {
			return false;
		}
		$('<link>').attr({ type: 'text/css', rel: 'stylesheet', href: url}).appendTo('head');
		return true;
	};
})(jQuery);

(function($) {
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


(function ($) {
	$.fn.replaceClass = function(s, t) {
		return this.removeClass(s).addClass(t);
	};
})(jQuery);
(function($) {
	function collapse($el) {
		if (!$el.hasClass('ui-collapsed')) {
			$el.addClass('ui-collapsed')
				.children(':not(legend)').slideUp().end()
				.find('legend>i.ui-fieldset-icon')
					.removeClass('fa-caret-down')
					.addClass('fa-caret-right');
		}
	}
	
	function expand($el) {
		if ($el.hasClass('ui-collapsed')) {
			$el.removeClass('ui-collapsed')
				.children(':not(legend)').slideDown().end()
				.find('legend>i.ui-fieldset-icon')
					.removeClass('fa-caret-right')
					.addClass('fa-caret-down');
		}
	}
	
	$.fn.fieldset = function(config) {
		config = config || {};
		return this.each(function() {
			var $t = $(this);
			if (!$t.data('fieldset')) {
				var c = config.collapsed && !($t.hasClass('ui-collapsed'));
				$t.data('fieldset', true)
					.addClass('ui-collapsible' + (c ? ' ui-collapsed' : ''))
					.children('legend')
						.click(function() {
							var $el = $(this).closest('fieldset');
							if ($el.hasClass('ui-collapsed')) {
								expand($el);
							}
							else {
								collapse($el);
							}
						});

				c = $t.hasClass('ui-collapsed');
				if (config.icon !== false && $t.find('legend>i.ui-fieldset-icon').size() == 0) {
					$t.children('legend')
						.prepend('<i class="ui-fieldset-icon fa fa-caret-'
								+ (c ? 'right' : 'down')
								+ '"></i>');
				}
				$t.children(':not(legend)')[c ? 'hide' : 'show']();
			}
			
			switch(config) {
			case 'collapse':
				collapse($t);
				break;
			case 'expand':
				expand($t);
				break;
			}
		});
	};

	// FIELDSET DATA-API
	// ==================
	$(window).on('load', function () {
		$('[data-spy="fieldset"]').fieldset();
	});
})(jQuery);
(function($) {
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

			var $a = null;
			if (a == 'true') {
				$a = $i.find('input,select,textarea,button').not(':hidden,:disabled,[readonly]').eq(0);
				if ($a.length < 1) {
					$a = $i.find('a').not(':hidden,:disabled').eq(0);
					if ($a.length < 1) {
						$a = $i;
					}
				}
			}
			else if (a != '' && a != 'false') {
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
		$('[focusme]').focusme();
	});
})(jQuery);
(function($) {
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
			m[v.name] = [ ov, v.value ];
		});
		return m;
	};

})(jQuery);

(function($) {
	function clearMaskTimeout($el) {
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

	function maskElement($el, c) {
		if ($el.isLoadMasked()) {
			unmaskElement($el);
		} else {
			clearMaskTimeout($el);
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
		if (c.mask !== false) {
			$el.append($('<div class="ui-loadmask-mask"></div>'));
		}
		
		$el.append($lm).addClass("ui-loadmasked");

		if (c.timeout > 0) {
			$el.data("_unmask_timeout", setTimeout(function() {
				unmaskElement($el);
			}, c.timeout));
		}
	}

	function unmaskElement($el) {
		clearMaskTimeout($el);

		$el.find(".ui-loadmask-mask, .ui-loadmask").remove();
		$el.removeClass("ui-loadmasked ui-loadmasked-relative");
	}

	/**
	 * Displays loading mask over selected element(s). Accepts both single and multiple selectors.
	 * @param cssClass css class for the mask element
	 * @param content  html content that will be add to the loadmask
	 * @param html  html message that will be display
	 * @param text  text message that will be display (html tag will be escaped)
	 * @param mask  add mask layer (default: true)
	 * @param fixed fixed position (default: false)
	 * @param delay Delay in milliseconds before element is masked (optional). If unloadmask() is called 
	 *              before the delay times out, no mask is displayed. This can be used to prevent unnecessary 
	 *              mask display for quick processes.
	 */
	$.fn.loadmask = function(c) {
		if (typeof(c) == 'string') {
			c = { text: c };
		}
		c = $.extend({}, c);
		return this.each(function() {
			if (c.delay !== undefined && c.delay > 0) {
				var $el = $(this);
				$el.data("_mask_timeout", setTimeout(function() {
					maskElement($el, c);
				}, c.delay));
			}
			else {
				maskElement($(this), c);
			}
		});
	};
	
	/**
	 * Removes mask from the element(s). Accepts both single and multiple selectors.
	 */
	$.fn.unloadmask = function() {
		return this.each(function() {
			unmaskElement($(this));
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
// Modifyed by Frank Wang

(function($) {
	$.fn.niceSelect = function(method) {
		// Methods
		if (typeof method == 'string') {
			switch (method) {
			case 'update':
				this.each(function() {
					var $select = $(this);
					var $dropdown = $(this).next('.nice-select');
					var open = $dropdown.hasClass('open');

					if ($dropdown.length) {
						$dropdown.remove();
						create_nice_select($select);

						if (open) {
							$select.next().trigger('click');
						}
					}
				});
				break;
			case 'destroy':
				this.each(function() {
					var $select = $(this);
					var $dropdown = $(this).next('.nice-select');

					if ($dropdown.length) {
						$dropdown.remove();
						$select.css('display', '');
					}
				});
				if ($('.nice-select').length == 0) {
					$(document).off('.nice_select');
				}
				break;
			default:
				console.log('Method "' + method + '" does not exist.')
				break;
			}
			return this;
		}

		// Hide native select
		this.hide();

		// Create custom markup
		this.each(function() {
			var $select = $(this);

			if (!$select.next().hasClass('nice-select')) {
				create_nice_select($select);
			}
		});

		function create_nice_select($select) {
			$select.after($('<div></div>')
				.addClass('nice-select')
				.addClass($select.attr('class') || '')
				.addClass($select.attr('disabled') ? 'disabled' : '')
				.attr('tabindex', $select.attr('disabled') ? null : '0')
				.html('<span class="current"></span><ul></ul>')
			);

			var $dropdown = $select.next();
			var $options = $select.find('option');
			var $selected = $select.find('option:selected');

			$dropdown.find('.current').html($selected.data('display') || $selected.text());

			$options.each(function(i) {
				var $option = $(this);
				var display = $option.data('display');

				$dropdown.find('ul').append($('<li></li>')
					.attr('data-value', $option.val())
					.attr('data-display', (display || null))
					.addClass(
						($option.is(':selected') ? ' selected' : '') +
						($option.is(':disabled') ? ' disabled' : ''))
					.html($option.text())
				);
			});
		}

		/* Event listeners */

		// Unbind existing events in case that the plugin has been initialized before
		$(document).off('.nice_select');

		// Open/close
		$(document).on('click.nice_select', '.nice-select', function(event) {
			var $dropdown = $(this);

			$('.nice-select').not($dropdown).removeClass('open');
			$dropdown.toggleClass('open');

			if ($dropdown.hasClass('open')) {
				$dropdown.find('li');
				$dropdown.find('.focus').removeClass('focus');
				$dropdown.find('.selected').addClass('focus');
			} else {
				$dropdown.focus();
			}
		});

		// Close when clicking outside
		$(document).on('click.nice_select', function(event) {
			if ($(event.target).closest('.nice-select').length === 0) {
				$('.nice-select').removeClass('open');
			}
		});

		// Option click
		$(document).on('click.nice_select', '.nice-select li:not(.disabled)', function(event) {
			var $option = $(this);
			var $dropdown = $option.closest('.nice-select');

			$dropdown.find('.selected').removeClass('selected');
			$option.addClass('selected');

			var text = $option.data('display') || $option.text();
			$dropdown.find('.current').text(text);

			$dropdown.prev('select').val($option.data('value')).trigger('change');
		});

		// Keyboard events
		$(document).on('keydown.nice_select', '.nice-select', function(event) {
			var $dropdown = $(this);
			var $focused_option = $($dropdown.find('.focus') || $dropdown.find('ui li.selected'));

			// Space or Enter
			if (event.keyCode == 32 || event.keyCode == 13) {
				if ($dropdown.hasClass('open')) {
					$focused_option.trigger('click');
				} else {
					$dropdown.trigger('click');
				}
				return false;
				// Down
			} else if (event.keyCode == 40) {
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
				// Up
			} else if (event.keyCode == 38) {
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
				// Esc
			} else if (event.keyCode == 27) {
				if ($dropdown.hasClass('open')) {
					$dropdown.trigger('click');
				}
				// Tab
			} else if (event.keyCode == 9) {
				if ($dropdown.hasClass('open')) {
					return false;
				}
			}
		});

		// Detect CSS pointer-events support, for IE <= 10. From Modernizr.
		var style = document.createElement('a').style;
		style.cssText = 'pointer-events:auto';
		if (style.pointerEvents !== 'auto') {
			$('html').addClass('no-csspointerevents');
		}

		return this;
	};

}(jQuery));
(function($) {
	function __click(evt) {
		var el = evt.target;
		if (!el || el.tagName == "HTML") {
			return;
		}

		var $e = $(el);
		if ($e.hasClass('ui-popup') || $e.closest('.ui-popup').length) {
			return;
		}

		var $c = $('.ui-popup:visible>.ui-popup-content'), c = $c.data('popup');
		if (c && c.trigger == el) {
			return;
		}

		_hide($c);
		$(document).off('click.popup');
	}

	function __ajaxError(xhr, status, err) {
		if (xhr.responseJSON) {
			return JSON.stringify(xhr.responseJSON, null, 2);
		}

		return xhr.responseText || '<h1>' + (err || status) + '</h1>';
	}

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

	function __position($p, $t, position) {
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
			p.top = p.top - ph + th + 20;
			break;
		case 'left middle':
			p.left -= (pw + 11);
			p.top -= (ph / 2 - 20);
			break;
		case 'right bottom':
			p.left += tw + 11;
			p.top -= 20;
			break;
		case 'right top':
			p.left += tw + 11;
			p.top = p.top - ph + th + 20;
			break;
		case 'right middle':
			p.left += tw + 11;
			p.top -= (ph / 2 - 20);
			break;
		}

		return p;
	}

	function __in_screen($p, p) {
		var $w = $(window),
			wt = $w.scrollTop(), wl = $w.scrollLeft(),
			wb = wt + $w.height(), wr = wl + $w.width(),
			pr = p.left + $p.outerWidth(), pb = p.top + $p.outerHeight();

		return p.left >= wl && p.left <= wr
			&& p.top >= wt && p.top <= wb
			&& pr >= wl && pr <= wr
			&& pb >= wt && pb <= wb;
	}

	function __positions($p, $t, ps) {
		for (var i = 0; i < ps.length; i++) {
			var p = __position($p, $t, ps[i]);
			p.position = ps[i];
			if (__in_screen($p, p)) {
				return p;
			}
			ps[i] = p;
		}
		return ps[0];
	}

	function __align($p, trigger, position) {
		var $a = $p.find('.ui-popup-arrow').hide();
		if (position == 'center') {
			$p.addClass('ui-popup-center').css({
				top: '50%',
				left: '50%'
			});
			return;
		}

		$p.removeClass('ui-popup-center');

		var $t = $(trigger), ac = ArrowClasses[position];
		if (ac) {
			p = __position($p, $t, position);
		} else {
			switch (position) {
			case 'top':
				p = __positions($p, $t, ['top center', 'top left', 'top right']);
				break;
			case 'bottom':
				p = __positions($p, $t, ['bottom center', 'bottom left', 'bottom right']);
				break;
			case 'left':
				p = __positions($p, $t, ['left middle', 'left bottom', 'left top']);
				break;
			case 'right':
				p = __positions($p, $t, ['right middle', 'right bottom', 'right top']);
				break;
			case 'auto':
			default:
				p = __positions($p, $t, [
					'bottom center', 'bottom left', 'bottom right',
					'right middle', 'right bottom', 'right top',
					'top center', 'top left', 'top right',
					'right middle', 'right bottom', 'right top'
				]);
				break;
			}
			ac = ArrowClasses[p.position];
		}

		$p.css({
			position: 'absolute',
			top: p.top,
			left: p.left
		});
		$a.attr('class', 'ui-popup-arrow ' + ac).show();
	}

	function __mypop($c) {
		return $c.parent('.ui-popup');
	}

	function _toggle($c, trigger) {
		trigger = trigger || window;
		var $p = __mypop($c);
		if ($p.is(':hidden')) {
			_show($c, trigger);
			return;
		}

		var c = $c.data('popup');
		if (c.trigger === trigger) {
			_hide($c);
			return;
		}

		_show($c, trigger);
	}

	function _show($c, trigger) {
		_hide($('.ui-popup:visible>.ui-popup-content'));

		var $p = __mypop($c).show(), c = $c.data('popup');

		if (!c.loaded) {
			c.showing = trigger || window;
			__align($p, c.showing, c.position);
			_load($c);
			return;
		}

		$c.trigger('show.popup');

		c.trigger = trigger || window;
		__align($p, c.trigger, c.position);
		$c.hide().css('visibility', 'visible')[c.transition](function() {
			$c.trigger('shown.popup');
			if (c.clickHide == true || c.clickHide == 'true') {
				$(document).on('click.popup', __click);
			}
		});
	}

	function _hide($c) {
		$c.trigger('hide.popup');
		var $p = __mypop($c);
		if ($p.is(':visible')) {
			$p.hide();
			$(document).off('click.popup');
			$c.trigger('hidden.popup');
		}
	}

	function _load($c, c) {
		$c.trigger('load.popup');
		$c.html('<div class="ui-popup-loading"></div>');

		c = $.extend($c.data('popup'), c);
		$.ajax({
			url: c.url,
			data: c.data,
			dataType: c.dataType,
			method: c.method,
			success: function(html) {
				$c.css('visibility', 'hidden').html(html);
			},
			error: function(xhr, status, err) {
				$c.css('visibility', 'hidden').html((c.ajaxError || __ajaxError)(xhr, status, err));
			},
			complete: function() {
				c.loaded = true;
				$c.trigger('loaded.popup');
				if (c.showing) {
					if (__mypop($c).is(':visible')) {
						_show($c, c.showing);
					}
					delete c.showing;
				}
			}
		});
	}

	function _update($c, o) {
		if (o) {
			$.extend($c.data('popup'), o);
		}
	}

	function _callback($c) {
		var c = $c.data('popup');
		if (typeof (c.callback) == 'function') {
			c.callback.apply(c.trigger, [].slice.call(arguments, 1));
		}
	}

	function __camelCase(s) {
		s = s.charAt(0).toLowerCase() + s.slice(1);
		return s.replace(/[-_](.)/g, function(m, g) {
			return g.toUpperCase();
		});
	}

	function __options($c) {
		var c = {};
		var ks = ['url', 'method', 'data', 'data-type', 'position', 'transition', 'click-hide', 'callback'];
		$.each(ks, function(i, k) {
			var o = $c.attr('popup-' + k);
			if (o !== undefined && o !== null && o != '') {
				k = __camelCase(k);
				c[k] = k == 'callback' ? new Function(o) : o;
			}
		})
		return c;
	}

	function __init($c, c) {
		var $p = __mypop($c);
		if ($p.length) {
			_update($c, c);
			return;
		}

		c = $.extend({}, $.popup.defaults, __options($c), c);

		$p = $('<div class="ui-popup">').css({ 'display': 'none' })
			.append($('<div class="ui-popup-arrow">'))
			.append($('<i class="ui-popup-close">&times;</i>'))
			.appendTo('body');

		if (c.cssClass) {
			$p.addClass(c.cssClass);
		}

		$p.find('.ui-popup-close').click(function() {
			_hide($c);
		});

		$c.appendTo($p).data('popup', c).addClass('ui-popup-content').css({ 'display': 'block' });

		if (c.url) {
			c.loaded = false;
			if (c.autoload) {
				_load($c);
			}
		} else {
			c.loaded = true;
		}
	}

	var api = {
		load: _load,
		show: _show,
		hide: _hide,
		update: _update,
		toggle: _toggle,
		callback: _callback
	};

	$.fn.popup = function(c) {
		var args = [].slice.call(arguments);
		this.each(function() {
			var $c = $(this);

			if (typeof (c) == 'string') {
				var p = $c.data('popup');
				if (!p) {
					__init($c);
				}
				args[0] = $c;
				api[c].apply($c, args);
				return;
			}

			__init($c, c);
		});
		return this;
	};

	$.popup = function() {
		var $c = $('.ui-popup:visible>.ui-popup-content');
		$c.popup.apply($c, arguments);
		return $c;
	};

	$.popup.defaults = {
		dataType: 'html',
		method: 'GET',
		position: 'auto',
		transition: 'slideDown',
		clickHide: true
	};

	// POPUP DATA-API
	// ==================
	$(window).on('load', function() {
		$('[data-spy="popup"]').popup();
		$('[popup-target]').click(function() {
			var $t = $(this), c = __options($t);
			$($t.attr('popup-target')).popup(c).popup('toggle', this);
		});
	});

})(jQuery);
(function($) {
	$.fn.scrollIntoView = function(c) {
		if (!this.length) {
			return this;
		}
		
		var $e = this.first(), $w = $(window), eo = $e.offset();
		var wh = $w.height(), ww = $w.width();
		var st = $w.scrollTop(), sb = st + wh, sl = $w.scrollLeft(), sr = sl + ww;
		var et = eo.top, eh = $e.outerHeight(), eb = et + eh;
		var el = eo.left, ew = $e.outerWidth(), er = el + ew;
		
		var x = sl > er ? el : (sr < el ? (ew > ww ? el : el - (ww - ew)) : -1);
		var y = st > eb ? et : (sb < et ? (eh >= wh ? et : et - (wh - eh)) : -1);
		
		if (x >= 0 || y >= 0) {
			var ss = {};
			if (x >= 0) { ss.scrollLeft = x; }
			if (y >= 0) { ss.scrollTop = y; }
			var $hb = $('html,body');
			if (c) {
				$hb.animate(ss, c);
			}
			else {
				$hb.prop(ss);
			}
		}
		return this;
	};
})(jQuery);
(function($) {
	$.fn.selectText = function() {
		var $t = $(this);
		if ($t.length) {
			var doc = document;
			var el = $t.get(0);
			if (doc.body.createTextRange) {
				var r = doc.body.createTextRange();
				r.moveToElementText(el);
				r.select();
			}
			else {
				if (window.getSelection) {
					var ws = window.getSelection();
					var r = doc.createRange();
					r.selectNodeContents(el);
					ws.removeAllRanges();
					ws.addRange(r);
				}
			}
		}
	};
})(jQuery);
(function($) {
	$.fn.enterfire = function() {
		$(this).each(function() {
			var f = $(this).attr('enterfire');
			if (f != 'hooked') {
				$(this).attr('enterfire', 'hooked').keyup(function(evt) {
					if (evt.ctrlKey && evt.which == 13) {
						if (f == 'form' || f == 'submit' || f == 'true') {
							$(this).closest('form').submit();
						}
						else {
							$(f).click();
						}
					}
				});
			}
		});
	};
	
	$.fn.autosize = function() {
		$(this).each(function() {
			var a = $(this).attr('autosize');
			if (a == 'hooked') {
				$(this).css('height', 'auto').height($(this).prop('scrollHeight'));
			}
			else {
				$(this).css('overflow-y', 'hidden').attr('autosize', 'hooked').on('input', function() {
					$(this).css('height', 'auto').height($(this).prop('scrollHeight'));
				});
			}
		});
	};

	$(window).on('load', function() {
		$('textarea[enterfire]').enterfire();
		$('textarea[autosize]').autosize();
	});
})(jQuery);
// jQuery toast plugin created by Kamran Ahmed copyright MIT license 2015 (modified by Frank Wang)
(function($) {
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
			for (var i = 0; i < os.text.length; i++) {
				$ul.append($('<li class="ui-toast-' + sm + '">')[sm](os.text[i]));
			}
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
			case 'mid-center':
				op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
				op.top = ($(window).outerHeight() / 2) - $c.outerHeight() / 2;
				break;
			case 'bottom':
				op.bottom = 5;
				op.left = 20;
				op.right = 20;
				break;
			case 'bottom-center':
				op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
				op.bottom = 20;
				break;
			case 'bottom-left':
				op.bottom = 20;
				op.left = 20;
				break;
			case 'bottom-right':
				op.bottom = 20;
				op.right = 20;
				break;	
			case 'top':
				op.top = 5;
				op.left = 20;
				op.right = 20;
				break;
			case 'top-center':
				op.left = ($(window).outerWidth() / 2) - $c.outerWidth() / 2;
				op.top = 20;
				break;
			case 'top-left':
				op.top = 20;
				op.left = 20;
				break;
			case 'top-right':
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
		position: 'top-right',
		bgColor: false,
		textColor: false,
		textAlign: 'left',
		loaderBg: '#9EC600'
	};

})(jQuery);
(function($) {
	$.fn.totop = function() {
		$(this).each(function() {
			var $t = $(this);
			$t.click(function() {
				$('html,body').animate({ scrollTop: 0 }, 'slow');
			}).css({cursor: 'pointer'});
	
			var $w = $(window);
			$w.scroll(function() {
				$t[$w.scrollTop() > $w.height() ? 'show' : 'hide']();
			});
		});
	};

	$(window).on('load', function() {
		$('[totop]').totop();
	});
})(jQuery);

