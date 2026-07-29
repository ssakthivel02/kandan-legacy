(() => {
  'use strict';

  let activeUtterance = null;
  let activeStatus = null;
  let startupTimer = null;

  const clearStartupTimer = () => {
    if (startupTimer !== null) {
      window.clearTimeout(startupTimer);
      startupTimer = null;
    }
  };

  const getTamilVoice = () => {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    return voices.find(voice => /^ta(?:-|_)/i.test(voice.lang))
      || voices.find(voice => /Tamil/i.test(voice.name))
      || null;
  };

  const setStatus = (element, message) => {
    if (element) element.textContent = message;
  };

  const stop = () => {
    if (!('speechSynthesis' in window)) return;
    clearStartupTimer();
    window.speechSynthesis.cancel();
    activeUtterance = null;
    setStatus(activeStatus, 'Read-aloud stopped.');
  };

  const speakText = (text, statusElement) => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setStatus(statusElement, 'Tamil read-aloud is not supported by this browser.');
      return false;
    }

    const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleanText) {
      setStatus(statusElement, 'No verified Tamil text is available to read.');
      return false;
    }

    stop();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const tamilVoice = getTamilVoice();
    utterance.lang = tamilVoice?.lang || 'ta-IN';
    if (tamilVoice) utterance.voice = tamilVoice;
    utterance.rate = 0.88;
    utterance.pitch = 1;
    activeUtterance = utterance;
    activeStatus = statusElement;

    utterance.onstart = () => {
      clearStartupTimer();
      setStatus(
        statusElement,
        tamilVoice
          ? `Playing with ${tamilVoice.name}.`
          : 'Playing with the browser’s available voice; install a Tamil voice for better pronunciation.'
      );
    };
    utterance.onend = () => {
      clearStartupTimer();
      activeUtterance = null;
      setStatus(statusElement, 'Read-aloud completed.');
    };
    utterance.onerror = event => {
      clearStartupTimer();
      activeUtterance = null;
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        setStatus(statusElement, 'The browser could not play this text.');
      }
    };

    setStatus(statusElement, 'Starting Tamil read-aloud…');
    startupTimer = window.setTimeout(() => {
      if (activeUtterance !== utterance) return;
      window.speechSynthesis.cancel();
      activeUtterance = null;
      setStatus(
        statusElement,
        'Tamil read-aloud did not start. Check that a speech voice is enabled, then try again.'
      );
    }, 5000);
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      clearStartupTimer();
      activeUtterance = null;
      setStatus(
        statusElement,
        'Tamil read-aloud could not start in this browser.'
      );
      return false;
    }
    return true;
  };

  const bindContainer = container => {
    const selector = container.dataset.readAloudTarget;
    const target = selector ? document.querySelector(selector) : null;
    const status = container.querySelector('[data-speech-status]');
    const play = container.querySelector('[data-speech-action="play"]');
    const pause = container.querySelector('[data-speech-action="pause"]');
    const stopButton = container.querySelector('[data-speech-action="stop"]');

    play?.addEventListener('click', () => {
      if (window.speechSynthesis?.paused && activeUtterance) {
        window.speechSynthesis.resume();
        setStatus(status, 'Read-aloud resumed.');
        return;
      }
      speakText(target?.textContent || '', status);
    });

    pause?.addEventListener('click', () => {
      if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        setStatus(status, 'Read-aloud paused.');
      }
    });

    stopButton?.addEventListener('click', stop);
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-read-aloud-target]').forEach(bindContainer);
  });

  window.addEventListener('pagehide', stop);
  window.OSBSpeech = { speakText, stop, getTamilVoice };
})();
