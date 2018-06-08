# Kalimotxo
Kalimotxo is a library to parse operator grammar.  
Kalimotxo can add operators dynamically.  

## How to use

### node.js
Install Kalimotxo:
```
npm install kalimotxo
```

Use module:
```js
var R = require('kalimotxo');
```

### Browser
```html
<script src="kalimotxo.js"></script>
```

## Examples

### Arithmetic Operator
```js
var rules = K.Operator(options);
rules.addInfixLToR("+", 700, (x, y) => x + y);
rules.addInfixLToR("-", 700, (x, y) => x - y);
rules.addInfixLToR("*", 800, (x, y) => x * y);
rules.addInfixLToR("/", 800, (x, y) => x / y);

console.log(rules.parse("1+2*3", 0).attribute);  // outputs 7
```
