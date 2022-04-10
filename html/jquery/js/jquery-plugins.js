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
	// Use of jQuery.browser is frowned upon.
	// More details: http://api.jquery.com/jQuery.browser
	// jQuery.uaMatch maintained for back-compat
	$.uaMatch = function( ua ) {
		ua = ua.toLowerCase();

		var m = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
			/(webkit)[ \/]([\w.]+)/.exec( ua ) ||
			/(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
			/(msie) ([\w.]+)/.exec( ua ) ||
			ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
			[];

		return {
			b: m[ 1 ] || "",
			v: m[ 2 ] || "0"
		};
	};

	var m = $.uaMatch( navigator.userAgent );
	var b = { version: 0 };

	if (m.b) {
		b[m.b] = true;
		b.version = m.v;
	}

	// Chrome is Webkit, but Webkit is also Safari.
	if (b.chrome) {
		b.webkit = true;
	}
	else if (b.webkit) {
		b.safari = true;
	}

	$.browser = $.extend(b, {
		width: function() {
			return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
		},
		height: function() {
			return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
		},
		ipad: /ipad/i.test(navigator.userAgent),
		ipod: /ipod/i.test(navigator.userAgent),
		iphone: /iphone/i.test(navigator.userAgent),
		ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
		android: /android/i.test(navigator.userAgent),
		majorVersion: parseInt(b.version, 10)
	});
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
	/**
	 * Move the selected element(s) to the center position of parent element (default: body)
	 */
	$.fn.center = function(c) {
		c = c || {};
		return this.each(function() {
			var $s = $(this);
			var $t = c.target ? $(c.target) : $s.parent();

			var tl = $t.scrollLeft(),
				tt = $t.scrollTop(),
				tw = $t.width(),
				th = $t.height(),
				ow = $s.outerWidth(),
				oh = $s.outerHeight();
			
			try {
				if (c.relative === false || (c.relative !== true && $t.css('position') != 'relative')) {
					var r = $t.offset();
					tl = r.left;
					tt = r.top;
				}
			}
			catch (e) {
			}

			var ot = Math.round(tt + (th - oh) / 2),
				ol = Math.round(tl + (tw - ow) / 2);
			$s.css({
				top: ot + "px",
				left: ol + "px"
			});
		});
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
				this.find('input[name="' + n + '"]').each(function() {
					var $t = $(this);
					switch ($t.attr('type')) {
					case 'button':
					case 'file':
					case 'submit':
						break;
					case 'checkbox':
						var va = $.isArray(v) ? v : [ v ];
						var oc = $t.prop('checked'), nc = $.inArray($t.val(), va);
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
			m[v.name] = v.value;
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

		//if this element has center timeout scheduled then remove it
		t = $el.data("_maskc_timeout");
		if (t) {
			clearTimeout(t);
			$el.removeData("_maskc_timeout");
		}
	}

	function maskElement($el, c) {
		if ($el.isLoadMasked()) {
			unmaskElement($el);
		}
		else {
			clearMaskTimeout($el);
		}
		
		if ($el.css("position") == "static") {
			$el.addClass("ui-loadmasked-relative");
		}
		$el.addClass("ui-loadmasked");

		if (c.mask !== false) {
			var $m = $('<div class="ui-loadmask-mask"></div>');
			//auto height fix for IE
			if ($.browser && $.browser.msie) {
				$m.height($el.height() + parseInt($el.css("padding-top")) + parseInt($el.css("padding-bottom")));
				$m.width($el.width() + parseInt($el.css("padding-left")) + parseInt($el.css("padding-right")));
			}
			$el.append($m);
		}
		
		//fix for z-index bug with selects in IE6
		if ($.browser && $.browser.msie && parseInt($.browser.version, 10) < 7) {
			$el.find("select").addClass("ui-loadmasked-hidden");
		}
		
		var $mb = $('<div class="ui-loadmask" style="display:none;"></div>');
		if (c.cssClass) {
			$mb.addClass(c.cssClass);
		}
		if (c.content) {
			$mb.append($(c.content));
		}
		else {
			var $tb = $('<table class="ui-loadmask-tb"></table>'),
				$tr = $('<tr>'),
				$ti = $('<td class="ui-loadmask-icon">').append($('<i>').addClass(c.iconClass));
			$tr.append($ti);

			if (c.html || c.text) {
				$mb.addClass('ui-loadmask-hasmsg');
				var $tx = $('<td class="ui-loadmask-text">');
				if (c.html) {
					$tx.html(c.html);
				}
				else {
					$tx.text(c.text);
				}
				$tr.append($tx);
			}
			$mb.append($tb.append($tr));
		}
		$el.append($mb);

		if (c.fixed || typeof($.fn.center) != 'function') {
			$mb.addClass('ui-loadmask-fixed');
		}
		else {
			$mb.center();
			$el.data("_maskc_timeout", setInterval(function() {
				$mb.center();
			}, 250));
		}
		$mb.show();
		
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
		$el.find("select").removeClass("ui-loadmasked-hidden");
	}

	$.loadmask = {
		defaults: {
			iconClass: 'ui-loadmask-loading'
		}
	};

	/**
	 * Displays loading mask over selected element(s). Accepts both single and multiple selectors.
	 * @param cssClass css class for the mask element
	 * @param iconClass css class for the icon (default: ui-loadmask-loading)
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
		c = $.extend({}, $.loadmask.defaults, c);
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
(function($) {
	var __inited = false;
	var __active = null;
	var __tclose = null;
	var __tenter = null;

	function __emptyFn() {
	}
	
	function __init() {
		if (!__inited) {
			__inited = true;
			$('<div id="ui_popup_loader" style="display:none"></div>').appendTo('body');
			$('<div id="ui_popup_shadow" style="display:none">'
				+ ($.browser.msie && parseInt($.browser.version, 10) < 7 ?
						'<iframe src="javascript:false;" frameborder="0"></iframe>' : '')
				+ '</div>').appendTo('body');
			$('<i id="ui_popup_closer" class="fa fa-times-circle" style="display:none"></i>')
				.appendTo('body')
				.mousedown(__mousedown);

			$(document).mousedown(__mousedown);
		}
	}

	function __mousedown(e) {
		if (__active && !__tclose) {
			__tclose = setTimeout(function() { 
				__tclose = null;
				__close(e.target); 
			}, 200);
		}
	}

	function __center($p) {
		var $w = $(window);
		$p.css({
			top: ($w.scrollTop() + 30) + "px",
			left: ($w.scrollLeft() + 30) + "px",
			width: ($.browser.width() - 60) + "px",
			height: ($.browser.height() - 60) + "px"
		});
	}

	function __shadow() {
		if (__active) {
			var $p = $('#' + __active);
			if ($p.hasClass('ui-popup-center')) {
				__center($p);
			}
			var p = $p[0];
			$('#ui_popup_shadow').css({
				top: p.offsetTop + 'px',
				left: p.offsetLeft + 'px',
				width: p.offsetWidth + 'px',
				height: p.offsetHeight + 'px',
				display: 'block'
			}).children('iframe').css({
				width: p.firstChild.offsetWidth + 'px',
				height: p.firstChild.offsetHeight + 'px'
			});
			$('#ui_popup_closer').css({
				top: p.offsetTop - 4 + 'px',
				left: p.offsetLeft + p.offsetWidth - 12 + 'px',
				display: 'block'
			})
			setTimeout(__shadow, 100);
		}
		else {
			$('#ui_popup_shadow, #ui_popup_closer').css('display', 'none');
		}
	}

	function __close(el) {
		if (!__active || (el && el.tagName == "HTML")) {
			return;
		}

		if (el.id == 'ui_popup_closer') {
			_hide();
			return;
		}
		
		var $p = $("#" + __active), p = $p.get(0);
		var elt = $p.data('popup').trigger;

		// is self or trigger clicked?
		while (el && el.tagName != 'BODY') {
			if (el === p || el === elt || $(el).css('position') == 'absolute') {
				return;
			}
			el = el.parentNode;
		}
		
		if (el) {
			_hide({silent: true});
		}
	}
	
	function __align(c, $el) {
		var $t = $(c.target || c.trigger);
		if (c.popover || $t.length < 1) {
			$el.addClass('ui-popup-center');
			return;
		}

		var p = $t.offset();
		p.top += $t.outerHeight();

		var bw = $.browser.width();
		var ow = $el.outerWidth();
		if (p.left + ow > bw) {
			p.left = bw - ow - 20;
			if (p.left < 0) {
				p.left = 0;
			}
		}
		
		$el.css({
			top: p.top + "px",
			left: p.left + "px"
		}).removeClass('ui-popup-center');
	}
	
	function __activeTarget($t) {
		if ($t.length > 0) {
			var el = $t.get(0);
			if (el.setActive) {
				el.setActive();
			}
			else {
				el.focus();
			}
		}
	}

	function __clearTimer() {
		if (__tclose) {
			clearTimeout(__tclose);
			__tclose = null;
		}
	}
	
	function _toggle(c) {
		c = $.extend({ id: __active }, c);
		if (!c.id) {
			return this;
		}
	
		__clearTimer();
		
		if (c.id == __active) {
			var $p = $("#" + c.id), trigger = $p.data('popup').trigger;
			if (c.trigger === trigger) {
				c.silent = true;
			}
			_hide(c);
			return this;
		}

		_show(c);
		return this;
	}

	function __popup($pc, c) {
		$pc.css({
			top : "0px",
			left : "0px",
		}).addClass('ui-popup-opacity0').show();

		__align(c, $pc.parent(), true);
		
		$pc.hide().removeClass('ui-popup-opacity0').slideDown('fast', c.onpopup);
		
		__shadow();
	}
	
	function _show(c) {
		c = $.extend({ id: __active }, c);
		if (!c.id) {
			return this;
		}
	
		__clearTimer();

		if (c.id == __active) {
			return this;
		}
		
		_hide({silent: true});

		__active = c.id;
	
		__activeTarget($(c.target || c.trigger));
	
		var $p = $("#" + c.id), $pc = $p.children(".ui-popup-content");

		c = $.extend($p.data('popup'), { slient: null, trigger: null }, c);

		if (c.autoClear) {
			c.loaded = null;
		}
		
		if (c.loaded) {
			__popup($pc, c);
		}
		else if (c.loaded !== false){
			_load(c);
		}
		return this;
	}
	
	function _hide(c) {
		c = $.extend({ id: __active }, c);
		if (c.id) {
			__clearTimer();

			__active = null;
			__shadow();
		
			var $p = $("#" + c.id); 

			$p.css({
				top : "-999999px",
				left : "-999999px"
			});

			c = $.extend($p.data('popup'), c);

			if (c.silent !== true) {
				__activeTarget($(c.target || c.trigger));
			}

			if (typeof(c.onhide) == 'function') {
				c.onhide();
			}
		}
		$('body').removeClass('ui-popop-over');
		return this;
	}

	function __loadPage(c, html, e) {
		html = (html || "").trim();
		
		var $p = $("#" + c.id);
		var $pc = $p.children(".ui-popup-content");

		if (c.prepare) {
			var $c = c.prepare(html, e);
			if ($c) {
				$pc.append($c);
				$p.data('popup').loaded = true;
				return $pc;
			}
		}
		else {
			if (html) {
				$pc.html(html);
				$p.data('popup').loaded = true;
				return $pc;
			}
		}
		$p.data('popup').loaded = false;
		return null;
	}
	
	function _load(c) {
		c = $.extend({ id: __active }, c);
		if (c.id) {
			__align(c, $("#ui_popup_loader").show(), false);

			var $pc = null;
			$.ajax({
				url: c.url, 
				data: c.params,
				dataType: 'html',
				success: function(html) {
					$pc = __loadPage(c, html);
				},
				error: function(xhr, status, e) {
					$pc = __loadPage(c, null, e);
				},
				complete: function(xhr, status) {
					if (c.id == __active) {
						$("#ui_popup_loader").hide();
						if ($pc) {
							if ($pc.is(':hidden')) {
								__popup($pc, c);
							}
							else {
								__align(c, $pc.parent(), true);
							}
						}
					}
				}
			});
		}
		return this;
	}
	
	function _callback(data) {
		if (__active) {
			var pd = $('#' + __active).data('popup');
			if (pd && pd.callback) {
				pd.callback(data, pd.trigger);
			}
		}
	}

	var api = {
			load: _load,
			callback: _callback,
			toggle: _toggle,
			show: _show,
			hide: _hide
		};

	$.popup = function(c) {
		__init();
		
		c = c || {};
		if (c.id) {
			var $p = $('#' + c.id);
			if ($p.length < 1) {
				$p = $('<div id="' + c.id + '" class="ui-popup">'
					+ '<div class="ui-popup-content"></div></div>').appendTo('body');

				if (c.cssClass) {
					$p.addClass(c.cssClass);
				}
				$p.data('popup', c);
				if (c.content) {
					var $pc = $p.children(".ui-popup-content");
					$(c.content).detach().appendTo($pc);
					c.loaded = true;
					delete c.content;
				}
				else if (c.autoload) {
					$.ajax({
						url: c.url, 
						data: c.params, 
						dataType: 'html',
						success: function(html) {
							__loadPage(c, html);
						},
						error: function(xhr, status, e) {
							__loadPage(c, null, e);
						}
					});
				}
			}
		}

		return api; 
	};
	
	function __onclick() {
		$.popup().toggle($.extend({trigger: this}, $(this).data('popup')));
		return false;
	}
	function __onleave() {
		if (__tenter) {
			clearTimeout(__tenter);
			__tenter = null;
		}
	}
	function __onenter() {
		__onleave();

		var c = $.extend({trigger: this}, $(this).data('popup'));
		if (c.mouseenter === true) {
			$.popup().show(c);
		}
		else {
			__tenter = setTimeout(function() {
				$.popup().show(c);
			}, c.mouseenter);
		}
		return false;
	}
	
	$.fn.popup = function(c) {
		c = c || {};

		this.data('popup', c)
			.unbind('click', __onclick)
			.unbind('mouseenter', __onenter)
			.unbind('mouseleave', __onleave);
		
		if (c.mouseclick !== false) {
			this.click(__onclick);
		}
		if (c.mouseenter === true) {
			this.mouseenter(__onenter);
		}
		else if (c.mouseenter > 0) {
			this.mouseenter(__onenter).mouseleave(__onleave);
		}
		
		return this;
	};
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
				$ul.append($('<li class="ui-toast-li" id="ui-toast-item-' + i + '">')[sm](os.text[i]));
			}
			$t.append($ul);
		} else {
			$t.append($('<span>')[sm](os.text));
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
		$t.on('toast.afterShown', function() {
			processLoader($t, os);
		});

		$t.find('.ui-toast-close').on('click', function(e) {
			e.preventDefault();
			transitionOut($t, os);
		});

		if (typeof os.beforeShow == 'function') {
			$t.on('toast.beforeShow', function() {
				os.beforeShow($t);
			});
		}

		if (typeof os.afterShown == 'function') {
			$t.on('toast.afterShown', function() {
				os.afterShown($t);
			});
		}

		if (typeof os.beforeHide == 'function') {
			$t.on('toast.beforeHide', function() {
				os.beforeHide($t);
			});
		}

		if (typeof os.afterHidden == 'function') {
			$t.on('toast.afterHidden', function() {
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

	function processLoader($t, os) {
		// Show the loader only, if auto-hide is on and loader is demanded
		if (!canAutoHide(os) || os.loader === false) {
			return false;
		}

		var loader = $t.find('.ui-toast-loader');

		// 400 is the default time that jquery uses for fade/slide
		// Divide by 1000 for milliseconds to seconds conversion
		var transitionTime = (os.hideAfter - 400) / 1000 + 's';
		var loaderBg = os.loaderBg;

		var style = loader.attr('style') || '';
		style = style.substring(0, style.indexOf('-webkit-transition')); // Remove the last transition definition

		style += '-webkit-transition: width ' + transitionTime + ' ease-in; \
				  -o-transition: width ' + transitionTime + ' ease-in; \
				  transition: width ' + transitionTime + ' ease-in; \
				  background-color: ' + loaderBg + ';';

		loader.attr('style', style).addClass('ui-toast-loaded');
	}

	function animate($t, os) {
		transitionIn($t, os);

		if (canAutoHide(os)) {
			setTimeout(function() {
				transitionOut($t, os);
			}, os.hideAfter);
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

		$t.hide().trigger('toast.beforeShow')[tm](function() {
			$t.trigger('toast.afterShown');
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

		$t.trigger('toast.beforeHide')[tm](function() {
			$t.trigger('toast.afterHidden');
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
		animate($t, os);

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

