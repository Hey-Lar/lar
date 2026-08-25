/* Rebuild Web/lar.html from the prototype + the native bridge patch.
   Called by net-worth/update.mjs (step 4.5) and runnable standalone. */
import { readFileSync, writeFileSync } from "node:fs";

/* Both live in this repo, so resolve them relative to this file — an absolute
   path here only ever worked on one machine. URLs pass straight to fs and stay
   correct on Windows, where .pathname would yield "/C:/...". */
const SRC = new URL("../../prototype/index.html", import.meta.url);
const OUT = new URL("./Web/lar.html", import.meta.url);

let s = readFileSync(SRC, "utf8");
const bridge = `
<script>
/* phone: the wake pill must survive the small-screen breakpoint */
var st=document.createElement("style");st.textContent="@media (max-width:620px){.cnav .actions{display:flex}}";document.head.appendChild(st);
/* state-aware controls for the model: idempotent, never blind toggles */
window.larScene=function(n){
  var b=document.querySelector('.scene[data-scene="'+n+'"]');
  if (b && b.getAttribute('aria-pressed')!=='true') b.click();
};
window.larToggle=function(k,on){
  var b=document.querySelector('.hstat[data-toggle="'+k+'"]');
  if (b && (b.getAttribute('aria-pressed')==='true')!==on) b.click();
};
/* native bridge: "Hey Lar" hands off to Swift, replies land in the glass sheet */
(function(){
  var wake=document.getElementById('wake');
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.lar) {
    wake.addEventListener('click', function(){
      window.webkit.messageHandlers.lar.postMessage('wake');
    }, true);
  }
  window.larReply=function(kind,title,body){
    document.getElementById('sh-k').textContent=kind;
    document.getElementById('sh-t').textContent=title;
    document.getElementById('sh-b').textContent=body;
    document.getElementById('sheet').classList.add('on');
  };
})();
</script>
</body>`;
if (!s.includes("</body>")) throw new Error("no </body> in prototype");
s = s.replace("</body>", bridge, 1);
writeFileSync(OUT, s);
console.log(`Web/lar.html rebuilt from prototype (${s.length} bytes)`);
