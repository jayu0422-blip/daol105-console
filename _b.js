
const $ = id => document.getElementById(id);
const CHECK = '<svg viewBox="0 0 20 20" fill="none"><path d="M4 10l4 4 8-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// 2026~2027 시험 회차 사전 세팅 (start = 시험 종료 후 '작업 시작' 대략일; 학교마다 달라 조정 가능)
const PERIODS = [
  {label:'2026 2학기 중간', start:'2026-10-19'},
  {label:'2026 2학기 기말', start:'2026-12-14'},
  {label:'2027 1학기 중간', start:'2027-05-03'},
  {label:'2027 1학기 기말', start:'2027-07-05'},
  {label:'2027 2학기 중간', start:'2027-10-18'},
  {label:'2027 2학기 기말', start:'2027-12-13'}
];
function today(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function currentPeriodLabel(){ const t=today(); let cur=PERIODS[0].label; for(const p of PERIODS){ if(p.start<=t) cur=p.label; } return cur; }
function periodInfo(label){ return PERIODS.find(p=>p.label===label); }

const DEFAULT = {
  v: 3,
  period: currentPeriodLabel(),
  periods: PERIODS.map(p=>p.label),
  tasks: ['강사 설문(필수정보)','기출분석 랜딩','블로그 포스팅','인스타 카드뉴스','유튜브 게시글'],
  schoolsAll: ['미강중','윤슬중','은가람중','미사중','미사강변고','미사고','하남고'],
  teachers: [
    {name:'유용권', subject:'수학(중등)', schools:['미강중','윤슬중','은가람중','미사중']},
    {name:'임결', subject:'수학(고등)', schools:['미사강변고','미사고','하남고']},
    {name:'김영하', subject:'국어(고등)', schools:['미사고','미사강변고','하남고']},
    {name:'민귀홍', subject:'영어(고등)', schools:['미사강변고','미사고','하남고']},
    {name:'황웅', subject:'영어', schools:['미사고','하남고']},
    {name:'이정관', subject:'수능(고등)', schools:['미사고','미사강변고','하남고']},
    {name:'정영주', subject:'관리형독서실', schools:['미사고','미사강변고','하남고']}
  ],
  done: {}
};
let D = load();
D.period = currentPeriodLabel();  // 접속 시 항상 '현재 시기' 자동 선택

function load(){
  try{ const s=localStorage.getItem('daolTasks'); if(s){ const d=JSON.parse(s);
    if(d.v!==DEFAULT.v) return JSON.parse(JSON.stringify(DEFAULT));  // 스키마·일정·배정 변경 → 초기화
    d.periods = DEFAULT.periods.slice();  // 일정은 항상 최신
    if(!Array.isArray(d.teachers)) d.teachers=JSON.parse(JSON.stringify(DEFAULT.teachers));
    return d; } }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT));
}
function save(){ localStorage.setItem('daolTasks', JSON.stringify(D)); }
function key(t,s,task){ return D.period+'|'+t+'|'+s+'|'+task; }

function fillSelectors(){
  $('period').innerHTML = D.periods.map(p=>`<option ${p===D.period?'selected':''}>${p}</option>`).join('');
  const roles = ['전체(원장·인포)', ...D.teachers.map(t=>t.name+' (본인)')];
  const cur = $('role').value || '전체(원장·인포)';
  $('role').innerHTML = roles.map(r=>`<option ${r===cur?'selected':''}>${r}</option>`).join('');
}
function setPeriod(){ D.period=$('period').value; save(); render(); }

function visibleTeachers(){
  const r=$('role').value||'';
  if(r.startsWith('전체')) return D.teachers;
  const nm=r.replace(' (본인)','');
  return D.teachers.filter(t=>t.name===nm);
}
function missCount(t){
  let m=0; t.schools.forEach(s=>D.tasks.forEach(task=>{ if(!D.done[key(t.name,s,task)]) m++; })); return m;
}

function render(){
  fillSelectors();
  const ts=visibleTeachers();
  // summary
  let total=0, done=0;
  D.teachers.forEach(t=>t.schools.forEach(s=>D.tasks.forEach(task=>{ total++; if(D.done[key(t.name,s,task)]) done++; })));
  const pi=periodInfo(D.period), t=today();
  const pstat = pi ? (pi.start>t ? '예정 · 작업 '+pi.start+'~' : '작업 진행 중 · '+pi.start+'~') : '현재 회차';
  $('summary').innerHTML=
    `<div class="stat"><b>${esc(D.period)}</b><span>${esc(pstat)}</span></div>`+
    `<div class="stat green"><b>${done}</b><span>제출 완료</span></div>`+
    `<div class="stat red"><b>${total-done}</b><span>미제출</span></div>`+
    `<div class="stat"><b>${total?Math.round(done/total*100):0}%</b><span>진행률</span></div>`;
  // board
  if(!ts.length){ $('board').innerHTML='<div class="empty">표시할 강사가 없습니다. ⚙설정에서 추가하세요.</div>'; return; }
  $('board').innerHTML = ts.map(t=>{
    const miss=missCount(t);
    const schools = t.schools.map(s=>{
      const rows = D.tasks.map(task=>{
        const k=key(t.name,s,task); const on=!!D.done[k];
        return `<div class="row ${on?'done':''}">
          <div class="cbx" onclick="toggle('${enc(t.name)}','${enc(s)}','${enc(task)}')">${CHECK}</div>
          <div class="nm">${esc(task)}</div>
          <span class="badge ${on?'done':'miss'}">${on?'제출 완료':'미제출'}</span>
        </div>`;
      }).join('');
      return `<div class="school"><div class="sh">📍 ${esc(s)}</div>${rows}</div>`;
    }).join('');
    return `<div class="tcard">
      <div class="h"><span class="nm">${esc(t.name)}</span><span class="sub">${esc(t.subject)}</span>
        <span class="miss ${miss?'on':'off'}">${miss?('미제출 '+miss+'건'):'완료 ✓'}</span></div>
      ${schools}
      <div class="f"><button class="btn line sm" onclick="alarmOne('${enc(t.name)}')">🔔 ${esc(t.name)} 미제출 알림</button></div>
    </div>`;
  }).join('');
  save();
}
function toggle(t,s,task){ t=dec(t);s=dec(s);task=dec(task); const k=key(t,s,task); if(D.done[k]) delete D.done[k]; else D.done[k]=true; render(); }

// 회차 생성: 현재 필수작업 세트를 새 시험기간 라벨로 초기화(전부 미제출)
function newPeriod(){
  const label=prompt('새 시험기간 이름 (예: 2026-2학기 기말)');
  if(!label) return;
  if(!D.periods.includes(label)) D.periods.push(label);
  D.period=label; // 새 회차는 done 없음 → 전부 미제출
  save(); render(); toast('topStatus','새 회차 "'+label+'" 생성 — 전부 미제출',true);
}

// 알림 문구
function unpaid(t){
  const items=[];
  t.schools.forEach(s=>D.tasks.forEach(task=>{ if(!D.done[key(t.name,s,task)]) items.push(s+' '+task); }));
  return items;
}
function alarmMsg(t){
  const items=unpaid(t); if(!items.length) return null;
  return `[다올105] ${t.name} 선생님, ${D.period} 담당학교 필수 작업 미제출 ${items.length}건입니다.\n`+
    items.map(x=>' · '+x).join('\n')+
    `\n\n시험기간 대비 자료라 마감 지켜 부탁드립니다. 완료하시면 인포데스크에 알려주세요. 감사합니다. — 다올105 인포데스크`;
}
function alarmOne(nm){ nm=dec(nm); const t=D.teachers.find(x=>x.name===nm); const m=alarmMsg(t);
  if(!m){ toast('topStatus',nm+' 선생님은 미제출이 없습니다.',true); return; }
  $('alarmText').value=m; open2('alarmModal');
}
function alarmAll(){
  const msgs=D.teachers.map(t=>alarmMsg(t)).filter(Boolean);
  if(!msgs.length){ toast('topStatus','미제출이 없습니다 🎉',true); return; }
  $('alarmText').value=msgs.join('\n\n──────────\n\n'); open2('alarmModal');
}
async function copyAlarm(){ try{ await navigator.clipboard.writeText($('alarmText').value); toast('alarmStatus','복사됨 ✓',true);}catch(e){ toast('alarmStatus','복사 실패',false);} }

// 설정
function openSettings(){
  $('setTasks').value=D.tasks.join(', ');
  $('setSchools').value=D.schoolsAll.join(', ');
  renderTeacherEdit(); open2('setModal');
}
function renderTeacherEdit(){
  $('teacherEdit').innerHTML=D.teachers.map((t,i)=>
    `<div class="teditrow">
      <input type="text" value="${esc(t.name)}" data-i="${i}" data-f="name" placeholder="이름">
      <input type="text" value="${esc(t.subject)}" data-i="${i}" data-f="subject" placeholder="과목/직책">
      <input type="text" value="${esc(t.schools.join(','))}" data-i="${i}" data-f="schools" placeholder="담당학교,쉼표">
      <span class="x" onclick="delTeacher(${i})">×</span>
    </div>`).join('');
}
function addTeacher(){ D.teachers.push({name:'',subject:'',schools:[...D.schoolsAll]}); renderTeacherEdit(); }
function delTeacher(i){ D.teachers.splice(i,1); renderTeacherEdit(); }
function saveSettings(){
  document.querySelectorAll('#teacherEdit input').forEach(inp=>{
    const i=+inp.dataset.i, f=inp.dataset.f, v=inp.value.trim();
    if(!D.teachers[i]) return;
    if(f==='schools') D.teachers[i].schools=v.split(',').map(x=>x.trim()).filter(Boolean);
    else D.teachers[i][f]=v;
  });
  D.teachers=D.teachers.filter(t=>t.name);
  D.tasks=$('setTasks').value.split(',').map(x=>x.trim()).filter(Boolean);
  D.schoolsAll=$('setSchools').value.split(',').map(x=>x.trim()).filter(Boolean);
  save(); closeModal('setModal'); render();
}

// 백업/복원
function exportJSON(){
  const a=document.createElement('a');
  a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(D,null,2));
  a.download='다올105_작업현황_'+D.period+'.json'; a.click();
  toast('topStatus','백업 다운로드 ✓',true);
}
function importJSON(ev){
  const f=ev.target.files[0]; if(!f) return; const r=new FileReader();
  r.onload=e=>{ try{ D=JSON.parse(e.target.result); save(); render(); toast('topStatus','복원 완료 ✓',true);}catch(x){ toast('topStatus','복원 실패: 파일 확인',false);} };
  r.readAsText(f); ev.target.value='';
}

// util
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function enc(s){ return encodeURIComponent(s); }
function dec(s){ return decodeURIComponent(s); }
function open2(id){ $(id).classList.add('on'); }
function closeModal(id){ $(id).classList.remove('on'); }
function toast(el,msg,ok){ const e=$(el); if(!e)return; e.textContent=msg; e.style.color= ok===false?'#c0392b':'#1f8a4c'; }

render();
