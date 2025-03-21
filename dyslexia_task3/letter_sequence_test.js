// Инициализация jsPsych
var jsPsych = initJsPsych({
  override_safe_mode: true,
  on_finish: function () {
    let filteredResults = jsPsych.data.get().filter({ trial_type: "survey-text" }).values();
    console.log("🔹 Итоговые результаты (только ответы):", filteredResults);
    jsPsych.data.displayData("json");
  },
});

// Глобальные переменные
const myDict = {
  numRepetit: 30, // Число повторений
  wordlength: 4,  // Длина слова в символах
  expos: 500,     // Экспозиция
  gap: 500,       // Задержка
  distanceDiff: 2,// Сложность по расстоянию
  lettercorruption: 2, // Степень повреждения букв
};

var numRepetitions = myDict['numRepetit'];
var Blenght = myDict['wordlength'];
var Expo = myDict['expos'];
var Gap = myDict['gap'];
var minDistance = [10, 25, 32][myDict['distanceDiff']];
var maxDistance = [20, 32, 40][myDict['distanceDiff']];
var useDistortedLetters = [false, true, true, true][myDict['lettercorruption']];
var difficultyFolder = ["", "easy", "medium", "hard"][myDict['lettercorruption']];
var difficultyLetter = ["", "легкий", "средний", "сложный"][myDict['lettercorruption']];
var trainingPassed = false; // Флаг для завершения тренировки

// Буквы
var letters = ["А", "Б", "В", "Г", "Д", "Е", "Ё", "Ж", "З", "И", "Й", "К", "Л", "М", "Н", "О", "П", "Р", "С", "Т", "У", "Ф", "Х", "Ц", "Ч", "Ш", "Щ", "Ы", "Э", "Ю", "Я"];

// Функция генерации последовательности
function generateSequence(length) {
  return Array.from({ length: length }, () => letters[Math.floor(Math.random() * letters.length)]);
}

// Функция генерации пути к изображению
function getImagePath(letter) {
  let fileName = `${letter.toLowerCase('ru')} ${difficultyLetter}.png`;
  let filepath = `letters/${difficultyFolder}/${encodeURIComponent(fileName)}`;
  return filepath;
}

// Функция генерации позиций
function getRandomPosition(previousX, previousY) {
  let newX, newY;
  let num = 0;
  do {
    newX = Math.floor(Math.random() * 80) + 10;
    newY = Math.floor(Math.random() * 80) + 10;
    num++;
  } while (
    previousX !== null &&
    previousY !== null &&
    (Math.sqrt(Math.pow(newX - previousX, 2) + Math.pow(newY - previousY, 2)) > maxDistance ||
      Math.sqrt(Math.pow(newX - previousX, 2) + Math.pow(newY - previousY, 2)) < minDistance) &&
    num < 100
  );
  return { x: newX, y: newY };
}

// Функция генерации одного теста
function generateTestTrial(isTraining = false) {
  var sequence = generateSequence(Blenght);
  let positions = sequence.map(() => getRandomPosition(null, null));

  let testTrials = sequence.map((letter, index) => ({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: useDistortedLetters
      ? `<img src='${getImagePath(letter)}' style='position: absolute; top: ${positions[index].y}%; left: ${positions[index].x}%; width: 80px; height: auto;'>`
      : `<div style="position: absolute; top: ${positions[index].y}%; left: ${positions[index].x}%; font-size: 60px;">${letter}</div>`,
    choices: "NO_KEYS",
    trial_duration: Expo,
    post_trial_gap: Gap,
  }));

  let trialTimeline = [
    ...testTrials,
    {
      type: jsPsychSurveyText,
      questions: [{ prompt: "Введите последовательность букв:", name: "user_input" }],
      button_label: "Подтвердить",
      on_finish: function (data) {
        var userResponse = data.response.user_input.trim().toUpperCase();
        var correctSequence = sequence.join("");
        var isCorrect = userResponse === correctSequence;

        jsPsych.data.addDataToLastTrial({
          correct_sequence: correctSequence,
          user_response: userResponse,
          is_correct: isCorrect,
          phase: isTraining ? "training" : "experiment",
        });

        if (isTraining) {
          trainingPassed = isCorrect; // Завершаем тренировку только при правильном ответе
        }
      },
    },
  ];

  // Добавляем обратную связь только для основного теста
  if (!isTraining) {
    trialTimeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () {
        let lastTrial = jsPsych.data.get().last(1).values()[0];
        let isCorrect = lastTrial.is_correct;
        let userResponse = lastTrial.user_response;
        let correctSequence = lastTrial.correct_sequence;
        return `
          <p>Ваш ответ: <strong>${userResponse}</strong></p>
          <p>Правильная последовательность: <strong>${correctSequence}</strong></p>
          <p>Результат: ${isCorrect ? "Правильно" : "Неправильно"}</p>
          <p>Нажмите любую клавишу, чтобы продолжить.</p>
        `;
      },
      choices: "ALL_KEYS",
      post_trial_gap: 500,
    });
  }

  return {
    timeline: trialTimeline,
  };
}

// Таймлайн для тренировки
var trainingTimeline = {
  timeline: [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<p>В этом эксперименте на экране будут появляться буквы в разных частях экрана.</p>
                 <p>Ваша задача — запомнить последовательность букв.</p>
                 <p>После окончания последовательности вас попросят ввести её в правильном порядке.</p>
                 <p>Нажмите любую клавишу, чтобы начать пробное задание.</p>`,
    },
    generateTestTrial(true),
  ],
  loop_function: function () {
    return !trainingPassed; // Повторяем, пока пользователь не ответит правильно
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