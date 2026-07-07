import { Exam, Question } from "./types";

export const APPS_SCRIPT_CODE = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;
  
  // Set CORS headers by returning JSON via ContentService
  if (action === "getExams") {
    var examSheet = sheet.getSheetByName("Exams");
    if (!examSheet) {
      return jsonResponse({ error: "Exams sheet not found. Please create a sheet named 'Exams'." });
    }
    
    var data = examSheet.getDataRange().getValues();
    var exams = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[1]) continue; // Skip rows with no name
      exams.push({
        slNo: Number(row[0]) || i,
        name: String(row[1]),
        tabName: String(row[2]),
        timeLimit: Number(row[3]) || 15,
        status: String(row[4]).toLowerCase() === "live" ? "live" : "draft"
      });
    }
    return jsonResponse({ exams: exams });
  }
  
  if (action === "getQuestions") {
    var tabName = e.parameter.tabName;
    if (!tabName) {
      return jsonResponse({ error: "Missing tabName parameter." });
    }
    
    var questionSheet = sheet.getSheetByName(tabName);
    if (!questionSheet) {
      return jsonResponse({ error: "Question sheet tab '" + tabName + "' not found." });
    }
    
    var data = questionSheet.getDataRange().getValues();
    var questions = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[1]) continue; // Skip rows with no question text
      questions.push({
        questionNo: row[0] || i,
        question: String(row[1]),
        optionA: String(row[2]),
        optionB: String(row[3]),
        optionC: String(row[4]),
        optionD: String(row[5]),
        correctAnswer: String(row[6]).trim().toLowerCase(),
        explanation: String(row[7] || "")
      });
    }
    return jsonResponse({ questions: questions });
  }
  
  return jsonResponse({ error: "Invalid action. Use 'getExams' or 'getQuestions'." });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const DEFAULT_EXAMS: Exam[] = [
  {
    id: "ts-mastery",
    slNo: 1,
    name: "TypeScript Essentials",
    tabName: "TypeScript_Questions",
    timeLimit: 3, // 3 minutes for quick trial
    status: "live"
  },
  {
    id: "gk-challenge",
    slNo: 2,
    name: "General Knowledge & Science",
    tabName: "GK_Questions",
    timeLimit: 2, // 2 minutes
    status: "live"
  },
  {
    id: "react-tailwind",
    slNo: 3,
    name: "React & Tailwind CSS (Sandbox)",
    tabName: "React_Questions",
    timeLimit: 5,
    status: "draft"
  }
];

export const DEFAULT_QUESTIONS: Record<string, Question[]> = {
  "TypeScript_Questions": [
    {
      questionNo: 1,
      question: "Which keyword is used to define a custom type in TypeScript that can be either an interface-like object or a union of primitive values?",
      optionA: "interface",
      optionB: "type",
      optionC: "class",
      optionD: "define",
      correctAnswer: "b",
      explanation: "The 'type' keyword allows defining type aliases, which can represent object shapes, primitive union types, intersections, and more, whereas 'interface' is limited to object structures."
    },
    {
      questionNo: 2,
      question: "How do you specify that a function does not return any value in TypeScript?",
      optionA: "function myFunction(): void",
      optionB: "function myFunction(): null",
      optionC: "function myFunction(): undefined",
      optionD: "function myFunction(): never",
      correctAnswer: "a",
      explanation: "The 'void' type represents the absence of any return value. 'never' represents a function that never terminates or always throws an error."
    },
    {
      questionNo: 3,
      question: "What is the key difference between 'any' and 'unknown' in TypeScript?",
      optionA: "'any' allows any type check but 'unknown' is used only for object types",
      optionB: "There is no difference between them",
      optionC: "'unknown' is type-safe because you cannot perform operations on it without narrowing the type first, unlike 'any'",
      optionD: "'any' is type-safe while 'unknown' turns off all type-checking completely",
      correctAnswer: "c",
      explanation: "The 'unknown' type is the type-safe counterpart of 'any'. Anything is assignable to 'unknown', but 'unknown' is not assignable to anything else without a type assertion or control flow analysis."
    },
    {
      questionNo: 4,
      question: "Which file is used to configure compilation options for a TypeScript project?",
      optionA: "package.json",
      optionB: "vite.config.ts",
      optionC: "tsconfig.json",
      optionD: "compiler.config",
      correctAnswer: "c",
      explanation: "The 'tsconfig.json' file specifies the root files and the compiler options required to compile the TypeScript project."
    },
    {
      questionNo: 5,
      question: "What does the 'readonly' modifier do in TypeScript interface properties?",
      optionA: "It makes the property accessible only inside the class",
      optionB: "It prevents writing to or reassigning the property after initialization",
      optionC: "It hides the property from being displayed in JSON output",
      optionD: "It forces the property to always be a string",
      correctAnswer: "b",
      explanation: "Properties marked with 'readonly' can only be modified when the object is first created or in a constructor, preventing future mutations."
    }
  ],
  "GK_Questions": [
    {
      questionNo: 1,
      question: "Which planet in our solar system is known as the Red Planet?",
      optionA: "Venus",
      optionB: "Mars",
      optionC: "Jupiter",
      optionD: "Saturn",
      correctAnswer: "b",
      explanation: "Mars is known as the Red Planet due to iron oxide (rust) on its surface, giving it a reddish appearance."
    },
    {
      questionNo: 2,
      question: "What is the chemical symbol for Gold?",
      optionA: "Ag",
      optionB: "Au",
      optionC: "Fe",
      optionD: "Gd",
      correctAnswer: "b",
      explanation: "The chemical symbol for Gold is 'Au', from the Latin word 'aurum', meaning shining dawn."
    },
    {
      questionNo: 3,
      question: "Who developed the theory of general relativity?",
      optionA: "Isaac Newton",
      optionB: "Galileo Galilei",
      optionC: "Albert Einstein",
      optionD: "Nikola Tesla",
      correctAnswer: "c",
      explanation: "Albert Einstein published the theory of general relativity in 1915, describing gravity as a geometric property of space and time."
    },
    {
      questionNo: 4,
      question: "What is the largest ocean on Earth?",
      optionA: "Atlantic Ocean",
      optionB: "Indian Ocean",
      optionC: "Arctic Ocean",
      optionD: "Pacific Ocean",
      correctAnswer: "d",
      explanation: "The Pacific Ocean is the largest and deepest of Earth's oceanic divisions, extending from the Arctic Ocean in the north to the Southern Ocean in the south."
    },
    {
      questionNo: 5,
      question: "Which organ of the human body is responsible for pumping blood?",
      optionA: "Lungs",
      optionB: "Brain",
      optionC: "Heart",
      optionD: "Kidneys",
      correctAnswer: "c",
      explanation: "The heart is a muscular organ that pumps blood through the blood vessels of the circulatory system."
    }
  ],
  "React_Questions": [
    {
      questionNo: 1,
      question: "What is the primary purpose of React's useState hook?",
      optionA: "To fetch data from external APIs on component load",
      optionB: "To add state variables and state management to functional components",
      optionC: "To cache expensive calculation values dynamically",
      optionD: "To perform manual operations on DOM elements directly",
      correctAnswer: "b",
      explanation: "useState is a Hook that lets you add React state to function components, enabling them to track and re-render based on local data changes."
    },
    {
      questionNo: 2,
      question: "In Tailwind CSS, which prefix is used to apply a style on medium-sized screens or larger (typically desktops)?",
      optionA: "sm:",
      optionB: "md:",
      optionC: "lg:",
      optionD: "xl:",
      correctAnswer: "b",
      explanation: "Tailwind's 'md:' prefix targets screens that are 768px wide or larger, commonly used for tablets and smaller desktops."
    },
    {
      questionNo: 3,
      question: "What does JSX stand for in React development?",
      optionA: "JavaScript Syntax Extension",
      optionB: "Java XML Serializer",
      optionC: "JSON XML Exchange",
      optionD: "JavaScript Extensible Style",
      correctAnswer: "a",
      explanation: "JSX stands for JavaScript XML or JavaScript Syntax Extension. It allows developers to write HTML-like elements and layouts directly within JavaScript/TypeScript."
    }
  ]
};
