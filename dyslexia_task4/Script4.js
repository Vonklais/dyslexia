// Инициализация jsPsych
var jsPsych = initJsPsych({
  override_safe_mode: true,
  on_finish: function () {
    let filteredResults = jsPsych.data.get().filter({ trial_type: "survey-text" }).values();
    console.log("🔹 Итоговые результаты (только ответы):", filteredResults);
    document.body.innerHTML = "<pre>" + JSON.stringify(filteredResults, null, 2) + "</pre>";
  },
});

// Глобальные переменные
var timeline = [];
var globalCorrectSequence = ""; // Для хранения корректной последовательности слогов
var minYdistance = 10; // Минимальное расстояние по вертикали
var maxYdistance = 50; // Максимальное расстояние по вертикали

// Приветствие
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "Добро пожаловать в эксперимент. Нажмите любую клавишу, чтобы начать.",
});

// Глобальные параметры эксперимента
const myDict = {
  numRepetit: 3,      // Число повторений
  numletter: 2,        // Число букв в слоге
  numSyllables: 3,     // Число слогов
  expos: 300,          // Экспозиция
  gap: 400,            // Задержка
  distanceDiff: 2,     // Сложность по расстоянию
  lettercorruption: 0, // Степень повреждения букв
};

var numRepetitions = myDict['numRepetit'];
var syllableLength = myDict['numletter'];
var numSyllables = myDict['numSyllables'];
var Expo = myDict['expos'];
var Gap = myDict['gap'];
var minDistance = [10, 25, 35][myDict['distanceDiff']];
var maxDistance = [20, 35, 40][myDict['distanceDiff']];
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
    let c = Soglasn[Math.floor(Math.random() * Soglasn.length)];
    let v = Glasn[Math.floor(Math.random() * Glasn.length)];
    return [c, v];
  } else if (length === 3) {
    let c1 = Soglasn[Math.floor(Math.random() * Soglasn.length)];
    let v = Glasn[Math.floor(Math.random() * Glasn.length)];
    let c2 = Soglasn[Math.floor(Math.random() * Soglasn.length)];
    return [c1, v, c2];
  }
}

// Функция для формирования пути к изображению
function getImagePath(letter) {
  return `letters/${difficultyFolder}/${letter.toLowerCase('ru')} ${difficultyLetter}.png`;
}

// Функция генерации одного теста
function generateTestTrial(isTraining = false) {
  // Генерация последовательности слогов
  var sequence = [];
  for (var i = 0; i < numSyllables; i++) {
    sequence.push(generateSyllable(syllableLength));
  }

  // Генерация случайных позиций для каждого слога
  function getRandomPosition() {
    return {
      x: Math.floor(Math.random() * 81) + 10,
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

  // Формирование корректной последовательности (без пробелов для сравнения)
  var correctSequence = sequence.map(s => s.join("")).join("");
  var correctSequenceDisplay = sequence.map(s => s.join("")).join(" "); // С пробелами для отображения

  let trialTimeline = [
    ...testTrials,
    {
      type: jsPsychSurveyText,
      questions: [
        { prompt: "Введите последовательность слогов, разделённых пробелом:", name: "user_input" }
      ],
      button_label: "Подтвердить",
      on_finish: function (data) {
        var userResponse = data.response.user_input.trim().toUpperCase().replace(/\s+/g, ""); // Убираем лишние пробелы для сравнения
        var isCorrect = userResponse === correctSequence;

        jsPsych.data.addDataToLastTrial({
          correct_sequence: correctSequence,
          correct_sequence_display: correctSequenceDisplay, // Для отображения с пробелами
          user_response: userResponse,
          is_correct: isCorrect,
          phase: isTraining ? "training" : "experiment"
        });

        if (isTraining) {
          trainingPassed = isCorrect;
        }
      }
    }
  ];

  // Добавляем обратную связь только для основного теста
  if (!isTraining) {
    trialTimeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () {
        let lastTrial = jsPsych.data.get().last(1).values()[0];
        let isCorrect = lastTrial.is_correct;
        let userResponse = lastTrial.user_response.match(/.{1,2}/g)?.join(" ") || lastTrial.user_response; // Форматируем ответ пользователя с пробелами
        let correctSequenceDisplay = lastTrial.correct_sequence_display;
        return `
          <p>Ваш ответ: <strong>${userResponse}</strong></p>
          <p>Правильная последовательность: <strong>${correctSequenceDisplay}</strong></p>
          <p>Результат: ${isCorrect ? "Правильно" : "Неправильно"}</p>
          <p>Нажмите любую клавишу, чтобы продолжить.</p>
        `;
      },
      choices: "ALL_KEYS",
      post_trial_gap: 500,
    });
  }

  return {
    timeline: trialTimeline
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

// Добавляем финальный экран со статистикой
mainExperimentTimeline.timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: function () {
    let experimentTrials = jsPsych.data.get().filter({ phase: "experiment", trial_type: "survey-text" });
    let totalResponses = experimentTrials.count();
    let correctResponses = experimentTrials.filter({ is_correct: true }).count();
    let accuracy = totalResponses > 0 ? (correctResponses / totalResponses * 100).toFixed(2) : 0;

    return `
      <p>Эксперимент завершён!</p>
      <p>Всего последовательностей: ${totalResponses}</p>
      <p>Правильных ответов: ${correctResponses}</p>
      <p>Доля правильных ответов: ${accuracy}%</p>
      <p>Нажмите любую клавишу, чтобы завершить.</p>
    `;
  },
  choices: "ALL_KEYS",
  on_finish: function () {
    window.location.href = "../Mainhtml.html"; // Перенаправление на Mainhtml.html
  },
});

// Запускаем тест: сначала тренировка, затем основной тест
jsPsych.run([trainingTimeline, mainExperimentTimeline]);