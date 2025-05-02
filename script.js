document.addEventListener("DOMContentLoaded", function () {
    // Smooth scrolling effect for navigation links
    const links = document.querySelectorAll("nav ul li a");

    links.forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop,
                    behavior: "smooth"
                });
            }
        });
    });

    // Navigation menu toggle for mobile view
    const nav = document.querySelector("nav ul");
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "☰";
    toggleBtn.classList.add("menu-toggle");

    document.querySelector("header").prepend(toggleBtn);

    toggleBtn.addEventListener("click", function () {
        nav.classList.toggle("active");
    });
});
