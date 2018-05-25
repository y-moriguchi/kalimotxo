/**
 * Kalimotxo
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
(function(root) {
	function Trie() {
		var me,
			trie = {},
			keyValue = {},
			module;
		function addTrie(keyword, value) {
			var i,
				nowTrie = trie,
				ch;
			for(i = 0; i < keyword.length; i++) {
				ch = keyword.charAt(i);
				if(!nowTrie[ch]) {
					nowTrie[ch] = {};
				}
				nowTrie = nowTrie[ch];
			}
		}
		me = {
			search: function(str, index) {
				var nowTrie = trie,
					i,
					ch,
					res = "";
				for(i = index; i < str.length; i++) {
					ch = str.charAt(i);
					if(nowTrie[ch]) {
						nowTrie = nowTrie[ch];
						res += ch;
					} else {
						break;
					}
				}
				if(keyValue[res]) {
					return {
						key: res,
						value: keyValue[res]
					};
				} else {
					return null;
				}
			},
			add: function(keyword, value) {
				addTrie(keyword, value);
				keyValue[keyword] = value;
			}
		};
		return me;
	}

	function Operator(options) {
		var me,
			patterns = options ? options : {};
			patternFollow = patterns.follow ? patterns.follow : /$/,
			patternId = patterns.id ? patterns.id : /[0-9]+/,
			patternSpace = patterns.space ? patterns.space : /[ \t\n\r]+/,
			patternStartParen = patterns.startParen ? patterns.startParen : /\(/,
			patternEndParen = patterns.endParen ? patterns.endParen : /\)/,
			MIN_PRED = 1,
			MAX_PRED = 65535,
			END_PRED = -1,
			PAREN_PRED1 = 0,
			PAREN_PRED2 = 65537,
			ID_PRED = 65536,
			PRED_SCALE = 10,
			PRED_DIFF = 2,
			END = 0,
			ID = 1,
			START_PAREN = 2,
			END_PAREN = 3,
			INFIX = 1,
			PREFIX = 2,
			POSTFIX = 3,
			operatorNo = 4,
			trie = Trie(),
			table = {};
		table[END] = {
			f: END_PRED * PRED_SCALE,
			g: END_PRED * PRED_SCALE,
			action: function(attr) { return attr; }
		};
		table[ID] = {
			f: ID_PRED * PRED_SCALE,
			g: ID_PRED * PRED_SCALE + PRED_DIFF,
			action: patterns.actionId ? patterns.actionId : function(x) { return parseFloat(x); }
		};
		table[START_PAREN] = {
			f: PAREN_PRED1 * PRED_SCALE,
			g: PAREN_PRED2 * PRED_SCALE
		};
		table[END_PAREN] = {
			f: PAREN_PRED2 * PRED_SCALE,
			g: PAREN_PRED1 * PRED_SCALE
		};
		function copyRegex(pattern) {
			var reSource = pattern.source;
				reFlags = "g";
			reFlags += pattern.ignoreCase ? "i" : "";
			reFlags += pattern.multiline ? "m" : "";
			return new RegExp(reSource, reFlags);
		}
		function matchSticky(regex, str, index) {
			var match;
			regex.lastIndex = 0;
			if(!!(match = regex.exec(str.substr(index))) && match.index === 0) {
				return {
					match: match[0],
					index: index + regex.lastIndex
				}
			} else {
				return null;
			}
		}
		function addOperator(operator, precedenceF, precedenceG, action, fix) {
			trie.add(operator, operatorNo);
			table[operatorNo++] = {
				f: precedenceF,
				g: precedenceG,
				action: action,
				fix: fix
			};
		}
		function parse(str, index) {
			var nowIndex = index ? index : 0,
				pFollow = copyRegex(patternFollow),
				pId = copyRegex(patternId),
				pSpace = copyRegex(patternSpace),
				pStartParen = copyRegex(patternStartParen),
				pEndParen = copyRegex(patternEndParen),
				stack = [],
				attrStack = [],
				token,
				tokenPoped;
			function nextToken() {
				var match,
					attr;
				if(!!(match = matchSticky(pSpace, str, nowIndex))) {
					nowIndex = match.index;
				}
				if(nowIndex >= str.length || !!matchSticky(pFollow, str, nowIndex)) {
					return {
						token: END
					};
				} else if(!!(match = matchSticky(pStartParen, str, nowIndex))) {
					nowIndex = match.index;
					return {
						token: START_PAREN
					};
				} else if(!!(match = matchSticky(pEndParen, str, nowIndex))) {
					nowIndex = match.index;
					return {
						token: END_PAREN
					};
				} else if(!!(match = matchSticky(pId, str, nowIndex))) {
					nowIndex = match.index;
					return {
						token: ID,
						attr: match.match
					};
				} else if(!!(match = trie.search(str, nowIndex))) {
					nowIndex += match.key.length;
					return {
						token: match.value
					};
				} else {
					throw new Error("Syntax error: unexpected token");
				}
			}
			function doAction(token) {
				var arg1,
					arg2;
				if(token.token === ID) {
					attrStack.push(table[ID].action(token.attr));
				} else if(token.token !== END && token.token !== START_PAREN && token.token !== END_PAREN) {
					switch(table[token.token].fix) {
					case INFIX:
						arg2 = attrStack.pop();
						arg1 = attrStack.pop();
						attrStack.push(table[token.token].action(arg1, arg2));
						break;
					case PREFIX:
					case POSTFIX:
						arg1 = attrStack.pop();
						attrStack.push(table[token.token].action(arg1, arg2));
						break;
					default:
						throw new Error("Invalid fix");
					}
				}
			}
			stack.push({ token: END });
			token = nextToken();
			while(true) {
				if(stack[stack.length - 1].token === END && token.token === END) {
					return {
						match: str.substr(index, nowIndex),
						lastIndex: nowIndex,
						attribute: attrStack[attrStack.length - 1]
					};
				} else {
					if(table[stack[stack.length - 1].token].f <= table[token.token].g) {
						stack.push(token);
						token = nextToken();
					} else {
						do {
							tokenPoped = stack.pop();
							doAction(tokenPoped);
						} while(table[stack[stack.length - 1].token].f >= table[tokenPoped.token].g);
					}
				}
			}
		}
		me = {
			addInfixOperatorLToR: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE - PRED_DIFF, action, INFIX);
			},
			addInfixOperatorRToL: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE + PRED_DIFF, action, INFIX);
			},
			addPrefixOperator: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE + PRED_DIFF, action, PREFIX);
			},
			addPostfixOperator: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE - PRED_DIFF, action, PREFIX);
			},
			parse: parse
		};
		return me;
	}

	module = {
		Operator: Operator
	};
	if(typeof module !== "undefined" && module.exports) {
		module.exports = module;
	} else {
		root["Kalimotxo"] = root["K"] = module;
	}
})(this);
