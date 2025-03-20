const jsPsych = initJsPsych({
    override_safe_mode: true
});

// Глобальная переменная с параметрами
const myDict = {
    trainingTime: 20000,      // Длительность тренировочного этапа (в мс)
    testTime: 1000 * 60 * 0.5,// Длительность теста (в мс, 30 секунд)
    wordLength: 3,            // Длина слова в символах (будет переопределено в эксперименте)
    exposure: 300,           // Экспозиция (в мс)
    gap: 400,                // Задержка между стимулами (в мс)
    letterCorruption: 0       // Степень повреждения букв (0 - не поврежденные, 1 и выше - поврежденные)
};

var difficultyFolder = ["", "easy", "medium", "hard"][myDict['lettercorruption']];
var difficultyLetter = ["", "легкий", "средний", "сложный"][myDict['lettercorruption']];

// Состояние эксперимента
const experimentState = {
    trainingAccuracy: 0,
    targetWord: null,
    stimuliData: null
};

// Наборы букв и слов
const letterSets3 = [
    { letters: ["Т", "Ч", "К", "П", "М", "У", "И", "Д", "Л", "Н", "Ц", "Ш"], words: ["ТЧК", "ШИК", "ЛУК", "ЛНД", "УМК", "ШДП"] },
    { letters: ["П", "Р", "С", "Т", "И", "У", "Я", "Б", "Г", "О", "Ы", "Ч", "Э", "З"], words: ["ИГО", "ТИС", "БЗЯ", "РБЗ", "ЫСЯ", "СОЭ", "ПГИ"] },
    { letters: ["С", "Т", "В", "О", "Я", "Ы", "Ф", "Р", "Ш", "П", "Ц", "З"], words: ["СВР", "ФЗВ", "ВОР", "КОТ", "ФЫР", "ЗЫВ", "ШПЦ"] },
    { letters: ["С", "Т", "Р", "У", "К", "Ж", "А", "М", "Е", "Й", "Н", "Ч", "Т"], words: ["ЖАР", "ЖУК"] }
];

const letterSets4 = [
    { letters: ["Т", "Ч", "К", "П", "М", "У", "И", "Д", "Л", "Н", "Ц", "Ш"], words: ["ДЛУН", "ПУНШ", "ШПИЦ", "ПШИК", "ШИМТ", "ШМУЧ"] },
    { letters: ["П", "Р", "С", "Т", "И", "У", "Я", "Б", "Г", "О", "Ы", "Ч", "Э", "З"], words: ["БРЯЗ", "БРИЗ", "ЗОСЭ", "ИПРУ", "УГПТ", "ПРСТ"] },
    { letters: ["С", "Т", "В", "О", "Я", "Ы", "Ф", "Р", "Ш", "П", "Ц", "З"], words: ["ФОРТ", "ШПОР", "СТВР", "ШПТЦ", "ПТИЦ", "ВОРС"] },
    { letters: ["Р", "Ч", "А", "Т", "К", "И", "В", "Я", "Ф", "З", "П", "Г", "Ш", "У"], words: ["ПРИЗ", "ГРУШ", "ШПУГ", "ЯЗВА", "ГРЯЗ", "АТКУ", "ФУТП"] },
    { letters: ["С", "Т", "Р", "У", "К", "Ж", "А", "М", "Е", "Й", "Н", "Ч", "Т"], words: ["РУКА", "МЕКУ", "ЙУМА", "СТУЖ", "ЕРАЙ", "ЧЖУМ", "УЙМА", "ТЕЙЧ"] }
];

// Генерация позиций без пересечения
function generateNonOverlappingWords(N, words) {
    let positions = [];
    function isNonOverlapping(start, length) {
        for (let pos of positions) {
            let [existingStart, existingLength] = pos;
            if ((start >= existingStart && start < existingStart + existingLength) || 
                (start + length > existingStart && start + length <= existingStart + existingLength)) {
                return false;
            }
        }
        return true;
    }
    for (let word of words) {
        let [length, count] = word;
        for (let i = 0; i < count; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 1000) {
                let start = Math.floor(Math.random() * (N - length + 1));
                if (isNonOverlapping(start, length)) {
                    positions.push([start, length]);
                    placed = true;
                }
                attempts++;
            }
            if (!placed) console.warn(`Не удалось разместить последовательность длиной ${length}`);
        }
    }
    return positions;
}

// Генерация стимулов для 3 букв
function generateStimuli3(totalStimuli, letters) {
    let stimuli = Array(totalStimuli).fill(null);
    let correctResponseIndices = [];
    let correctSequencesCount = Math.ceil(totalStimuli * 0.07);
    let incorrectSequencesCount = Math.ceil(totalStimuli * 0.1);
    let singleLetterCount = Math.ceil(totalStimuli * 0.15);
    let wordPositions = generateNonOverlappingWords(totalStimuli, [
        [3, correctSequencesCount],
        [2, incorrectSequencesCount]
    ]);
    let singleLetterPositions = generateNonOverlappingWords(totalStimuli, [[1, singleLetterCount]]);

   // Функция генерации пути к изображению
    function getImagePath(letter) {
        let fileName = `${letter.toLowerCase('ru')} ${difficultyLetter}.png`;
        let filepath = `letters/${difficultyFolder}/${encodeURIComponent(fileName)}`;
        return filepath;

}

    for (let [start, length] of wordPositions) {
        if (length === 3) {
            for (let i = 0; i < 3; i++) {
                let stimulusContent = myDict.letterCorruption > 0
                    ? `<img src='${getImagePath(experimentState.targetWord[i])}' style='width: 80px; height: auto;'>`
                    : `<div style="font-size:60px;">${experimentState.targetWord[i]}</div>`;
                stimuli[start + i] = { 
                    stimulus: stimulusContent, 
                    correct_response: i === 2 ? " " : null,
                    is_target: i === 2
                };
            }
            correctResponseIndices.push(start + 2);
        } else if (length === 2) {
            let startIndex = Math.floor(Math.random() * 2);
            let randomPair = experimentState.targetWord[startIndex] + experimentState.targetWord[startIndex + 1];
            for (let i = 0; i < 2; i++) {
                let stimulusContent = myDict.letterCorruption > 0
                    ? `<img src='${getImagePath(randomPair[i])}' style='width: 80px; height: auto;'>`
                    : `<div style="font-size:60px;">${randomPair[i]}</div>`;
                stimuli[start + i] = { stimulus: stimulusContent, correct_response: null, is_target: false };
            }
        }
    }

    for (let [start] of singleLetterPositions) {
        let singleLetter;
        let attempts = 0;
        do {
            singleLetter = experimentState.targetWord[Math.floor(Math.random() * experimentState.targetWord.length)];
            attempts++;
        } while (attempts < 10 && start >= 2 && 
            stimuli[start - 2]?.stimulus.includes(experimentState.targetWord[0]) && 
            stimuli[start - 1]?.stimulus.includes(experimentState.targetWord[1]));
        if (attempts < 10) {
            let stimulusContent = myDict.letterCorruption > 0
                ? `<img src='${getImagePath(singleLetter)}' style='width: 80px; height: auto;'>`
                : `<div style="font-size:60px;">${singleLetter}</div>`;
            stimuli[start] = { stimulus: stimulusContent, correct_response: null, is_target: false };
        }
    }

    for (let i = 0; i < totalStimuli; i++) {
        if (stimuli[i] === null) {
            let randomLetter = letters[Math.floor(Math.random() * letters.length)];
            let stimulusContent = myDict.letterCorruption > 0
                ? `<img src='${getImagePath(randomLetter)}' style='width: 80px; height: auto;'>`
                : `<div style="font-size:60px;">${randomLetter}</div>`;
            stimuli[i] = { stimulus: stimulusContent, correct_response: null, is_target: false };
        }
    }

    console.log("Список стимулов:", stimuli);
    console.log("Индексы правильных ответов:", correctResponseIndices);
    return { stimuli, correctResponseIndices };
}

// Генерация стимулов для 4 букв
function generateStimuli4(totalStimuli, letters) {
    let stimuli = Array(totalStimuli).fill(null);
    let correctResponseIndices = [];
    let correctSequencesCount = Math.ceil(totalStimuli * 0.05);
    let incorrect3SequencesCount = Math.ceil(totalStimuli * 0.05);
    let incorrect2SequencesCount = Math.ceil(totalStimuli * 0.1);
    let singleLetterCount = Math.ceil(totalStimuli * 0.15);
    let wordPositions = generateNonOverlappingWords(totalStimuli, [
        [4, correctSequencesCount],
        [3, incorrect3SequencesCount],
        [2, incorrect2SequencesCount],
        [1, singleLetterCount]
    ]);

    function getImagePath(letter) {
        const difficultyFolders = ["", "easy", "medium", "hard"];
        const difficultyLetters = ["", "легкий", "средний", "сложный"];
        const corruptionIndex = Math.min(myDict.letterCorruption, difficultyFolders.length - 1);
        return `letters/${difficultyFolders[corruptionIndex]}/${letter} ${difficultyLetters[corruptionIndex]}.png`;
    }

    for (let [start, length] of wordPositions) {
        if (length === 4) {
            for (let i = 0; i < 4; i++) {
                let stimulusContent = myDict.letterCorruption > 0
                    ? `<img src='${getImagePath(experimentState.targetWord[i])}' style='width: 80px; height: auto;'>`
                    : `<div style="font-size:60px;">${experimentState.targetWord[i]}</div>`;
                stimuli[start + i] = { 
                    stimulus: stimulusContent, 
                    correct_response: i === 3 ? " " : null,
                    is_target: i === 3
                };
            }
            correctResponseIndices.push(start + 3);
        } else if (length === 3) {
            let startIndex = Math.floor(Math.random() * 2);
            let randomTrio = experimentState.targetWord[startIndex] + experimentState.targetWord[startIndex + 1] + experimentState.targetWord[startIndex + 2];
            for (let i = 0; i < 3; i++) {
                let stimulusContent = myDict.letterCorruption > 0
                    ? `<img src='${getImagePath(randomTrio[i])}' style='width: 80px; height: auto;'>`
                    : `<div style="font-size:60px;">${randomTrio[i]}</div>`;
                stimuli[start + i] = { stimulus: stimulusContent, correct_response: null, is_target: false };
            }
        } else if (length === 2) {
            let startIndex = Math.floor(Math.random() * 3);
            let randomPair = experimentState.targetWord[startIndex] + experimentState.targetWord[startIndex + 1];
            for (let i = 0; i < 2; i++) {
                let stimulusContent = myDict.letterCorruption > 0
                    ? `<img src='${getImagePath(randomPair[i])}' style='width: 80px; height: auto;'>`
                    : `<div style="font-size:60px;">${randomPair[i]}</div>`;
                stimuli[start + i] = { stimulus: stimulusContent, correct_response: null, is_target: false };
            }
        } else if (length === 1) {
            let singleLetter = experimentState.targetWord[Math.floor(Math.random() * 4)];
            let stimulusContent = myDict.letterCorruption > 0
                ? `<img src='${getImagePath(singleLetter)}' style='width: 80px; height: auto;'>`
                : `<div style="font-size:60px;">${singleLetter}</div>`;
            stimuli[start] = { stimulus: stimulusContent, correct_response: null, is_target: false };
        }
    }

    for (let i = 0; i < totalStimuli; i++) {
        if (stimuli[i] === null) {
            let randomLetter = letters[Math.floor(Math.random() * letters.length)];
            let stimulusContent = myDict.letterCorruption > 0
                ? `<img src='${getImagePath(randomLetter)}' style='width: 80px; height: auto;'>`
                : `<div style="font-size:60px;">${randomLetter}</div>`;
            stimuli[i] = { stimulus: stimulusContent, correct_response: null, is_target: false };
        }
    }

    console.log("Список стимулов:", stimuli);
    console.log("Индексы правильных ответов:", correctResponseIndices);
    return { stimuli, correctResponseIndices };
}

function createFullTimeline() {
    const timeline = [];
    const totalDuration = myDict.exposure + myDict.gap;

    // Подготовка данных
    const wordLength = Math.random() < 0.5 ? 3 : 4; // Переопределяем wordLength из myDict
    const selectedSet = wordLength === 3 ? letterSets3[Math.floor(Math.random() * letterSets3.length)] : letterSets4[Math.floor(Math.random() * letterSets4.length)];
    experimentState.targetWord = selectedSet.words[Math.floor(Math.random() * selectedSet.words.length)];
    const letters = selectedSet.letters.filter(letter => !experimentState.targetWord.includes(letter));

    // Тренировочный этап
    const trainingStimuliCount = Math.floor(myDict.trainingTime / totalDuration);
    experimentState.stimuliData = wordLength === 3 ? generateStimuli3(trainingStimuliCount, letters) : generateStimuli4(trainingStimuliCount, letters);

    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
            <p>Тренировочный этап (${myDict.trainingTime / 1000} секунд).</p>
            <p>На экране будут появляться буквы.</p>
            <p>Если вы видите последовательность <strong>${experimentState.targetWord}</strong>, нажмите пробел на последней букве.</p>
            <p>Ответ принимается до начала следующего стимула.</p>
            <p>Нажмите любую клавишу, чтобы начать.</p>
        `,
        post_trial_gap: 1000
    });

    const trainingTest = {
        timeline: [{
            type: jsPsychHtmlKeyboardResponse,
            stimulus: jsPsych.timelineVariable("stimulus"),
            choices: [" "],
            trial_duration: totalDuration,
            response_ends_trial: false,
            stimulus_duration: myDict.exposure,
            data: {
                is_target: jsPsych.timelineVariable("is_target"),
                correct_response: jsPsych.timelineVariable("correct_response"),
                stimulus_onset: null,
                reaction_time: null,
                phase: "training",
                prev_correct: false
            },
            on_start: function(data) {
                data.stimulus_onset = performance.now();
            },
            on_finish: function(data) {
                const allTrials = jsPsych.data.get().filter({ phase: "training" }).values();
                const prevTrialIndex = allTrials.length - 2;

                if (data.response === " ") {
                    const rt = data.rt;
                    if (prevTrialIndex >= 0 && allTrials[prevTrialIndex].is_target && !allTrials[prevTrialIndex].correct && !data.is_target) {
                        const delayedRt = rt + totalDuration;
                        jsPsych.data.get().filter({ phase: "training", trial_index: allTrials[prevTrialIndex].trial_index }).addToLast({
                            reaction_time: delayedRt,
                            response: " ",
                            prev_correct: true
                        });
                        console.log("Задержанный ответ применен к предыдущему:", { 
                            prev_trial_index: prevTrialIndex,
                            prev_rt: delayedRt,
                            prev_correct: true,
                            rt_from_current: rt,
                            total_duration: totalDuration
                        });
                    }
                    data.reaction_time = rt;
                    data.correct = data.is_target ? true : false;
                    console.log("Ответ на текущий:", { 
                        is_target: data.is_target, 
                        correct: data.correct, 
                        rt: data.reaction_time 
                    });
                } else {
                    data.correct = data.is_target ? false : true;
                    data.reaction_time = null;
                    console.log("Нет ответа:", { 
                        is_target: data.is_target, 
                        correct: data.correct, 
                        rt: data.reaction_time 
                    });
                }
            }
        }],
        timeline_variables: experimentState.stimuliData.stimuli,
        randomize_order: false
    };

    timeline.push(trainingTest);

    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
            let trials = jsPsych.data.get().filter({ phase: "training" });
            let correctResponses = trials.filter({ is_target: true, correct: true }).count();
            let prevCorrect = trials.filter({ prev_correct: true }).count();
            let allCorrectResponses = correctResponses + prevCorrect;
            let totalTargets = trials.filter({ is_target: true }).count();
            let accuracy = totalTargets > 0 ? (allCorrectResponses / totalTargets * 100).toFixed(2) : 0;
            experimentState.trainingAccuracy = parseFloat(accuracy);

            let targetTrials = trials.filter({ is_target: true });
            let rtSum = targetTrials.values().reduce((sum, t) => sum + (t.reaction_time || 0), 0);
            let rtCount = targetTrials.filter(t => t.reaction_time !== null).count();
            let avgRt = rtCount > 0 ? (rtSum / rtCount).toFixed(2) : "N/A";

            console.log("Training results:", { correctResponses, prevCorrect, allCorrectResponses, totalTargets, accuracy });
            return `
                <p>Тренировка завершена.</p>
                <p>Точность: ${accuracy}% (${allCorrectResponses} из ${totalTargets})</p>
                <p>Среднее время реакции: ${avgRt} мс</p>
                <p>${accuracy >= -30 ? 'Вы прошли тренировку! Нажмите клавишу для основного теста.' : 'Точность ниже 30%. Тест завершен.'}</p>
            `;
        }
    });

    // Основной этап
    const mainStimuliCount = Math.floor(myDict.testTime / totalDuration);
    experimentState.stimuliData = wordLength === 3 ? generateStimuli3(mainStimuliCount, letters) : generateStimuli4(mainStimuliCount, letters);

    timeline.push({
        conditional_function: function() {
            return experimentState.trainingAccuracy >= -30;
        },
        timeline: [
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: `
                    <p>Основной этап (${myDict.testTime / 1000} секунд).</p>
                    <p>На экране будут появляться буквы.</p>
                    <p>Если вы видите последовательность <strong>${experimentState.targetWord}</strong>, нажмите пробел на последней букве.</p>
                    <p>Ответ принимается до начала следующего стимула.</p>
                    <p>Нажмите любую клавишу, чтобы начать.</p>
                `,
                post_trial_gap: 1000
            },
            {
                timeline: [{
                    type: jsPsychHtmlKeyboardResponse,
                    stimulus: jsPsych.timelineVariable("stimulus"),
                    choices: [" "],
                    trial_duration: totalDuration,
                    response_ends_trial: false,
                    stimulus_duration: myDict.exposure,
                    data: {
                        is_target: jsPsych.timelineVariable("is_target"),
                        correct_response: jsPsych.timelineVariable("correct_response"),
                        stimulus_onset: null,
                        reaction_time: null,
                        phase: "main",
                        prev_correct: false
                    },
                    on_start: function(data) {
                        data.stimulus_onset = performance.now();
                    },
                    on_finish: function(data) {
                        const allTrials = jsPsych.data.get().filter({ phase: "main" }).values();
                        const prevTrialIndex = allTrials.length - 2;

                        if (data.response === " ") {
                            const rt = data.rt;
                            if (prevTrialIndex >= 0 && allTrials[prevTrialIndex].is_target && !allTrials[prevTrialIndex].correct && !data.is_target) {
                                const delayedRt = rt + totalDuration;
                                jsPsych.data.get().filter({ phase: "main", trial_index: allTrials[prevTrialIndex].trial_index }).addToLast({
                                    reaction_time: delayedRt,
                                    response: " ",
                                    prev_correct: true
                                });
                                console.log("Задержанный ответ применен к предыдущему:", { 
                                    prev_trial_index: prevTrialIndex,
                                    prev_rt: delayedRt,
                                    prev_correct: true,
                                    rt_from_current: rt,
                                    total_duration: totalDuration
                                });
                            }
                            data.reaction_time = rt;
                            data.correct = data.is_target ? true : false;
                            console.log("Ответ на текущий:", { 
                                is_target: data.is_target, 
                                correct: data.correct, 
                                rt: data.reaction_time 
                            });
                        } else {
                            data.correct = data.is_target ? false : true;
                            data.reaction_time = null;
                            console.log("Нет ответа:", { 
                                is_target: data.is_target, 
                                correct: data.correct, 
                                rt: data.reaction_time 
                            });
                        }
                    }
                }],
                timeline_variables: experimentState.stimuliData.stimuli,
                randomize_order: false
            },
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: function() {
                    let trials = jsPsych.data.get().filter({ phase: "main" }).values();
        
                    // Массивы targets и responses
                    let targets = trials.map(trial => trial.is_target ? 1 : 0);
                    let responses = trials.map(trial => trial.response ? 1 : 0);
                    console.log(targets)
                    // Переменные для подсчёта
                    let correctResponses = 0;
                    let falseAlarms = 0;
                    let totalTargets = targets.filter(t => t === 1).length;
                    let rtSum = 0; // Сумма времён реакции
                    let rtCount = 0; // Количество правильных ответов с временем
        
                    // Цикл по всем стимулам
                    for (let i = 0; i < trials.length; i++) {
                        if (targets[i] === 1 && responses[i] === 1) {
                            // Немедленный правильный ответ
                            correctResponses++;
                            rtSum += trials[i].reaction_time;
                            rtCount++;
                        } else if (targets[i] === 0 && responses[i] === 1) {
                            // Ответ дан на нецелевой стимул
                            if (i > 0 && targets[i - 1] === 1 && responses[i - 1] === 0) {
                                // Правильный ответ с задержкой для предыдущего целевого стимула
                                correctResponses++;
                                // Время реакции = время ответа на текущем + totalDuration
                                let delayedRt = trials[i].reaction_time + totalDuration;
                                rtSum += delayedRt;
                                rtCount++;
                            } else {
                                // Ложный ответ
                                falseAlarms++;
                            }
                        }
                    }
        
                    // Вычисляем среднее время реакции
                    let avgRt = rtCount > 0 ? (rtSum / rtCount).toFixed(2) : "N/A";
        
                    // Вычисляем долю правильных ответов
                    let accuracy = totalTargets > 0 ? (correctResponses / totalTargets * 100).toFixed(2) : 0;
        
                    // Выводим результаты
                    return `
                        <p>Тест завершён.</p>
                        <p>Доля правильных ответов: ${accuracy}%</p>
                        <p>Число ложных реакций: ${falseAlarms}</p>
                        <p>Среднее время реакции: ${avgRt} мс</p>
                        <p>Нажмите любую клавишу, чтобы завершить.</p>
                    `;
                }
            }
        ]
    });

    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
            if (experimentState.trainingAccuracy >= -30) return "";
            return "<p>Эксперимент завершён. Точность на тренировке была недостаточной.</p>";
        },
        on_finish: function() {
            let filteredResults = jsPsych.data.get().filter({ trial_type: "html-keyboard-response" }).values();
            console.log("🔹 Итоговые результаты:", filteredResults);
            document.body.innerHTML = "<pre>" + JSON.stringify(filteredResults, null, 2) + "</pre>";
            window.location.href = "../Mainhtml.html"; // Перенаправление на Mainhtml.html
        }
    });

    return timeline;
}

// Запуск эксперимента
jsPsych.run(createFullTimeline());