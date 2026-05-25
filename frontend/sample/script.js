/**
 * Sample JavaScript file demonstrating common patterns
 */

// Function declaration
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Arrow function
const multiply = (a, b) => a * b;

// Object definition
const config = {
  appName: "Sample Editor",
  version: "1.0.0",
  features: ["editing", "preview", "export"],
  settings: {
    theme: "light",
    fontSize: 14
  }
};

// Array methods
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
const filtered = numbers.filter(n => n > 2);

// Class definition
class Calculator {
  constructor(initialValue = 0) {
    this.value = initialValue;
  }
  
  add(num) {
    this.value += num;
    return this;
  }
  
  subtract(num) {
    this.value -= num;
    return this;
  }
  
  getResult() {
    return this.value;
  }
}

// Usage
console.log("Fibonacci(10):", fibonacci(10));
console.log("Multiply(5, 3):", multiply(5, 3));
console.log("Doubled:", doubled);
console.log("Config:", config);

const calc = new Calculator(10);
const result = calc.add(5).subtract(3).getResult();
console.log("Calculator result:", result);
