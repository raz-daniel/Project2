window.addEventListener('scroll', () => {
    const parallax = document.querySelector('.parallax');
    let scrollPosition = window.pageYOffset;
    
    parallax.style.transform = 'translateY(' + scrollPosition * .9 + 'px)';
})