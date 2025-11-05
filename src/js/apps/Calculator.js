// Calculator Application
const CalculatorApp = {
    currentValue: '0',
    previousValue: null,
    operation: null,
    windowId: null,

    render() {
        return `
            <div class="calculator">
                <div class="calculator-display" id="calc-display">0</div>
                <div class="calculator-buttons">
                    <button class="calc-btn clear">C</button>
                    <button class="calc-btn operator">÷</button>
                    <button class="calc-btn operator">×</button>
                    <button class="calc-btn operator">−</button>
                    
                    <button class="calc-btn">7</button>
                    <button class="calc-btn">8</button>
                    <button class="calc-btn">9</button>
                    <button class="calc-btn operator">+</button>
                    
                    <button class="calc-btn">4</button>
                    <button class="calc-btn">5</button>
                    <button class="calc-btn">6</button>
                    <button class="calc-btn operator">%</button>
                    
                    <button class="calc-btn">1</button>
                    <button class="calc-btn">2</button>
                    <button class="calc-btn">3</button>
                    <button class="calc-btn">.</button>
                    
                    <button class="calc-btn">0</button>
                    <button class="calc-btn equals">=</button>
                </div>
            </div>
        `;
    },

    init(windowId) {
        this.windowId = windowId;
        this.currentValue = '0';
        this.previousValue = null;
        this.operation = null;
        
        const display = document.getElementById('calc-display');
        const buttons = document.querySelectorAll(`#${windowId} .calc-btn`);
        
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleButton(btn.textContent, display);
            });
        });
    },

    handleButton(value, display) {
        if (value === 'C') {
            this.clear();
        } else if (value === '=') {
            this.calculate();
        } else if (['+', '−', '×', '÷', '%'].includes(value)) {
            this.setOperation(value);
        } else if (value === '.') {
            this.addDecimal();
        } else {
            this.addNumber(value);
        }
        
        display.textContent = this.currentValue;
    },

    clear() {
        this.currentValue = '0';
        this.previousValue = null;
        this.operation = null;
    },

    addNumber(num) {
        if (this.currentValue === '0') {
            this.currentValue = num;
        } else {
            this.currentValue += num;
        }
    },

    addDecimal() {
        if (!this.currentValue.includes('.')) {
            this.currentValue += '.';
        }
    },

    setOperation(op) {
        if (this.previousValue !== null && this.operation !== null) {
            this.calculate();
        }
        this.previousValue = this.currentValue;
        this.currentValue = '0';
        this.operation = op;
    },

    calculate() {
        if (this.previousValue === null || this.operation === null) return;
        
        const prev = parseFloat(this.previousValue);
        const current = parseFloat(this.currentValue);
        let result = 0;
        
        switch(this.operation) {
            case '+':
                result = prev + current;
                break;
            case '−':
                result = prev - current;
                break;
            case '×':
                result = prev * current;
                break;
            case '÷':
                result = prev / current;
                break;
            case '%':
                result = prev % current;
                break;
        }
        
        this.currentValue = String(result);
        this.previousValue = null;
        this.operation = null;
    }
};
