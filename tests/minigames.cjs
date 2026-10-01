const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
new vm.Script([...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'));
const source=html.slice(html.indexOf('// Shared rules for the five-game release.'),html.indexOf('const PLACEHOLDER_MINIGAME='));
const rules={};vm.createContext(rules);vm.runInContext(source,rules);
const bets=rules.rouletteBets();
for(const b of bets){assert.equal(new Set(b.numbers).size,b.numbers.length);assert(b.numbers.every(n=>n>=0&&n<=36));assert.equal(b.numbers.length*b.multiplier,36);}
assert.equal(rules.roulettePayout([bets[7]],7).cents,360);
assert.equal(rules.roulettePayout([bets[7],bets[7],bets[7]],7).sips,11);
assert.equal(rules.roulettePayout([bets[37],bets[37],bets[37]],1).sips,1);
assert.equal(rules.roulettePayout(bets.slice(37,49),0).cents,0);
assert.equal(rules.roulettePayout([{numbers:[1],multiplier:12},{numbers:[1],multiplier:12}],1).sips,2);
assert.equal(rules.roulettePayout([{numbers:[1],multiplier:9},{numbers:[1],multiplier:9},{numbers:[1],multiplier:9}],1).sips,3);
const cards=(...ranks)=>ranks.map(rank=>({rank,suit:'♠'}));const hand=(ranks,extra={})=>({cards:cards(...ranks),split:false,doubled:false,...extra});
assert.equal(rules.blackjackValue(cards(1,1,9)),21);assert.equal(rules.blackjackValue(cards(1,6,10)),17);
assert.equal(rules.blackjackReward(hand([1,10]),cards(10,9)),3);
assert.equal(rules.blackjackReward(hand([1,10]),cards(1,10)),0);
assert.equal(rules.blackjackReward(hand([10,5,6]),cards(1,10)),0);
assert.equal(rules.blackjackReward(hand([1,10],{split:true}),cards(10,9)),2);
assert.equal(rules.blackjackReward(hand([10,5,5],{doubled:true}),cards(10,9)),4);
assert.equal(rules.blackjackReward(hand([10,10]),cards(10,10)),0);
assert.equal(rules.blackjackReward(hand([10,10,5]),cards(10,10,5)),0);
assert.equal(rules.blackjackReward(hand([10,8]),cards(10,10,5)),2);
for(let n=2;n<=100;n++){const c=rules.mineConfig(n);assert.equal(c.mines,20);assert.equal(c.side,10);assert(c.mines<c.side*c.side);}
assert.equal(rules.mineNeighbours(0,4,new Set([1,4,5,15])),3);
assert.equal(rules.mineNeighbours(3,4,new Set([4])),0);
assert.equal(rules.stackOverlap(14,72,90,72).width,0);assert.equal(rules.stackOverlap(14,72,20,72).width,66);
// Event-level tests: actual game functions, deterministic randomness and virtual UI/timers.
function run(name,players=['A','B'],options={}){
 let pending=[],summary='',cleanup,raf,now=0;const nodes=new Map();
 function element(){return {innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},dataset:{},remove(){},appendChild(){},querySelector(sel){const m=this.innerHTML.match(new RegExp('id="'+sel.slice(1)+'"'));if(!m&&!sel.startsWith('.'))return null;const key=this.innerHTML+'::'+sel;if(!nodes.has(key))nodes.set(key,element());return nodes.get(key);},querySelectorAll(sel){const attr=sel.slice(1,-1),key=attr.replace(/^data-/, '').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return [...this.innerHTML.matchAll(new RegExp(attr+'="([^"]+)"','g'))].map(m=>{const k=this.innerHTML+'::'+attr+'='+m[1];if(!nodes.has(k)){const e=element();e.dataset[key]=m[1];nodes.set(k,e);}return nodes.get(k);});}}}
 const ui={stage:element(),controls:element(),banner:element()};let shuffleCalls=0;
 const ctx={Math,document:{createElement:element},escapeHtml:s=>String(s),randomInt:(min,max)=>options.randomSequence?options.randomSequence.shift():options.random??min,shuffle:a=>options.shuffle?options.shuffle(a,++shuffleCalls):[...a],setTimeout:f=>(pending.push(f),pending.length),clearTimeout:()=>pending=[],requestAnimationFrame:f=>(raf=f,1),cancelAnimationFrame:()=>raf=null,setMiniControls:(u,s)=>u.controls.innerHTML=s,setMiniResult:(u,s)=>u.result=s,clearMiniResult:u=>u.result='',miniGameEngine:{mount:()=>ui,setCleanup:f=>cleanup=f,finish:s=>summary=s}};
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx[name]({mini:{title:name},order:players.map(name=>({name}))});
 return {ui,ctx,click(id){const el=ui.controls.querySelector('#'+id);assert(el&&el.onclick,'missing '+id);el.onclick();},pick(attr,value){const el=ui.stage.querySelectorAll('['+attr+']').find(e=>Object.values(e.dataset).includes(String(value)))||ui.controls.querySelectorAll('['+attr+']').find(e=>Object.values(e.dataset).includes(String(value)));assert(el&&el.onclick,'missing '+attr+' '+value+' in '+ui.stage.innerHTML);el.onclick();},flush(){const a=pending;pending=[];a.forEach(f=>f());},tick(ms){now+=ms;if(raf)raf(now);},close(){cleanup();},get summary(){return summary;}};
}
let t=run('startRoulette',['A','B'],{random:7});for(let p=0;p<2;p++){for(let i=0;i<3;i++)t.pick('data-bet',7);t.click('roulette-confirm');}t.click('roulette-spin');t.flush();assert.match(t.ui.result,/11 slokken/);t.click('batch-finish');assert.match(t.summary,/Nummer 7/);
t=run('startPenalties');t.pick('data-shot',0);t.flush();assert.match(t.ui.result,/redt/);t.click('penalty-next');t.pick('data-shot',2);t.flush();assert.match(t.ui.result,/Doelpunt/);t.click('batch-finish');assert.match(t.summary,/A: gered.*B: doelpunt/);
const floodOpened=new Set(),floodFlags=new Set([8]);rules.mineFlood(0,3,new Set([2]),floodOpened,floodFlags);assert(!floodOpened.has(2));assert(!floodOpened.has(8));assert(floodOpened.has(0));assert(floodOpened.has(3));
t=run('startMines',['A','B','C'],{shuffle:a=>[...a].sort((a,b)=>(a*37%101)-(b*37%101))});
const initialBanner=t.ui.banner.textContent;
let closed=[...t.ui.stage.innerHTML.matchAll(/data-cell="(\d+)" aria-label="Vak \d+"/g)].map(m=>Number(m[1]));assert(closed.length>20);assert(closed.length<100);
t.pick('data-mode','flag');t.pick('data-cell',closed[0]);assert.match(t.ui.stage.innerHTML,/ vlag"/);assert.match(t.ui.banner.textContent,/A/);
t.pick('data-mode','open');const prior=t.ui.stage.innerHTML;t.pick('data-cell',closed[0]);assert.equal(t.ui.stage.innerHTML,prior);
t.pick('data-mode','flag');t.pick('data-cell',closed[0]);t.pick('data-mode','open');t.pick('data-cell',closed[0]);t.click('mine-next');assert.match(t.ui.banner.textContent,/B/);
// A known card sequence exercises splitting, doubling and shared dealer revelation.
const seq=[10,7,8,8,10,9,3,2,10,10].map(rank=>({rank,suit:'♠'}));
t=run('startBlackjack',['A','B'],{shuffle:()=>[...seq].reverse()});assert.match(t.ui.stage.innerHTML,/Verborgen kaart/);t.click('bj-split');t.click('bj-double');t.click('bj-next');t.click('bj-hit');t.click('bj-stand');t.click('bj-ready');t.click('bj-stand');t.click('bj-reveal');assert.match(t.ui.result,/A: 6 slokken/);assert.match(t.ui.result,/B: 2 slokken/);t.click('batch-finish');assert.match(t.summary,/A: 6/);
t=run('startStack');t.click('stack-start');t.tick(0);t.tick(50);t.click('stack-drop');assert.match(t.ui.result,/Raak/);t.click('stack-next');assert.match(t.ui.banner.textContent,/B/);t.close();
// A cancelled pending animation must never complete or issue a result.
t=run('startPenalties');t.pick('data-shot',0);t.close();t.flush();assert.equal(t.ui.result,'');
console.log('PASS: application syntax; roulette bets/payout/rounding; blackjack aces, naturals, ties, busts, split/double/shared dealer; mine scaling/neighbours/elimination; stack overlap/turns; penalties hit/save; cancellation.');

for(const id of ['MG27','MG28','MG29','MG31','MG35'])assert.match(html,new RegExp(id+':\\{start:start'));
const ranks=dice=>rules.yahtzeeHand(dice).rank;
assert.equal(ranks([6,6,6,6,6]),7);assert.equal(ranks([6,6,6,6,2]),6);assert.equal(ranks([2,2,2,5,5]),5);
assert.equal(ranks([2,3,4,5,6]),4);assert.equal(ranks([1,2,3,4,5]),4);assert.equal(ranks([2,2,2,4,6]),3);
assert.equal(ranks([2,2,4,4,6]),2);assert.equal(ranks([3,3,4,5,6]),1);assert.equal(ranks([1,2,3,4,6]),0);
t=run('startLastSeat',['A','B']);t.click('seat-ready');t.pick('data-seat',1);t.click('seat-ready');t.pick('data-seat',1);assert.match(t.ui.result,/A, B vallen af/);assert.match(t.ui.controls.innerHTML,/Iedereen is af/);t.click('seat-finish');assert.match(t.summary,/geen winnaar/);
t=run('startCardDraw',['A','B','C'],{shuffle:a=>{const ranks=[9,12,13];return [...ranks,...a.filter(c=>!ranks.includes(c.rank)).map(c=>c.rank)].map((r,i)=>({rank:typeof r==='number'?r:2+i,suit:'♠'}));}});t.click('card-draw');t.click('card-next');t.click('card-draw');t.click('card-next');t.click('card-draw');t.click('card-resolve');assert.match(t.ui.result,/C heeft de hoogste/);assert.match(t.ui.result,/A heeft de laagste kaart en drinkt 1 slok/);t.click('batch-finish');assert.match(t.summary,/C delen/);assert.match(t.summary,/A drinken/);
t=run('startCardDraw',['A','B','C'],{shuffle:a=>{const order=[9,9,8,13,10],remaining=[...a];return order.map(rank=>{const i=remaining.findIndex(c=>c.rank===rank);return remaining.splice(i,1)[0];}).concat(remaining);}});t.click('card-draw');t.click('card-next');t.click('card-draw');t.click('card-next');t.click('card-draw');t.click('card-resolve');assert.match(t.ui.result,/Herkaart hoogste: A K♠ vs\. B 10♠/);assert.match(t.ui.result,/A heeft de hoogste kaart/);assert.match(t.ui.result,/C heeft de laagste kaart/);
t=run('startDiceStop',['A','B','C'],{randomSequence:[4,2,1,3]});t.click('dice-roll');t.click('dice-stop');t.click('dice-next');t.click('dice-roll');t.click('dice-roll');assert.match(t.ui.result,/beurtpunten kwijt/);t.click('dice-next');t.click('dice-roll');t.click('dice-stop');assert.match(t.ui.result,/A wint/);t.click('batch-finish');assert.match(t.summary,/A/);assert.match(t.summary,/B/);
t=run('startYahtzee',['A','B'],{randomSequence:[6,6,6,6,6,1,2,3,4,6]});t.click('yahtzee-roll');t.click('yahtzee-next');t.click('yahtzee-roll');t.click('yahtzee-resolve');assert.match(t.ui.result,/A wint/);assert.match(t.ui.result,/3 slokken/);t.click('batch-finish');assert.match(t.summary,/3 uit/);
console.log('PASS: simultaneous seat elimination; card draw and tie-break; push-your-luck turns; Yahtzee ranking and game flow; all five games registered.');
