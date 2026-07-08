export interface Exam {
  id: string;
  slNo: number;
  name: string;
  tabName: string;
  timeLimit: number; // in minutes
  status: "live" | "draft" | "archived" | "archive" | string;
  examDate?: string; // date in mm/dd/yy format or other string
  markPerQuestion?: number;
  penaltyMark?: number;
  isFree?: boolean;
  price?: number;
}

export interface Question {
  questionNo: number | string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "a" | "b" | "c" | "d" | "A" | "B" | "C" | "D" | string;
  explanation?: string;
}

export interface Attempt {
  id: string;
  examId: string;
  examName: string;
  username: string;
  email: string;
  score: number;
  totalQuestions: number;
  timeTaken: number; // in seconds
  completedAt: string; // ISO string
  userId?: string; // Optional if guest
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
  percentage?: number;
  totalObtainedMark?: number;
  examTotalMark?: number;
  markPerQuestion?: number;
  penaltyMark?: number;
}

export function formatExamDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    let dateObj: Date;
    // Check if it's in format mm/dd/yy or mm/dd/yyyy
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      let month = parseInt(parts[0], 10);
      let day = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (year < 100) {
        year += 2000; // Assume 21st century for 2-digit years
      }
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = new Date(dateStr);
    }

    if (isNaN(dateObj.getTime())) {
      return dateStr; // Return raw if parsing fails
    }

    const day = String(dateObj.getDate()).padStart(2, "0");
    const months = [
      "July", "August", "September", "October", "November", "December",
      "January", "February", "March", "April", "May", "June"
    ];
    // Wait, the correct months order for javascript 0-indexed is:
    const correctMonths = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = correctMonths[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day} ${month}, ${year}`;
  } catch (e) {
    return dateStr;
  }
}

