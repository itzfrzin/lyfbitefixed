const fs = require('fs');
const files = ['personalization.html', 'tracker.html', 'plus.html', 'delivery.html', 'rewards.html', 'billing.html', 'settings.html'];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace(/<a href=\"#\">Privacy Policy<\/a>/g, '<a href=\"privacy.html\">Privacy Policy</a>');
    html = html.replace(/<a href=\"#\">Terms of Service<\/a>/g, '<a href=\"terms.html\">Terms of Service</a>');
    html = html.replace(/<a href=\"#\">Contact Us<\/a>/g, '<a href=\"contact.html\">Contact Us</a>');
    fs.writeFileSync(file, html);
    console.log('Updated ' + file);
  }
});
