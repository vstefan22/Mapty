'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// ////////////////////////////////////////////////////
class App {
  // private properties
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    // Get users position
    this._getPosition();
    // Event handlers

    // If edit window is open don't trigger function to create new workout
    if (!form.classList.contains('edit')) {
      form.addEventListener('submit', this._newWorkout.bind(this));
    }
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Get data from local storage
    this._getLocalStorage();
  }

  _getPosition() {
    // bind(this) using to not lose this keyword in _loadMap() function
    // getCurrentPosition(success, error), we pass callback function so parameter of current location is passed to _loadMap
    // if we successfuly get users location
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position!');
      }
    );
  }

  _loadMap(position) {
    console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden'); // show form
    inputDistance.focus(); // put automatic input on distance input
  }
  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    if (form.classList.contains('edit')) return;
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Display marker
    e.preventDefault();

    // get data from the input
    const type = inputType.value;
    const distance = +inputDistance.value; // + converts them to a number
    const duration = +inputDuration.value;
    if (typeof this.#mapEvent === 'undefined') return;
    const { lat, lng } = this.#mapEvent.latlng;

    // get two different variables by descructuring array
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers1');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      ) {
        return alert('Inputs have to be positive numbers2');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${
            workout.description
          } <button class="edit__button">Edit</button> <button class="delete__button">Delete</button></h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (workout.type === 'running') {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>`;
    }
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>`;
    }

    form.insertAdjacentHTML('afterend', html);
    // Listen for Edit or Delete
    document
      .querySelector('.edit__button')
      .addEventListener('click', this._editWorkout.bind(this));
    document
      .querySelector('.delete__button')
      .addEventListener('click', this._deleteWorkout.bind(this));
  }
  _moveToPopup(e) {
    if (!this.#map) return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    if (!workout) return;
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // Callback function when data is edited submited
  _submitEdit(e) {
    // Get passed value (workout ID)
    const workoutId = e.srcElement.myParam;

    // Find workout in list of workouts
    const findWorkout = this.#workouts.find(work => work.id === workoutId);

    // Get values
    const typeUpdate = inputType.value;
    const distanceUpdate = +inputDistance.value;
    const durationUpdate = +inputDuration.value;

    // Depending on the input
    if (typeUpdate === 'running') {
      // Delete elevation gain from the object
      delete findWorkout.elevationGain;
      delete findWorkout.speed;

      // Put cadence
      const cadenceUpdate = +inputCadence.value;
      findWorkout.cadence = cadenceUpdate;

      // Calculate pace again
      findWorkout.pace = distanceUpdate / durationUpdate;
    } else if (typeUpdate === 'cycling') {
      // Delete cadence from the object
      delete findWorkout.cadence;
      delete findWorkout.pace;

      // Put elevation gain
      const ElevationUpdate = +inputElevation.value;
      findWorkout.elevationGain = ElevationUpdate;

      // Calculate speed again
      findWorkout.speed = distanceUpdate / (durationUpdate / 60);
    }

    // Update rest of the values
    findWorkout.distance = distanceUpdate;
    findWorkout.duration = durationUpdate;
    findWorkout.type = typeUpdate;

    // Hide form and render updated workout
    this._hideForm();
    this._renderWorkout(findWorkout);

    // Remove edit class to allow creation of new workouts
    form.classList.remove('edit');

    // Update local storage
    this._setLocalStorage();
  }

  // Callback function for editing workout
  _editWorkout(e) {
    // Find target workout
    const getWorkoutId = e.target.closest('.workout').dataset.id;
    const getWorkout = this.#workouts.find(work => work.id === getWorkoutId);

    // Hide workout
    const workout = e.target
      .closest('.workout')
      .classList.add('form__row--hidden');

    // Show form
    form.classList.remove('hidden');
    form.classList.add('edit');

    // Display data from previous workout on form
    inputType.value = getWorkout.type;
    inputDistance.value = getWorkout.distance;
    inputDuration.value = getWorkout.duration;

    if (getWorkout.type === 'running') {
      inputCadence.value = getWorkout.cadence;
    } else {
      inputElevation.value = getWorkout.elevationGain;

      // Get child elements and if it's cycling remove cadence (7) and show elevGain(9)
      form.childNodes[7].classList.add('form__row--hidden');
      form.childNodes[9].classList.remove('form__row--hidden');
    }

    // Submit data
    // If new workout window is opened don't trigger edit function

    if (form.classList.contains('edit')) {
      form.addEventListener('submit', this._submitEdit.bind(this));
    }

    // Pass workout id to the function
    form.myParam = getWorkoutId;
  }

  // Delete workout
  _deleteWorkout(e) {
    if (!this.#map) return;
    const delWorkoutId = e.target.closest('.workout').dataset.id;

    // Find coordinates to pass to _loadMap function
    const getCoords = this.#workouts[0].coords;
    const positions = {
      coords: { latitude: getCoords[0], longitude: getCoords[1] },
    };

    // Find workout user wants to delete
    const delWorkout = this.#workouts.find(function (work, i, arr) {
      console.log(work.id, delWorkoutId);
      if (work.id === delWorkoutId) {
        // Remove workout from the array, hide workout from completed workouts
        arr.splice(i, 1);
        e.target.closest('.workout').classList.add('form__row--hidden');

        // Remove workout from the ocal storage
        localStorage.removeItem(i);
      }
    });

    // Reload the map and update local storage
    this.#map.remove();
    this._loadMap(positions);
    this._setLocalStorage();
  }

  // Local storage stuff
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
