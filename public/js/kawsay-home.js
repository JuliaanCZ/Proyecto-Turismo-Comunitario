const carousel = document.querySelector('[data-destination-carousel]');
if (carousel) {
  const slides = [...carousel.querySelectorAll('[data-slide]')];
  const count = carousel.querySelector('[data-slide-count]');
  const railLabel = carousel.querySelector('[data-rail-label]');
  const play = carousel.querySelector('[data-play]');
  let index = 0;
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer;
  const show = (next) => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, position) => { slide.hidden = position !== index; });
    carousel.querySelectorAll('.k-carousel-progress span').forEach((bar, position) => {
      bar.classList.toggle('k-active', position === index);
    });
    railLabel.textContent = 'Ecuador · ' + slides[index].dataset.regionLabel;
    count.textContent = [index + 1, slides.length].map((number) => String(number).padStart(2, '0')).join(' / ');
  };
  const schedule = () => {
    window.clearInterval(timer);
    play.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', playing ? 'Pausar carrusel' : 'Reanudar carrusel');
    if (playing) timer = window.setInterval(() => {
      if (!carousel.matches(':focus-within') && !document.hidden) show(index + 1);
    }, 8500);
  };
  carousel.querySelector('[data-prev]').addEventListener('click', () => { show(index - 1); schedule(); });
  carousel.querySelector('[data-next]').addEventListener('click', () => { show(index + 1); schedule(); });
  play.addEventListener('click', () => { playing = !playing; schedule(); });
  schedule();
}
