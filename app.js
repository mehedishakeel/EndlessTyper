const COMMON = `the of and to in a is that for it on with as was at by be this from are or have an not but they you which one we all were can her has there been if more when will would who so no out do about up what their than into them could only other new some time these two may then first any my now such like our over man me even most made after also did many before must through back years where much your way well down should because each just those people good how too little state world very still own see men work long get here between both life being under never day same another know while last might us great old year off come since against go came right used take three himself few house use during without again place around however home small found thought went say part once general high upon school every does got united left number course war until always away something fact water though public less put think almost hand enough far took head yet government system better set told nothing night end why called eyes find going look asked later point next program city business group give toward young let room days side social given present several order national possible rather second per among form important often food keep children feet land really today large sure having week perhaps country four case money line product family area big name service way study story power hour game member law car community company team idea practice`.split(' ');
const ADVANCED = `accuracy momentum control steady balance posture relaxed deliberate consistent improve technique progress keyboard sentence language challenge training focused efficient confident precise cadence pattern common develop comfort repeat correct smooth quick response attention endurance measured natural mistake recovery concentration`.split(' ');
const PRO = `synchronize extraordinary responsibility characteristic interpretation accessibility productivity communication infrastructure transformation approximately sophisticated psychological entrepreneurship interoperability counterintuitive comprehensive configuration determination experimentation`.split(' ');
const PUNCT = ['.', ',', '?', '!', ';', ':'];
const XP_PER_LEVEL = 100;
const XP_PER_WORD = 5;
const $ = (s) => document.querySelector(s);

function loadProgress(){
  try{const saved=JSON.parse(localStorage.getItem('endlesstyper-progress')||'{}');return{totalXp:Number.isFinite(saved.totalXp)?Math.max(0,saved.totalXp):0}}
  catch{return{totalXp:0}}
}

const progress=loadProgress();
const state={words:[],typed:'',start:null,paused:false,pauseStarted:null,pausedMs:0,punctuation:false,numbers:false,sound:false,maxStreak:0,caretRow:null,scoredWords:new Set(),sessionXp:0};

function trainingTier(level=gameLevel()){
  if(level<3)return'beginner';
  if(level<6)return'developing';
  if(level<10)return'advanced';
  return'pro';
}

function wordPool(){
  const tier=trainingTier();
  if(tier==='beginner')return COMMON.filter(word=>word.length<=5);
  if(tier==='developing')return COMMON.filter(word=>word.length<=7).concat(ADVANCED.filter(word=>word.length<=7));
  if(tier==='advanced')return COMMON.concat(ADVANCED);
  return COMMON.concat(ADVANCED,PRO);
}

function randomWord(i){
  const pool=wordPool();let word=pool[Math.floor(Math.random()*pool.length)];
  if(state.numbers&&Math.random()<.09)word=String(Math.floor(10+Math.random()*990));
  if(state.punctuation){if(i%10===0)word=word[0].toUpperCase()+word.slice(1);if(Math.random()<.18)word+=PUNCT[Math.floor(Math.random()*PUNCT.length)]}
  return word;
}

function makeWords(count){return Array.from({length:count},(_,i)=>randomWord(i))}
function targetText(){return state.words.join(' ')}
function currentWordIndex(){return state.typed.length?state.typed.split(' ').length-1:0}

function reset(focus=true,clearProgress=false){
  if(clearProgress){progress.totalXp=0;localStorage.removeItem('endlesstyper-progress');localStorage.removeItem('typespry-progress');localStorage.removeItem('endlesstype-progress')}
  state.words=makeWords(180);state.typed='';state.start=null;state.paused=false;state.pausedMs=0;state.pauseStarted=null;state.maxStreak=0;state.caretRow=null;state.scoredWords=new Set();state.sessionXp=0;
  $('#typingInput').value='';render();updateStats();renderProgress();
  if(focus)focusInput();else $('#typingShell').classList.add('blurred');
}

function render(){
  const typed=state.typed,activeWordIndex=currentWordIndex(),typedWords=typed.split(' ');let charIndex=0;
  $('#words').innerHTML=state.words.map((word,wi)=>{
    const letters=[...word].map(ch=>{const entered=typed[charIndex];let cls='letter';if(entered!==undefined)cls+=entered===ch?' correct':' incorrect';if(charIndex===typed.length&&wi===activeWordIndex)cls+=' current';charIndex++;return`<span class="${cls}">${escapeHtml(ch)}</span>`}).join('');
    const typedWord=typedWords[wi]||'';
    const extras=typedWord.length>word.length?[...typedWord.slice(word.length)].map(c=>`<span class="letter extra">${escapeHtml(c)}</span>`).join(''):'';
    const error=typedWord&&typedWord!==word&&wi<activeWordIndex;
    if(wi<state.words.length-1&&typed[charIndex]!==undefined)charIndex++;
    return`<span class="word ${wi===activeWordIndex?'current-word':''} ${error?'error':''}" data-index="${wi}">${letters}${extras}</span>`;
  }).join(' ');
  requestAnimationFrame(positionWords);
}

function escapeHtml(value){const node=document.createElement('div');node.textContent=value;return node.innerHTML}

function positionWords(){
  const current=$('.current-word');if(!current)return;
  const shell=$('#typingShell'),words=$('#words');shell.scrollTop=0;
  const lineHeight=parseFloat(getComputedStyle(words).lineHeight),row=Math.round(current.offsetTop/lineHeight),shift=Math.max(0,(row-1)*lineHeight);
  const lineChanged=state.caretRow!==null&&row!==state.caretRow;state.caretRow=row;
  words.style.transform=`translateY(-${shift}px)`;$('.line-marker').style.top=`${Math.min(current.offsetTop-shift+10,shell.clientHeight-32)}px`;positionCaret(shift,lineChanged);
}

function positionCaret(shift=0,lineChanged=false){
  const caret=$('#typingCaret'),words=$('#words'),letter=$('.letter.current'),word=$('.current-word');if(!word)return;
  const finalLetter=word.querySelector('.letter:last-child'),wordEnd=finalLetter?finalLetter.offsetLeft+finalLetter.offsetWidth:word.offsetWidth;
  const x=words.offsetLeft+word.offsetLeft+(letter?letter.offsetLeft:wordEnd),y=words.offsetTop+word.offsetTop-shift+(word.offsetHeight-parseFloat(getComputedStyle(caret).height))/2;
  caret.classList.toggle('line-wrap',lineChanged);caret.style.left=`${x}px`;caret.style.top=`${y}px`;if(lineChanged)requestAnimationFrame(()=>caret.classList.remove('line-wrap'));
}

function stats(){
  const elapsed=state.start?Math.max(1/60,(Date.now()-state.start-state.pausedMs)/60000):0,target=targetText();let correct=0,incorrect=0;
  [...state.typed].forEach((char,i)=>char===target[i]?correct++:incorrect++);
  const raw=elapsed?state.typed.length/5/elapsed:0,wpm=elapsed?correct/5/elapsed:0,accuracy=state.typed.length?correct/state.typed.length*100:100;
  const completed=state.typed.trim()?state.typed.trim().split(/\s+/).length-(/\s$/.test(state.typed)?0:1):0;
  return{elapsed,wpm,raw,accuracy,correct,incorrect,completed};
}

function getStreak(){const index=currentWordIndex();let streak=0;for(let i=index-1;i>=0;i--){if((state.typed.split(' ')[i]||'')===state.words[i])streak++;else break}state.maxStreak=Math.max(state.maxStreak,streak);return streak}

function speedGoal(){return Math.min(100,20+(gameLevel()-1)*5)}
function coachMessage(data){
  const goal=speedGoal();
  if(!state.start)return`accuracy first · target ${goal} wpm`;
  if(data.accuracy<90)return'slow down · clean keys build speed';
  if(data.wpm>=goal&&data.accuracy>=95)return'goal met · keep this rhythm';
  if(data.accuracy>=98)return`great control · ease toward ${goal} wpm`;
  return`stay smooth · target ${goal} wpm`;
}

function updateStats(){
  const data=stats();$('#wpm').textContent=Math.round(data.wpm);$('#accuracy').textContent=Math.round(data.accuracy);$('#streak').textContent=getStreak();
  $('#sessionLabel').textContent=coachMessage(data);$('.session-state').classList.toggle('live',!!state.start&&!state.paused);
}

function gameLevel(){return Math.floor(progress.totalXp/XP_PER_LEVEL)+1}
function rankTitle(level){if(level<2)return'newcomer';if(level<4)return'key scout';if(level<7)return'rhythm runner';if(level<10)return'pace setter';if(level<15)return'speed crafter';return'typing ace'}
function renderProgress(){const level=gameLevel(),within=progress.totalXp%XP_PER_LEVEL;$('#levelNumber').textContent=level;$('#currentLevel').textContent=level;$('#rankTitle').textContent=rankTitle(level);$('#xpBar').style.width=`${within}%`;$('#xpText').textContent=`${within} / ${XP_PER_LEVEL} xp`;$('#sessionXp').textContent=`+${state.sessionXp}`}

let levelToastTimer;
function showLevelUp(level){const toast=$('#levelUpToast');clearTimeout(levelToastTimer);$('#levelUpNumber').textContent=level;$('#levelUpTitle').textContent=`Level ${level} unlocked`;toast.hidden=false;toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');levelToastTimer=setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>toast.hidden=true,250)},2600)}

function awardCompletedWord(index){
  if(index<0||state.scoredWords.has(index))return;
  const typedWord=state.typed.trimEnd().split(' ')[index]||'',targetWord=state.words[index];
  const comparedLength=Math.max(typedWord.length,targetWord.length);let matching=0;
  for(let i=0;i<Math.min(typedWord.length,targetWord.length);i++)if(typedWord[i]===targetWord[i])matching++;
  const wordAccuracy=comparedLength?matching/comparedLength:0;
  const earned=typedWord===targetWord?XP_PER_WORD:Math.max(1,Math.floor(XP_PER_WORD*wordAccuracy));
  state.scoredWords.add(index);const oldLevel=gameLevel();progress.totalXp+=earned;state.sessionXp+=earned;localStorage.setItem('endlesstyper-progress',JSON.stringify(progress));renderProgress();const newLevel=gameLevel();if(newLevel>oldLevel)showLevelUp(newLevel);
}

function handleInput(event){
  if(state.paused)return;
  let value=event.target.value.replace(/\n/g,' ').replace(/ {2,}/g,' ');if(event.target.value!==value)event.target.value=value;if(!state.start&&value.length)state.start=Date.now();state.typed=value;
  if(value.endsWith(' '))awardCompletedWord(currentWordIndex()-1);
  if(state.sound&&value.length)clickSound(value[value.length-1]===' ');
  if(currentWordIndex()>state.words.length-45)state.words.push(...makeWords(100));
  render();updateStats();
}

function focusInput(){$('#typingShell').classList.remove('blurred','paused');$('#typingInput').focus({preventScroll:true})}
function togglePause(){if(!state.start)return;state.paused=!state.paused;if(state.paused){state.pauseStarted=Date.now();$('#typingShell').classList.add('paused');$('#focusOverlay').textContent='paused · click or press escape to continue'}else{state.pausedMs+=Date.now()-state.pauseStarted;state.pauseStarted=null;$('#typingShell').classList.remove('paused');$('#focusOverlay').textContent='click here or press any key to focus';focusInput()}updateStats()}
function formatTime(seconds){seconds=Math.floor(seconds);const minutes=Math.floor(seconds/60);return minutes?`${minutes}:${String(seconds%60).padStart(2,'0')}`:`${seconds}s`}

let audioCtx;
function clickSound(space){audioCtx||=new(window.AudioContext||window.webkitAudioContext)();const oscillator=audioCtx.createOscillator(),gain=audioCtx.createGain();oscillator.frequency.value=space?165:220+Math.random()*25;gain.gain.setValueAtTime(.025,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.035);oscillator.connect(gain).connect(audioCtx.destination);oscillator.start();oscillator.stop(audioCtx.currentTime+.04)}

$('#punctuationToggle').addEventListener('change',event=>{state.punctuation=event.target.checked;reset()});
$('#numbersToggle').addEventListener('change',event=>{state.numbers=event.target.checked;reset()});
$('#typingInput').addEventListener('input',handleInput);
$('#typingInput').addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==$('#typingInput')&&!state.paused)$('#typingShell').classList.add('blurred')},100));
$('#focusOverlay').addEventListener('click',()=>state.paused?togglePause():focusInput());
$('#typingShell').addEventListener('click',focusInput);$('#restartButton').addEventListener('click',()=>reset(true,true));
$('#themeButton').addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem('endlesstyper-theme',document.body.classList.contains('light')?'light':'dark')});
$('#soundButton').addEventListener('click',event=>{state.sound=!state.sound;event.currentTarget.style.color=state.sound?'var(--accent)':''});
$('#helpButton').addEventListener('click',()=>$('#helpDialog').showModal());
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('#helpDialog').open){event.preventDefault();togglePause()}
  if(event.key==='Enter'&&event.target===document.body){event.preventDefault();focusInput()}
  if(event.key==='Tab'&&!$('#helpDialog').open){event.preventDefault();document.addEventListener('keydown',function once(next){if(next.key==='Enter'){next.preventDefault();reset(true,true)}document.removeEventListener('keydown',once)},{once:true})}
  if(!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)&&event.key.length===1)focusInput();
});

function registerWebMCP(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const tools=[
    {name:'start_typing_session',title:'Start EndlessTyper training',description:'Start or refresh an unlimited EndlessTyper training session.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(){reset(false);return{mode:'endless',trainingTier:trainingTier(),status:'ready'}}},
    {name:'read_typing_stats',title:'Read typing stats',description:'Read live performance and game progression.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){const data=stats();return{wpm:Math.round(data.wpm),accuracy:Math.round(data.accuracy),elapsedSeconds:Math.round(data.elapsed*60),completedWords:data.completed,trainingTier:trainingTier(),level:gameLevel(),totalXp:progress.totalXp}}},
    {name:'reset_typing_session',title:'Reset EndlessTyper progress',description:'Clear all XP, return to level 1, and generate a fresh prompt.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(){reset(false,true);return{status:'ready',trainingTier:trainingTier(),level:gameLevel()}}}
  ];tools.forEach(tool=>{try{Promise.resolve(context.registerTool(tool)).catch(()=>{})}catch{}})
}

if(localStorage.getItem('endlesstyper-theme')==='light')document.body.classList.add('light');
reset(false);setInterval(()=>{if(state.start&&!state.paused)updateStats()},500);registerWebMCP();
