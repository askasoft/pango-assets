(function($) {
	"use strict";

	$.fn.changeValue = function(v) {
		var o = this.val();

		this.val(v);
		if (o != v) {
			this.trigger('change');
		}
		return this;
	};

	$.fn.formClear = function() {
		this.find('textarea, select').val('');
		this.find('input').each(function() {
			var $i = $(this);
			switch ($i.attr('type')) {
			case 'hidden':
			case 'button':
			case 'submit':
			case 'reset':
				break;
			case 'checkbox':
			case 'radio':
				$i.prop('checked', false);
				break;
			default:
				$i.val('');
			}
		});
		return this;
	};

	$.fn.formValues = function(vs, trigger) {
		if (vs) {
			for (var n in vs) {
				var v = vs[n];
				this.find(':input').filter(function() { return this.name == n; }).each(function() {
					var $t = $(this);
					switch ($t.attr('type')) {
					case 'file':
					case 'button':
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

