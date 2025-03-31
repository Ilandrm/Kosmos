import{a as W}from"./GameFlowService-CUMmPH9U.js";import{d as j,G as V,r as s,m as b,b as A,e as E,_ as P,c as i,a as u,g as F,h as y,l as k,F as S,j as x,t as w,k as q,o as n}from"./index-PSnCfxiI.js";const Z=j({name:"SpaceHangmanGame",components:{GameInstruction:V},setup(){const e=["Astre","Comète","Soleil","Terre","Lune","Etoile"],l="abcdefghijklmnopqrstuvwxyz".split(""),o=s(""),p=s([]),m=s([]),r=s(0),d=6,t=s(!1),c=s(!1),v=s(!1),f=s("Devinez le mot lié à l'espace !"),g=s(40),C=s(!1),N=s(!1),M=s(!0),T=s({title:"Pendu Spatial",players:"1 joueurs",time:"30 secondes",instruction:"Devinez le mot en utilisant les lettres à votre disposition"}),I=b(()=>t.value||c.value||v.value),$=b(()=>r.value>=d?`<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>
          <defs>
            <radialGradient id='explosionGradient' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>
              <stop offset='0%' stop-color='#ff9500' />
              <stop offset='50%' stop-color='#ff5722' />
              <stop offset='100%' stop-color='#b71c1c' />
            </radialGradient>
          </defs>
          <circle cx='100' cy='100' r='90' fill='url(#explosionGradient)'>
            <animate attributeName='r' values='70;100;90;120;90' dur='0.5s' repeatCount='1'/>
            <animate attributeName='opacity' values='1;0.9;0.8;0.7;0.5' dur='2s' repeatCount='indefinite'/>
          </circle>
          <path d='M60,60 L140,140 M60,140 L140,60 M100,40 L100,160 M40,100 L160,100' stroke='#ffff00' stroke-width='8'>
            <animate attributeName='stroke-width' values='8;12;8;10;8' dur='0.5s' repeatCount='1'/>
          </path>
        </svg>`:`<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>
        <defs>
          <radialGradient id='planetGradient' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>
            <stop offset='0%' stop-color='#64b5f6' />
            <stop offset='85%' stop-color='#1976d2' />
            <stop offset='100%' stop-color='#0d47a1' />
          </radialGradient>
        </defs>
        <circle cx='100' cy='100' r='80' fill='url(#planetGradient)' stroke='#0d47a1' stroke-width='2' />
        <ellipse cx='70' cy='70' rx='25' ry='20' fill='#2196f3' opacity='0.5' />
        <ellipse cx='130' cy='110' rx='30' ry='22' fill='#2196f3' opacity='0.4' />
        <circle cx='50' cy='120' r='15' fill='#2196f3' opacity='0.3' />
      </svg>`),z=b(()=>`<svg width='100' height='100' xmlns='http://www.w3.org/2000/svg'>
        <defs>
          <radialGradient id='asteroidGradient' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>
            <stop offset='0%' stop-color='#a1887f' />
            <stop offset='50%' stop-color='#8d6e63' />
            <stop offset='85%' stop-color='#6d4c41' />
            <stop offset='100%' stop-color='#5d4037' />
          </radialGradient>
          <filter id='asteroidGlow' x='-30%' y='-30%' width='160%' height='160%'>
            <feGaussianBlur stdDeviation='3' result='blur' />
            <feComposite in='SourceGraphic' in2='blur' operator='over' />
          </filter>
        </defs>
        ${r.value>0?`
        <ellipse cx='40' cy='40' rx='45' ry='15' fill='rgba(255, 87, 34, 0.1)' transform='rotate(-25 40 40)'>
          <animate attributeName='rx' values='45;55;45' dur='2s' repeatCount='indefinite' />
        </ellipse>
        <ellipse cx='40' cy='40' rx='35' ry='10' fill='rgba(255, 87, 34, 0.2)' transform='rotate(-25 40 40)'>
          <animate attributeName='rx' values='35;45;35' dur='1.5s' repeatCount='indefinite' />
        </ellipse>
      `:""}
        <g filter='url(#asteroidGlow)'>
          <path d='M40,15 L60,25 L70,45 L55,65 L30,70 L15,55 L20,30 Z' fill='url(#asteroidGradient)' stroke='#3e2723' stroke-width='2' />
          <circle cx='30' cy='35' r='6' fill='#5d4037' />
          <circle cx='50' cy='50' r='8' fill='#5d4037' />
          <ellipse cx='45' cy='30' rx='5' ry='4' fill='#5d4037' />
          <path d='M25,25 L35,35 M45,40 L55,50 M30,55 L40,65' stroke='#3e2723' stroke-width='1' />
        </g>
      </svg>`),L=()=>{o.value=e[Math.floor(Math.random()*e.length)].toLowerCase(),p.value=Array(o.value.length).fill("_"),m.value=[],r.value=0,t.value=!1,c.value=!1,v.value=!1,f.value="Devinez le mot lié à l'espace !",g.value=40},B=()=>{M.value=!1,O()},H=a=>{if(!(m.value.includes(a)||I.value))if(m.value.push(a),o.value.includes(a)){for(let h=0;h<o.value.length;h++)o.value[h]===a&&(p.value[h]=a);p.value.includes("_")||(t.value=!0,f.value="Bravo ! Vous avez sauvé la planète de l'astéroïde !")}else r.value++,r.value>=d?(c.value=!0,p.value=o.value.split(""),f.value="Perdu ! L'astéroïde a détruit la planète ! Le mot était : "+o.value):f.value=`Attention ! L'astéroïde se rapproche... (${d-r.value} essais restants)`},U=()=>{const a=W("space-hangman");a==="alien-hunt-3d"?window.location.href="/games/alien-hunt-3d":a==="completion"?window.location.href="/completion":a?window.location.href=`/games/${a}`:window.location.href="/"};let G;A(()=>{G=setInterval(()=>{g.value>0?g.value--:(clearInterval(G),D())},1e3)}),E(()=>{clearInterval(G)});function D(){v.value=!0,f.value="Temps écoulé ! L'astéroïde a détruit la planète ! Le mot était : "+o.value,r.value=d}const O=()=>{L(),C.value=!0};return L(),{displayedWord:p,usedLetters:m,alphabet:l,errors:r,maxErrors:d,gameWon:t,gameLost:c,timeUp:v,gameOver:I,statusMessage:f,tryLetter:H,resetGame:L,planetSrc:$,asteroidSrc:z,continueToNextGame:U,timeLeft:g,gameStarted:C,gameOverMessageVisible:N,showInstructions:M,gameInstructions:T,onInstructionComplete:B}}}),J={class:"space-hangman-container"},K={class:"game-area"},Q={class:"planet-container"},R=["innerHTML"],X=["innerHTML"],Y={class:"word-display"},_={key:1,class:"time-left"},ee={class:"keyboard"},te=["onClick","disabled"];function se(e,l,o,p,m,r){const d=q("GameInstruction");return n(),i("div",J,[l[2]||(l[2]=u("h1",null,"Pendu Spatial",-1)),u("div",K,[e.showInstructions?(n(),F(d,{key:0,title:e.gameInstructions.title,players:e.gameInstructions.players,time:e.gameInstructions.time,instruction:e.gameInstructions.instruction,onStart:e.onInstructionComplete},null,8,["title","players","time","instruction","onStart"])):y("",!0),u("div",Q,[l[1]||(l[1]=u("div",{class:"asteroid-trajectory"},null,-1)),u("div",{innerHTML:e.planetSrc,class:"planet-image"},null,8,R),e.errors>0?(n(),i("div",{key:0,innerHTML:e.asteroidSrc,class:k(["asteroid-image","asteroid-position-"+e.errors])},null,10,X)):y("",!0)]),u("div",Y,[(n(!0),i(S,null,x(e.displayedWord,(t,c)=>(n(),i("span",{key:c,class:"letter-box"},w(t),1))),128))]),u("div",{class:k(["status-message",{win:e.gameWon,lose:e.gameLost,"time-up":e.timeUp}])},w(e.statusMessage),3),!e.timeUp&&!e.gameOver?(n(),i("div",_," Temps restant : "+w(e.timeLeft)+" secondes ",1)):y("",!0),u("div",ee,[(n(!0),i(S,null,x(e.alphabet,t=>(n(),i("button",{key:t,onClick:c=>e.tryLetter(t),disabled:e.usedLetters.includes(t)||e.gameOver||e.timeUp,class:k([{used:e.usedLetters.includes(t)},"key-button"])},w(t),11,te))),128))]),e.gameOver||e.timeUp?(n(),i("button",{key:2,onClick:l[0]||(l[0]=(...t)=>e.continueToNextGame&&e.continueToNextGame(...t)),class:"continue-btn"}," Continuer ")):y("",!0)])])}const re=P(Z,[["render",se],["__scopeId","data-v-b79840b7"]]);export{re as default};
