// Инициализация jsPsych
var jsPsych = initJsPsych({
  override_safe_mode: true,
  on_finish: function () {
    // Фильтруем только результаты ответов пользователя (убираем стимулы)
    let filteredResults = jsPsych.data.get().filter({ trial_type: "survey-text" }).values();

    // Выводим очищенные данные
    console.log("🔹 Итоговые результаты (только ответы):", filteredResults);

    // Показываем только очищенные данные
    jsPsych.data.displayData("json");
  },
});

// Глобальные переменные
//число повторений, длина слова, длительность стимула и задержки, расстояние, сложность букв

const myDict = {
  numRepetit: 2,//число повторений
  wordlength: 4,//длина слова в символах
  expos: 1000,//экспозиция
  gap:1000,//задержка
  distanceDiff: 2,//сложность по расстоянию
  lettercorruption:1,//степень повреждения букв, 0 - не повреждённые
};




var numRepetitions = myDict['numRepetit'];
var Blenght = myDict['wordlength'];
var Expo = myDict['expos'];
var Gap = myDict['gap'];
var minDistance = [10, 25, 37][myDict['distanceDiff']];
var maxDistance = [20, 35, 52][myDict['distanceDiff']];
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
  return `letters/${difficultyFolder}/${letter} ${difficultyLetter}.png`;
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

// Функция генерации одного теста (с флагом isTraining)
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

  return {
    timeline: [
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
            phase: isTraining ? "training" : "experiment", // Отмечаем тренировку и тест
          });

          if (isTraining) {
            trainingPassed = isCorrect; // Завершаем тренировку только при правильном ответе
          }
        },
      },
    ],
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

// **Добавляем основной тест на numRepetitions раз**
for (let i = 0; i < numRepetitions; i++) {
  mainExperimentTimeline.timeline.push(generateTestTrial(false));
}

// **Запускаем тест: сначала тренировка, затем основной тест**
jsPsych.run([trainingTimeline, mainExperimentTimeline]);
