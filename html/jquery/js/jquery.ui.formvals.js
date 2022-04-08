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

