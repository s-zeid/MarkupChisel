(() => {
  const style = document.createElement("style");
  style.textContent = /* css */ `
    html, body {
      margin: 0; width: 100%; height: 100%; font-size: 16px;
      display: flex; gap: 0.0625rem; background: GrayText;
      @media (max-width: 799px) { flex-direction: column; }
      &.light { color-scheme: light; } &.dark { color-scheme: dark; }
    }
    iframe {
      background: Canvas; border: none; flex-grow: 1;
    }
  `;
  document.head.append(style);


  const content = document.createElement("main");
  content.innerHTML = /* html */ `
  <iframe data-src="./direct.html"></iframe>
  <iframe data-src="./element.html"></iframe>
  `.trim();
  document.body.prepend(...content.childNodes);


  for (const iframe of document.querySelectorAll("iframe")) {
    iframe.setAttribute("src", iframe.dataset.src);
  }
  window.setHashes = function(hash = location.hash) {
    for (const iframe of document.querySelectorAll("iframe")) {
      if (location.protocol != "file:") {
        iframe.contentWindow.location.hash = hash;
      } else {
        iframe.src = iframe.dataset.src + hash;
      }
    }
  }
  window.addEventListener("load", event => {
    if (location.protocol != "file:") {
      for (const iframe of document.querySelectorAll("iframe")) {
        iframe.contentWindow.addEventListener("hashchange", event => {
          if (iframe.contentWindow.location.hash != window.location.hash) {
            window.location.hash = iframe.contentWindow.location.hash;
          }
        });
      }
    }
    window.addEventListener("hashchange", event => window.setHashes());
    window.setHashes();
  });
})();
