(function($) {
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

	$.fn.treeview = function(method, target) {
		// Methods
		if (typeof method == 'string') {
			switch (method) {
			case 'collapse':
				collapse(this, target);
				break;
			case 'expand':
				expand(this, target);
				break;
			case 'toggle':
				toggle(this, target);
				break;
			case 'destroy':
				unbind(this);
				break;
			default:
				console.log('Method "' + method + '" does not exist.')
				break;
			}
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
}(jQuery));
