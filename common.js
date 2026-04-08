document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  // Bind to all theme toggles in case there are multiple
  const toggleBtns = document.querySelectorAll('.theme-toggle');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    });
  });
  // ── Global Unit Conversion ─────────────────────────────────────────────
  const updateUnitLabels = () => {
    const units = localStorage.getItem('lyfbite_units') || 'metric';
    const isImperial = units === 'imperial';
    
    // Simple DOM-wide text replacement for labels that contain (kg) or (ml)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walker.nextNode()) {
      if (isImperial) {
        if (node.nodeValue.includes('(kg)')) node.nodeValue = node.nodeValue.replace('(kg)', '(lb)');
        if (node.nodeValue.includes('(ml)')) node.nodeValue = node.nodeValue.replace('(ml)', '(oz)');
        if (node.nodeValue.includes(' kg'))   node.nodeValue = node.nodeValue.replace(' kg', ' lb');
        // ml is trickier as it might be part of words, but usually trailing space or end of string
        if (node.nodeValue.endsWith(' ml')) node.nodeValue = node.nodeValue.replace(' ml', ' oz');
      } else {
        if (node.nodeValue.includes('(lb)')) node.nodeValue = node.nodeValue.replace('(lb)', '(kg)');
        if (node.nodeValue.includes('(oz)')) node.nodeValue = node.nodeValue.replace('(oz)', '(ml)');
        if (node.nodeValue.includes(' lb'))   node.nodeValue = node.nodeValue.replace(' lb', ' kg');
        if (node.nodeValue.endsWith(' oz')) node.nodeValue = node.nodeValue.replace(' oz', ' ml');
      }
    }
  };
  
  updateUnitLabels();

  // Also expose to window if pages need to re-run it
  window.updateLyfBiteUnits = updateUnitLabels;
});
