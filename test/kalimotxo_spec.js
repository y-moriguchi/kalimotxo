/**
 * Kalimotxo
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
/*
 * This test case describe by Jasmine.
 */
describe("Kalimotxo", function () {
	function fact(x) {
		var r = 1;
		for(var i = 2; i <= x; i++) {
			r *= i;
		}
		return r;
	}

	function match(rules, str, value, length, follow) {
		var len = length === void 0 ? str.length : length,
			result;
		result = rules.parse(str, 0, follow);
		expect(result.lastIndex).toBe(len);
		expect(result.attribute).toEqual(value);
	}

	function toThrow(rules, str) {
		var len = length === void 0 ? str.length : length,
			result;
		expect(function() { rules.parse(str, 0) }).toThrow();
	}

	function makeRules(options) {
		var rules = K.Operator(options);
		rules.addInfixNonAssoc("<", 1200 - 700, (x, y) => x < y ? 1 : 0);
		rules.addInfixNonAssoc(">", 1200 - 700, (x, y) => x > y ? 1 : 0);
		rules.addInfixNonAssoc("=<", 1200 - 700, (x, y) => x <= y ? 1 : 0);
		rules.addInfixNonAssoc(">=", 1200 - 700, (x, y) => x >= y ? 1 : 0);
		rules.addInfixLToR("+", 1200 - 500, (x, y) => x + y);
		rules.addInfixLToR("-", 1200 - 500, (x, y) => x - y);
		rules.addInfixLToR("*", 1200 - 400, (x, y) => x * y);
		rules.addInfixLToR("%", 1200 - 400, (x, y) => x % y);
		rules.addInfixRToL("**", 1200 - 250, (x, y) => Math.pow(x, y));
		rules.addPostfix("!", 1200 - 220, x => fact(x));
		rules.addPostfixNonAssoc("++", 1200 - 500, x => x + 1);
		rules.addPostfix("!@", 1200 - 520, x => fact(x));
		rules.addPrefix("/", 1200 - 400, x => 1 / x);
		rules.addPrefixNonAssoc("-", 1200 - 500, x => -x);
		rules.addPrefixNonAssoc("uminus", 1200 - 500, x => -x);
		rules.addPrefix("-@", 1200 - 500, x => x - 5);
		return rules;
	}

	beforeEach(function () {
	});

	describe("testing match", function () {
		it("id", function () {
			var rules = makeRules();
			match(rules, "12", 12);
		});
		it("infix operator", function () {
			var rules = makeRules();
			match(rules, "1+2", 3);
			match(rules, "1+2*3", 7);
			match(rules, "2*3+1", 7);
			match(rules, "8-2-4", 2);
			match(rules, "2*2**2**3", 512);
			match(rules, "2**2**3*2", 512);
			match(rules, "(1+2)*3", 9);
			match(rules, "8-(2-4)", 10);
			match(rules, "2*(2**2)**3", 128);
			match(rules, "1+3<2+4", 1);
			toThrow(rules, "1+3<2+4<4");
			match(rules, "0<(1<2)", 1);
			match(rules, "(0<1)<2", 1);
			toThrow(rules, "0<(1<2)<3");
			toThrow(rules, "(0+3)<(1+3)<3");
			toThrow(rules, "1<2>4");
			match(rules, "1<(2>4)", 0);
		});
		it("prefix operator", function () {
			var rules = makeRules();
			match(rules, "/2", 0.5);
			match(rules, "1+/2", 1.5);
			match(rules, "-1+2", 1);
			toThrow(rules, "--1+2");
			match(rules, "1--2", 3);
			match(rules, "//2", 2);
			match(rules, "-/2", -0.5);
			toThrow(rules, "1---2");
			match(rules, "1--(-2)", -1);
			match(rules, "/-2", -0.5);
			match(rules, "1+-1*-2", 3);
			match(rules, "-@3*2", 1);
			match(rules, "(-@3)*2", -4);
		});
		it("postfix operator", function () {
			var rules = makeRules();
			match(rules, "3!", 6);
			match(rules, "3!++", 7);
			match(rules, "3++!", 24);
			match(rules, "3!+4", 10);
			match(rules, "4+3!", 10);
			match(rules, "(1+3)!", 24);
			match(rules, "3!@+4", 10);
			match(rules, "1+3!@", 24);
			match(rules, "1+(3!@)", 7);
			match(rules, "1+1++", 3);
			toThrow(rules, "1+1++++");
			match(rules, "1+(1++)++", 4);
			match(rules, "1+(1++)+++2", 6);
			match(rules, "3!!", 720);
			match(rules, "(3!)!", 720);
		});
		it("syntax errors", function () {
			var rules = makeRules();
			toThrow(rules, "()");
			toThrow(rules, "1%%2");
			toThrow(rules, "1(2+3)");
			toThrow(rules, "(2+3");
			toThrow(rules, "2+3)");
			toThrow(rules, "((2+3)+3");
			toThrow(rules, "(2+3)+3)");
			toThrow(rules, "!+3");
			toThrow(rules, "1+(!+3)");
			toThrow(rules, "%3");
			toThrow(rules, "1+(%3)");
			toThrow(rules, "1+-");
			toThrow(rules, "1+(1+-)");
			toThrow(rules, "-@");
			toThrow(rules, "1+(-@)");
			toThrow(rules, ")");
			toThrow(rules, "1+)");
			toThrow(rules, "1+())");
			toThrow(rules, "1+(1+))");
			toThrow(rules, "");
			toThrow(rules, "1-@2");
			toThrow(rules, "aaa");
			toThrow(rules, "1+2;");
		});
		it("space", function () {
			var rules = makeRules();
			match(rules, "1 + 2 + 3", 6);
		});
		it("option: follow", function () {
			var rules = makeRules({ follow: /;/ });
			match(rules, "1+2;", 3, 3);
		});
		it("option: id", function () {
			var rules = makeRules({ id: /[0-9]/ });
			match(rules, "1+2", 3);
			toThrow(rules, "11");
		});
		it("option: space", function () {
			var rules = makeRules({ space: / / });
			match(rules, "1 + 2", 3);
			toThrow(rules, "1\t+\t1");
		});
		it("option: parenthesis", function () {
			var rules = makeRules({ parenthesis: [ /{/, /}/ ] });
			match(rules, "{1+2}*3", 9);
			toThrow(rules, "(1+2)*3");
		});
		it("option: actionId", function () {
			var rules = makeRules({ actionId: function(x) { return x.length } });
			match(rules, "(1+2)*346", 6);
		});
		it("word boundary", function () {
			var rules = makeRules();
			match(rules, "uminus1", -1);
			match(rules, "uminus 1", -1);
			toThrow(rules, "uminuss1");
		});
		it("option: words", function () {
			var rules = makeRules({ words: /[a-zA-Z0-9_]/ });
			match(rules, "uminus 1", -1);
			toThrow(rules, "uminus1", -1);
		});
		it("follow", function () {
			var rules = makeRules();
			match(rules, "1+2+3;", 6, 5, /;/);
			match(rules, "1+2+3;", 1, 1, /\+/);
		});
	});
});
