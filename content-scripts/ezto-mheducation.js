if (!(window.top === window && location.pathname.startsWith('/ext/map/'))) StudyConfig.boot('mcgraw', (chrome) => {

let legacySettings={...StudyConfig.defaults.mcgraw},legacyEpoch=0;
const legacyReady=chrome.storage.sync.get(null).then(v=>Object.assign(legacySettings,v));
const legacyPacer=StudyPacing.create(()=>legacySettings,()=>{isAutomating=false;updateUnifiedStopped();},'mcgraw');
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='sync')for(const key of Object.keys(legacySettings))if(changes[key])legacySettings[key]=changes[key].newValue;});
async function askUnified(question) {
  const mine=++legacyEpoch;
  unifiedRequestId=crypto.randomUUID();unifiedSignature=JSON.stringify(question);
  const id=unifiedRequestId;
  try{
    await legacyReady;
    const current=()=>isAutomating&&mine===legacyEpoch&&unifiedRequestId===id&&JSON.stringify(parseQuestion())===unifiedSignature;
    if(!current())return;
    const root=document.querySelector('.question');let imageToken;
    if(root&&StudyMedia.graphics(root).length){
      if(!legacySettings.includePictures)throw Error('Picture detected. Enable Include Pictures or enter this question manually.');
      imageToken=await StudyMedia.capture(chrome,root,id,current);
    }
    if(!current())return;
    const result=await chrome.runtime.sendMessage({type:'sendQuestionToChatGPT',id,question,imageToken});
    if(!result?.received)throw Error(result?.error||'Could not connect to the AI tab.');
  }catch(error){if(mine===legacyEpoch){isAutomating=false;updateUnifiedStopped();globalThis.StudyMonitor?.notice(error.message);}}
}
function updateUnifiedStopped(){
  legacyEpoch++;legacyPacer.cancel();
  unifiedRequestId=null;
  chrome.runtime.sendMessage({type:'mcgrawCancel'}).catch(()=>{});
  globalThis.StudyMonitor?.report();
}
let messageListener = null;
let isAutomating = false;
let unifiedRequestId = null, unifiedSignature = null;
let lastIncorrectQuestion = null;
let lastCorrectAnswer = null;
let controlsRegistered = false;

function setupMessageListener() {
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
  }

  messageListener = (message, sender, sendResponse) => {
    if(message.type==='studyPlatform'){sendResponse({platform:'mcgraw'});return;}
    if(message.type==='studyStop'||message.type==='stopAutomation'){
      isAutomating=false;updateUnifiedStopped();
      if(typeof clearMatchingPauseWatcher==='function')clearMatchingPauseWatcher();
      sendResponse({received:true});return;
    }

    if (message.type === "processChatGPTResponse") {
      if(!isAutomating || message.id!==unifiedRequestId || JSON.stringify(parseQuestion())!==unifiedSignature){
        isAutomating=false;updateUnifiedStopped();sendResponse({received:false});return;
      }
      unifiedRequestId=null;

      processChatGPTResponse(message.response);
      sendResponse({ received: true });
      return true;
    }

    if (message.type === "alertMessage") {
      alert(message.message);
      sendResponse({ received: true });
      return true;
    }
  };

  chrome.runtime.onMessage.addListener(messageListener);
}

function isQuizPage() {
  return (
    document.querySelector(".question") &&
    (document.querySelector(".answers-wrap.multiple-choice") ||
      document.querySelector(".answers-wrap.boolean") ||
      document.querySelector(".answers-wrap.input-response"))
  );
}

function ensureAssistant() {
  if (controlsRegistered) return;

  const helpLink = document.querySelector(".header__help");
  if (helpLink && isQuizPage()) {
    mountAssistant();
    controlsRegistered = true;
  }
}

function startPageObserver() {
  const observer = new MutationObserver(() => {
    if (!controlsRegistered) {
      ensureAssistant();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  ensureAssistant();
}

function checkForQuizEnd() {
  const progressInfo = document.querySelector(".footer__progress__heading");

  if (progressInfo) {
    const progressText = progressInfo.textContent;
    const match = progressText.match(/(\d+)\s+of\s+(\d+)/);
    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);
      if (current > total) {
        return true;
      }
    }
  }

  return false;
}

function stopAutomation(reason = "Quiz completed") {
  legacyEpoch++;legacyPacer.cancel();
  isAutomating = false;
  chrome.runtime.sendMessage({type:'mcgrawCancel'}).catch(()=>{});

  globalThis.StudyMonitor?.notice(`Automation stopped: ${reason}`);

}

function checkForNextStep() {
  if (!isAutomating) return;

  const questionData = parseQuestion();
  if (questionData) {
    askUnified(questionData);
  } else {
    stopAutomation("No question found or question type not supported");
  }
}

function parseQuestion() {
  const questionElement = document.querySelector(".question");
  if (!questionElement) {
    return null;
  }

  let questionType = "";
  let options = [];

  if (document.querySelector(".answers-wrap.multiple-choice")) {
    questionType = "multiple_choice";
    const optionElements = document.querySelectorAll(
      ".answers--mc .answer__label--mc"
    );
    options = Array.from(optionElements).map((el) => {
      const textContent = el.textContent.trim();
      return textContent.replace(/^[a-z]\s+/, "");
    });
  } else if (document.querySelector(".answers-wrap.boolean")) {
    questionType = "true_false";
    options = ["True", "False"];
  } else if (document.querySelector(".answers-wrap.input-response")) {
    questionType = "fill_in_the_blank";
    options = [];
  } else {
    return null;
  }

  let questionText = "";
  if (questionType === "fill_in_the_blank") {
    const questionClone = questionElement.cloneNode(true);

    const blankSpans = questionClone.querySelectorAll(
      'span[aria-hidden="true"]'
    );
    blankSpans.forEach((span) => {
      if (span.textContent.includes("_")) {
        span.textContent = "[BLANK]";
      }
    });

    const hiddenSpans = questionClone.querySelectorAll(
      'span[style*="position: absolute"]'
    );
    hiddenSpans.forEach((span) => span.remove());

    questionText = questionClone.textContent.trim();
  } else {
    questionText = questionElement.textContent.trim();
  }

  return {
    type: questionType,
    question: questionText,
    options: options,
    previousCorrection: lastIncorrectQuestion
      ? {
          question: lastIncorrectQuestion,
          correctAnswer: lastCorrectAnswer,
        }
      : null,
  };
}

async function processChatGPTResponse(responseText) {
  const mine=legacyEpoch,signature=JSON.stringify(parseQuestion());
  const current=()=>isAutomating&&mine===legacyEpoch&&JSON.stringify(parseQuestion())===signature;
  try {
    const response=StudySecurity.parse(responseText),answer=response.answer;
    if(legacySettings.pacingMode==='review'){
      stopAutomation('Guided answer ready. Enter it yourself.');
      globalThis.StudyMonitor?.showPreview('Answer: '+JSON.stringify(answer)+'\n\n'+String(response.explanation||''));
      globalThis.StudyMonitor?.notice('Guided answer ready. Nothing was entered or submitted.');
      return;
    }
    legacyPacer.begin(response.studyTiming||response.suggestedReviewSeconds,1,{text:parseQuestion().question});
    await legacyPacer.beforeField(0,1,current);legacyPacer.check(current);
    if(document.querySelector('.answers-wrap.multiple-choice'))handleMultipleChoiceAnswer(answer);
    else if(document.querySelector('.answers-wrap.boolean'))handleTrueFalseAnswer(answer);
    else if(document.querySelector('.answers-wrap.input-response'))await handleFillInTheBlankAnswer(answer,current);
    legacyPacer.check(current);
    if(legacySettings.pauseBeforeSubmit)await legacyPacer.wait(0,'Filled · review then Continue now',current,{manual:true});
    await legacyPacer.afterQuestion(current);legacyPacer.check(current);
    const nextButton=document.querySelector('.footer__link--next:not([hidden])');
    if(!nextButton||nextButton.disabled||nextButton.classList.contains('is-disabled')){stopAutomation('No next question. Submit the assignment manually.');return;}
    nextButton.click();
    setTimeout(()=>{if(isAutomating&&mine===legacyEpoch){if(checkForQuizEnd())stopAutomation('Quiz completed');else checkForNextStep();}},1500);
  }catch(error){if(mine===legacyEpoch)stopAutomation(error.message);}
}

function handleMultipleChoiceAnswer(answer) {
  const radioButtons = document.querySelectorAll(
    '.answers--mc input[type="radio"]'
  );
  const labels = document.querySelectorAll(".answers--mc .answer__label--mc");

  for (let i = 0; i < labels.length; i++) {
    const labelText = labels[i].textContent.trim().replace(/^[a-z]\s+/, "");

    if (
      labelText === answer ||
      labelText.replace(/\.$/, "") === answer.replace(/\.$/, "") ||
      labelText.includes(answer) ||
      answer.includes(labelText)
    ) {
      radioButtons[i].click();
      break;
    }
  }
}

function handleTrueFalseAnswer(answer) {
  const buttons = document.querySelectorAll(".answer--boolean");

  for (const button of buttons) {
    const buttonSpan = button.querySelector(".answer__button--boolean");
    if (!buttonSpan) {
      continue;
    }
    
    const fullText = buttonSpan.textContent;
    
    const buttonText = fullText.trim().split(",")[0].trim();

    if (
      (buttonText === "True" && (answer === "True" || answer === true)) ||
      (buttonText === "False" && (answer === "False" || answer === false))
    ) {
      button.click();
      return;
    }
  }
  
  console.error("No matching button found for answer:", answer);
}

async function handleFillInTheBlankAnswer(answer,current=()=>isAutomating) {
  const inputField = document.querySelector(".answer--input__input");

  if (inputField) {
    let answerText = "";

    if (Array.isArray(answer)) {
      answerText = answer[0];
    } else {
      answerText = answer;
    }

    await legacyPacer.setText(inputField,String(answerText),current);

  } else {
    console.error("Could not find input field for fill in the blank");
  }
}

function mountAssistant() {
    legacyPacer.attach(document.body);
    const start=()=>{if(isAutomating)return;isAutomating=true;globalThis.StudyMonitor?.clearNotice(); checkForNextStep();};
    const stop=()=>{isAutomating=false;updateUnifiedStopped(); globalThis.StudyMonitor?.notice('Auto stopped.');};
    globalThis.StudyMonitor?.register({platform:'mcgraw',read:()=>({status:isAutomating?'Waiting for the chatbot or the next question…':'Ready. Choose Start Auto or Ask AI.',controls:{start:!isAutomating,ask:!isAutomating,stop:isAutomating}}),actions:{start,ask:start,stop}});
}

setupMessageListener();
startPageObserver();

if (isAutomating) {
  setTimeout(() => {
    checkForNextStep();
  }, 1000);
}

});
