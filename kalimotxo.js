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
			add: function(keyword, value, propname) {
				addTrie(keyword, value);
				if(!keyValue[keyword]) {
					keyValue[keyword] = {};
				}
				keyValue[keyword][propname] = value;
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
			patternStartParen = patterns.parenthesis ? patterns.parenthesis[0] : /\(/,
			patternEndParen = patterns.parenthesis ? patterns.parenthesis[1] : /\)/,
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
			trie = Trie(),   // not immutable
			table = {};      // not immutable
		table[END] = {
			f: END_PRED * PRED_SCALE,
			g: END_PRED * PRED_SCALE,
			action: function(attr) { return attr; },
			associative: true
		};
		table[ID] = {
			f: ID_PRED * PRED_SCALE,
			g: ID_PRED * PRED_SCALE + PRED_DIFF,
			action: patterns.actionId ? patterns.actionId : function(x) { return parseFloat(x); },
			associative: true
		};
		table[START_PAREN] = {
			f: PAREN_PRED1 * PRED_SCALE,
			g: PAREN_PRED2 * PRED_SCALE,
			associative: true
		};
		table[END_PAREN] = {
			f: PAREN_PRED2 * PRED_SCALE,
			g: PAREN_PRED1 * PRED_SCALE,
			associative: true
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
		function isSamePrecedence(token1, token2) {
			var pred1 = table[token1],
				pred2 = table[token2];
			return pred1.fix === pred2.fix && Math.abs(pred1.f - pred2.g) <= PRED_SCALE;
		}
		function addOperator(operator, precedenceF, precedenceG, action, fix, nonassoc) {
			trie.add(operator, operatorNo, fix);
			table[operatorNo++] = {
				f: precedenceF,
				g: precedenceG,
				action: action,
				fix: fix,
				associative: !nonassoc
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
				fixState = PREFIX,
				countParen = 0;
			function transitFix(fix, token) {
				switch(fix) {
				case PREFIX:
					if(token === ID) {
						return {
							state: INFIX
						};
					} else if(token === START_PAREN) {
						return {
							state: PREFIX
						};
					} else if(token === END_PAREN) {
						throw new Error("Syntax error: unexpected end parenthesis");
					} else if(token === END) {
						throw new Error("Syntax error: unexpected end of expression");
					} else if(table[token[PREFIX]]) {
						return {
							state: PREFIX,
							fix: PREFIX
						};
					} else {
						throw new Error("Syntax error: unexpected postfix operator");
					}
				case INFIX:
					if(token === ID || token === START_PAREN) {
						throw new Error("Syntax error: unexpected id or start parenthesis");
					} else if(token === END_PAREN || token === END) {
						return {
							state: INFIX
						};
					} else if(table[token[INFIX]]) {
						return {
							state: POSTFIX,
							fix: INFIX
						};
					} else if(table[token[POSTFIX]]) {
						return {
							state: POSTFIX,
							fix: POSTFIX
						};
					} else {
						throw new Error("Syntax error: unexpected prefix operator");
					}
				case POSTFIX:
					if(token === ID || token === END_PAREN || token === END) {
						return {
							state: INFIX
						};
					} else if(token === START_PAREN) {
						return {
							state: PREFIX
						};
					} else if(table[token[PREFIX]]) {
						return {
							state: PREFIX,
							fix: PREFIX
						};
					} else if(table[token[POSTFIX]]) {
						return {
							state: POSTFIX,
							fix: POSTFIX
						};
					} else {
						return {
							state: PREFIX,
							fix: INFIX
						};
					}
				default:
					throw new Error("invalid state");
				}
			}
			function nextToken(before) {
				var match,
					attr,
					result,
					fixResult;
				if(!!(match = matchSticky(pSpace, str, nowIndex))) {
					nowIndex = match.index;
				}
				if(nowIndex >= str.length || !!matchSticky(pFollow, str, nowIndex)) {
					if(countParen > 0) {
						throw new Error("Syntax error: unbalanced parenthesis");
					}
					result = {
						token: END
					};
				} else if(!!(match = matchSticky(pStartParen, str, nowIndex))) {
					nowIndex = match.index;
					countParen++;
					result = {
						token: START_PAREN
					};
				} else if(!!(match = matchSticky(pEndParen, str, nowIndex))) {
					nowIndex = match.index;
					countParen--;
					if(countParen < 0) {
						throw new Error("Syntax error: unbalanced parenthesis");
					}
					result = {
						token: END_PAREN
					};
				} else if(!!(match = matchSticky(pId, str, nowIndex))) {
					nowIndex = match.index;
					result = {
						token: ID,
						attr: match.match
					};
				} else if(!!(match = trie.search(str, nowIndex))) {
					nowIndex += match.key.length;
					result = {
						token: match.value,
						operator: true
					};
				} else {
					throw new Error("Syntax error: unexpected token");
				}
				fixResult = transitFix(fixState, result.token);
				fixState = fixResult.state;
				if(result.operator) {
					result.token = result.token[fixResult.fix];
					if(before && table[before.token].fix === INFIX && fixResult.fix === INFIX) {
						throw new Error("Syntax error: unexpected infix operator");
					}
				}
				result.associative = table[result.token].associative;
				return result;
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
			function exec() {
				var token,
					tokenPoped,
					stackTop,
					isSamePred;
				stack.push({ token: END });
				token = nextToken(token);
				while(true) {
					stackTop = stack[stack.length - 1].token;
					if(stackTop === END && token.token === END) {
						return {
							match: str.substr(index, nowIndex),
							lastIndex: nowIndex,
							attribute: attrStack[attrStack.length - 1]
						};
					} else {
						// check associative
						isSamePred = isSamePrecedence(stackTop, token.token);
						if(isSamePred && !token.associative) {
							throw new Error("Syntax error: operator is not associative");
						}

						if(!(table[stackTop].fix === POSTFIX && (table[token.token].fix === POSTFIX || table[token.token].fix === INFIX)) &&
								(table[stackTop].f <= table[token.token].g || table[token.token].fix === PREFIX)) {
							stack.push(token);
							token = nextToken(token);
						} else {
							do {
								tokenPoped = stack.pop();
								doAction(tokenPoped);
							} while(table[stack[stack.length - 1].token].f >= table[tokenPoped.token].g);
						}
					}
				}
			}
			return exec();
		}
		me = {
			addInfixLToR: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE - PRED_DIFF, action, INFIX);
			},
			addInfixRToL: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE + PRED_DIFF, action, INFIX);
			},
			addInfixNonAssoc: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE + PRED_DIFF, action, INFIX, true);
			},
			addPrefix: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE + PRED_DIFF, action, PREFIX);
			},
			addPrefixNonAssoc: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE + PRED_DIFF, action, PREFIX, true);
			},
			addPostfix: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE - PRED_DIFF, action, POSTFIX);
			},
			addPostfixNonAssoc: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE - PRED_DIFF, action, POSTFIX, true);
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
