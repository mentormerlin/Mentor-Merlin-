/*
 * activity.js
 *
 * This script powers the NMC registration flow activity.  It presents a list of
 * steps in random order and allows the participant to drag and drop the tiles
 * into what they believe is the correct chronological sequence.  Upon
 * submission the order is validated and feedback is displayed inline.  Each
 * submission is posted to a Google Apps Script endpoint for storage in a
 * linked Google Sheet – replace `YOUR_SCRIPT_ID` with your own script ID
 * obtained when you deploy the Apps Script as a web app.
 */

document.addEventListener('DOMContentLoaded', () => {
    const tilesContainer = document.getElementById('tilesContainer');
    const submitButton = document.getElementById('submitActivity');
    const resultEl = document.getElementById('activityResult');

    // Elements for the start form
    const startBtn = document.getElementById('startActivityBtn');
    const nameInput = document.getElementById('activityName');
    const emailInput = document.getElementById('activityEmail');
    const startSection = document.getElementById('activity-start');
    const contentSection = document.getElementById('activity-content');

    // Define the steps in their correct chronological order.  Each entry has
    // a unique ID and a text description.  When the activity initializes
    // these steps are shuffled so the participant must reorder them.
    const steps = [
        { id: 1, text: 'Apply for NMC eligibility with valid passport and nursing qualification' },
        { id: 2, text: 'Upload documents (passport, qualification, registration) and pay £140 application fee' },
        { id: 3, text: 'Contact home council' },
        { id: 4, text: 'Receive email from NMC after Third party verification' },
        { id: 5, text: 'Submit Health and Character declarations (PCC + Medical fitness)' },
        { id: 6, text: 'Upload proof of English Language proficiency (OET or IELTS or SIFE route)' },
        { id: 7, text: 'Pay £153 final registration fee' },
        { id: 8, text: 'ID check and document verification' },
        { id: 9, text: 'Receive NMC PIN after successfully clearing CBT and OSCE' }
    ];

    /**
     * Randomly shuffle an array in place using the Fisher–Yates algorithm.
     *
     * @param {Array} array - the array to shuffle
     * @returns {Array} the shuffled array
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Initialize the drag‑and‑drop activity.  Clears any existing tiles,
     * randomizes the order of the defined steps and renders them as
     * draggable divs.  Attaches the necessary drag event handlers.
     */
    function initActivity() {
        tilesContainer.innerHTML = '';
        const shuffledSteps = shuffleArray([...steps]);
        shuffledSteps.forEach((step) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.draggable = true;
            tile.dataset.id = step.id;
            tile.textContent = step.text;
            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragend', handleDragEnd);
            tilesContainer.appendChild(tile);
        });
        tilesContainer.addEventListener('dragover', handleDragOver);
    }

    /**
     * Event handlers for the drag events.  The dragging class is added/removed
     * to style the currently dragged element.  The dragover handler computes
     * the correct insertion point based on the mouse position.
     */
    function handleDragStart(e) {
        if (e.target && e.target.classList.contains('tile')) {
            e.target.classList.add('dragging');
        }
    }
    function handleDragEnd(e) {
        if (e.target && e.target.classList.contains('tile')) {
            e.target.classList.remove('dragging');
        }
    }
    function handleDragOver(e) {
        e.preventDefault();
        const draggable = document.querySelector('.dragging');
        if (!draggable) return;
        const afterElement = getDragAfterElement(tilesContainer, e.clientY);
        if (afterElement == null) {
            tilesContainer.appendChild(draggable);
        } else {
            tilesContainer.insertBefore(draggable, afterElement);
        }
    }

    /**
     * Determine the element that should appear after the dragged element.
     *
     * @param {HTMLElement} container - the container holding the tiles
     * @param {number} y - the current vertical mouse coordinate
     * @returns {HTMLElement|null} the element to insert before
     */
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.tile:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Handle the start button click: validate inputs, store values and show the activity
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const email = emailInput.value.trim().toLowerCase();
            if (!name || !email) {
                alert('Please enter your name and email to start the activity.');
                return;
            }
            sessionStorage.setItem('activity_userName', name);
            sessionStorage.setItem('activity_userEmail', email);
            startSection.classList.add('hidden');
            contentSection.classList.remove('hidden');
            initActivity();
        });
    }

    // Compare the current order to the correct order when the user submits
    if (submitButton) {
        submitButton.addEventListener('click', () => {
            const currentOrder = Array.from(tilesContainer.children).map((child) => parseInt(child.dataset.id, 10));
            const correctOrder = steps.map((step) => step.id);
            const name = sessionStorage.getItem('activity_userName');
            const email = sessionStorage.getItem('activity_userEmail');
            const timestamp = new Date().toISOString();
            const isCorrect = arraysEqual(currentOrder, correctOrder);
            const resultObj = {
                name,
                email,
                result: isCorrect ? 'Correct' : 'Incorrect',
                submittedOrder: currentOrder.join(', '), // Convert array to string for Sheet
                timestamp
            };

            // Send the result to the Google Apps Script web app.  Replace YOUR_SCRIPT_ID
            // below with the ID from your deployed script.  The no‑cors mode prevents
            // CORS issues but the response cannot be read in the browser.
            fetch('https://script.google.com/macros/s/AKfycbw7-Y4SvAlJdtEaEoECc_pVCkN9rV8Z0J5iOImVSsayz_vHs5750aJgqYgcd6dGu96dYw/exec', {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resultObj)
            }).catch((err) => {
                console.error('Error sending result to Google Sheet:', err);
            });
            // Provide immediate feedback to the participant
            if (isCorrect) {
                resultEl.textContent = 'Great job! You have arranged the steps correctly.';
                resultEl.className = 'activity-result success';
            } else {
                resultEl.textContent = 'Some steps are out of order. Please try again to complete the flow.';
                resultEl.className = 'activity-result error';
            }
        });
    }

    /**
     * Compare two arrays for strict equality of their elements in order.
     *
     * @param {Array} arr1 - first array
     * @param {Array} arr2 - second array
     * @returns {boolean} true if arrays are identical
     */
    function arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }
});
