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

if (typeof Array.prototype.each != 'function') {
	Array.prototype.each = function(fn, scope) {
		scope = scope || window;
		for (var i = 0; i < this.length; i++) {
			if (fn.call(scope, this[i], i, this) === false) {
				break;
			}
		}
	}
}

if (typeof Array.prototype.empty != 'function') {
	Array.prototype.empty = function() {
		return this.splice(0, this.length);
	}
}

if (typeof Array.prototype.insert != 'function') {
	Array.prototype.insert = function() {
		var args = [ arguments[0], 0 ];
		[].push.apply(args, [].slice.call(arguments, 1));
		[].splice.apply(this, args);
		return this;
	}
}

if (typeof Array.prototype.remove != 'function') {
	Array.prototype.remove = function(o) {
		var c = 0;
		for (var i = this.length - 1; i >= 0; i--) {
			if (this[i] === o) {
				this.splice(i, 1);
				c++;
			}
		}
		return c;
	}
}

if (typeof Array.prototype.removeDuplicates != 'function') {
	Array.prototype.removeDuplicates = function() {
		for (var i = 0; i < this.length; i++) {
			for (var j = this.length - 1; j > i; j--) {
				if (this[i] === this[j]) {
					this.splice(j, 1);
				}
			}
		}
	}
}
/*--------------------------------------------------------
 dateformat.js - Simple date formatter
 Version 1.1 (Update 2008/04/02)

 Copyright (c) 2007-2008 onozaty (http://www.enjoyxstudy.com)

 Released under an MIT-style license.

 For details, see the web site:
 http://www.enjoyxstudy.com/javascript/dateformat/

 --------------------------------------------------------
 patterns
 y : Year         ex. "yyyy" -> "2007", "yy" -> "07"
 M : Month        ex. "MM" -> "05" "12", "M" -> "5" "12"
 d : Day          ex. "dd" -> "09" "30", "d" -> "9" "30"
 H : Hour (0-23)  ex. "HH" -> "00" "23", "H" -> "0" "23"
 h : Hour (1-12)  ex. "hh" -> "01" "12", "h" -> "1" "12"
 m : Minute       ex. "mm" -> "01" "59", "m" -> "1" "59"
 s : Second       ex. "ss" -> "00" "59", "s" -> "0" "59"
 S : Millisecond  ex. "SSS" -> "000" "012" "999", 
 "SS" -> "00" "12" "999", "S" -> "0" "12" "999"

 Text can be quoted using single quotes (') to avoid interpretation.
 "''" represents a single quote. 


 Useing..

 var fmt = new DateFormat("yyyy/MM/dd HH:mm:ss SSS");

 var str = fmt.format(new Date()); // "2007/05/10 12:21:19 002"
 var date = fmt.parse("2007/05/10 12:21:19 002"); // return Date object

 --------------------------------------------------------*/

if (typeof Date.prototype.format != "function") {
	Date.prototype.format = function(f) {
		return (new DateFormat(f)).format(this);
	};
}

var DateFormat = function(pattern) {
	this._init(pattern);
};

DateFormat.prototype = {
	_init : function(pattern) {
		this.pattern = pattern;
		this._patterns = [];

		for ( var i = 0; i < pattern.length; i++) {
			var ch = pattern.charAt(i);
			if (this._patterns.length == 0) {
				this._patterns[0] = ch;
			} else {
				var index = this._patterns.length - 1;
				if (this._patterns[index].charAt(0) == "'") {
					if (this._patterns[index].length == 1
							|| this._patterns[index]
									.charAt(this._patterns[index].length - 1) != "'") {
						this._patterns[index] += ch;
					} else {
						this._patterns[index + 1] = ch;
					}
				} else if (this._patterns[index].charAt(0) == ch) {
					this._patterns[index] += ch;
				} else {
					this._patterns[index + 1] = ch;
				}
			}
		}
	},

	format : function(date) {
		var result = [];
		for ( var i = 0; i < this._patterns.length; i++) {
			result[i] = this._formatWord(date, this._patterns[i]);
		}
		return result.join('');
	},

	_formatWord : function(date, pattern) {
		var formatter = this._formatter[pattern.charAt(0)];
		if (formatter) {
			return formatter.apply(this, [ date, pattern ]);
		} else {
			return pattern;
		}
	},

	_formatter : {
		"y" : function(date, pattern) {
				// Year
			var year = String(date.getFullYear());
			if (pattern.length <= 2) {
				year = year.substring(2, 4);
			} else {
				year = this._zeroPadding(year, pattern.length);
			}
			return year;
		},
		"M" : function(date, pattern) {
			// Month in year
			return this._zeroPadding(String(date.getMonth() + 1), pattern.length);
		},
		"d" : function(date, pattern) {
			// Day in month
			return this._zeroPadding(String(date.getDate()), pattern.length);
		},
		"H" : function(date, pattern) {
			// Hour in day (0-23)
			return this._zeroPadding(String(date.getHours()), pattern.length);
		},
		"h" : function(date, pattern) {
			// Hour in day (1-12)
			var h = date.getHours();
			h = h > 12 ? h - 12 : (h == 0 ? 12 : h);
			return this._zeroPadding(String(h), pattern.length);
		},
		"m" : function(date, pattern) {
			// Minute in hour
			return this._zeroPadding(String(date.getMinutes()), pattern.length);
		},
		"s" : function(date, pattern) {
			// Second in minute
			return this._zeroPadding(String(date.getSeconds()), pattern.length);
		},
		"S" : function(date, pattern) {
			// Millisecond
			return this
					._zeroPadding(String(date.getMilliseconds()), pattern.length);
		},
		"'" : function(date, pattern) {
			// escape
			if (pattern == "''") {
				return "'";
			} else {
				return pattern.replace(/'/g, '');
			}
		}
	},

	_zeroPadding : function(str, length) {
		if (str.length >= length) {
			return str;
		}

		return new Array(length - str.length + 1).join("0") + str;
	},

	/// Parser ///
	parse : function(text) {
		if (typeof text != 'string' || text == '')
			return null;

		var result = {
			year : 1970,
			month : 1,
			day : 1,
			hour : 0,
			min : 0,
			sec : 0,
			msec : 0
		};

		for ( var i = 0; i < this._patterns.length; i++) {
			if (text == '')
				return null; // parse error!!
			text = this._parseWord(text, this._patterns[i], result);
			if (text === null)
				return null; // parse error!!
		}
		if (text != '')
			return null; // parse error!!

		return new Date(result.year, result.month - 1, result.day, result.hour,
				result.min, result.sec, result.msec);
	},

	_parseWord : function(text, pattern, result) {
		var parser = this._parser[pattern.charAt(0)];
		if (parser) {
			return parser.apply(this, [ text, pattern, result ]);
		} else {
			if (text.indexOf(pattern) != 0) {
				return null;
			} else {
				return text.substring(pattern.length);
			}
		}
	},

	_parser : {
		"y" : function(text, pattern, result) {
				// Year
			var year;
			if (pattern.length <= 2) {
				year = text.substring(0, 2);
				year = year < 70 ? '20' + year : '19' + year;
				text = text.substring(2);
			} else {
				var length = (pattern.length == 3) ? 4 : pattern.length;
				year = text.substring(0, length);
				text = text.substring(length);
			}
			if (!this._isNumber(year))
				return null; // error
			result.year = parseInt(year, 10);
			return text;
		},
		"M" : function(text, pattern, result) {
			// Month in year
			var month;
			if (pattern.length == 1 && text.length > 1
					&& text.substring(0, 2).match(/1[0-2]/) != null) {
				month = text.substring(0, 2);
				text = text.substring(2);
			} else {
				month = text.substring(0, pattern.length);
				text = text.substring(pattern.length);
			}
			if (!this._isNumber(month))
				return null; // error
			result.month = parseInt(month, 10);
			return text;
		},
		"d" : function(text, pattern, result) {
			// Day in month
			var day;
			if (pattern.length == 1 && text.length > 1
					&& text.substring(0, 2).match(/1[0-9]|2[0-9]|3[0-1]/) != null) {
				day = text.substring(0, 2);
				text = text.substring(2);
			} else {
				day = text.substring(0, pattern.length);
				text = text.substring(pattern.length);
			}
			if (!this._isNumber(day))
				return null; // error
			result.day = parseInt(day, 10);
			return text;
		},
		"H" : function(text, pattern, result) {
			// Hour in day (0-23)
			var hour;
			if (pattern.length == 1 && text.length > 1
					&& text.substring(0, 2).match(/1[0-9]|2[0-3]/) != null) {
				hour = text.substring(0, 2);
				text = text.substring(2);
			} else {
				hour = text.substring(0, pattern.length);
				text = text.substring(pattern.length);
			}
			if (!this._isNumber(hour))
				return null; // error
			result.hour = parseInt(hour, 10);
			return text;
		},
		"h" : function(text, pattern, result) {
			// Hour in day (1-12)
			var hour;
			if (pattern.length == 1 && text.length > 1
					&& text.substring(0, 2).match(/1[0-2]/) != null) {
				hour = text.substring(0, 2);
				text = text.substring(2);
			} else {
				hour = text.substring(0, pattern.length);
				text = text.substring(pattern.length);
			}
			if (!this._isNumber(hour))
				return null; // error
			result.hour = parseInt(hour, 10);
			return text;
		},
		"m" : function(text, pattern, result) {
			// Minute in hour
			var min;
			if (pattern.length == 1 && text.length > 1
					&& text.substring(0, 2).match(/[1-5][0-9]/) != null) {
				min = text.substring(0, 2);
				text = text.substring(2);
			} else {
				min = text.substring(0, pattern.length);
				text = text.substring(pattern.length);
			}
			if (!this._isNumber(min))
				return null; // error
			result.min = parseInt(min, 10);
			return text;
		},
		"s" : function(text, pattern, result) {
			// Second in minute
			var sec;
			if (pattern.length == 1 && text.length > 1
					&& text.substring(0, 2).match(/[1-5][0-9]/) != null) {
				sec = text.substring(0, 2);
				text = text.substring(2);
			} else {
				sec = text.substring(0, pattern.length);
				text = text.substring(pattern.length);
			}
			if (!this._isNumber(sec))
				return null; // error
			result.sec = parseInt(sec, 10);
			return text;
		},
		"S" : function(text, pattern, result) {
			// Millimsecond
			var msec;
			if (pattern.length == 1 || pattern.length == 2) {
				if (text.length > 2
						&& text.substring(0, 3).match(/[1-9][0-9][0-9]/) != null) {
					msec = text.substring(0, 3);
					text = text.substring(3);
				} else if (text.length > 1
						&& text.substring(0, 2).match(/[1-9][0-9]/) != null) {
					msec = text.substring(0, 2);
					text = text.substring(2);
				} else {
					msec = text.substring(0, pattern.length);
					text = text.substring(pattern.length);
				}
			} else {
				msec = text.substring(0, pattern.length);
				text = text.substring(pattern.length);
			}
			if (!this._isNumber(msec))
				return null; // error
			result.msec = parseInt(msec, 10);
			return text;
		},
		"'" : function(text, pattern, result) {
			// escape
			if (pattern == "''") {
				pattern = "'";
			} else {
				pattern = pattern.replace(/'/g, '');
			}
			if (text.indexOf(pattern) != 0) {
				return null; // error
			} else {
				return text.substring(pattern.length);
			}
		}
	},

	_isNumber : function(str) {
		return /^[0-9]*$/.test(str);
	}
};

if (typeof Function.prototype.callback != "function") {
	/**
	 * Creates a callback that passes arguments[0], arguments[1], arguments[2], ...
	 * Call directly on any function. Example: <code>myFunction.callback(arg1, arg2)</code>
	 * Will create a function that is bound to those 2 args. <b>If a specific scope is required in the
	 * callback, use {@link #delegate} instead.</b> The function returned by callback always
	 * executes in the window scope.
	 * <p>This method is required when you want to pass arguments to a callback function.  If no arguments
	 * are needed, you can simply pass a reference to the function as a callback (e.g., callback: myFn).
	 * However, if you tried to pass a function with arguments (e.g., callback: myFn(arg1, arg2)) the function
	 * would simply execute immediately when the code is parsed. Example usage:
	 * <pre><code>
		var sayHi = function(name){
			alert('Hi, ' + name);
		}
		
		// clicking the button alerts "Hi, Fred"
		new Ext.Button({
			text: 'Say Hi',
			renderTo: Ext.getBody(),
			handler: sayHi.callback('Fred')
		});
		</code></pre>
	 * @return {Function} The new function
	 */
	Function.prototype.callback = function(/*args...*/){
		// make args available, in function below
		var args = arguments;
		var method = this;
		return function() {
			return method.apply(window, args);
		};
	};
}

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
	Function.prototype.bind = function(/*args...*/){
		// make args available, in function below
		var scope = arguments[0] || window;
		var args = Array.prototype.slice.call(arguments, 1);
		var method = this;
		return function() {
			return method.apply(scope, args);
		};
	};
}

if (typeof Function.prototype.delegate != "function") {
	/**
	 * Creates a delegate (callback) that sets the scope to obj.
	 * Call directly on any function. Example: <code>this.myFunction.delegate(this, [arg1, arg2])</code>
	 * Will create a function that is automatically scoped to obj so that the <tt>this</tt> variable inside the
	 * callback points to obj. Example usage:
	 * <pre><code>
		var sayHi = function(name){
			// Note this use of "this.text" here.  This function expects to
			// execute within a scope that contains a text property.  In this
			// example, the "this" variable is pointing to the btn object that
			// was passed in delegate below.
			alert('Hi, ' + name + '. You clicked the "' + this.text + '" button.');
		}

		var btn = new Button({
			text: 'Say Hi'
		});

		// This callback will execute in the scope of the
		// button instance. Clicking the button alerts
		// "Hi, Fred. You clicked the "Say Hi" button."
		btn.on('click', sayHi.delegate(btn, ['Fred']));
		</code></pre>
	 * @param {Object} obj (optional) The object for which the scope is set
	 * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
	 * @param {Boolean} appendArgs (optional) if True args are appended to call args instead of overriding
	 * @return {Function} The new function
	 */
	Function.prototype.delegate = function(obj, args, appendArgs) {
		var method = this;
		return function() {
			var callArgs = args || arguments;
			if (appendArgs === true) {
				callArgs = Array.prototype.slice.call(arguments, 0);
				callArgs = callArgs.concat(args);
			}
			return method.apply(obj || window, callArgs);
		};
	};
}

if (typeof Function.prototype.delay != "function") {
	/**
	 * Calls this function after the number of millseconds specified, optionally in a specific scope. Example usage:
	 * <pre><code>
		var sayHi = function(name){
			alert('Hi, ' + name);
		}

		// executes immediately:
		sayHi('Fred');

		// executes after 2 seconds:
		sayHi.delay(2000, this, ['Fred']);

		// this syntax is sometimes useful for deferring
		// execution of an anonymous function:
		(function(){
			alert('Anonymous');
		}).delay(100);
		</code></pre>
	 * @param {Number} millis The number of milliseconds for the setTimeout call (if 0 the function is executed immediately)
	 * @param {Object} obj (optional) The object for which the scope is set
	 * @param {Array} args (optional) Overrides arguments for the call. (Defaults to the arguments passed by the caller)
	 * @return {Number} The timeout id that can be used with clearTimeout
	 */
	Function.prototype.delay = function(millis, obj, args) {
		var fn = this.delegate(obj, args);
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
		var sayHi = function(name){
			alert('Hi, ' + name);
		}

		sayHi('Fred'); // alerts "Hi, Fred"

		// create a new function that validates input without
		// directly modifying the original function:
		var sayHiToFriend = sayHi.precall(function(name){
			return name == 'Brian';
		});

		sayHiToFriend('Fred');	// no alert
		sayHiToFriend('Brian'); // alerts "Hi, Brian"
		</code></pre>
	 * @param {Function} fcn The function to call before the original
	 * @param {Object} scope (optional) The scope of the passed fcn (Defaults to scope of original function or window)
	 * @return {Function} The new function
	 */
	Function.prototype.precall = function(fcn, scope) {
		if(typeof fcn != "function"){
			return this;
		}
		var method = this;
		return function() {
			fcn.target = this;
			fcn.method = method;
			if(fcn.apply(scope || this || window, arguments) === false){
				return;
			}
			return method.apply(this || window, arguments);
		};
	};
}

if (typeof Function.prototype.postcall != "function") {
	/**
	 * Create a combined function call sequence of the original function + the passed function.
	 * The resulting function returns the results of the original function.
	 * The passed fcn is called with the parameters of the original function. Example usage:
	 * <pre><code>
		var sayHi = function(name){
			alert('Hi, ' + name);
		}

		sayHi('Fred'); // alerts "Hi, Fred"

		var sayGoodbye = sayHi.postcall(function(name){
			alert('Bye, ' + name);
		});

		sayGoodbye('Fred'); // both alerts show
		</code></pre>
	 * @param {Function} fcn The function to sequence
	 * @param {Object} scope (optional) The scope of the passed fcn (Defaults to scope of original function or window)
	 * @return {Function} The new function
	 */
	Function.prototype.postcall = function(fcn, scope) {
		if (typeof fcn != "function") {
			return this;
		}
		var method = this;
		return function() {
			var retval = method.apply(this || window, arguments);
			fcn.apply(scope || this || window, arguments);
			return retval;
		};
	};
}
/**
 * @class DecimalFormat
 * @constructor
 * @param {String} formatStr
 * @author Oskan Savli
 */
function DecimalFormat(formatStr) {
	/**
	 * @fieldOf DecimalFormat
	 * @type String
	 */
	this.prefix = '';
	/**
	 * @fieldOf DecimalFormat
	 * @type String
	 */
	this.suffix = '';
	/**
	 * @description Grouping size
	 * @fieldOf DecimalFormat
	 * @type String
	 */
	this.comma = 0;
	/**
	 * @description Minimum integer digits to be displayed
	 * @fieldOf DecimalFormat
	 * @type Number
	 */
	this.minInt = 1;
	/**
	 * @description Minimum fractional digits to be displayed
	 * @fieldOf DecimalFormat
	 * @type String
	 */
	this.minFrac = 0;
	/**
	 * @description Maximum fractional digits to be displayed
	 * @fieldOf DecimalFormat
	 * @type String
	 */
	this.maxFrac = 0;

	// get prefix
	for (var i = 0; i < formatStr.length; i++) {
		if (formatStr.charAt(i) == '#' || formatStr.charAt(i) == '0') {
			this.prefix = formatStr.substring(0, i);
			formatStr = formatStr.substring(i);
			break;
		}
	}

	// get suffix
	this.suffix = formatStr.replace(/[#]|[0]|[,]|[.]/g, '');

	// get number as string
	var numberStr = formatStr.replace(/[^0#,.]/g, '');

	var intStr = '';
	var fracStr = '';
	var point = numberStr.indexOf('.');
	if (point != -1) {
		intStr = numberStr.substring(0, point);
		fracStr = numberStr.substring(point + 1);
	}
	else {
		intStr = numberStr;
	}

	var commaPos = intStr.lastIndexOf(',');
	if (commaPos != -1) {
		this.comma = intStr.length - 1 - commaPos;
	}

	intStr = intStr.replace(/[,]/g, ''); // remove commas

	fracStr = fracStr.replace(/[,]|[.]+/g, '');

	this.maxFrac = fracStr.length;
	var tmp = intStr.replace(/[^0]/g, ''); // remove all except zero
	if (tmp.length > this.minInt)
		this.minInt = tmp.length;
	tmp = fracStr.replace(/[^0]/g, '');
	this.minFrac = tmp.length;
}

/**
 * @description Formats given value
 * @methodOf DecimalFormat
 * @param {String}
 *            numberStr
 * @return {String} Formatted number
 * @author Oskan Savli
 */
DecimalFormat.prototype.format = function(numStr) { // 1223.06 --> $1,223.06
    // remove prefix, suffix and commas
	var numberStr = this.parse(numStr).toLowerCase();

	// do not format if not a number
	if (isNaN(numberStr) || numberStr.length == 0)
		return numStr;

	// scientific numbers
	if (i = numberStr.indexOf("e") != -1) {
		var n = Number(numberStr);
		if (n == "Infinity" || n == "-Infinity")
			return numberStr;
		numberStr = n + "";
		if (numberStr.indexOf('e') != -1)
			return numberStr;
	}

	var negative = false;
	// remove sign
	if (numberStr.charAt(0) == '-') {
		negative = true;
		numberStr = numberStr.substring(1);
	}
	else if (numberStr.charAt(0) == '+') {
		numberStr = numberStr.substring(1);
	}

	var point = numberStr.indexOf('.'); // position of point character
	var intStr = '';
	var fracStr = '';
	if (point != -1) {
		intStr = numberStr.substring(0, point);
		fracStr = numberStr.substring(point + 1);
	}
	else {
		intStr = numberStr;
	}
	fracStr = fracStr.replace(/[.]/, ''); // remove other point characters

	var isPercentage = this.suffix && this.suffix.charAt(0) === '%';
	// if percentage, number will be multiplied by 100.
	var minInt = this.minInt, minFrac = this.minFrac, maxFrac = this.maxFrac;
	if (isPercentage) {
		minInt -= 2;
		minFrac += 2;
		maxFrac += 2;
	}

	if (fracStr.length > maxFrac) { // round
		// case 6143
		var num = new Number('0.' + fracStr);
		num = (maxFrac == 0) ? Math.round(num) : num.toFixed(maxFrac);
		// toFixed method has bugs on IE (0.7 --> 0)
		fracStr = num.toString(10).substr(2);
		var c = (num >= 1) ? 1 : 0; // carry
		var x, i = intStr.length - 1;
		while (c) { // increment intStr
			if (i == -1) {
				intStr = '1' + intStr;
				break;
			}
			else {
				x = intStr.charAt(i);
				if (x == 9) {
					x = '0';
					c = 1;
				}
				else {
					x = (++x) + '';
					c = 0;
				}
				intStr = intStr.substring(0, i) + x
						+ intStr.substring(i + 1, intStr.length);
				i--;
			}
		}
	}
	for ( var i = fracStr.length; i < minFrac; i++) { // if minFrac=4 then
														// 1.12 --> 1.1200
		fracStr = fracStr + '0';
	}
	while (fracStr.length > minFrac
			&& fracStr.charAt(fracStr.length - 1) == '0') { // if minInt=4 then
															// 00034 --> 0034)
		fracStr = fracStr.substring(0, fracStr.length - 1);
	}

	for (var i = intStr.length; i < minInt; i++) { // if minInt=4 then 034 -->
													// 0034
		intStr = '0' + intStr;
	}
	
	while (intStr.length > minInt && intStr.charAt(0) == '0') { // if minInt=4
																// then 00034
																// --> 0034)
		intStr = intStr.substring(1);
	}

	if (isPercentage) { // multiply by 100
		intStr += fracStr.substring(0, 2);
		fracStr = fracStr.substring(2);
	}

	var j = 0;
	for (var i = intStr.length; i > 0; i--) { // add commas
		if (j != 0 && j % this.comma == 0) {
			intStr = intStr.substring(0, i) + ',' + intStr.substring(i);
			j = 0;
		}
		j++;
	}

	var formattedValue;
	if (fracStr.length > 0)
		formattedValue = this.prefix + intStr + '.' + fracStr + this.suffix;
	else
		formattedValue = this.prefix + intStr + this.suffix;

	if (negative) {
		formattedValue = '-' + formattedValue;
	}

	return formattedValue;
}


/**
 * @description Converts formatted value back to non-formatted value
 * @methodOf DecimalFormat
 * @param {String}
 *            fNumberStr Formatted number
 * @return {String} Original number
 * @author Oskan Savli
 */
DecimalFormat.prototype.parse = function(fNumStr) { // $1,223.06 -->
															// 1223.06
  fNumStr += ''; // ensure it is string
	if (!fNumStr)
		return ''; // do not return undefined or null
	if (!isNaN(fNumStr))
		return this.getNumericString(fNumStr);
	var fNumberStr = fNumStr;
	var negative = false;
	if (fNumStr.charAt(0) == '-') {
		fNumberStr = fNumberStr.substr(1);
		negative = true;
	}
	var pIndex = fNumberStr.indexOf(this.prefix);
	var sIndex = (this.suffix == '') ? fNumberStr.length : fNumberStr.indexOf(
			this.suffix, this.prefix.length + 1);
	if (pIndex == 0 && sIndex > 0) {
		// remove suffix
		fNumberStr = fNumberStr.substr(0, sIndex);
		// remove prefix
		fNumberStr = fNumberStr.substr(this.prefix.length);
		// remove commas
		fNumberStr = fNumberStr.replace(/,/g, '');
		if (negative)
			fNumberStr = '-' + fNumberStr;
		if (!isNaN(fNumberStr))
			return this.getNumericString(fNumberStr);
	}
	return fNumStr;
}

/**
 * @description We shouldn't return strings like 1.000 in parse method.
 *              However, using only Number(str) is not enough, because it omits .
 *              in big numbers like 23423423423342234.34 => 23423423423342236 .
 *              There's a conflict in cases 6143 and 6541.
 * @methodOf DecimalFormat
 * @param {String}
 *            str Numberic string
 * @return {String} Corrected numeric string
 * @author Serdar Bicer
 */
DecimalFormat.prototype.getNumericString = function(str){
	// first convert to number
	var num = new Number(str);
	// check if there is a missing dot
	var numStr = num + '';
	if (str.indexOf('.') > -1 && numStr.indexOf('.') < 0) {
		// check if original string has all zeros after dot or not
		for ( var i = str.indexOf('.') + 1; i < str.length; i++) {
			// if not, this means we lost precision
			if (str.charAt(i) !== '0')
				return str;
		}
		return numStr;
	}
	return str;
}

//--------------------------------------------------
if (typeof Number.trim != "function") {
	Number.trim = function(s) {
		if (typeof(s) != 'string') {
			return s;
		}
		var h = '1234567890';
		var z = '１２３４５６７８９０';
		var ss = s.replace(/,/g, '').split('');
		for (i = 0; i < ss.length; i++) {
			var j = z.indexOf(ss[i]);
			if (j >= 0) {
				ss[i] = h[j];
			}
		}
		return ss.join('');
	};
}
if (typeof Number.parseInt != "function") {
	Number.parseInt = function(s, r) {
		return parseInt(Number.trim(s), r);
	};
}
if (typeof Number.parseFloat != "function") {
	Number.parseFloat = function(s) {
		return parseFloat(Number.trim(s));
	};
}
if (typeof Number.format != "function") {
	Number.format = function(pattern, n) {
		return (new DecimalFormat(pattern)).format(n);
	};
}
if (typeof Number.comma != "function") {
	var CDF = new DecimalFormat('###,###.#########');
	Number.comma = function(n) {
		return CDF.format(n);
	};
}
if (typeof Number.formatSize != "function") {
	var KB = 1024,
		MB = KB * KB,
		GB = MB * KB,
		TB = GB * KB,
		PB = TB * KB;
	
	Number.formatSize = function(n, p) {
		p = Math.pow(10, p || 2);
		var sz = "";
		if (n >= PB) {
			sz = Math.round(n * p / PB) / p + ' PB';
		}
		else if (n >= TB) {
			sz = Math.round(n * p / TB) / p + ' TB';
		}
		else if (n >= GB) {
			sz = Math.round(n * p / GB) / p + ' GB';
		}
		else if (n >= MB) {
			sz = Math.round(n * p / MB) / p + ' MB';
		}
		else if (n >= KB) {
			sz = Math.round(n * p / KB) / p + ' KB';
		}
		else if (n != '') {
			sz = n + ' bytes';
		}
		return sz;
	};
}


if (typeof String.prototype.hashCode != "function") {
	String.prototype.hashCode = function() {
		var h = 0;
		for (var i = 0; i < this.length; i++) {
//			h = 31 * h + this.charCodeAt(i);
			h = ((h << 5) - h) + this.charCodeAt(i); // faster
			h |= 0; // Convert to 32bit integer
		}
		return h;
	};
}
if (typeof String.prototype.isEmpty != "function") {
	String.prototype.isEmpty = function(s) {
		return this.length < 1;
	};
}
if (typeof String.prototype.contains != "function") {
	String.prototype.contains = function(s) {
		return this.indexOf(s) >= 0;
	};
}
if (typeof String.prototype.trimLeft != "function") {
	var re = /^\s+/;
	String.prototype.trimLeft = function() {
		return this.replace(re, "");
	};
}
if (typeof String.prototype.trimRight != "function") {
	var re = /\s+$/;
	String.prototype.trimRight = function() {
		return this.replace(re, "");
	};
}
if (typeof String.prototype.trim != "function") {
	var re = /^\s+|\s+$/g;
	String.prototype.trim = function() {
		return this.replace(re, "");
	};
}
if (typeof String.prototype.stripLeft != "function") {
	var re = /^[\s\u3000]+/;
	String.prototype.stripLeft = function() {
		return this.replace(re, "");
	};
}
if (typeof String.prototype.stripRight != "function") {
	var re = /[\s\u3000]+$/;
	String.prototype.stripRight = function() {
		return this.replace(re, "");
	};
}
if (typeof String.prototype.strip != "function") {
	var re = /^[\s\u3000]+|[\s\u3000]+$/g;
	String.prototype.strip = function() {
		return this.replace(re, "");
	};
}
if (typeof String.prototype.left != "function") {
	String.prototype.left = function(len) {
		return this.slice(0, len);
	};
}
if (typeof String.prototype.mid != "function") {
	String.prototype.mid = String.prototype.substr;
}
if (typeof String.prototype.right != "function") {
	String.prototype.right = function(len) {
		if (len >= this.length) {
			return this;
		}
		return this.substr(this.length - len, len);
	};
}
if (typeof String.prototype.leftPad != "function") {
	String.prototype.leftPad = function(sz, ch) {
		ch = ch || ' ';
		var r = this;
		while (r.length < sz) {
			r = ch + r;
		}
		return r;
	};
}
if (typeof String.prototype.rightPad != "function") {
	String.prototype.rightPad = function(sz, ch) {
		ch = ch || ' ';
		var r = this;
		while (r.length < sz) {
			r += chr;
		}
		return r;
	};
}
if (typeof String.prototype.startsWith != "function") {
	String.prototype.startsWith = function(prefix, toffset) {
		return this.indexOf(prefix) == (toffset || 0);
	};
}
if (typeof String.prototype.endsWith != "function") {
	String.prototype.endsWith = function(suffix) {
		return this.startsWith(suffix, this.length - suffix.length);
	};
}

if (typeof String.prototype.capitalize != "function") {
	String.prototype.capitalize = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	};
}
if (typeof String.prototype.uncapitalize != "function") {
	String.prototype.uncapitalize = function() {
		return this.charAt(0).toLowerCase() + this.slice(1);
	};
}


if (typeof String.prototype.snakeCase != "function") {
	String.prototype.snakeCase = function(c) {
		c = c || '_';
		var s = this.camelCase();
		return s.replace(/[A-Z]/g, function(m) {
			return c + m.charAt(0).toLowerCase();
		});
	};
}
if (typeof String.prototype.camelCase != "function") {
	String.prototype.camelCase = function() {
		s = this.charAt(0).toLowerCase() + this.slice(1);
		return s.replace(/[-_](.)/g, function(m, g) {
			return g.toUpperCase();
		});
	};
}
if (typeof String.prototype.pascalCase != "function") {
	String.prototype.pascalCase = function(c) {
		return this.camelCase().capitalize();
	};
}

if (typeof String.prototype.format != "function") {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/\{(\d+)\}/g, function(m, i) {
			return args[i];
		});
	};
}
if (typeof String.prototype.substrAfter != 'function') {
	String.prototype.substrAfter = function(c) {
		var s = this, i = s.indexOf(c);
		return (i >= 0) ? s.slice(i + 1) : "";
	};
}
if (typeof String.prototype.substrBefore != 'function') {
	String.prototype.substrBefore = function(c) {
		var s = this, i = s.indexOf(c);
		return (i >= 0) ? s.slice(0, i) : s;
	};
}
if (typeof String.prototype.ellipsis != 'function') {
	String.prototype.ellipsis = function(len) {
		if (this.length > len) {
			return this.substr(0, len - 3) + "...";
		}
		return this;
	};
}
/**
 * Truncate a string and add an ellipsiz ('...') to the end if it exceeds the specified length
 * the length of charCodeAt(i) > 0xFF will be treated as 2. 
 * @param {String} value The string to truncate
 * @param {Number} length The maximum length to allow before truncating
 * @return {String} The converted text
 */
if (typeof String.prototype.ellipsiz != 'function') {
	String.prototype.ellipsiz = function(len) {
		var sz = 0;
		for (var i = 0; i < this.length; i++) {
			sz++;
			if (this.charCodeAt(i) > 0xFF) {
				sz++;
			}
			if (sz > len) {
				return this.slice(0, i) + '...';
			}
		}
		return this;
	}
}

if (typeof String.prototype.escapeRegExp != "function") {
	String.prototype.escapeRegExp = function() {
		return this.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
	};
}
if (typeof String.prototype.escapeHTML != "function") {
	var ehm = {
		'&': '&amp;',
		"'": '&apos;',
		'`': '&#x60;',
		'"': '&quot;',
		'<': '&lt;',
		'>': '&gt;'
	};

	String.prototype.escapeHTML = function() {
		return this.replace(/[&'`"<>]/g, function(c) {
			return ehm[c];
		});
	};
}
if (typeof String.prototype.unescapeHTML != "function") {
	// a simple version, complete version: https://stackoverflow.com/questions/994331/how-to-unescape-html-character-entities-in-java
	var uhm = {
		'&lt;'   : '<',
		'&gt;'   : '>',
		'&amp;'  : '&',
		'&quot;' : '"',
		'&apos;' : "'",
		'&#x27;' : "'",
		'&#x60;' : '`'
	};

	String.prototype.unescapeHTML = function() {
		return this.replace(/&(lt|gt|amp|quot|apos|#x27|#x60);/g, function(t) {
			return uhm[t];
		});
	};
}
if (typeof String.prototype.prettifyXML != "function") {
	String.prototype.prettifyXML = function() {
		var xml = '';
		var pad = 0;
		var ss = this.replace(/(>)(<)(\/*)/g, '$1\r\n$2$3').split('\r\n');
		for (var i = 0; i < ss.length; i++) {
			var s = ss[i];
			var indent = 0;
			if (s.match( /.+<\/\w[^>]*>$/ )) {
			}
			else if (s.match( /^<\/\w/ )) {
				if (pad > 0) {
					pad -= 1;
				}
			}
			else if (s.match( /^<\w[^>]*[^\/]*>.*$/ )) {
				indent = 1;
			}
	
			xml += ('').leftPad(pad * 2) + s + '\r\n';
			pad += indent;
		}
	
		return xml;
	};
}
if (typeof String.prototype.encodeUTF8 != "function") {
	String.prototype.encodeUTF8 = function() {
		string = this.replace(/rn/g,"\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}

		return utftext;
	};
}
if (typeof String.prototype.decodeUTF8 != "function") {
	String.prototype.decodeUTF8 = function() {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while ( i < this.length ) {
			c = this.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = this.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = this.charCodeAt(i+1);
				c3 = this.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}

		return string;
	};
}
if (typeof String.prototype.encodeBase64 != "function") {
	String.prototype.encodeBase64 = function() {
		if (typeof btoa === 'function') {
			 return btoa(this);
		}
		var base64s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var bits;
		var dual;
		var i = 0;
		var encOut = "";
		while(this.length >= i + 3){
			bits = (this.charCodeAt(i++) & 0xff) <<16 | (this.charCodeAt(i++) & 0xff) <<8 | this.charCodeAt(i++) & 0xff;
			encOut += base64s.charAt((bits & 0x00fc0000) >>18) + base64s.charAt((bits & 0x0003f000) >>12) + base64s.charAt((bits & 0x00000fc0) >> 6) + base64s.charAt((bits & 0x0000003f));
		}
		if(this.length -i > 0 && this.length -i < 3){
			dual = Boolean(this.length -i -1);
			bits = ((this.charCodeAt(i++) & 0xff) <<16) |	 (dual ? (this.charCodeAt(i) & 0xff) <<8 : 0);
			encOut += base64s.charAt((bits & 0x00fc0000) >>18) + base64s.charAt((bits & 0x0003f000) >>12) + (dual ? base64s.charAt((bits & 0x00000fc0) >>6) : '=') + '=';
		}
		return(encOut);
	};
}

if (typeof String.prototype.decodeBase64 != "function") {
	String.prototype.decodeBase64 = function() {
		if (typeof atob === 'function') {
			return atob(this);
		}
		var base64s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var bits, decOut = "";
		for (var i = 0; i < this.length; i += 4) {
			bits = (base64s.indexOf(this.charAt(i)) & 0xff) <<18 | (base64s.indexOf(this.charAt(i +1)) & 0xff) <<12 | (base64s.indexOf(this.charAt(i +2)) & 0xff) << 6 | base64s.indexOf(this.charAt(i +3)) & 0xff;
			decOut += String.fromCharCode((bits & 0xff0000) >>16, (bits & 0xff00) >>8, bits & 0xff);
		}
		if (this.charCodeAt(i -2) == 61) {
			return(decOut.slice(0, decOut.length - 2));
		}
		else if (this.charCodeAt(i -1) == 61) {
			return(decOut.slice(0, decOut.length - 1));
		}
		else {
			return(decOut);
		}
	};
}

