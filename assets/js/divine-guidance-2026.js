(() => {
  'use strict';
  const root = document.querySelector('[data-divine-guidance]');
  if (!root) return;
  const paths = {
    courage: {kicker:'வேல் · துணிவு',ta:'அச்சத்தை விட நம்பிக்கை பெரிது. இன்று ஒரு நேர்மையான சிறிய படியை எடு.',en:'Faith can be larger than fear. Take one honest, purposeful step today.',route:'slokas/om-saravana-bhava.html'},
    clarity: {kicker:'ஞானம் · தெளிவு',ta:'அவசரத்தை அமைதிப்படுத்து. உண்மை தெளிவாகும் வரை கவனத்துடன் இரு.',en:'Quiet the rush. Stay attentive until what is true becomes clear.',route:'learning-paths.html'},
    peace: {kicker:'மயில் · அமைதி',ta:'மூச்சை மெதுவாக்கு. மனத்தின் பாரத்தை இக்கணத்தில் சிறிது இறக்கி வை.',en:'Slow your breath. Set down a little of the mind’s weight in this moment.',route:'devotional-practice-planner.html'},
    devotion: {kicker:'அருள் · பக்தி',ta:'ஒரு பெயரை அன்புடன் நினை. ஒரு பாடலை முழு கவனத்துடன் வாசி.',en:'Remember one sacred name with love. Read one hymn with your full attention.',route:'murugan-song-library.html'}
  };
  const card=root.querySelector('.guidance-card'),kicker=root.querySelector('[data-guidance-kicker]'),tamil=root.querySelector('[data-guidance-ta]'),english=root.querySelector('[data-guidance-en]'),route=root.querySelector('[data-guidance-route]'),listen=root.querySelector('[data-guidance-listen]');
  let active='courage';
  const label=value=>{if(!listen)return;listen.innerHTML=`<span aria-hidden="true">◖))</span> ${value}`};
  const stopSpeech=()=>{if('speechSynthesis'in window)window.speechSynthesis.cancel();listen?.setAttribute('aria-pressed','false');label('Listen in Tamil')};
  const select=key=>{const path=paths[key];if(!path)return;stopSpeech();active=key;kicker.textContent=path.kicker;tamil.textContent=path.ta;english.textContent=path.en;route.href=path.route;root.querySelectorAll('[data-guidance-intent]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.guidanceIntent===key?'true':'false'));card.classList.remove('is-changing');requestAnimationFrame(()=>card.classList.add('is-changing'))};
  root.addEventListener('click',event=>{const choice=event.target.closest('[data-guidance-intent]');if(choice)select(choice.dataset.guidanceIntent)});
  listen?.addEventListener('click',()=>{if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){label('Read-aloud is unavailable');return}if(listen.getAttribute('aria-pressed')==='true'){stopSpeech();return}stopSpeech();const utterance=new SpeechSynthesisUtterance(paths[active].ta);utterance.lang='ta-IN';utterance.rate=.82;utterance.onend=stopSpeech;utterance.onerror=stopSpeech;listen.setAttribute('aria-pressed','true');label('Stop');window.speechSynthesis.speak(utterance)});
  addEventListener('pagehide',stopSpeech,{once:true});
})();
