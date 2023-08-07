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
const delAllWork = document.querySelector('.delete__all--workouts');
const error = document.querySelector('.error__message');

const sort = document.querySelectorAll('.sort');

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
let workout;
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
    delAllWork.addEventListener('click', this._delAllWorkouts.bind(this));

    sort.forEach(option => {
      option.addEventListener('click', this._sort.bind(this));
    });
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
  _checkInput(type, distance, duration, thridValue) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    const showError = function () {
      error.classList.remove('form__row--hidden');
      error.innerHTML = 'Error! check your inputs again.';
      return false;
    };
    type === 'running'
      ? (thridValue = +inputCadence.value)
      : (thridValue = +inputElevation.value);

    if (
      !validInputs(distance, duration, thridValue) ||
      !allPositive(distance, duration, thridValue)
    ) {
      return showError();
    }
    return true;
  }
  _newWorkout(e) {
    if (form.classList.contains('edit')) return;
    e.preventDefault();

    // get data from the input
    const type = inputType.value;
    const distance = +inputDistance.value; // + converts them to a number
    const duration = +inputDuration.value;
    if (typeof this.#mapEvent === 'undefined') return;
    const { lat, lng } = this.#mapEvent.latlng;

    // get two different variables by descructuring array

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!this._checkInput(type, distance, duration, cadence)) return;
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!this._checkInput(type, distance, duration, elevation)) return;
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    error.classList.add('form__row--hidden');
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
          <h2 class="workout__title">${workout.description}</h2>
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
      </div>
      
        <button class="edit__button new--button">✍️ Edit</button>
        <button class="delete__button new--button">🗑️ Delete</button>
      
    `;
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
    </div>
    
    
      <button class="edit__button new--button">✍️ Edit</button>
      <button class="delete__button new--button">🗑️ Delete</button>
    
    `;
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
    e.preventDefault();

    const workoutId = e.srcElement.myParam;

    const findWorkout = this.#workouts.find(work => work.id === workoutId);

    const typeUpdate = inputType.value;
    const distanceUpdate = +inputDistance.value;
    const durationUpdate = +inputDuration.value;

    // Depending on the input
    if (typeUpdate === 'running') {
      // Delete elevation gain from the object
      const cadenceUpdate = +inputCadence.value;
      if (
        !this._checkInput(
          typeUpdate,
          distanceUpdate,
          durationUpdate,
          cadenceUpdate
        )
      )
        return;
      delete findWorkout.elevationGain;
      delete findWorkout.speed;

      findWorkout.cadence = cadenceUpdate;

      findWorkout.pace = distanceUpdate / durationUpdate;
    } else if (typeUpdate === 'cycling') {
      const ElevationUpdate = +inputElevation.value;
      if (
        !this._checkInput(
          typeUpdate,
          distanceUpdate,
          durationUpdate,
          ElevationUpdate
        )
      )
        return;
      delete findWorkout.cadence;
      delete findWorkout.pace;
      findWorkout.elevationGain = ElevationUpdate;
      findWorkout.speed = distanceUpdate / (durationUpdate / 60);
    }

    findWorkout.distance = distanceUpdate;
    findWorkout.duration = durationUpdate;
    findWorkout.type = typeUpdate;

    this._hideForm();
    this._renderWorkout(findWorkout);

    form.classList.remove('edit');
    error.classList.add('form__row--hidden');

    this._setLocalStorage();
  }

  // Callback function for editing workout
  _editWorkout(e) {
    // Find target workout
    const getWorkoutId = e.target.closest('.workout').dataset.id;
    const getWorkout = this.#workouts.find(work => work.id === getWorkoutId);
    error.classList.add('form__row--hidden');
    e.target.closest('.workout').classList.add('form__row--hidden');

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

    // If new workout window is opened don't trigger edit function
    // once: true is used to remove event listener after it runs
    if (form.classList.contains('edit')) {
      form.addEventListener('submit', this._submitEdit.bind(this));
    }

    // Pass workout id to the function
    form.myParam = getWorkoutId;
  }
  _udpateMap(getPosition) {
    this.#map.remove();
    this._loadMap(getPosition);
    this._setLocalStorage();
  }
  _getCoords() {
    const getCoords = this.#workouts[0].coords;
    const positions = {
      coords: { latitude: getCoords[0], longitude: getCoords[1] },
    };
    return positions;
  }
  _removeAllWorkouts() {
    const allWorkouts = document.querySelectorAll('.workout');
    allWorkouts.forEach(workoutHide =>
      workoutHide.closest('.workout').classList.add('form__row--hidden')
    );
  }
  // Delete one workout
  _deleteWorkout(e) {
    if (!this.#map) return;
    const delWorkoutId = e.target.closest('.workout').dataset.id;
    const positions = this._getCoords();

    // Find and delete workout
    const delWorkout = this.#workouts.find(function (work, i, arr) {
      if (work.id === delWorkoutId) {
        arr.splice(i, 1);
        e.target.closest('.workout').classList.add('form__row--hidden');
        localStorage.removeItem(i);
      }
    });

    // Reload the map and update local storage
    this._udpateMap(positions);
  }

  // Delete all workouts
  _delAllWorkouts() {
    error.classList.add('form__row--hidden');
    if (this.#workouts.length === 0) return;

    const positions = this._getCoords();

    this.#workouts = [];

    // Reload map, remove all workouts and reset local storage
    this._removeAllWorkouts();
    this._udpateMap(positions);
  }

  _sort(e) {
    error.classList.add('form__row--hidden');
    const dataType = e.srcElement.dataset.type;

    // Sort for type by string value
    if (dataType === 'type') {
      this.#workouts.sort((a, b) =>
        a.type > b.type ? 1 : b.type > a.type ? -1 : 0
      );
    }

    // Sort by duration or distance
    this.#workouts.sort((a, b) => {
      a = eval(`a.${dataType}`);
      b = eval(`b.${dataType}`);

      return a - b;
    });

    // Hide all workouts
    this._removeAllWorkouts();

    // Show ordered workouts
    this.#workouts.forEach(showWorkout => {
      this._renderWorkout(showWorkout);
    });
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
