const jsPsych = initJsPsych({
    override_safe_mode: true
});

// Глобальная переменная с параметрами
const myDict = {
    trainingTime: 20000,      // Длительность тренировочного этапа (в мс)
    testTime: 1000 * 60 * 4,// Длительность теста (в мс, 30 секунд)
    lettersDiff: 2,           // Сложность набора букв
    lettersNum: 2,            // Число целевых букв
    exposure: 300,           // Экспозиция (в мс)
    gap: 400,                // Задержка между стимулами (в мс)
    letterCorruption: 1       // Степень повреждения букв (0 - не поврежденные, 1 и выше - поврежденные)
};

// Глобальные параметры
const params = {
    difficulty: [0.5, 1, 2, 1, 0],
    letterPools: [
        ["О", "П", "В", "М", "Ы", "Ф", "И", "А", "Р", "У"],
        ["Й", "Ц", "Н", "З", "Ж", "А", "Ы", "Я", "Ч", "Ю"],
        ["У", "Е", "Ш", "Э", "Б", "Т", "М", "С", "Ф", "А", "П"],
        ["Ю", "Д", "Р", "Е", "О", "Ж", "Щ", "Х", "Ф", "К"]
    ],
    letterPools2: [
        ["О", "Ю", "Е", "А", "Э", "С"],
        ["М", "И", "Х", "К", "У", "Ж", "А"],
        ["П", "Н", "Л", "Т", "Д", "Ц", "Ш", "Щ"],
        ["Ч", "Р", "В", "З", "Ы", "Б", "Я", "Ф"],
        ["Г", "Е", "Н", "А", "Т", "Д"]
    ],
    exposureTimes: [1000, 500, 300],
    interStimulusIntervals: [300, 200, 100],
    difficultyFolders: ["", "easy", "medium", "hard"],
    difficultyLetters: ["", "легкий", "средний", "сложный"],
    targetPercentage: 0.3
};

// Состояние эксперимента
const experimentState = {
    trainingAccuracy: 0
};

function getExperimentParams(difficulty) {
    return {
        testTime: myDict.testTime,
        lettersDiff: myDict.lettersDiff,
        lettersNum: myDict.lettersNum,
        exposureTime: myDict.exposure,
        interStimulusInterval: myDict.gap,
        useDistorted: [false, true, true, true][myDict.letterCorruption],
        difficultyFolder: params.difficultyFolders[myDict.letterCorruption],
        difficultyLetter: params.difficultyLetters[myDict.letterCorruption]
    };
}

function generateStimuli(totalStimuli, targetLetters, targetCount, letterPool, config) {
    let stimuli = [];
    let targetIndices = new Set();
    let nonTargetLetters = letterPool.filter(l => !targetLetters.includes(l));

    while (targetIndices.size < targetCount) {
        targetIndices.add(Math.floor(Math.random() * totalStimuli));
    }

    for (let i = 0; i < totalStimuli; i++) {
        let isTarget = targetIndices.has(i);
        let letter = isTarget 
            ? targetLetters[Math.floor(Math.random() * targetLetters.length)]
            : nonTargetLetters[Math.floor(Math.random() * nonTargetLetters.length)];
        
        let fileName = `${letter.toLowerCase('ru')} ${config.difficultyLetter}.png`;
        let filePath = `letters/${config.difficultyFolder}/${encodeURIComponent(fileName)}`;
        console.log(filePath);
        let stimulus = config.useDistorted 
            ? `<img src="${filePath}" style="width: 80px; height: auto;" onerror="console.error('Ошибка загрузки:', this.src)">`
            : `<div style="font-size:60px;">${letter}</div>`;
        
        stimuli.push({
            stimulus: stimulus,
            is_target: isTarget,
            correct_response: isTarget ? " " : null
        });
    }
    return stimuli;
}

function createFullTimeline() {
    const config = getExperimentParams(params.difficulty);
    const timeline = [];

    const targetPool = config.lettersDiff === 0 ? params.letterPools : params.letterPools2;
    const letterPool = targetPool[Math.floor(Math.random() * targetPool.length)];
    const targetLetters = jsPsych.randomization.sampleWithoutReplacement(letterPool, config.lettersNum);
    const totalDuration = config.exposureTime + config.interStimulusInterval;

    // Тренировочный этап
    const trainingDuration = 10000;
    const trainingStimuliCount = Math.floor(trainingDuration / totalDuration);
    const trainingTargetCount = Math.ceil(trainingStimuliCount * params.targetPercentage);
    const trainingStimuli = generateStimuli(trainingStimuliCount, targetLetters, trainingTargetCount, letterPool, config);

    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
            <p>Тренировочный этап (10 секунд).</p>
            <p>На экране будут появляться буквы.</p>
            <p>Если вы видите целевые буквы: <strong>${targetLetters.join(", ")}</strong>, нажмите пробел.</p>
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
            stimulus_duration: config.exposureTime,
            data: {
                is_target: jsPsych.timelineVariable("is_target"),
                correct_response: jsPsych.timelineVariable("correct_response"),
                stimulus_onset: null,
                reaction_time: null,
                phase: "training",
                responded: false
            },
            on_start: function(data) {
                data.stimulus_onset = performance.now();
            },
            on_finish: function(data) {
                const prevTrial = jsPsych.data.get().last(2).values()[1];
                const currentTime = performance.now();

                if (data.response === " ") {
                    data.responded = true;
                    const rt = data.rt;
                    if (prevTrial && prevTrial.is_target && !prevTrial.responded && !data.is_target && rt > config.exposureTime) {
                        prevTrial.reaction_time = currentTime - prevTrial.stimulus_onset;
                        prevTrial.correct = true;
                        prevTrial.delayed_correct = true; // Отмечаем ответ с задержкой
                        prevTrial.responded = true;
                        data.is_delayed_response = true; // Для текущего нецелевого
                        data.correct = false;
                        data.reaction_time = rt;
                    } else if (data.is_target) {
                        data.reaction_time = rt;
                        data.correct = true;
                    } else {
                        data.correct = false;
                        data.reaction_time = rt;
                    }
                } else {
                    data.responded = false;
                    if (data.is_target) {
                        data.correct = false;
                        data.reaction_time = null;
                    } else {
                        data.correct = true;
                        data.reaction_time = null;
                    }
                }
            }
        }],
        timeline_variables: trainingStimuli,
        randomize_order: false
    };

    timeline.push(trainingTest);


    timeline.push({
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
            let trials = jsPsych.data.get().filter({ phase: "training" }).values();
        
            // Массивы targets и responses
            let targets = trials.map(trial => trial.is_target ? 1 : 0);
            let responses = trials.map(trial => trial.responded ? 1 : 0);
        
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
            experimentState.trainingAccuracy = accuracy;
            return `
                <p>Доля правильных ответов: ${accuracy}%</p>
                <p>Число ложных реакций: ${falseAlarms}</p>
                <p>Среднее время реакции: ${avgRt} мс</p>
                <p>${accuracy >= 30 ? 'Вы прошли тренировку! Нажмите клавишу для основного теста.' : 'Точность ниже 30%. Тест завершен.'}</p>
            `;
        },
        on_finish: function() {
            console.log("Training finished, accuracy:", experimentState.trainingAccuracy);
        }
    });

    // Основной этап
    const mainDuration = config.testTime;
    const mainStimuliCount = Math.floor(mainDuration / totalDuration);
    const mainTargetCount = Math.ceil(mainStimuliCount * params.targetPercentage);
    const mainStimuli = generateStimuli(mainStimuliCount, targetLetters, mainTargetCount, letterPool, config);

    timeline.push({
        conditional_function: function() {
            return experimentState.trainingAccuracy >= 30;
        },
        timeline: [
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: `
                    <p>Основной этап.</p>
                    <p>На экране будут появляться буквы.</p>
                    <p>Если вы видите целевые буквы: <strong>${targetLetters.join(", ")}</strong>, нажмите пробел.</p>
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
                    stimulus_duration: config.exposureTime,
                    data: {
                        is_target: jsPsych.timelineVariable("is_target"),
                        correct_response: jsPsych.timelineVariable("correct_response"),
                        stimulus_onset: null,
                        reaction_time: null,
                        phase: "main",
                        responded: false
                    },
                    on_start: function(data) {
                        data.stimulus_onset = performance.now();
                    },
                    on_finish: function(data) {
                        const prevTrial = jsPsych.data.get().last(2).values()[1];
                        const currentTime = performance.now();

                        if (data.response === " ") {
                            data.responded = true;
                            const rt = data.rt;
                            if (prevTrial && prevTrial.is_target && !prevTrial.responded && !data.is_target) {
                                prevTrial.reaction_time = currentTime - prevTrial.stimulus_onset;
                                prevTrial.correct = true;
                                prevTrial.delayed_correct = true; // Отмечаем ответ с задержкой
                                prevTrial.responded = true;
                                data.is_delayed_response = true; // Для текущего нецелевого
                                data.correct = false;
                                data.reaction_time = rt;
                            } else if (data.is_target) {
                                data.reaction_time = rt;
                                data.correct = true;
                            } else {
                                data.correct = false;
                                data.reaction_time = rt;
                            }
                        } else {
                            data.responded = false;
                            if (data.is_target) {
                                data.correct = false;
                                data.reaction_time = null;
                            } else {
                                data.correct = true;
                                data.reaction_time = null;
                            }
                        }
                    }
                }],
                timeline_variables: mainStimuli,
                randomize_order: false
            },
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: function() {
                    let trials = jsPsych.data.get().filter({ phase: "main" }).values();
        
                    // Массивы targets и responses
                    let targets = trials.map(trial => trial.is_target ? 1 : 0);
                    let responses = trials.map(trial => trial.responded ? 1 : 0);
        
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
            if (experimentState.trainingAccuracy >= 0) return "";
            return "<p>Эксперимент завершён. Точность на тренировке была недостаточной.</p>";
        },
        on_finish: function() {
            let filteredResults = jsPsych.data.get().filter({ trial_type: "html-keyboard-response" }).values();
            console.log("🔹 Итоговые результаты:", filteredResults);
            document.body.innerHTML = "<pre>" + JSON.stringify(filteredResults, null, 2) + "</pre>";
            window.location.href = "../Mainhtml.html";
        }
    });

    return timeline;
}

// Запуск эксперимента
jsPsych.run(createFullTimeline());