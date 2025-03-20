// Инициализация jsPsych
var jsPsych = initJsPsych({
  override_safe_mode: true,
  on_finish: function () {
    // Фильтруем только результаты ответов пользователя (убираем стимулы)
    let filteredResults = jsPsych.data.get().filter({ trial_type: "survey-text" }).values();

    // Выводим очищенные данные в консоль
    console.log("🔹 Итоговые результаты (только ответы):", filteredResults);

    // Показываем только очищенные данные на экране в формате JSON
    document.body.innerHTML = "<pre>" + JSON.stringify(filteredResults, null, 2) + "</pre>";
  },
});


// Глобальные переменные
var timeline = [];
var globalCorrectSequence = ""; // для хранения корректной последовательности слогов
var minYdistance = 10; // Минимальное расстояние по вертикали
var maxYdistance = 50; // Максимальное расстояние по вертикали

// Приветствие
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "Добро пожаловать в эксперимент. Нажмите любую клавишу, чтобы начать.",
});

// Глобальные переменные (параметры эксперимента)
//число повторений, Количество букв в слоге, Количество слогов в слове, длительность стимула и задержки, расстояние, сложность букв

const myDict = {
  numRepetit: 2,//число повторений
  numletter: 2,//число букв в слоге
  numSyllables:3,//число слогов
  expos: 1000,//экспозиция
  gap:1000,//задержка
  distanceDiff: 2,//сложность по расстоянию
  lettercorruption:1,//степень повреждения букв, 0 - не повреждённые
};





var numRepetitions = myDict['numRepetit'];
var syllableLength = myDict['numletter']; // Количество букв в слоге (2 или 3)
var numSyllables = myDict['numSyllables']; // Количество слогов в слове
var Expo =  myDict['expos'];
var Gap =  myDict['gap'];
var minDistance = [10, 25, 37][ myDict['distanceDiff']];
var maxDistance = [20, 35, 52][myDict['distanceDiff']];
var useDistortedLetters = [false, true, true, true][myDict['lettercorruption']];
var difficultyFolder = ["", "easy", "medium", "hard"][myDict['lettercorruption']];
var difficultyLetter = ["", "легкий", "средний", "сложный"][myDict['lettercorruption']];
var trainingPassed = false; // Флаг для завершения тренировки

// Массивы согласных и гласных
var Soglasn = [
  "Б", "В", "Г", "Д", "Ж", "З", "Й", "К", "Л", "М",
  "Н", "П", "Р", "С", "Т", "Ф", "Х", "Ц", "Ч", "Ш", "Щ"
];
var Glasn = ["А", "Е", "Ё", "И", "О", "У", "Ы", "Э", "Ю", "Я"];

// Функция генерации слога
function generateSyllable(length) {
  if (length === 2) {
    // Слог: согласная + гласная
    let c = Soglasn[Math.floor(Math.random() * Soglasn.length)];
    let v = Glasn[Math.floor(Math.random() * Glasn.length)];
    return [c, v];
  } else if (length === 3) {
    // Слог: согласная + гласная + согласная
    let c1 = Soglasn[Math.floor(Math.random() * Soglasn.length)];
    let v = Glasn[Math.floor(Math.random() * Glasn.length)];
    let c2 = Soglasn[Math.floor(Math.random() * Soglasn.length)];
    return [c1, v, c2];
  }
}

// Функция для формирования пути к изображению
function getImagePath(syllable) {
  return `letters/${difficultyFolder}/${syllable} ${difficultyLetter}.png`;
}

// Функция генерации одного теста (с флагом isTraining)
// Здесь вместо букв генерируются слоги
function generateTestTrial(isTraining = false) {
  // Генерация последовательности слогов
  var sequence = [];
  for (var i = 0; i < numSyllables; i++) {
    sequence.push(generateSyllable(syllableLength));
  }
  
  // Генерация случайных позиций для каждого слога
  function getRandomPosition() {
    return {
      x: Math.floor(Math.random() * 81) + 10, // число от 10 до 90
      y: Math.floor(Math.random() * 81) + 10
    };
  }
  let positions = sequence.map(() => getRandomPosition());
  
  // Генерация тестовых этапов для показа каждого слога
  let testTrials = sequence.map((syllable, index) => {
    let stimulusContent;
    if (useDistortedLetters) {
      if (syllable.length === 2) {
        stimulusContent = `
          <img src="${getImagePath(syllable[0])}" style="position: absolute; top: ${positions[index].y}%; left: ${positions[index].x}%; width: 50px; height: auto;">
          <img src="${getImagePath(syllable[1])}" style="position: absolute; top: ${positions[index].y}%; left: ${positions[index].x + 5}%; width: 50px; height: auto;">
        `;
      } else if (syllable.length === 3) {
        stimulusContent = `
          <img src="${getImagePath(syllable[0])}" style="position: absolute; top: ${positions[index].y}%; left: ${positions[index].x}%; width: 50px; height: auto;">
          <img src="${getImagePath(syllable[1])}" style="position: absolute; top: ${positions[index].y}%; left: ${positions[index].x + 5}%; width: 50px; height: auto;">
          <img src="${getImagePath(syllable[2])}" style="position: absolute; top: ${positions[index].y}%; left: ${positions[index].x + 10}%; width: 50px; height: auto;">
        `;
      }
    } else {
      stimulusContent = `<div style="position: absolute; top: ${positions[index].y}%; left: ${positions[index].x}%; font-size: 60px;">${syllable.join('')}</div>`;
    }
    return {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: stimulusContent,
      choices: "NO_KEYS",
      trial_duration: Expo,
      post_trial_gap: Gap,
    };
  });
  
  // Формирование корректной последовательности (без пробелов)
  var correctSequence = sequence.map(s => s.join("")).join("");
  
  return {
    timeline: [
      ...testTrials,
      {
        type: jsPsychSurveyText,
        questions: [
          { prompt: "Введите последовательность слогов, разделённых пробелом:", name: "user_input" }
        ],
        button_label: "Подтвердить",
        on_finish: function (data) {
          var userResponse = data.response.user_input.trim().toUpperCase().replace(/\s+/g, "");
          var isCorrect = userResponse === correctSequence;
          
          jsPsych.data.addDataToLastTrial({
            correct_sequence: correctSequence,
            user_response: userResponse,
            is_correct: isCorrect,
            phase: isTraining ? "training" : "experiment"
          });
          
          if (isTraining) {
            trainingPassed = isCorrect; // Завершаем тренировку только при правильном ответе
          }
        }
      }
    ]
  };
}

// Таймлайн для тренировки
var trainingTimeline = {
  timeline: [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<p>В этом эксперименте на экране будут появляться слоги в разных частях экрана.</p>
                 <p>Ваша задача — запомнить последовательность слогов.</p>
                 <p>После окончания последовательности вас попросят ввести её в правильном порядке.</p>
                 <p>Нажмите любую клавишу, чтобы начать пробное задание.</p>`,
    },
    generateTestTrial(true),
  ],
  loop_function: function () {
    return !trainingPassed; // Повторяем тренировку, пока ответ не будет правильным
  },
};

// Таймлайн для основного теста
var mainExperimentTimeline = {
  timeline: [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<p>Основная часть эксперимента начинается. Нажмите любую клавишу.</p>`,
    },
  ],
};

// Добавляем основной тест на numRepetitions раз
for (let i = 0; i < numRepetitions; i++) {
  mainExperimentTimeline.timeline.push(generateTestTrial(false));
}

// Запускаем тест: сначала тренировка, затем основной тест
jsPsych.run([trainingTimeline, mainExperimentTimeline]);
