class CodeFixerGame {
    constructor(gameSave) {
        this.gameSave = gameSave;
        this.state = {
            currentLanguage: 'cpp',
            currentLevel: 1,
            currentChallenge: {},
            score: 0,
            streak: 0,
            user: null
        };

        this.domElements = {
            loginBtn: document.getElementById('login-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            userInfo: document.getElementById('user-info'),
            userEmail: document.getElementById('user-email'),
            scoreEl: document.getElementById('score'),
            streakEl: document.getElementById('streak'),
            codeEditor: document.getElementById('code-editor'),
            codeDisplay: document.getElementById('code-content'),
            expectedOutput: document.getElementById('expected-output'),
            userOutput: document.getElementById('user-output'),
            messageEl: document.getElementById('message'),
            diffOutput: document.getElementById('diff-output'),
            challengeTitle: document.getElementById('challenge-title'),
            submitBtn: document.getElementById('submit-btn'),
            hintBtn: document.getElementById('hint-btn'),
            nextBtn: document.getElementById('next-btn'),
            resetBtn: document.getElementById('reset-btn'),
            saveBtn: document.getElementById('save-btn'),
            levelBtns: document.querySelectorAll('.level-btn'),
            languageTabs: document.querySelectorAll('.language-tab')
        };
    }

    init() {
        this.initNetlifyIdentity();
        this.setupEventListeners();
        this.loadRandomChallenge();
    }

    initNetlifyIdentity() {
        if (window.netlifyIdentity) {
            window.netlifyIdentity.on('init', user => {
                this.state.user = user;
                if (user) this.handleLogin(user);
            });

            window.netlifyIdentity.on('login', user => {
                this.handleLogin(user);
                window.netlifyIdentity.close();
            });

            window.netlifyIdentity.on('logout', () => {
                this.handleLogout();
            });

            this.domElements.loginBtn.addEventListener('click', () => {
                window.netlifyIdentity.open();
            });
        }
    }

    async handleLogin(user) {
        this.state.user = user;
        this.domElements.userEmail.textContent = user.email;
        this.domElements.userInfo.style.display = 'flex';
        this.domElements.loginBtn.style.display = 'none';

        const savedData = await this.gameSave.loadUserData(user);
        if (savedData) {
            this.state.score = savedData.score || 0;
            this.state.streak = savedData.streak || 0;
            this.state.currentLanguage = savedData.currentLanguage || 'cpp';
            this.state.currentLevel = savedData.currentLevel || 1;
            this.updateScoreDisplay();
            this.loadRandomChallenge();
        }
    }

    handleLogout() {
        this.state.user = null;
        this.domElements.userInfo.style.display = 'none';
        this.domElements.loginBtn.style.display = 'block';
    }

    setupEventListeners() {
        // Language tabs
        this.domElements.languageTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.state.currentLanguage = tab.dataset.lang;
                document.querySelector('.language-tab.active').classList.remove('active');
                tab.classList.add('active');
                this.loadRandomChallenge();
            });
        });

        // Level buttons
        this.domElements.levelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.currentLevel = parseInt(btn.dataset.level);
                document.querySelector('.level-btn.active').classList.remove('active');
                btn.classList.add('active');
                this.loadRandomChallenge();
            });
        });

        // Game buttons
        this.domElements.submitBtn.addEventListener('click', () => this.checkSolution());
        this.domElements.hintBtn.addEventListener('click', () => this.showHint());
        this.domElements.nextBtn.addEventListener('click', () => this.loadRandomChallenge());
        this.domElements.resetBtn.addEventListener('click', () => this.resetCode());
        this.domElements.saveBtn.addEventListener('click', () => this.saveGame());
    }

    loadRandomChallenge() {
        const challenges = codeChallenges[this.state.currentLanguage][this.state.currentLevel];
        const randomIndex = Math.floor(Math.random() * challenges.length);
        this.state.currentChallenge = challenges[randomIndex];
        
        this.domElements.codeDisplay.textContent = this.state.currentChallenge.broken;
        this.domElements.codeEditor.value = this.state.currentChallenge.broken;
        this.domElements.expectedOutput.textContent = this.state.currentChallenge.expectedOutput;
        this.domElements.challengeTitle.textContent = this.state.currentChallenge.title;
        
        this.clearFeedback();
    }

    checkSolution() {
        const userCode = this.domElements.codeEditor.value.trim();
        const fixedCode = this.state.currentChallenge.fixed.trim();
        
        // Simple validation
        if (userCode === fixedCode) {
            this.state.score += 10 * this.state.currentLevel;
            this.state.streak++;
            this.showFeedback('success', 'Correct! Well done!');
        } else {
            this.state.streak = 0;
            this.showFeedback('error', 'Not quite right. Try again!');
            this.showDiff(userCode, fixedCode);
        }
        
        this.updateScoreDisplay();
    }

    showFeedback(type, message) {
        this.domElements.messageEl.textContent = message;
        this.domElements.messageEl.className = `message ${type}`;
    }

    clearFeedback() {
        this.domElements.messageEl.textContent = '';
        this.domElements.messageEl.className = 'message';
        this.domElements.diffOutput.style.display = 'none';
        this.domElements.diffOutput.innerHTML = '';
    }

    showDiff(userCode, fixedCode) {
        // Simple diff implementation
        let diffHTML = '';
        const userLines = userCode.split('\n');
        const fixedLines = fixedCode.split('\n');
        
        for (let i = 0; i < Math.max(userLines.length, fixedLines.length); i++) {
            if (userLines[i] !== fixedLines[i]) {
                diffHTML += `<div class="diff-line diff-removed">Line ${i+1}: ${userLines[i] || ''}</div>`;
                diffHTML += `<div class="diff-line diff-added">Line ${i+1}: ${fixedLines[i] || ''}</div>`;
            }
        }
        
        this.domElements.diffOutput.innerHTML = diffHTML;
        this.domElements.diffOutput.style.display = diffHTML ? 'block' : 'none';
    }

    showHint() {
        this.showFeedback('info', this.state.currentChallenge.hint);
        this.state.score = Math.max(0, this.state.score - 3);
        this.updateScoreDisplay();
    }

    resetCode() {
        this.domElements.codeEditor.value = this.state.currentChallenge.broken;
        this.clearFeedback();
    }

    async saveGame() {
        const saveData = {
            score: this.state.score,
            streak: this.state.streak,
            currentLanguage: this.state.currentLanguage,
            currentLevel: this.state.currentLevel
        };
        
        await this.gameSave.saveUserData(saveData);
        this.showFeedback('success', 'Progress saved!');
    }

    updateScoreDisplay() {
        this.domElements.scoreEl.textContent = this.state.score;
        this.domElements.streakEl.textContent = this.state.streak;
    }
}


// Extensive code challenges for all languages
const codeChallenges = {
    cpp: {
        1: [
            {
                title: "Missing Namespace",
                broken: `#include <iostream>\n\nint main() {\n    cout << "Hello World";\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    std::cout << "Hello World";\n    return 0;\n}`,
                hint: "Remember to specify the namespace for cout or use 'using namespace std;'",
                expectedOutput: "Hello World"
            },
            {
                title: "Missing Semicolon",
                broken: `#include <iostream>\n\nint main() {\n    int x = 5\n    std::cout << x;\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    int x = 5;\n    std::cout << x;\n    return 0;\n}`,
                hint: "Check for missing semicolons at the end of statements",
                expectedOutput: "5"
            },
            {
                title: "Comparison vs Assignment",
                broken: `#include <iostream>\n\nint main() {\n    int number = 10;\n    if (number = 5) {\n        std::cout << "Number is 5";\n    }\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    int number = 10;\n    if (number == 5) {\n        std::cout << "Number is 5";\n    }\n    return 0;\n}`,
                hint: "Check your comparison operator in the if statement",
                expectedOutput: ""
            },
            {
                title: "Incorrect Main Return",
                broken: `#include <iostream>\n\nint main() {\n    std::cout << "Hello";\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    std::cout << "Hello";\n    return 0;\n}`,
                hint: "main() should return an integer value",
                expectedOutput: "Hello"
            },
            {
                title: "Undefined Variable",
                broken: `#include <iostream>\n\nint main() {\n    std::cout << x;\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    int x = 10;\n    std::cout << x;\n    return 0;\n}`,
                hint: "Variables must be declared before use",
                expectedOutput: "10"
            }
        ],
        2: [
            {
                title: "For Loop Syntax",
                broken: `#include <iostream>\n\nint main() {\n    for (int i = 0; i < 5; i++ {\n        std::cout << i << " ";\n    }\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    for (int i = 0; i < 5; i++) {\n        std::cout << i << " ";\n    }\n    return 0;\n}`,
                hint: "Check the syntax of your for loop, particularly the closing parenthesis",
                expectedOutput: "0 1 2 3 4 "
            },
            {
                title: "Array Bounds",
                broken: `#include <iostream>\n\nint main() {\n    int arr[3] = {1, 2, 3};\n    std::cout << arr[3];\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    int arr[3] = {1, 2, 3};\n    std::cout << arr[2];\n    return 0;\n}`,
                hint: "Remember that array indices start at 0, so what's the valid range for this array?",
                expectedOutput: "3"
            },
            {
                title: "While Loop Condition",
                broken: `#include <iostream>\n\nint main() {\n    int i = 0;\n    while (i < 5) {\n        std::cout << i << " ";\n    }\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    int i = 0;\n    while (i < 5) {\n        std::cout << i << " ";\n        i++;\n    }\n    return 0;\n}`,
                hint: "The loop variable needs to be incremented inside the loop",
                expectedOutput: "0 1 2 3 4 "
            },
            {
                title: "Switch Case Break",
                broken: `#include <iostream>\n\nint main() {\n    int x = 2;\n    switch(x) {\n        case 1: std::cout << "One";\n        case 2: std::cout << "Two";\n        case 3: std::cout << "Three";\n    }\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    int x = 2;\n    switch(x) {\n        case 1: std::cout << "One"; break;\n        case 2: std::cout << "Two"; break;\n        case 3: std::cout << "Three"; break;\n    }\n    return 0;\n}`,
                hint: "Don't forget break statements in switch cases",
                expectedOutput: "Two"
            },
            {
                title: "Function Declaration",
                broken: `#include <iostream>\n\nint main() {\n    std::cout << square(5);\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint square(int n) {\n    return n * n;\n}\n\nint main() {\n    std::cout << square(5);\n    return 0;\n}`,
                hint: "Functions must be declared before they are used",
                expectedOutput: "25"
            }
        ],
        3: [
            {
                title: "Memory Leak",
                broken: `#include <iostream>\n\nint main() {\n    int* ptr = new int;\n    *ptr = 5;\n    std::cout << *ptr;\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    int* ptr = new int;\n    *ptr = 5;\n    std::cout << *ptr;\n    delete ptr;\n    return 0;\n}`,
                hint: "Don't forget to clean up dynamically allocated memory",
                expectedOutput: "5"
            },
            {
                title: "Pointer Arithmetic",
                broken: `#include <iostream>\n\nint main() {\n    int arr[3] = {10, 20, 30};\n    int* ptr = arr;\n    std::cout << *(ptr + 3);\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint main() {\n    int arr[3] = {10, 20, 30};\n    int* ptr = arr;\n    std::cout << *(ptr + 2);\n    return 0;\n}`,
                hint: "Be careful with pointer arithmetic and array bounds",
                expectedOutput: "30"
            },
            {
                title: "Reference Parameter",
                broken: `#include <iostream>\n\nvoid increment(int x) {\n    x++;\n}\n\nint main() {\n    int num = 5;\n    increment(num);\n    std::cout << num;\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nvoid increment(int &x) {\n    x++;\n}\n\nint main() {\n    int num = 5;\n    increment(num);\n    std::cout << num;\n    return 0;\n}`,
                hint: "To modify the original variable, use a reference parameter",
                expectedOutput: "6"
            },
            {
                title: "Const Correctness",
                broken: `#include <iostream>\n\nvoid print(const int* arr, int size) {\n    for(int i = 0; i < size; i++) {\n        arr[i] = i;  // Trying to modify\n        std::cout << arr[i] << " ";\n    }\n}\n\nint main() {\n    int nums[] = {1, 2, 3};\n    print(nums, 3);\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nvoid print(const int* arr, int size) {\n    for(int i = 0; i < size; i++) {\n        std::cout << arr[i] << " ";\n    }\n}\n\nint main() {\n    int nums[] = {1, 2, 3};\n    print(nums, 3);\n    return 0;\n}`,
                hint: "const parameters cannot be modified",
                expectedOutput: "1 2 3 "
            },
            {
                title: "Function Overloading",
                broken: `#include <iostream>\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint add(int a, int b, int c) {\n    return a + b + c;\n}\n\nint main() {\n    std::cout << add(2, 3) << " " << add(2, 3, 4);\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint add(int a, int b, int c) {\n    return a + b + c;\n}\n\nint main() {\n    std::cout << add(2, 3) << " " << add(2, 3, 4);\n    return 0;\n}`,
                hint: "This code is correct! Function overloading allows multiple functions with same name",
                expectedOutput: "5 9"
            }
        ],
        4: [
            {
                title: "Class Definition",
                broken: `#include <iostream>\n\nclass MyClass {\n    int value;\npublic:\n    MyClass(int v) { value = v; }\n    int getValue();\n};\n\nint main() {\n    MyClass obj(42);\n    std::cout << obj.getValue();\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nclass MyClass {\n    int value;\npublic:\n    MyClass(int v) { value = v; }\n    int getValue() { return value; }\n};\n\nint main() {\n    MyClass obj(42);\n    std::cout << obj.getValue();\n    return 0;\n}`,
                hint: "The getValue method is declared but not defined",
                expectedOutput: "42"
            },
            {
                title: "Inheritance",
                broken: `#include <iostream>\n\nclass Animal {\npublic:\n    virtual void speak() = 0;\n};\n\nclass Dog : public Animal {\n    void speak() { std::cout << "Woof!"; }\n};\n\nint main() {\n    Dog myDog;\n    myDog.speak();\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nclass Animal {\npublic:\n    virtual void speak() = 0;\n};\n\nclass Dog : public Animal {\npublic:\n    void speak() override { std::cout << "Woof!"; }\n};\n\nint main() {\n    Dog myDog;\n    myDog.speak();\n    return 0;\n}`,
                hint: "Check the access specifier and consider using override",
                expectedOutput: "Woof!"
            },
            {
                title: "Constructor Initialization",
                broken: `#include <iostream>\n\nclass Point {\n    int x, y;\npublic:\n    Point(int a, int b) {\n        x = a;\n        y = b;\n    }\n    void print() { std::cout << x << "," << y; }\n};\n\nint main() {\n    Point p(3, 4);\n    p.print();\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nclass Point {\n    int x, y;\npublic:\n    Point(int a, int b) : x(a), y(b) {}\n    void print() { std::cout << x << "," << y; }\n};\n\nint main() {\n    Point p(3, 4);\n    p.print();\n    return 0;\n}`,
                hint: "Consider using member initializer list for better practice",
                expectedOutput: "3,4"
            },
            {
                title: "Static Member",
                broken: `#include <iostream>\n\nclass Counter {\n    static int count;\npublic:\n    Counter() { count++; }\n    static int getCount() { return count; }\n};\n\nint main() {\n    Counter c1, c2;\n    std::cout << Counter::getCount();\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nclass Counter {\n    static int count;\npublic:\n    Counter() { count++; }\n    static int getCount() { return count; }\n};\n\nint Counter::count = 0;\n\nint main() {\n    Counter c1, c2;\n    std::cout << Counter::getCount();\n    return 0;\n}`,
                hint: "Static member variables must be defined outside the class",
                expectedOutput: "2"
            },
            {
                title: "Operator Overloading",
                broken: `#include <iostream>\n\nclass Complex {\n    float real, imag;\npublic:\n    Complex(float r, float i) : real(r), imag(i) {}\n    Complex operator+(Complex other) {\n        return Complex(real + other.imag, imag + other.real);\n    }\n    void print() { std::cout << real << " + " << imag << "i"; }\n};\n\nint main() {\n    Complex c1(2,3), c2(4,5);\n    Complex c3 = c1 + c2;\n    c3.print();\n    return 0;\n}`,
                fixed: `#include <iostream>\n\nclass Complex {\n    float real, imag;\npublic:\n    Complex(float r, float i) : real(r), imag(i) {}\n    Complex operator+(Complex other) {\n        return Complex(real + other.real, imag + other.imag);\n    }\n    void print() { std::cout << real << " + " << imag << "i"; }\n};\n\nint main() {\n    Complex c1(2,3), c2(4,5);\n    Complex c3 = c1 + c2;\n    c3.print();\n    return 0;\n}`,
                hint: "Check the addition logic in the operator overload",
                expectedOutput: "6 + 8i"
            }
        ],
        5: [
            {
                title: "Template Function",
                broken: `#include <iostream>\n\nint max(int a, int b) {\n    return (a > b) ? a : b;\n}\n\ndouble max(double a, double b) {\n    return (a > b) ? a : b;\n}\n\nint main() {\n    std::cout << max(5, 3) << " " << max(2.5, 3.1);\n    return 0;\n}`,
                fixed: `#include <iostream>\n\ntemplate <typename T>\nT max(T a, T b) {\n    return (a > b) ? a : b;\n}\n\nint main() {\n    std::cout << max(5, 3) << " " << max(2.5, 3.1);\n    return 0;\n}`,
                hint: "Consider using templates to avoid function overloading",
                expectedOutput: "5 3.1"
            },
            {
                title: "Lambda Function",
                broken: `#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> nums = {3, 1, 4, 1, 5};\n    std::sort(nums.begin(), nums.end(), bool(int a, int b) { return a < b; });\n    for(int n : nums) std::cout << n << " ";\n    return 0;\n}`,
                fixed: `#include <iostream>\n#include <vector>\n#include <algorithm>\n\nint main() {\n    std::vector<int> nums = {3, 1, 4, 1, 5};\n    std::sort(nums.begin(), nums.end(), [](int a, int b) { return a < b; });\n    for(int n : nums) std::cout << n << " ";\n    return 0;\n}`,
                hint: "Check the lambda function syntax",
                expectedOutput: "1 1 3 4 5 "
            },
            {
                title: "Smart Pointer",
                broken: `#include <iostream>\n#include <memory>\n\nclass Resource {\npublic:\n    Resource() { std::cout << "Resource acquired\\n"; }\n    ~Resource() { std::cout << "Resource destroyed\\n"; }\n    void use() { std::cout << "Resource used\\n"; }\n};\n\nint main() {\n    Resource* res = new Resource();\n    res->use();\n    return 0;\n}`,
                fixed: `#include <iostream>\n#include <memory>\n\nclass Resource {\npublic:\n    Resource() { std::cout << "Resource acquired\\n"; }\n    ~Resource() { std::cout << "Resource destroyed\\n"; }\n    void use() { std::cout << "Resource used\\n"; }\n};\n\nint main() {\n    auto res = std::make_unique<Resource>();\n    res->use();\n    return 0;\n}`,
                hint: "Consider using smart pointers to manage memory automatically",
                expectedOutput: "Resource acquired\nResource used\nResource destroyed\n"
            },
            {
                title: "Move Semantics",
                broken: `#include <iostream>\n#include <vector>\n\nstd::vector<int> createVector() {\n    std::vector<int> v = {1, 2, 3};\n    return v;\n}\n\nint main() {\n    std::vector<int> vec;\n    vec = createVector();\n    for(int n : vec) std::cout << n << " ";\n    return 0;\n}`,
                fixed: `#include <iostream>\n#include <vector>\n#include <utility>\n\nstd::vector<int> createVector() {\n    std::vector<int> v = {1, 2, 3};\n    return std::move(v);\n}\n\nint main() {\n    std::vector<int> vec;\n    vec = createVector();\n    for(int n : vec) std::cout << n << " ";\n    return 0;\n}`,
                hint: "Use move semantics to avoid unnecessary copying",
                expectedOutput: "1 2 3 "
            },
            {
                title: "Thread Safety",
                broken: `#include <iostream>\n#include <thread>\n#include <mutex>\n\nint counter = 0;\n\nvoid increment() {\n    for(int i = 0; i < 10000; i++) {\n        counter++;\n    }\n}\n\nint main() {\n    std::thread t1(increment);\n    std::thread t2(increment);\n    t1.join();\n    t2.join();\n    std::cout << counter;\n    return 0;\n}`,
                fixed: `#include <iostream>\n#include <thread>\n#include <mutex>\n\nint counter = 0;\nstd::mutex mtx;\n\nvoid increment() {\n    for(int i = 0; i < 10000; i++) {\n        mtx.lock();\n        counter++;\n        mtx.unlock();\n    }\n}\n\nint main() {\n    std::thread t1(increment);\n    std::thread t2(increment);\n    t1.join();\n    t2.join();\n    std::cout << counter;\n    return 0;\n}`,
                hint: "Shared resources need protection with mutexes",
                expectedOutput: "20000"
            }
        ]
    },
    python: {
        1: [
            {
                title: "Print Function",
                broken: `print "Hello World"`,
                fixed: `print("Hello World")`,
                hint: "In Python 3, print is a function and needs parentheses",
                expectedOutput: "Hello World"
            },
            {
                title: "Indentation Error",
                broken: `def greet():\nprint("Hello")`,
                fixed: `def greet():\n    print("Hello")`,
                hint: "Python uses indentation to define code blocks",
                expectedOutput: "Hello"
            },
            {
                title: "String Concatenation",
                broken: `name = "Alice"\nage = 25\nprint("Name: " + name + " Age: " + age)`,
                fixed: `name = "Alice"\nage = 25\nprint("Name: " + name + " Age: " + str(age))`,
                hint: "Cannot concatenate strings with numbers directly",
                expectedOutput: "Name: Alice Age: 25"
            },
            {
                title: "Division Result",
                broken: `result = 5 / 2\nprint(result)`,
                fixed: `result = 5 / 2\nprint(result)`,
                hint: "This code is correct! Python 3 does floating-point division by default",
                expectedOutput: "2.5"
            },
            {
                title: "List Access",
                broken: `numbers = [1, 2, 3]\nprint(numbers[3])`,
                fixed: `numbers = [1, 2, 3]\nprint(numbers[2])`,
                hint: "Remember Python lists are 0-indexed",
                expectedOutput: "3"
            }
        ],
        2: [
            {
                title: "List Iteration",
                broken: `numbers = [1, 2, 3]\nfor i in range(len(numbers)):\n    print(numbers[i)`,
                fixed: `numbers = [1, 2, 3]\nfor num in numbers:\n    print(num)`,
                hint: "Python has more elegant ways to iterate through lists",
                expectedOutput: "1\n2\n3\n"
            },
            {
                title: "Dictionary Access",
                broken: `person = {'name': 'Alice', 'age': 25}\nprint(person[name])`,
                fixed: `person = {'name': 'Alice', 'age': 25}\nprint(person['name'])`,
                hint: "Dictionary keys need to be quoted when accessing",
                expectedOutput: "Alice"
            },
            {
                title: "Function Default Argument",
                broken: `def greet(name="World"):\n    print("Hello, " + name)\n\ngreet("Alice")\ngreet()`,
                fixed: `def greet(name="World"):\n    print("Hello, " + name)\n\ngreet("Alice")\ngreet()`,
                hint: "This code is correct! Default arguments work as expected",
                expectedOutput: "Hello, Alice\nHello, World\n"
            },
            {
                title: "List Slicing",
                broken: `numbers = [1, 2, 3, 4, 5]\nprint(numbers[1:3])`,
                fixed: `numbers = [1, 2, 3, 4, 5]\nprint(numbers[1:4])`,
                hint: "Remember slice end index is exclusive",
                expectedOutput: "[2, 3, 4]"
            },
            {
                title: "String Formatting",
                broken: `name = "Alice"\nage = 25\nprint("Name: %s Age: %d" % name, age)`,
                fixed: `name = "Alice"\nage = 25\nprint("Name: %s Age: %d" % (name, age))`,
                hint: "Multiple values need to be in a tuple",
                expectedOutput: "Name: Alice Age: 25"
            }
        ],
        3: [
            {
                title: "List Comprehension",
                broken: `numbers = [1, 2, 3, 4, 5]\neven_numbers = []\nfor num in numbers:\n    if num % 2 == 0:\n        even_numbers.append(num)\nprint(even_numbers)`,
                fixed: `numbers = [1, 2, 3, 4, 5]\neven_numbers = [num for num in numbers if num % 2 == 0]\nprint(even_numbers)`,
                hint: "Python has list comprehensions for more concise code",
                expectedOutput: "[2, 4]"
            },
            {
                title: "Lambda Function",
                broken: `numbers = [1, 2, 3, 4]\nsquared = list(map(def(x): return x*x, numbers))\nprint(squared)`,
                fixed: `numbers = [1, 2, 3, 4]\nsquared = list(map(lambda x: x*x, numbers))\nprint(squared)`,
                hint: "Use lambda for simple anonymous functions",
                expectedOutput: "[1, 4, 9, 16]"
            },
            {
                title: "Generator Expression",
                broken: `numbers = [1, 2, 3, 4, 5]\nsquares = [x*x for x in numbers]\nfor num in squares:\n    print(num)`,
                fixed: `numbers = [1, 2, 3, 4, 5]\nsquares = (x*x for x in numbers)\nfor num in squares:\n    print(num)`,
                hint: "Use generator expressions for memory efficiency",
                expectedOutput: "1\n4\n9\n16\n25\n"
            },
            {
                title: "Exception Handling",
                broken: `try:\n    result = 10 / 0\n    print(result)\nexcept:\n    print("Error occurred")`,
                fixed: `try:\n    result = 10 / 0\nexcept ZeroDivisionError:\n    print("Cannot divide by zero")`,
                hint: "Be specific about which exceptions to catch",
                expectedOutput: "Cannot divide by zero"
            },
            {
                title: "Context Manager",
                broken: `f = open("file.txt", "r")\ncontent = f.read()\nprint(content)\nf.close()`,
                fixed: `with open("file.txt", "r") as f:\n    content = f.read()\nprint(content)`,
                hint: "Use context managers for resource handling",
                expectedOutput: "file contents"
            }
        ],
        4: [
            {
                title: "Class Method",
                broken: `class Calculator:\n    def add(self, a, b):\n        return a + b\n\nresult = Calculator.add(2, 3)\nprint(result)`,
                fixed: `class Calculator:\n    def add(self, a, b):\n        return a + b\n\ncalc = Calculator()\nresult = calc.add(2, 3)\nprint(result)`,
                hint: "Instance methods need to be called on an instance of the class",
                expectedOutput: "5"
            },
            {
                title: "Static Method",
                broken: `class MathUtils:\n    def square(n):\n        return n * n\n\nprint(MathUtils.square(5))`,
                fixed: `class MathUtils:\n    @staticmethod\n    def square(n):\n        return n * n\n\nprint(MathUtils.square(5))`,
                hint: "Use @staticmethod decorator for static methods",
                expectedOutput: "25"
            },
            {
                title: "Property Decorator",
                broken: `class Circle:\n    def __init__(self, radius):\n        self.radius = radius\n    \n    def area(self):\n        return 3.14 * self.radius ** 2\n\nc = Circle(5)\nprint(c.area())`,
                fixed: `class Circle:\n    def __init__(self, radius):\n        self.radius = radius\n    \n    @property\n    def area(self):\n        return 3.14 * self.radius ** 2\n\nc = Circle(5)\nprint(c.area)`,
                hint: "Use @property to make a method accessible as an attribute",
                expectedOutput: "78.5"
            },
            {
                title: "Inheritance",
                broken: `class Animal:\n    def speak(self):\n        return "Sound"\n\nclass Dog(Animal):\n    def speak(self):\n        return "Bark"\n\nd = Dog()\nprint(d.speak)`,
                fixed: `class Animal:\n    def speak(self):\n        return "Sound"\n\nclass Dog(Animal):\n    def speak(self):\n        return "Bark"\n\nd = Dog()\nprint(d.speak())`,
                hint: "Methods need parentheses to call them",
                expectedOutput: "Bark"
            },
            {
                title: "Magic Methods",
                broken: `class Vector:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\nv1 = Vector(2, 3)\nv2 = Vector(4, 5)\nprint(v1 + v2)`,
                fixed: `class Vector:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n    \n    def __add__(self, other):\n        return Vector(self.x + other.x, self.y + other.y)\n    \n    def __repr__(self):\n        return f"Vector({self.x}, {self.y})"\n\nv1 = Vector(2, 3)\nv2 = Vector(4, 5)\nprint(v1 + v2)`,
                hint: "Implement magic methods for operator overloading",
                expectedOutput: "Vector(6, 8)"
            }
        ],
        5: [
            {
                title: "Decorators",
                broken: `def debug(func):\n    def wrapper():\n        print("Calling function")\n        return func()\n    return wrapper\n\n@debug\ndef greet():\n    print("Hello")\n\ngreet()`,
                fixed: `def debug(func):\n    def wrapper(*args, **kwargs):\n        print("Calling function")\n        return func(*args, **kwargs)\n    return wrapper\n\n@debug\ndef greet(name):\n    print(f"Hello {name}")\n\ngreet("Alice")`,
                hint: "Make decorators work with any function signature",
                expectedOutput: "Calling function\nHello Alice"
            },
            {
                title: "Generators",
                broken: `def countdown(n):\n    while n >= 0:\n        return n\n        n -= 1\n\nfor num in countdown(5):\n    print(num)`,
                fixed: `def countdown(n):\n    while n >= 0:\n        yield n\n        n -= 1\n\nfor num in countdown(5):\n    print(num)`,
                hint: "Use yield to create a generator function",
                expectedOutput: "5\n4\n3\n2\n1\n0\n"
            },
            {
                title: "Async/Await",
                broken: `import asyncio\n\nasync def fetch_data():\n    print("Start fetching")\n    await asyncio.sleep(2)\n    print("Done fetching")\n    return "Data"\n\nresult = fetch_data()\nprint(result)`,
                fixed: `import asyncio\n\nasync def fetch_data():\n    print("Start fetching")\n    await asyncio.sleep(2)\n    print("Done fetching")\n    return "Data"\n\nasync def main():\n    result = await fetch_data()\n    print(result)\n\nasyncio.run(main())`,
                hint: "Need to await coroutines and run them in an event loop",
                expectedOutput: "Start fetching\nDone fetching\nData"
            },
            {
                title: "Type Hints",
                broken: `def add(a, b):\n    return a + b\n\nprint(add(2, 3))\nprint(add("Hello", "World"))`,
                fixed: `from typing import Union\n\ndef add(a: Union[int, float, str], b: Union[int, float, str]) -> Union[int, float, str]:\n    return a + b\n\nprint(add(2, 3))\nprint(add("Hello", "World"))`,
                hint: "Add type hints for better code documentation",
                expectedOutput: "5\nHelloWorld"
            },
            {
                title: "Data Classes",
                broken: `class Point:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\np = Point(3, 4)\nprint(p)`,
                fixed: `from dataclasses import dataclass\n\n@dataclass\nclass Point:\n    x: int\n    y: int\n\np = Point(3, 4)\nprint(p)`,
                hint: "Use dataclasses to reduce boilerplate code",
                expectedOutput: "Point(x=3, y=4)"
            }
        ]
    },
    java: {
        1: [
            {
                title: "Main Method",
                broken: `public class Hello {\n    public static void main() {\n        System.out.println("Hello World");\n    }\n}`,
                fixed: `public class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}`,
                hint: "The main method in Java requires a String array parameter",
                expectedOutput: "Hello World"
            },
            {
                title: "Case Sensitivity",
                broken: `public class Hello {\n    public static void main(String[] args) {\n        system.out.println("Hello World");\n    }\n}`,
                fixed: `public class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}`,
                hint: "Java is case-sensitive - System should be capitalized",
                expectedOutput: "Hello World"
            },
            {
                title: "Variable Declaration",
                broken: `public class Main {\n    public static void main(String[] args) {\n        x = 5;\n        System.out.println(x);\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        int x = 5;\n        System.out.println(x);\n    }\n}`,
                hint: "Variables must be declared with their type in Java",
                expectedOutput: "5"
            },
            {
                title: "String Concatenation",
                broken: `public class Main {\n    public static void main(String[] args) {\n        String name = "Alice";\n        int age = 25;\n        System.out.println("Name: " + name + " Age: " + age);\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        String name = "Alice";\n        int age = 25;\n        System.out.println("Name: " + name + " Age: " + age);\n    }\n}`,
                hint: "This code is correct! Java automatically converts numbers to strings in concatenation",
                expectedOutput: "Name: Alice Age: 25"
            },
            {
                title: "Array Access",
                broken: `public class Main {\n    public static void main(String[] args) {\n        int[] numbers = {1, 2, 3};\n        System.out.println(numbers[3]);\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        int[] numbers = {1, 2, 3};\n        System.out.println(numbers[2]);\n    }\n}`,
                hint: "Array indices start at 0 in Java",
                expectedOutput: "3"
            }
        ],
        2: [
            {
                title: "For Loop",
                broken: `public class Main {\n    public static void main(String[] args) {\n        for (int i = 0; i < 5; i++ {\n            System.out.println(i);\n        }\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        for (int i = 0; i < 5; i++) {\n            System.out.println(i);\n        }\n    }\n}`,
                hint: "Check the for loop syntax - missing closing parenthesis",
                expectedOutput: "0\n1\n2\n3\n4\n"
            },
            {
                title: "While Loop",
                broken: `public class Main {\n    public static void main(String[] args) {\n        int i = 0;\n        while (i < 5) {\n            System.out.println(i);\n        }\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        int i = 0;\n        while (i < 5) {\n            System.out.println(i);\n            i++;\n        }\n    }\n}`,
                hint: "Don't forget to increment the loop variable",
                expectedOutput: "0\n1\n2\n3\n4\n"
            },
            {
                title: "Method Definition",
                broken: `public class Main {\n    public static void main(String[] args) {\n        System.out.println(add(2, 3));\n    }\n    \n    int add(int a, int b) {\n        return a + b;\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        System.out.println(add(2, 3));\n    }\n    \n    static int add(int a, int b) {\n        return a + b;\n    }\n}`,
                hint: "Methods called from static context must be static",
                expectedOutput: "5"
            },
            {
                title: "String Comparison",
                broken: `public class Main {\n    public static void main(String[] args) {\n        String s1 = "hello";\n        String s2 = new String("hello");\n        if (s1 == s2) {\n            System.out.println("Equal");\n        } else {\n            System.out.println("Not equal");\n        }\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        String s1 = "hello";\n        String s2 = new String("hello");\n        if (s1.equals(s2)) {\n            System.out.println("Equal");\n        } else {\n            System.out.println("Not equal");\n        }\n    }\n}`,
                hint: "Use equals() to compare string contents, not ==",
                expectedOutput: "Equal"
            },
            {
                title: "ArrayList Usage",
                broken: `import java.util.ArrayList;\n\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList list = new ArrayList();\n        list.add("Hello");\n        list.add(123);\n        System.out.println(list);\n    }\n}`,
                fixed: `import java.util.ArrayList;\n\npublic class Main {\n    public static void main(String[] args) {\n        ArrayList<String> list = new ArrayList<>();\n        list.add("Hello");\n        list.add("World");\n        System.out.println(list);\n    }\n}`,
                hint: "Use generics to specify list type",
                expectedOutput: "[Hello, World]"
            }
        ],
        3: [
            {
                title: "Class Definition",
                broken: `public class Person {\n    private String name;\n    \n    public Person(String name) {\n        name = name;\n    }\n    \n    public String getName() {\n        return name;\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Person p = new Person("Alice");\n        System.out.println(p.getName());\n    }\n}`,
                fixed: `public class Person {\n    private String name;\n    \n    public Person(String name) {\n        this.name = name;\n    }\n    \n    public String getName() {\n        return name;\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Person p = new Person("Alice");\n        System.out.println(p.getName());\n    }\n}`,
                hint: "Use 'this' to distinguish instance variable from parameter",
                expectedOutput: "Alice"
            },
            {
                title: "Inheritance",
                broken: `class Animal {\n    public void sound() {\n        System.out.println("Animal sound");\n    }\n}\n\nclass Dog extends Animal {\n    public void Sound() {\n        System.out.println("Bark");\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Dog myDog = new Dog();\n        myDog.sound();\n    }\n}`,
                fixed: `class Animal {\n    public void sound() {\n        System.out.println("Animal sound");\n    }\n}\n\nclass Dog extends Animal {\n    @Override\n    public void sound() {\n        System.out.println("Bark");\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Dog myDog = new Dog();\n        myDog.sound();\n    }\n}`,
                hint: "Method names are case-sensitive and use @Override for clarity",
                expectedOutput: "Bark"
            },
            {
                title: "Interface Implementation",
                broken: `interface Greeter {\n    void greet();\n}\n\nclass EnglishGreeter implements Greeter {\n    public void Greet() {\n        System.out.println("Hello");\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Greeter greeter = new EnglishGreeter();\n        greeter.greet();\n    }\n}`,
                fixed: `interface Greeter {\n    void greet();\n}\n\nclass EnglishGreeter implements Greeter {\n    public void greet() {\n        System.out.println("Hello");\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Greeter greeter = new EnglishGreeter();\n        greeter.greet();\n    }\n}`,
                hint: "Implementing method must match interface exactly",
                expectedOutput: "Hello"
            },
            {
                title: "Exception Handling",
                broken: `public class Main {\n    public static void main(String[] args) {\n        int result = divide(10, 0);\n        System.out.println(result);\n    }\n    \n    public static int divide(int a, int b) {\n        return a / b;\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        try {\n            int result = divide(10, 0);\n            System.out.println(result);\n        } catch (ArithmeticException e) {\n            System.out.println("Cannot divide by zero");\n        }\n    }\n    \n    public static int divide(int a, int b) {\n        return a / b;\n    }\n}`,
                hint: "Handle potential exceptions with try-catch",
                expectedOutput: "Cannot divide by zero"
            },
            {
                title: "Generic Method",
                broken: `public class Main {\n    public static void printArray(Object[] array) {\n        for (Object elem : array) {\n            System.out.print(elem + " ");\n        }\n    }\n    \n    public static void main(String[] args) {\n        Integer[] intArray = {1, 2, 3};\n        String[] strArray = {"A", "B", "C"};\n        printArray(intArray);\n        printArray(strArray);\n    }\n}`,
                fixed: `public class Main {\n    public static <T> void printArray(T[] array) {\n        for (T elem : array) {\n            System.out.print(elem + " ");\n        }\n    }\n    \n    public static void main(String[] args) {\n        Integer[] intArray = {1, 2, 3};\n        String[] strArray = {"A", "B", "C"};\n        printArray(intArray);\n        printArray(strArray);\n    }\n}`,
                hint: "Use generics for type-safe methods",
                expectedOutput: "1 2 3 A B C "
            }
        ],
        4: [
            {
                title: "Collections Sort",
                broken: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");\n        Collections.sort(names, new Comparator() {\n            public int compare(Object a, Object b) {\n                return ((String)a).length() - ((String)b).length();\n            }\n        });\n        System.out.println(names);\n    }\n}`,
                fixed: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");\n        Collections.sort(names, new Comparator<String>() {\n            public int compare(String a, String b) {\n                return a.length() - b.length();\n            }\n        });\n        System.out.println(names);\n    }\n}`,
                hint: "Use generics with Comparator",
                expectedOutput: "[Bob, Alice, Charlie]"
            },
            {
                title: "Lambda Expression",
                broken: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");\n        Collections.sort(names, (a, b) -> {\n            return a.length() - b.length();\n        });\n        System.out.println(names);\n    }\n}`,
                fixed: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");\n        names.sort((a, b) -> a.length() - b.length());\n        System.out.println(names);\n    }\n}`,
                hint: "Use more concise lambda syntax and List.sort()",
                expectedOutput: "[Bob, Alice, Charlie]"
            },
            {
                title: "Stream API",
                broken: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);\n        List<Integer> squares = new ArrayList<>();\n        for (int n : numbers) {\n            squares.add(n * n);\n        }\n        System.out.println(squares);\n    }\n}`,
                fixed: `import java.util.*;\nimport java.util.stream.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);\n        List<Integer> squares = numbers.stream()\n            .map(n -> n * n)\n            .collect(Collectors.toList());\n        System.out.println(squares);\n    }\n}`,
                hint: "Use Stream API for more functional approach",
                expectedOutput: "[1, 4, 9, 16, 25]"
            },
            {
                title: "Optional Class",
                broken: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        String name = findNameById(2);\n        System.out.println(name.toUpperCase());\n    }\n    \n    public static String findNameById(int id) {\n        Map<Integer, String> names = Map.of(1, "Alice", 2, "Bob");\n        return names.get(id);\n    }\n}`,
                fixed: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Optional<String> name = Optional.ofNullable(findNameById(2));\n        name.ifPresent(n -> System.out.println(n.toUpperCase()));\n    }\n    \n    public static String findNameById(int id) {\n        Map<Integer, String> names = Map.of(1, "Alice", 2, "Bob");\n        return names.get(id);\n    }\n}`,
                hint: "Use Optional to handle potential null values",
                expectedOutput: "BOB"
            },
            {
                title: "Try-With-Resources",
                broken: `import java.io.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        BufferedReader reader = null;\n        try {\n            reader = new BufferedReader(new FileReader("file.txt"));\n            String line = reader.readLine();\n            System.out.println(line);\n        } catch (IOException e) {\n            e.printStackTrace();\n        } finally {\n            try {\n                if (reader != null) {\n                    reader.close();\n                }\n            } catch (IOException e) {\n                e.printStackTrace();\n            }\n        }\n    }\n}`,
                fixed: `import java.io.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        try (BufferedReader reader = new BufferedReader(new FileReader("file.txt"))) {\n            String line = reader.readLine();\n            System.out.println(line);\n        } catch (IOException e) {\n            e.printStackTrace();\n        }\n    }\n}`,
                hint: "Use try-with-resources for automatic resource management",
                expectedOutput: "file contents"
            }
        ],
        5: [
            {
                title: "Concurrent HashMap",
                broken: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Map<String, Integer> map = new HashMap<>();\n        map.put("counter", 0);\n        \n        Runnable task = () -> {\n            for (int i = 0; i < 1000; i++) {\n                int value = map.get("counter");\n                map.put("counter", value + 1);\n            }\n        };\n        \n        Thread t1 = new Thread(task);\n        Thread t2 = new Thread(task);\n        t1.start();\n        t2.start();\n        try {\n            t1.join();\n            t2.join();\n        } catch (InterruptedException e) {\n            e.printStackTrace();\n        }\n        \n        System.out.println(map.get("counter"));\n    }\n}`,
                fixed: `import java.util.concurrent.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Map<String, Integer> map = new ConcurrentHashMap<>();\n        map.put("counter", 0);\n        \n        Runnable task = () -> {\n            for (int i = 0; i < 1000; i++) {\n                map.compute("counter", (k, v) -> v + 1);\n            }\n        };\n        \n        Thread t1 = new Thread(task);\n        Thread t2 = new Thread(task);\n        t1.start();\n        t2.start();\n        try {\n            t1.join();\n            t2.join();\n        } catch (InterruptedException e) {\n            e.printStackTrace();\n        }\n        \n        System.out.println(map.get("counter"));\n    }\n}`,
                hint: "Use ConcurrentHashMap and atomic operations for thread safety",
                expectedOutput: "2000"
            },
            {
                title: "CompletableFuture",
                broken: `import java.util.concurrent.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        ExecutorService executor = Executors.newFixedThreadPool(2);\n        Future<String> future = executor.submit(() -> {\n            Thread.sleep(1000);\n            return "Hello";\n        });\n        \n        try {\n            System.out.println(future.get());\n        } catch (Exception e) {\n            e.printStackTrace();\n        }\n        \n        executor.shutdown();\n    }\n}`,
                fixed: `import java.util.concurrent.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        CompletableFuture.supplyAsync(() -> {\n            try {\n                Thread.sleep(1000);\n            } catch (InterruptedException e) {\n                e.printStackTrace();\n            }\n            return "Hello";\n        }).thenAccept(System.out::println);\n        \n        // Keep application running\n        try {\n            Thread.sleep(2000);\n        } catch (InterruptedException e) {\n            e.printStackTrace();\n        }\n    }\n}`,
                hint: "Use CompletableFuture for more flexible async programming",
                expectedOutput: "Hello"
            },
            {
                title: "Pattern Matching (Java 17)",
                broken: `public class Main {\n    public static void main(String[] args) {\n        Object obj = "Hello";\n        \n        if (obj instanceof String) {\n            String s = (String) obj;\n            System.out.println(s.toUpperCase());\n        }\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        Object obj = "Hello";\n        \n        if (obj instanceof String s) {\n            System.out.println(s.toUpperCase());\n        }\n    }\n}`,
                hint: "Use pattern matching for instanceof to eliminate casting",
                expectedOutput: "HELLO"
            },
            {
                title: "Records (Java 16)",
                broken: `public class Main {\n    public static void main(String[] args) {\n        class Point {\n            private final int x;\n            private final int y;\n            \n            public Point(int x, int y) {\n                this.x = x;\n                this.y = y;\n            }\n            \n            public int x() { return x; }\n            public int y() { return y; }\n            \n            @Override\n            public String toString() {\n                return "Point[x=" + x + ", y=" + y + "]";\n            }\n        }\n        \n        Point p = new Point(3, 4);\n        System.out.println(p);\n    }\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        record Point(int x, int y) {}\n        \n        Point p = new Point(3, 4);\n        System.out.println(p);\n    }\n}`,
                hint: "Use records for simple data carriers",
                expectedOutput: "Point[x=3, y=4]"
            },
            {
                title: "Sealed Classes (Java 17)",
                broken: `public class Main {\n    public static void main(String[] args) {\n        Shape shape = new Circle(5);\n        System.out.println("Area: " + shape.area());\n    }\n}\n\nabstract class Shape {\n    public abstract double area();\n}\n\nclass Circle extends Shape {\n    private double radius;\n    \n    public Circle(double radius) {\n        this.radius = radius;\n    }\n    \n    @Override\n    public double area() {\n        return Math.PI * radius * radius;\n    }\n}\n\nclass Rectangle extends Shape {\n    // Other implementations\n}`,
                fixed: `public class Main {\n    public static void main(String[] args) {\n        Shape shape = new Circle(5);\n        System.out.println("Area: " + shape.area());\n    }\n}\n\nsealed abstract class Shape permits Circle, Rectangle {\n    public abstract double area();\n}\n\nfinal class Circle extends Shape {\n    private double radius;\n    \n    public Circle(double radius) {\n        this.radius = radius;\n    }\n    \n    @Override\n    public double area() {\n        return Math.PI * radius * radius;\n    }\n}\n\nfinal class Rectangle extends Shape {\n    // Other implementations\n}`,
                hint: "Use sealed classes to control inheritance",
                expectedOutput: "Area: 78.53981633974483"
            }
        ]
    },
    csharp: {
        1: [
            {
                title: "Main Method",
                broken: `using System;\n\nclass Program {\n    void Main() {\n        Console.WriteLine("Hello World");\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello World");\n    }\n}`,
                hint: "The Main method in C# must be static",
                expectedOutput: "Hello World"
            },
            {
                title: "Case Sensitivity",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        console.WriteLine("Hello World");\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello World");\n    }\n}`,
                hint: "C# is case-sensitive - Console should be capitalized",
                expectedOutput: "Hello World"
            },
            {
                title: "Variable Declaration",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        x = 5;\n        Console.WriteLine(x);\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        int x = 5;\n        Console.WriteLine(x);\n    }\n}`,
                hint: "Variables must be declared with their type in C#",
                expectedOutput: "5"
            },
            {
                title: "String Interpolation",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        string name = "Alice";\n        int age = 25;\n        Console.WriteLine("Name: " + name + " Age: " + age);\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        string name = "Alice";\n        int age = 25;\n        Console.WriteLine($"Name: {name} Age: {age}");\n    }\n}`,
                hint: "Use string interpolation for cleaner string formatting",
                expectedOutput: "Name: Alice Age: 25"
            },
            {
                title: "Array Initialization",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        int[] numbers = new int[3];\n        numbers = {1, 2, 3};\n        Console.WriteLine(numbers[0]);\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        int[] numbers = {1, 2, 3};\n        Console.WriteLine(numbers[0]);\n    }\n}`,
                hint: "In C#, arrays can be initialized directly with values",
                expectedOutput: "1"
            }
        ],
        2: [
            {
                title: "For Loop",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        for (int i = 0; i < 5; i++ {\n            Console.WriteLine(i);\n        }\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        for (int i = 0; i < 5; i++) {\n            Console.WriteLine(i);\n        }\n    }\n}`,
                hint: "Check the for loop syntax - missing closing parenthesis",
                expectedOutput: "0\n1\n2\n3\n4\n"
            },
            {
                title: "While Loop",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        int i = 0;\n        while (i < 5) {\n            Console.WriteLine(i);\n        }\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        int i = 0;\n        while (i < 5) {\n            Console.WriteLine(i);\n            i++;\n        }\n    }\n}`,
                hint: "Don't forget to increment the loop variable",
                expectedOutput: "0\n1\n2\n3\n4\n"
            },
            {
                title: "Method Definition",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(Add(2, 3));\n    }\n    \n    int Add(int a, int b) {\n        return a + b;\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(Add(2, 3));\n    }\n    \n    static int Add(int a, int b) {\n        return a + b;\n    }\n}`,
                hint: "Methods called from static context must be static",
                expectedOutput: "5"
            },
            {
                title: "List Initialization",
                broken: `using System;\nusing System.Collections.Generic;\n\nclass Program {\n    static void Main() {\n        List<int> numbers = new List<int>();\n        numbers.AddRange({1, 2, 3});\n        Console.WriteLine(numbers[0]);\n    }\n}`,
                fixed: `using System;\nusing System.Collections.Generic;\n\nclass Program {\n    static void Main() {\n        List<int> numbers = new List<int> {1, 2, 3};\n        Console.WriteLine(numbers[0]);\n    }\n}`,
                hint: "Use collection initializer syntax",
                expectedOutput: "1"
            },
            {
                title: "String Comparison",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        string s1 = "hello";\n        string s2 = "HELLO";\n        if (s1 == s2) {\n            Console.WriteLine("Equal");\n        } else {\n            Console.WriteLine("Not equal");\n        }\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        string s1 = "hello";\n        string s2 = "HELLO";\n        if (s1.Equals(s2, StringComparison.OrdinalIgnoreCase)) {\n            Console.WriteLine("Equal");\n        } else {\n            Console.WriteLine("Not equal");\n        }\n    }\n}`,
                hint: "For case-insensitive comparison, use StringComparison",
                expectedOutput: "Equal"
            }
        ],
        3: [
            {
                title: "Class Definition",
                broken: `using System;\n\nclass Person {\n    private string name;\n    \n    public Person(string name) {\n        name = name;\n    }\n    \n    public string GetName() {\n        return name;\n    }\n}\n\nclass Program {\n    static void Main() {\n        Person p = new Person("Alice");\n        Console.WriteLine(p.GetName());\n    }\n}`,
                fixed: `using System;\n\nclass Person {\n    private string name;\n    \n    public Person(string name) {\n        this.name = name;\n    }\n    \n    public string GetName() {\n        return name;\n    }\n}\n\nclass Program {\n    static void Main() {\n        Person p = new Person("Alice");\n        Console.WriteLine(p.GetName());\n    }\n}`,
                hint: "Use 'this' to distinguish instance variable from parameter",
                expectedOutput: "Alice"
            },
            {
                title: "Property Definition",
                broken: `using System;\n\nclass Person {\n    private string name;\n    \n    public string GetName() {\n        return name;\n    }\n    \n    public void SetName(string value) {\n        name = value;\n    }\n}\n\nclass Program {\n    static void Main() {\n        Person p = new Person();\n        p.SetName("Alice");\n        Console.WriteLine(p.GetName());\n    }\n}`,
                fixed: `using System;\n\nclass Person {\n    public string Name { get; set; }\n}\n\nclass Program {\n    static void Main() {\n        Person p = new Person();\n        p.Name = "Alice";\n        Console.WriteLine(p.Name);\n    }\n}`,
                hint: "Use properties instead of getter/setter methods",
                expectedOutput: "Alice"
            },
            {
                title: "Inheritance",
                broken: `using System;\n\nclass Animal {\n    public virtual void Speak() {\n        Console.WriteLine("Animal sound");\n    }\n}\n\nclass Dog : Animal {\n    public void Speak() {\n        Console.WriteLine("Bark");\n    }\n}\n\nclass Program {\n    static void Main() {\n        Animal myDog = new Dog();\n        myDog.Speak();\n    }\n}`,
                fixed: `using System;\n\nclass Animal {\n    public virtual void Speak() {\n        Console.WriteLine("Animal sound");\n    }\n}\n\nclass Dog : Animal {\n    public override void Speak() {\n        Console.WriteLine("Bark");\n    }\n}\n\nclass Program {\n    static void Main() {\n        Animal myDog = new Dog();\n        myDog.Speak();\n    }\n}`,
                hint: "Use override keyword to override virtual methods",
                expectedOutput: "Bark"
            },
            {
                title: "Interface Implementation",
                broken: `using System;\n\ninterface IGreeter {\n    void Greet();\n}\n\nclass EnglishGreeter : IGreeter {\n    public void Greet() {\n        Console.WriteLine("Hello");\n    }\n}\n\nclass Program {\n    static void Main() {\n        IGreeter greeter = new EnglishGreeter();\n        greeter.Greet();\n    }\n}`,
                fixed: `using System;\n\ninterface IGreeter {\n    void Greet();\n}\n\nclass EnglishGreeter : IGreeter {\n    public void Greet() {\n        Console.WriteLine("Hello");\n    }\n}\n\nclass Program {\n    static void Main() {\n        IGreeter greeter = new EnglishGreeter();\n        greeter.Greet();\n    }\n}`,
                hint: "This code is correct! Interfaces define contracts that classes implement",
                expectedOutput: "Hello"
            },
            {
                title: "Exception Handling",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        int result = Divide(10, 0);\n        Console.WriteLine(result);\n    }\n    \n    static int Divide(int a, int b) {\n        return a / b;\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        try {\n            int result = Divide(10, 0);\n            Console.WriteLine(result);\n        } catch (DivideByZeroException) {\n            Console.WriteLine("Cannot divide by zero");\n        }\n    }\n    \n    static int Divide(int a, int b) {\n        return a / b;\n    }\n}`,
                hint: "Handle potential exceptions with try-catch",
                expectedOutput: "Cannot divide by zero"
            }
        ],
        4: [
            {
                title: "Generic Method",
                broken: `using System;\n\nclass Program {\n    static void PrintArray(object[] array) {\n        foreach (object item in array) {\n            Console.Write(item + " ");\n        }\n    }\n    \n    static void Main() {\n        int[] intArray = {1, 2, 3};\n        string[] strArray = {"A", "B", "C"};\n        PrintArray(intArray);\n        PrintArray(strArray);\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void PrintArray<T>(T[] array) {\n        foreach (T item in array) {\n            Console.Write(item + " ");\n        }\n    }\n    \n    static void Main() {\n        int[] intArray = {1, 2, 3};\n        string[] strArray = {"A", "B", "C"};\n        PrintArray(intArray);\n        PrintArray(strArray);\n    }\n}`,
                hint: "Use generics for type-safe methods",
                expectedOutput: "1 2 3 A B C "
            },
            {
                title: "LINQ Query",
                broken: `using System;\nusing System.Collections.Generic;\n\nclass Program {\n    static void Main() {\n        List<int> numbers = new List<int> {1, 2, 3, 4, 5};\n        List<int> evenNumbers = new List<int>();\n        foreach (int num in numbers) {\n            if (num % 2 == 0) {\n                evenNumbers.Add(num);\n            }\n        }\n        Console.WriteLine(string.Join(", ", evenNumbers));\n    }\n}`,
                fixed: `using System;\nusing System.Linq;\nusing System.Collections.Generic;\n\nclass Program {\n    static void Main() {\n        List<int> numbers = new List<int> {1, 2, 3, 4, 5};\n        var evenNumbers = numbers.Where(n => n % 2 == 0).ToList();\n        Console.WriteLine(string.Join(", ", evenNumbers));\n    }\n}`,
                hint: "Use LINQ for more expressive collection queries",
                expectedOutput: "2, 4"
            },
            {
                title: "Lambda Expression",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        Func<int, int> square = delegate(int x) {\n            return x * x;\n        };\n        Console.WriteLine(square(5));\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        Func<int, int> square = x => x * x;\n        Console.WriteLine(square(5));\n    }\n}`,
                hint: "Use lambda expressions for concise anonymous functions",
                expectedOutput: "25"
            },
            {
                title: "Extension Methods",
                broken: `using System;\n\nclass StringUtils {\n    public static bool IsPalindrome(string s) {\n        char[] arr = s.ToCharArray();\n        Array.Reverse(arr);\n        return s == new string(arr);\n    }\n}\n\nclass Program {\n    static void Main() {\n        string word = "madam";\n        Console.WriteLine(StringUtils.IsPalindrome(word));\n    }\n}`,
                fixed: `using System;\n\nstatic class StringExtensions {\n    public static bool IsPalindrome(this string s) {\n        char[] arr = s.ToCharArray();\n        Array.Reverse(arr);\n        return s == new string(arr);\n    }\n}\n\nclass Program {\n    static void Main() {\n        string word = "madam";\n        Console.WriteLine(word.IsPalindrome());\n    }\n}`,
                hint: "Use extension methods to add functionality to existing types",
                expectedOutput: "True"
            },
            {
                title: "Nullable Types",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        int? number = null;\n        Console.WriteLine(number.Value);\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        int? number = null;\n        if (number.HasValue) {\n            Console.WriteLine(number.Value);\n        } else {\n            Console.WriteLine("No value");\n        }\n    }\n}`,
                hint: "Always check HasValue before accessing Value",
                expectedOutput: "No value"
            }
        ],
        5: [
            {
                title: "Async/Await",
                broken: `using System;\nusing System.Threading.Tasks;\n\nclass Program {\n    static void Main() {\n        Task<string> task = GetDataAsync();\n        Console.WriteLine(task.Result);\n    }\n    \n    static async Task<string> GetDataAsync() {\n        await Task.Delay(1000);\n        return "Data";\n    }\n}`,
                fixed: `using System;\nusing System.Threading.Tasks;\n\nclass Program {\n    static async Task Main() {\n        string result = await GetDataAsync();\n        Console.WriteLine(result);\n    }\n    \n    static async Task<string> GetDataAsync() {\n        await Task.Delay(1000);\n        return "Data";\n    }\n}`,
                hint: "Use async/await properly to avoid deadlocks",
                expectedOutput: "Data"
            },
            {
                title: "Pattern Matching",
                broken: `using System;\n\nclass Program {\n    static void Main() {\n        object obj = "Hello";\n        \n        if (obj is string) {\n            string s = (string)obj;\n            Console.WriteLine(s.ToUpper());\n        }\n    }\n}`,
                fixed: `using System;\n\nclass Program {\n    static void Main() {\n        object obj = "Hello";\n        \n        if (obj is string s) {\n            Console.WriteLine(s.ToUpper());\n        }\n    }\n}`,
                hint: "Use pattern matching to simplify type checking and casting",
                expectedOutput: "HELLO"
            },
            {
                title: "Records (C# 9)",
                broken: `using System;\n\nclass Point {\n    public int X { get; init; }\n    public int Y { get; init; }\n    \n    public Point(int x, int y) {\n        X = x;\n        Y = y;\n    }\n    \n    public override string ToString() => $"Point {{ X = {X}, Y = {Y} }}";\n}\n\nclass Program {\n    static void Main() {\n        var p = new Point(3, 4);\n        Console.WriteLine(p);\n    }\n}`,
                fixed: `using System;\n\nrecord Point(int X, int Y);\n\nclass Program {\n    static void Main() {\n        var p = new Point(3, 4);\n        Console.WriteLine(p);\n    }\n}`,
                hint: "Use records for simple data carriers",
                expectedOutput: "Point { X = 3, Y = 4 }"
            },
            {
                title: "Init-only Properties",
                broken: `using System;\n\nclass Person {\n    public string Name { get; set; }\n    public int Age { get; set; }\n}\n\nclass Program {\n    static void Main() {\n        var person = new Person { Name = "Alice", Age = 25 };\n        person.Age = 26; // Should not be allowed\n        Console.WriteLine($"{person.Name}, {person.Age}");\n    }\n}`,
                fixed: `using System;\n\nclass Person {\n    public string Name { get; init; }\n    public int Age { get; init; }\n}\n\nclass Program {\n    static void Main() {\n        var person = new Person { Name = "Alice", Age = 25 };\n        // person.Age = 26; // Now this would cause compile error\n        Console.WriteLine($"{person.Name}, {person.Age}");\n    }\n}`,
                hint: "Use init-only properties for immutable objects",
                expectedOutput: "Alice, 25"
            },
            {
                title: "Top-level Statements (C# 9)",
                broken: `using System;\n\nnamespace MyApp {\n    class Program {\n        static void Main() {\n            Console.WriteLine("Hello World");\n        }\n    }\n}`,
                fixed: `// Top-level statements - no namespace or Main method needed\nConsole.WriteLine("Hello World");`,
                hint: "Use top-level statements for simpler program structure",
                expectedOutput: "Hello World"
            }
        ]
    }
};
