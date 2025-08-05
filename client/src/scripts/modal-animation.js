// Modal Animation Functions
export const showModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
  }
};

export const hideModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }, 300);
  }
};

// Fade in animation
export const fadeIn = (element, duration = 300) => {
  element.style.opacity = '0';
  element.style.display = 'block';
  
  let start = null;
  const animate = (timestamp) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const opacity = Math.min(progress / duration, 1);
    
    element.style.opacity = opacity;
    
    if (progress < duration) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};

// Fade out animation
export const fadeOut = (element, duration = 300) => {
  let start = null;
  const animate = (timestamp) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const opacity = Math.max(1 - progress / duration, 0);
    
    element.style.opacity = opacity;
    
    if (progress < duration) {
      requestAnimationFrame(animate);
    } else {
      element.style.display = 'none';
    }
  };
  
  requestAnimationFrame(animate);
};

// Slide in animation
export const slideIn = (element, direction = 'left', duration = 300) => {
  const startPosition = direction === 'left' ? '-100%' : '100%';
  element.style.transform = `translateX(${startPosition})`;
  element.style.display = 'block';
  
  setTimeout(() => {
    element.style.transition = `transform ${duration}ms ease-out`;
    element.style.transform = 'translateX(0)';
  }, 10);
};

// Slide out animation
export const slideOut = (element, direction = 'left', duration = 300) => {
  const endPosition = direction === 'left' ? '-100%' : '100%';
  element.style.transition = `transform ${duration}ms ease-in`;
  element.style.transform = `translateX(${endPosition})`;
  
  setTimeout(() => {
    element.style.display = 'none';
  }, duration);
}; 