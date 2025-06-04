// Wait for the DOM to fully load
document.addEventListener("DOMContentLoaded", function () {
  // Mobile menu toggle functionality
  const mobileMenuButton = document.querySelector('.mobile-menu-button');
  const mobileMenu = document.querySelector('.mobile-menu');

  mobileMenuButton.addEventListener('click', function () {
    mobileMenu.classList.toggle('hidden');
  });
});

// Footer current year
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Logo hover effect
const logo = document.getElementById('navLogo');
logo.addEventListener('mouseenter', () => {
  logo.src = 'images/MeraakerLogoGreen.png';
});
logo.addEventListener('mouseleave', () => {
  logo.src = 'images/MeraakerLogoBlack.png';
});