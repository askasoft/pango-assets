(function() {
	"use strict";

	if (typeof Function.prototype.bind != "function") {
		/**
		 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
		 * 
		 * Syntax:
		 * <pre><code>
			fun.bind(thisArg[, arg1[, arg2[, ...]]])
			</code></pre>
		 * @return {Function} The new function
		 */
		Function.prototype.bind = function(scope/*, args...*/) {
			// make args available, in function below
			var fn = this, args = [].slice.call(arguments, 1);
			return function() {
				return fn.apply(scope, args);
			};
		};
	}

	if (typeof Function.prototype.callback != "function") {
		/**
		 * Creates a callback that passes arguments[0], arguments[1], arguments[2], ...
		 * Call directly on any function. Example: <code>myFunction.callback(arg1, arg2)</code>
		 * Will create a function that is bound to those 2 args. <b>If a specific scope is required in the
		 * callback, use {@link #delegate} instead.</b> The function returned by callback always
		 * executes in the caller scope.
		 * <p>This method is required when you want to pass arguments to a callback function.  If no arguments
		 * are needed, you can simply pass a reference to the function as a callback (e.g., callback: myFn).
		 * However, if you tried to pass a function with arguments (e.g., callback: myFn(arg1, arg2)) the function
		 * would simply execute immediately when the code is parsed. Example usage:
		 * <pre><code>
			var sayHi = function(hi, name) {
				alert(hi + ', ' + name);
			}
			
			$.ajax({
				url: '/sayhi',
				success: sayHi.callback('hi')
			});
			</code></pre>
		 * @return {Function} The new function
		 */
		Function.prototype.callback = function(/*args...*/) {
			// make args available, in function below
			var fn = this, args = [].slice.call(arguments, 0);
			return function() {
				return fn.apply(this, args.concat([].slice.call(arguments, 0)));
			};
		};
	}

	if (typeof Function.prototype.delegate != "function") {
		/**
		 * Creates a delegate (callback) that sets the scope to arguments[0].
		 * Call directly on any function. Example: <code>this.myFunction.delegate(this, [ arg1, arg2 ])</code>
		 * Will create a function that is automatically scoped to scope so that the <tt>this</tt> variable inside the
		 * callback points to scope. Example usage:
		 * <pre><code>
			var sayHi = function(name, event) {
				// Note this use of "this.text()" here.
				// This function expects to execute within a scope that contains a text() method.
				// In this example, the "this" variable is pointing to the btn object that was passed in delegate below.
				alert('Hi, ' + name + '. You clicked the "' + this.text() + '" button.');
			}
	
			var btn = $('<button>').text('Say Hi');
	
			// This callback will execute in the scope of the
			// button instance. Clicking the button alerts
			// "Hi, Fred. You clicked the "Say Hi" button."
			btn.on('click', sayHi.delegate(btn, [ 'Fred' ]));
			</code></pre>
		 * @param {Object} scope (optional) The object for which the scope is set
		 * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
		 * @param {Boolean} append (optional) if True args are appended to the call arguments instead of prepending
		 * @return {Function} The new function
		 */
		Function.prototype.delegate = function(scope, args, append) {
			var fn = this;
			return function() {
				var g = [].slice.call(arguments, 0);
				args ||= [];
				args = append ? g.concat(args) : args.concat(g);
				return fn.apply(scope || this, args);
			};
		};
	}

	if (typeof Function.prototype.delay != "function") {
		/**
		 * Calls this function after the number of millseconds specified, optionally in a specific scope. Example usage:
		 * <pre><code>
			var sayHi = function(name) {
				alert('Hi, ' + name);
			}
	
			// executes immediately:
			sayHi('Fred');
	
			// executes after 2 seconds:
			sayHi.delay(2000, this, 'Fred');
	
			</code></pre>
		 * @param {Number} millis The number of milliseconds for the setTimeout call (if 0 the function is executed immediately)
		 * @param {Object} scope (optional) The object for which the scope is set
		 * @param {...} args (optional) Arguments for the call.
		 * @return {Number} The timeout id that can be used with clearTimeout
		 */
		Function.prototype.delay = function(millis/*, scope, args...*/) {
			var fn = this.bind.apply([].slice.call(arguments, 1));
			if (millis) {
				return setTimeout(fn, millis);
			}
			fn();
			return 0;
		};
	}

	if (typeof Function.prototype.precall != "function") {
		/**
		 * Creates an interceptor function. The passed fcn is called before the original one. If it returns false,
		 * the original one is not called. The resulting function returns the results of the original function.
		 * The passed fcn is called with the parameters of the original function. Example usage:
		 * <pre><code>
			var sayHi = function(name) {
				alert('Hi, ' + name);
			}
	
			sayHi('Fred'); // alerts "Hi, Fred"
	
			// create a new function that validates input without
			// directly modifying the original function:
			var sayHiToFriend = sayHi.precall(function(name) {
				return name == 'Brian';
			});
	
			sayHiToFriend('Fred');	// no alert
			sayHiToFriend('Brian'); // alerts "Hi, Brian"
			</code></pre>
		 * @param {Function} pref The function to call before the original
		 * @param {Object} scope (optional) The scope of the passed fcn (Defaults to scope of original function or window)
		 * @return {Function} The new function
		 */
		Function.prototype.precall = function(pref, scope) {
			if (typeof pref != "function") {
				return this;
			}

			var fn = this;
			return function() {
				if (pref.apply(scope || this, arguments) === false) {
					return;
				}
				return fn.apply(this, arguments);
			};
		};
	}

	if (typeof Function.prototype.postcall != "function") {
		/**
		 * Create a combined function call sequence of the original function + the passed function.
		 * The resulting function returns the results of the original function.
		 * The passed fcn is called with the parameters of the original function. Example usage:
		 * <pre><code>
			var sayHi = function(name) {
				alert('Hi, ' + name);
			}
	
			sayHi('Fred'); // alerts "Hi, Fred"
	
			var sayGoodbye = sayHi.postcall(function(name) {
				alert('Bye, ' + name);
			});
	
			sayGoodbye('Fred'); // both alerts show
			</code></pre>
		 * @param {Function} postf The function to sequence
		 * @param {Object} scope (optional) The scope of the passed fcn (Defaults to scope of original function or window)
		 * @return {Function} The new function
		 */
		Function.prototype.postcall = function(postf, scope) {
			if (typeof postf != "function") {
				return this;
			}

			var fn = this;
			return function() {
				var rv = fn.apply(this, arguments);
				postf.apply(scope || this, arguments);
				return rv;
			};
		};
	}
})();

