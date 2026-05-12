let time = 25 * 60;
let interval = null;

let studySeconds = 0;

function updateDisplay() {

    let minutes = Math.floor(time / 60);
    let seconds = time % 60;

    seconds = seconds < 10 ? '0' + seconds : seconds;

    document.getElementById('timer').textContent =
        `${minutes}:${seconds}`;
}

function startTimer() {

    if (interval) return;

    interval = setInterval(() => {

        if (time > 0) {

            time--;
            studySeconds++;

            updateDisplay();

        } else {

            clearInterval(interval);
            interval = null;

            saveStudyTime();

            alert('Pomodoro finalizado!');
        }

    }, 1000);
}

function pauseTimer() {

    clearInterval(interval);
    interval = null;
}

function resetTimer() {

    clearInterval(interval);
    interval = null;

    time = 25 * 60;

    updateDisplay();
}

async function saveStudyTime() {

    try {

        const response = await fetch('http://localhost:8080/salvar', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                segundos: studySeconds
            })

        });

        const data = await response.text();

        console.log(data);

    } catch (erro) {

        console.log("Erro ao salvar:", erro);
    }
}

updateDisplay();