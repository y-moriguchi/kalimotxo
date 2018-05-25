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
			patternSpace = patterns.space ? pattern.space : /[ \t\n\r]+/,
			MIN_PRED = 1,
			MAX_PRED = 65535,
			END_PRED = 0,
			ID_PRED = 65536,
			PRED_SCALE = 10,
			PRED_DIFF = 2,
			END = 0,
			ID = 1,
			operatorNo = 2,
			trie = Trie(),
			tableF = {},
			tableG = {},
			actions = {};
		tableF[END] = END_PRED * PRED_SCALE;
		tableG[END] = END_PRED * PRED_SCALE;
		actions[END] = function(attr) { return attr; };
		tableF[ID] = ID_PRED * PRED_SCALE;
		tableG[ID] = ID_PRED * PRED_SCALE + PRED_DIFF;
		actions[ID] = patterns.actionId ? patterns.actionId : function(x) { return parseFloat(x); };
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
		function addOperator(operator, precedenceF, precedenceG, action) {
			trie.add(operator, operatorNo);
			tableF[operatorNo] = precedenceF;
			tableG[operatorNo] = precedenceG;
			actions[operatorNo] = action;
			operatorNo++;
		}
		function parse(str, index) {
			var nowIndex = index ? index : 0,
				pFollow = copyRegex(patternFollow),
				pId = copyRegex(patternId),
				pSpace = copyRegex(patternSpace),
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
				if(nowIndex >= str.length) {
					return {
						token: END,
						attr: null
					};
				} else if(!!(match = matchSticky(pFollow, str, nowIndex))) {
					nowIndex = match.index;
					return {
						token: END,
						attr: null
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
						token: match.value,
						attr: null
					};
				} else {
					throw new Error("Syntax error: unexpected token");
				}
			}
			function doAction(token) {
				var arg1,
					arg2;
				if(token.token === ID) {
					attrStack.push(actions[ID](token.attr));
				} else if(token.token !== END) {
					arg2 = attrStack.pop();
					arg1 = attrStack.pop();
					attrStack.push(actions[token.token](arg1, arg2));
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
					if(tableF[stack[stack.length - 1].token] <= tableG[token.token]) {
						stack.push(token);
						token = nextToken();
					} else {
						do {
							tokenPoped = stack.pop();
							doAction(tokenPoped);
						} while(tableF[stack[stack.length - 1].token] >= tableG[tokenPoped.token]);
					}
				}
			}
		}
		me = {
			addOperatorLToR: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE - PRED_DIFF, action);
			},
			addOperatorRToL: function(operator, precedence, action) {
				addOperator(operator, precedence * PRED_SCALE, precedence * PRED_SCALE + PRED_DIFF, action);
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
