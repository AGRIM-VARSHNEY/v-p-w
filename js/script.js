(function () {
  "use strict";

  // Reveal-on-scroll for sections and chapter blocks.
  var revealTargets = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealTargets.length) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // Show the jump nav once the visitor has scrolled past the hero.
  var hero = document.getElementById("hero");
  var jumpnav = document.getElementById("jumpnav");
  if (hero && jumpnav && "IntersectionObserver" in window) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          jumpnav.classList.toggle("is-visible", !entry.isIntersecting);
        });
      },
      { threshold: 0, rootMargin: "-90% 0px 0px 0px" }
    );
    navObserver.observe(hero);
  }
})();
