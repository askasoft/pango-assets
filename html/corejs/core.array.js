(function() {
	"use strict";

	if (typeof Array.prototype.empty != 'function') {
		Array.prototype.empty = function() {
			this.splice(0, this.length);
			return this;
		}
	}

	if (typeof Array.prototype.indexOf != 'function') {
		Array.prototype.indexOf = function(o) {
			for (var i = 0; i < this.length; i++) {
				if (this[i] === o) {
					return i;
				}
			}
			return -1;
		}
	}

	if (typeof Array.prototype.contains != 'function') {
		Array.prototype.contains = function(o) {
			return this.indexOf(o) >= 0;
		}
	}

	if (typeof Array.prototype.insert != 'function') {
		Array.prototype.insert = function() {
			var args = [arguments[0], 0];
			[].push.apply(args, [].slice.call(arguments, 1));
			[].splice.apply(this, args);
			return this;
		}
	}

	if (typeof Array.prototype.remove != 'function') {
		// Remove element o in array, returns removed elements count
		Array.prototype.remove = function(o) {
			var a = this, n = 0;
			for (var i = a.length - 1; i >= 0; i--) {
				if (a[i] === o) {
					a.splice(i, 1);
					n++;
				}
			}
			return n;
		}
	}

	if (typeof Array.prototype.removeIf != 'function') {
		// Remove each element o that satisfied f(o) === true in array, returns removed elements count
		Array.prototype.removeIf = function(f) {
			var a = this, n = 0;
			for (var i = a.length - 1; i >= 0; i--) {
				if (f(a[i])) {
					a.splice(i, 1);
					n++;
				}
			}
			return n;
		}
	}

	if (typeof Array.prototype.removeDuplicates != 'function') {
		Array.prototype.removeDuplicates = function() {
			var a = this, n = 0;
			for (var i = 0; i < a.length; i++) {
				for (var j = a.length - 1; j > i; j--) {
					if (a[i] === a[j]) {
						a.splice(j, 1);
						n++;
					}
				}
			}
			return n;
		}
	}

	if (typeof Array.prototype.each != 'function') {
		Array.prototype.each = function(fn, scope) {
			var a = this;
			scope ||= window;
			for (var i = 0; i < a.length; i++) {
				if (fn.call(scope, a[i], i, a) === false) {
					break;
				}
			}
		}
	}
})();
