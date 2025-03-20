// Инициализация jsPsych
var jsPsych = initJsPsych({
  override_safe_mode: true,
  on_finish: function () {
    jsPsych.data.displayData();
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
  stimulus:
    "Добро пожаловать в эксперимент. Нажмите любую клавишу, чтобы начать.",
});

// Параметры по умолчанию
var syllableLength = 2; // Количество букв в слоге (2 или 3)
var numSyllables = 4; // Количество слогов в слове (будет установлено через выбор)
var Expo = 500;
var Gap = 0;

// Флаг, указывающий, использовать ли искажённые буквы (определяется пользователем)
var useDistortedLetters = false;
var difficultyFolder = "easy"; // Папка с изображениями по умолчанию
var difficultyLetter = "легкий"; // Название уровня сложности

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
    return [c, v];  // Возвращаем массив букв
  } else if (length === 3) {
    // Слог: согласная + гласная + согласная
    let c1 = Soglasn[Math.floor(Math.random() * Soglasn.length)];
    let v = Glasn[Math.floor(Math.random() * Glasn.length)];
    let c2 = Soglasn[Math.floor(Math.random() * Soglasn.length)];
    return [c1, v, c2];  // Возвращаем массив букв
  }
}

// Функция для формирования пути к изображению
function getImagePath(syllable) {
  return `letters/${difficultyFolder}/${syllable} ${difficultyLetter}.png`;
}

// Выбор параметров теста через радио-кнопки
timeline.push({
  type: jsPsychSurveyHtmlForm,
  preamble: "<p>Выберите параметры теста:</p>",
  html: `
    <fieldset>
      <legend>Сложность искажённых букв:</legend>
      <label><input type="radio" name="distortion" value="0" required> Не искажённые</label><br>
      <label><input type="radio" name="distortion" value="1"> Искажённые (легко)</label><br>
      <label><input type="radio" name="distortion" value="2"> Искажённые (средне)</label><br>
      <label><input type="radio" name="distortion" value="3"> Искажённые (сложно)</label>
    </fieldset>
    <fieldset>
      <legend>Длина слова (количество слогов):</legend>
      <label><input type="radio" name="wordLength" value="2" required> 2 слога</label><br>
      <label><input type="radio" name="wordLength" value="3"> 3 слогов</label><br>
      <label><input type="radio" name="wordLength" value="4"> 4 слогов</label>
    </fieldset>
    <fieldset>
      <legend>Скорость предъявления:</legend>
      <label><input type="radio" name="exposure" value="0" required> 1000 мс</label><br>
      <label><input type="radio" name="exposure" value="1"> 500 мс</label><br>
      <label><input type="radio" name="exposure" value="2"> 300 мс</label>
    </fieldset>
    <fieldset>
      <legend>Количество букв в слоге:</legend>
      <label><input type="radio" name="syllableLength" value="2" required> 2 буквы (согласная + гласная)</label><br>
      <label><input type="radio" name="syllableLength" value="3"> 3 буквы (согласная + гласная + согласная)</label>
    </fieldset>
    <fieldset>
      <legend>Расстояние между слогами:</legend>
      <label><input type="radio" name="distance" value="0" required> Близко</label><br>
      <label><input type="radio" name="distance" value="1"> Среднее</label><br>
      <label><input type="radio" name="distance" value="2"> Далеко</label>
    </fieldset>
  `,
  button_label: "Продолжить",
  on_finish: function (data) {
    let distortionResponse = parseInt(data.response.distortion);
    let wordLengthResponse = parseInt(data.response.wordLength);
    let exposureResponse = parseInt(data.response.exposure);
    let syllableLengthResponse = parseInt(data.response.syllableLength);
    let distanceResponse = parseInt(data.response.distance);

    useDistortedLetters = distortionResponse > 0;
    numSyllables = wordLengthResponse;
    difficultyFolder = ["", "easy", "medium", "hard"][distortionResponse];
    difficultyLetter = ["", "легкий", "средний", "сложный"][distortionResponse];
    Expo = [1000, 500, 300][exposureResponse];
    syllableLength = syllableLengthResponse;

    // Устанавливаем расстояние между слогами в зависимости от выбора
    minYdistance = [10, 20, 30][distanceResponse];
    maxYdistance = [20, 30, 40][distanceResponse];
  },
});

// Этап подготовки стимулов
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <p>В этом эксперименте на экране будут появляться слоги, сформированные по правилу:</p>
    <p>• Для 2-буквенных слогов: согласная + гласная</p>
    <p>• Для 3-буквенных слогов: согласная + гласная + согласная</p>
    <p>Слоги будут появляться слева направо последовательно.</p>
    <p>Ваша задача — запомнить последовательность слогов.</p>
    <p>Нажмите любую клавишу, чтобы продолжить.</p>
  `,
  on_finish: function () {
    // Генерация последовательности слогов
    var syllableSequence = [];
    for (var i = 0; i < numSyllables; i++) {
      syllableSequence.push(generateSyllable(syllableLength));
    }
    // Сохраняем корректную последовательность для сравнения без пробела
    globalCorrectSequence = syllableSequence.map(syllable => syllable.join('')).join('');
    jsPsych.data.addProperties({ correct_sequence: globalCorrectSequence });

    var topPosprev = 50
    // Генерация этапов показа слогов
    var syllableTrials = syllableSequence.map(function (syllable, index) {
      // Располагаем слоги по горизонтали
      var leftPos = ((index + 1) * 100) / (syllableSequence.length + 1);
      var topPos
      do {
        topPos = (Math.floor(Math.random() * (maxYdistance - minYdistance + 1)) + minYdistance) * (Math.random() < 0.5 ? 1 : -1) + topPosprev;
      } while (topPos <= 10 || topPos >= 90);
      topPosprev = topPos;

      var stimulusContent = "";

      if (useDistortedLetters) {
        // Если используются искажённые буквы, показываем отдельные картинки для каждой буквы слога
        if (syllable.length === 2) {
          // Для слога из двух букв (согласная + гласная)
          stimulusContent = `
            <img src="${getImagePath(syllable[0])}" style="position: absolute; top: ${topPos}%; left: ${leftPos}%; width: 50px; height: auto;">
            <img src="${getImagePath(syllable[1])}" style="position: absolute; top: ${topPos}%; left: ${leftPos + 2}%; width: 50px; height: auto;">
          `;
        } else if (syllable.length === 3) {
          // Для слога из трёх букв (согласная + гласная + согласная)
          stimulusContent = `
            <img src="${getImagePath(syllable[0])}" style="position: absolute; top: ${topPos}%; left: ${leftPos}%; width: 50px; height: auto;">
            <img src="${getImagePath(syllable[1])}" style="position: absolute; top: ${topPos}%; left: ${leftPos + 2}%; width: 50px; height: auto;">
            <img src="${getImagePath(syllable[2])}" style="position: absolute; top: ${topPos}%; left: ${leftPos + 4}%; width: 50px; height: auto;">
          `;
        }
      } else {
        // Если буквы не искажены, просто показываем слог как текст
        stimulusContent = `<div style="position: absolute; top: ${topPos}%; left: ${leftPos}%; font-size: 60px;">${syllable.join('')}</div>`;
      }

      return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: stimulusContent,
        choices: "NO_KEYS",
        trial_duration: Expo,
        post_trial_gap: Gap,
      };
    });

    // Добавляем этапы показа слогов в timeline
    timeline.push(...syllableTrials);

    // Ввод ответа участником
    timeline.push({
      type: jsPsychSurveyText,
      questions: [
        {
          prompt:
            "Введите последовательность слогов, разделённых пробелом, которую вы видели:",
          name: "user_input",
        },
      ],
      button_label: "Подтвердить",
      on_finish: function (data) {
        // Приводим ответ к единому формату: заглавные буквы и один пробел между слогами
        var userResponse = data.response.user_input
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "");
        
        var isCorrect = userResponse === globalCorrectSequence;
        jsPsych.data.addProperties({
          user_response: userResponse,
          is_correct: isCorrect,
        });
      },
    });

    // Дебрифинг
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () {
        var trialData = jsPsych.data.get().last(1).values()[0];
        var feedback =
          trialData.is_correct === true
            ? `<p>Правильно! Вы ввели: ${trialData.user_response}</p>`
            : `<p>Неверно. Вы ввели: ${trialData.user_response}. Правильная последовательность: ${globalCorrectSequence}</p>`;
        return `<p>Эксперимент завершён!</p>
                ${feedback}
                <p>Спасибо за участие! Нажмите любую клавишу, чтобы выйти.</p>`;
      },
    });
  },
});

// Запуск эксперимента
jsPsych.run(timeline);
