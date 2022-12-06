let rangeMin = 10;
const range = document.querySelector(".range-selected");
const rangeInput = document.querySelectorAll(".range-input input");
const rangeYear = document.querySelectorAll(".range-year input");

rangeInput.forEach((input) => {
  input.addEventListener("input", (e) => {
    let minRange = parseInt(rangeInput[0].value);
    let maxRange = parseInt(rangeInput[1].value);
    if (maxRange - minRange < rangeMin) {
      if (e.target.className === "min") {
        rangeInput[0].value = maxRange - rangeMin;
      } else {
        rangeInput[1].value = minRange + rangeMin;
      }
    } else {
      rangeYear[0].value = minRange;
      rangeYear[1].value = maxRange;
      range.style.left = 100 - ((rangeInput[0].max - minRange) / (rangeInput[1].max-rangeInput[0].min)) * 100 + "%";
      range.style.right = ((rangeInput[0].max - maxRange) / (rangeInput[1].max-rangeInput[0].min)) * 100 + "%";
    }
  });
});
