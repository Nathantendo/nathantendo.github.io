'use strict';

const switcher = document.querySelector('.app');

switcher.addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');

    const className = document.body.className;
    if(className == "dark-theme") {
        this.textContent = "Dark Theme";
    } else {
        this.textContent = "Light Theme";
    }
});