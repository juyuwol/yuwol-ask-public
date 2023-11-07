(function () {

var form = document.getElementById('message-form');
var submit = document.getElementById('message-submit');
var toggle = document.getElementById('toggle-image');

form.onsubmit = function () {
  submit.disabled = true;
};
window.addEventListener('pageshow', function () {
  submit.disabled = false;
});

if (!toggle) return;

var text = document.getElementById('message');
var image = document.createElement('img');
var width = document.querySelector('[property="og:image:width"]');
var height = document.querySelector('[property="og:image:height"]');
image.alt = text.textContent;
if (width) image.width = width.getAttribute('content');
if (height) image.height = height.getAttribute('content');

toggle.onchange = function () {
  if (document.contains(image)) {
    image.parentNode.replaceChild(text, image);
  } else if (document.contains(text)) {
    if (!image.src) {
      var link = document.createElement('a');
      var meta = document.querySelector('[property="og:image"]');
      link.href = meta.getAttribute('content');
      image.src = link.pathname;
    }
    text.parentNode.replaceChild(image, text);
  }
};

})();
