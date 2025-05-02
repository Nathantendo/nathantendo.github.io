document.addEventListener("DOMContentLoaded", function () {
    const aboutText = document.getElementById("about-text");
    const toggleButton = document.getElementById("toggle-about");

    toggleButton.addEventListener("click", function () {
        if (aboutText.classList.contains("hidden")) {
            aboutText.classList.remove("hidden");
            toggleButton.textContent = "Show Less";
        } else {
            aboutText.classList.add("hidden");
            toggleButton.textContent = "Show More";
        }
    });
});
