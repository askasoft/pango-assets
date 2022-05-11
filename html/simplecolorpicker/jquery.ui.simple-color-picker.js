// jQuery simple color picker
// https://github.com/rachel-carvalho/simple-color-picker
// Modified by Frank Wang

(function($) {
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
			hideEffect: 'hide',
			onChangeColor: false,
			includeMargins: false
		}
	};

	function positionAndShowBox($txt, $box, opts) {
		var pos = $txt.offset();
		var left = pos.left + $txt.outerWidth(opts.includeMargins) - $box.outerWidth(opts.includeMargins);
		if (left < pos.left) left = pos.left;
		$box.css({ left: left, top: (pos.top + $txt.outerHeight(opts.includeMargins)) });
		showBox($box, opts);
	}

	function showBox($box, opts) {
		$box[opts.showEffect]();
		$(document).on('click.simple-color-picker', function() {
			hideBox($box, opts);
		});
	}

	function hideBox($box, opts) {
		$box[opts.hideEffect]();
		$(document).off('.simple-color-picker');
	}

	function initBox($txt, opts) {
		var prefix = $txt.attr('id').replace(/-/g, '') + '_';

		var $ul = $('<ul>');
		for (var i = 0; i < opts.colors.length; i++) {
			var item = opts.colors[i];

			var breakLine = (i % opts.colorsPerLine == 0) ? 'clear: both; ' : '';

			$ul.append($('<li>', {
				'style': breakLine + 'background-color: ' + item,
				'title': item
			}));
		}

		var $box = $('<div>', {
			'id': prefix + 'color_picker',
			'class': 'simple-color-picker'
		})
		.append($ul)
		.append($('<div style="clear: both;"></div>'))
		.hide().appendTo('body');

		$txt.data('simpleColorPicker', $box);
		return $box;
	}

	$.fn.simpleColorPicker = function(options) {
		// Methods
		if (typeof options == 'string') {
			switch (options) {
			case 'destroy':
				this.each(function() {
					var $box = $(this).data('simpleColorPicker');
					if ($box) {
						$box.remove();
					}
					$(this).off('.simple-color-picker').removeData('simpleColorPicker');
				});
				if ($('.simple-color-picker').length == 0) {
					$(document).off('.simple-color-picker');
				}
				break;
			default:
				console.log('Method "' + method + '" does not exist.')
				break;
			}
			return this;
		}

		var opts = $.extend({}, $.simpleColorPicker.defaults, options);

		return this.each(function() {
			var $txt = $(this);

			var $box = initBox($txt, opts);

			$box.find('li').click(function() {
				if ($txt.is('input')) {
					$txt.val($(this).attr('title'));
					$txt.blur();
				}
				if ($.isFunction(opts.onChangeColor)) {
					opts.onChangeColor.call($txt, $(this).attr('title'));
				}
				hideBox($box, opts);
			});

			$box.click(function(evt) {
				evt.stopPropagation();
			});

			$txt.on('click.simple-color-picker', function(evt) {
				evt.stopPropagation();
				if (!$txt.is('input')) {
					// element is not an input so probably a link or div which requires the color box to be shown
					positionAndShowBox($txt, $box, opts);
				}
			});

			$txt.on('focus.simple-color-picker', function() {
				positionAndShowBox($txt, $box, opts);
			});
		});
	};
}(jQuery));
