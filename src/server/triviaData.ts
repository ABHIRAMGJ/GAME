export interface TriviaQuestion {
  id: string;
  category: 'General Knowledge' | 'Science' | 'Technology' | 'Programming' | 'History' | 'Geography' | 'Sports' | 'Movies';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: [string, string, string, string];
  answerIndex: number; // 0, 1, 2, 3
  explanation: string;
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // Programming & Tech
  {
    id: 'tech-1',
    category: 'Programming',
    difficulty: 'easy',
    question: 'What does "HTML" stand for?',
    options: ['HyperText Markup Language', 'High Tech Modern Language', 'HyperTransfer Mode Link', 'Hybrid Text Multi Language'],
    answerIndex: 0,
    explanation: 'HTML is the standard markup language for creating web pages.',
  },
  {
    id: 'tech-2',
    category: 'Technology',
    difficulty: 'easy',
    question: 'Who is recognized as the co-founder of Apple alongside Steve Jobs?',
    options: ['Steve Wozniak', 'Bill Gates', 'Paul Allen', 'Tim Berners-Lee'],
    answerIndex: 0,
    explanation: 'Steve Wozniak co-founded Apple Computer with Steve Jobs in 1976.',
  },
  {
    id: 'tech-3',
    category: 'Programming',
    difficulty: 'medium',
    question: 'In computer science, what is the average time complexity of QuickSort?',
    options: ['O(n log n)', 'O(n²)', 'O(log n)', 'O(n)'],
    answerIndex: 0,
    explanation: 'QuickSort runs in O(n log n) average time complexity.',
  },
  {
    id: 'tech-4',
    category: 'Programming',
    difficulty: 'easy',
    question: 'Which of the following is NOT a JavaScript primitive type?',
    options: ['Object', 'Symbol', 'Boolean', 'BigInt'],
    answerIndex: 0,
    explanation: 'In JavaScript, Objects are reference types; Symbol, Boolean, and BigInt are primitives.',
  },
  {
    id: 'tech-5',
    category: 'Technology',
    difficulty: 'medium',
    question: 'What year was the World Wide Web introduced to the public by Tim Berners-Lee?',
    options: ['1991', '1983', '1995', '1989'],
    answerIndex: 0,
    explanation: 'Tim Berners-Lee published the first website publicly in August 1991.',
  },

  // Science
  {
    id: 'sci-1',
    category: 'Science',
    difficulty: 'easy',
    question: 'What is the most abundant gas in Earth’s atmosphere?',
    options: ['Nitrogen', 'Oxygen', 'Argon', 'Carbon Dioxide'],
    answerIndex: 0,
    explanation: 'Nitrogen makes up approximately 78% of Earth’s atmosphere.',
  },
  {
    id: 'sci-2',
    category: 'Science',
    difficulty: 'medium',
    question: 'What elementary particle is responsible for the electromagnetic force?',
    options: ['Photon', 'Gluon', 'Higgs Boson', 'Neutrino'],
    answerIndex: 0,
    explanation: 'The photon is the gauge boson that mediates electromagnetic interactions.',
  },
  {
    id: 'sci-3',
    category: 'Science',
    difficulty: 'easy',
    question: 'What is the chemical symbol for Gold?',
    options: ['Au', 'Ag', 'Fe', 'Gd'],
    answerIndex: 0,
    explanation: 'Gold symbol Au derives from the Latin word "Aurum".',
  },
  {
    id: 'sci-4',
    category: 'Science',
    difficulty: 'hard',
    question: 'Which speed is approximately the speed of light in a vacuum?',
    options: ['299,792,458 m/s', '150,000,000 m/s', '343 m/s', '1,080,000,000 km/s'],
    answerIndex: 0,
    explanation: 'Light travels at exactly 299,792,458 meters per second in a vacuum.',
  },

  // History & Geography
  {
    id: 'geo-1',
    category: 'Geography',
    difficulty: 'easy',
    question: 'What is the capital city of Japan?',
    options: ['Tokyo', 'Kyoto', 'Osaka', 'Sapporo'],
    answerIndex: 0,
    explanation: 'Tokyo has been the capital and seat of government of Japan since 1868.',
  },
  {
    id: 'geo-2',
    category: 'Geography',
    difficulty: 'medium',
    question: 'Which is the largest desert in the world by land area?',
    options: ['Antarctic Desert', 'Sahara Desert', 'Arabian Desert', 'Gobi Desert'],
    answerIndex: 0,
    explanation: 'Antarctica is classified as a polar desert and is the world’s largest desert.',
  },
  {
    id: 'hist-1',
    category: 'History',
    difficulty: 'medium',
    question: 'In what year did the Apollo 11 mission land the first humans on the Moon?',
    options: ['1969', '1965', '1972', '1961'],
    answerIndex: 0,
    explanation: 'Neil Armstrong and Buzz Aldrin landed on the Moon on July 20, 1969.',
  },
  {
    id: 'hist-2',
    category: 'History',
    difficulty: 'easy',
    question: 'Which ancient civilization built the Great Pyramid of Giza?',
    options: ['Ancient Egypt', 'Babylonians', 'Ancient Greece', 'Persian Empire'],
    answerIndex: 0,
    explanation: 'The Great Pyramid was built for Egyptian Pharaoh Khufu around 2560 BC.',
  },

  // Sports & Movies
  {
    id: 'sports-1',
    category: 'Sports',
    difficulty: 'easy',
    question: 'How many players are on the field for one team in a standard soccer match?',
    options: ['11', '9', '10', '12'],
    answerIndex: 0,
    explanation: 'A soccer team consists of 11 players including the goalkeeper.',
  },
  {
    id: 'sports-2',
    category: 'Sports',
    difficulty: 'medium',
    question: 'In tennis, what term is used to describe a score of zero?',
    options: ['Love', 'Fault', 'Deuce', 'Nil'],
    answerIndex: 0,
    explanation: '"Love" corresponds to zero points in tennis scoring.',
  },
  {
    id: 'movies-1',
    category: 'Movies',
    difficulty: 'easy',
    question: 'Who directed the movie "Inception" and "Oppenheimer"?',
    options: ['Christopher Nolan', 'Steven Spielberg', 'Denis Villeneuve', 'James Cameron'],
    answerIndex: 0,
    explanation: 'Christopher Nolan directed Inception (2010) and Oppenheimer (2023).',
  },
  {
    id: 'movies-2',
    category: 'Movies',
    difficulty: 'easy',
    question: 'Which movie won the Academy Award for Best Picture in 2020 (the first non-English film to do so)?',
    options: ['Parasite', '1917', 'Roma', 'The Shape of Water'],
    answerIndex: 0,
    explanation: 'Bong Joon-ho’s "Parasite" won four Oscars including Best Picture in 2020.',
  },
  {
    id: 'gen-1',
    category: 'General Knowledge',
    difficulty: 'easy',
    question: 'How many squares are there on a standard chess board?',
    options: ['64', '32', '81', '100'],
    answerIndex: 0,
    explanation: 'A standard chessboard is an 8x8 grid of 64 alternating light and dark squares.',
  },
  {
    id: 'gen-2',
    category: 'General Knowledge',
    difficulty: 'easy',
    question: 'Which planet is known as the "Red Planet"?',
    options: ['Mars', 'Venus', 'Jupiter', 'Mercury'],
    answerIndex: 0,
    explanation: 'Mars appears reddish due to iron oxide (rust) on its surface.',
  },
  {
    id: 'gen-3',
    category: 'General Knowledge',
    difficulty: 'medium',
    question: 'What is the national animal of Scotland?',
    options: ['Unicorn', 'Red Deer', 'Golden Eagle', 'Loch Ness Monster'],
    answerIndex: 0,
    explanation: 'The mythical Unicorn has been a Scottish heraldic symbol since the 12th century.',
  },
];
