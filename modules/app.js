// Canvas roundRect polyfill
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(r,w/2,h/2);this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath();return this;};}
// PDF.js worker
if(typeof pdfjsLib!=="undefined"){pdfjsLib.GlobalWorkerOptions.workerSrc="";pdfjsLib.disableWorker=true;}

// State
let jobs=[];
let resumes=[];
let covers=[];
let currentJobId=null,currentFilter="all",boardView="grid",selectedCvJobId=null,activeTemplate=null;
let editingDocId={resume:null,cover:null};
let resumeTemplate="modern";
let coverTemplate="modern";
let _apiKey="";
let _firebaseUser=null;
let _db=null;
let _firebaseReady=false;

// ============================================================
// FIREBASE CONFIG â€” Replace with your own Firebase project values
// Get these from: Firebase Console â†’ Project Settings â†’ General â†’ Your apps â†’ Web app
// ============================================================
const FIREBASE_CONFIG={
  apiKey:"AIzaSyDmAZzZkLosXBprTP9-z1pHQiQVRdh-Emk",
  authDomain:"jobtrack-bcbcf.firebaseapp.com",
  projectId:"jobtrack-bcbcf",
  storageBucket:"jobtrack-bcbcf.firebasestorage.app",
  messagingSenderId:"905043988733",
  appId:"1:905043988733:web:f5ed632fb58404b12dee94"
};

// -- Firebase Init --
function isFirebaseConfigured(){return FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.projectId;}

function initFirebase(){
  if(!isFirebaseConfigured())return false;
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    _db=firebase.firestore();
    _db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
    _firebaseReady=true;
    return true;
  }catch(e){console.warn("Firebase init failed:",e);return false;}
}

// -- Unified Storage Layer --
// Firebase Firestore when signed in, window.storage for artifact, localStorage as last resort
function userDocRef(collection){
  if(_firebaseReady&&_firebaseUser&&_db)return _db.collection("users").doc(_firebaseUser.uid).collection(collection);
  return null;
}

async function storeGet(key){
  // Firebase path
  if(_firebaseReady&&_firebaseUser&&_db){
    try{
      const doc=await _db.collection("users").doc(_firebaseUser.uid).collection("settings").doc(key).get();
      return doc.exists?doc.data().value:null;
    }catch(e){}
  }
  // Artifact storage
  try{if(window.storage){const r=await window.storage.get(key);return r?r.value:null;}}catch(e){}
  // localStorage fallback
  try{return localStorage.getItem(key);}catch(e){return null;}
}

async function storeSet(key,value){
  // Firebase path
  if(_firebaseReady&&_firebaseUser&&_db){
    try{await _db.collection("users").doc(_firebaseUser.uid).collection("settings").doc(key).set({value:value,updated:new Date().toISOString()});return;}catch(e){}
  }
  // Artifact storage
  try{if(window.storage){await window.storage.set(key,value);return;}}catch(e){}
  // localStorage fallback
  try{localStorage.setItem(key,value);}catch(e){}
}

// -- Firebase collection save/load for arrays (jobs, resumes, covers) --
async function fbSaveCollection(name,arr){
  if(!_firebaseReady||!_firebaseUser||!_db)return;
  try{
    // Store as single doc for simplicity (< 1MB per doc is fine for personal use)
    await _db.collection("users").doc(_firebaseUser.uid).collection("data").doc(name).set({items:JSON.stringify(arr),updated:new Date().toISOString()});
  }catch(e){console.warn("Firebase save error:",e);}
}

async function fbLoadCollection(name){
  if(!_firebaseReady||!_firebaseUser||!_db)return null;
  try{
    const doc=await _db.collection("users").doc(_firebaseUser.uid).collection("data").doc(name).get();
    if(doc.exists&&doc.data().items)return JSON.parse(doc.data().items);
  }catch(e){}
  return null;
}

// -- Auth UI --
async function signInWithGoogle(){
  if(!_firebaseReady){toast("Firebase not configured","err");return;}
  try{
    const provider=new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
  }catch(e){
    if(e.code!=="auth/popup-closed-by-user")toast("Sign-in failed: "+e.message,"err");
  }
}

function signOut(){
  if(!_firebaseReady)return;
  firebase.auth().signOut();
  _firebaseUser=null;
  // Clear local state and go to setup
  jobs=[];resumes=[];covers=[];_apiKey="";
  document.getElementById("app").style.display="none";
  document.getElementById("setup-screen").style.display="block";
  updateAuthUI();
}

function updateAuthUI(){
  const indicator=document.getElementById("auth-indicator");
  const settingsStatus=document.getElementById("settings-auth-status");
  const settingsActions=document.getElementById("settings-auth-actions");
  if(_firebaseUser){
    const name=_firebaseUser.displayName||_firebaseUser.email||"User";
    const email=_firebaseUser.email||"";
    const photo=_firebaseUser.photoURL;
    if(indicator){
      indicator.innerHTML=(photo?'<img src="'+photo+'" style="width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border);">':'')+
        '<span style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px;">'+name.split(" ")[0]+'</span>'+
        '<button class="btn-sm" style="font-size:10px;padding:3px 8px;background:var(--surface2);border:1px solid var(--border);color:var(--muted);border-radius:5px;cursor:pointer;" onclick="signOut()">Sign Out</button>';
    }
    if(settingsStatus)settingsStatus.innerHTML='<span style="color:var(--green);">&#9679;</span> Signed in as <strong style="color:var(--text);">'+name+'</strong>'+(email?' ('+email+')':'')+'<br>Your data syncs to the cloud automatically.';
    if(settingsActions)settingsActions.innerHTML='<button class="btn btn-ghost btn-sm" onclick="signOut()">Sign Out</button>';
  }else if(isFirebaseConfigured()){
    if(indicator)indicator.innerHTML='<button class="btn btn-sm btn-ghost" style="width:100%;justify-content:center;" onclick="signInWithGoogle()">Sign In</button>';
    if(settingsStatus)settingsStatus.innerHTML='<span style="color:var(--muted);">&#9679;</span> Not signed in. Sign in with Google to sync your data across devices.';
    if(settingsActions)settingsActions.innerHTML='<button class="btn btn-primary btn-sm" onclick="signInWithGoogle()" style="gap:6px;"><svg width="14" height="14" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Sign in with Google</button>';
  }else{
    if(indicator)indicator.innerHTML='<span style="font-size:10px;color:var(--muted);">Local mode</span>';
    if(settingsStatus)settingsStatus.innerHTML='Running in local mode. To enable cloud sync, configure Firebase in the source code. See the <strong>FIREBASE_CONFIG</strong> section.';
    if(settingsActions)settingsActions.innerHTML='';
  }
}

// -- Master Load --
async function loadAllData(){
  // Try Firebase first
  const fbOk=initFirebase();
  // Show Google sign-in on setup if Firebase configured
  const setupAuth=document.getElementById("setup-auth");
  if(setupAuth&&fbOk)setupAuth.style.display="block";

  if(fbOk){
    // Listen for auth state
    firebase.auth().onAuthStateChanged(async(user)=>{
      _firebaseUser=user;
      updateAuthUI();
      if(user){
        // Load from Firestore
        const [fj,fr,fc]=await Promise.all([fbLoadCollection("jobs"),fbLoadCollection("resumes"),fbLoadCollection("covers")]);
        if(fj)jobs=fj;
        if(fr)resumes=fr;
        if(fc)covers=fc;
        const [k,rt,ct,wm]=await Promise.all([storeGet("gemini_key"),storeGet("jt_resume_tpl"),storeGet("jt_cover_tpl"),storeGet("jt_gemini_model")]);
        _apiKey=k||"";resumeTemplate=rt||"modern";coverTemplate=ct||"modern";workingModel=wm||"";
        document.getElementById("loading-screen").style.display="none";
        if(_apiKey){
          document.getElementById("setup-screen").style.display="none";
          document.getElementById("app").style.display="flex";
          renderDashboard();
        }else{
          document.getElementById("setup-screen").style.display="block";
        }
      }else{
        // Not signed in â€” show setup with Google sign-in option
        document.getElementById("loading-screen").style.display="none";
        document.getElementById("setup-screen").style.display="block";
      }
    });
  }else{
    // No Firebase â€” use artifact storage / localStorage
    try{
      const [j,r,c,k,rt,ct,wm]=await Promise.all([
        storeGet("jt_jobs"),storeGet("jt_resumes"),storeGet("jt_covers"),
        storeGet("gemini_key"),storeGet("jt_resume_tpl"),storeGet("jt_cover_tpl"),
        storeGet("jt_gemini_model")
      ]);
      jobs=j?JSON.parse(j):[];resumes=r?JSON.parse(r):[];covers=c?JSON.parse(c):[];
      _apiKey=k||"";resumeTemplate=rt||"modern";coverTemplate=ct||"modern";workingModel=wm||"";
    }catch(e){console.error("Load error:",e);}
    document.getElementById("loading-screen").style.display="none";
    if(_apiKey){
      document.getElementById("app").style.display="flex";
      document.getElementById("setup-screen").style.display="none";
      renderDashboard();
    }else{
      document.getElementById("setup-screen").style.display="block";
    }
  }
  updateAuthUI();
}

const STATUS={saved:{label:"Saved",color:"var(--accent)"},applied:{label:"Applied",color:"var(--blue)"},interview:{label:"Interview",color:"var(--purple)"},offer:{label:"Offer",color:"var(--green)"},rejected:{label:"Rejected",color:"var(--red)"}};
const STATUS_ORDER=["saved","applied","interview","offer","rejected"];

const EMAIL_TEMPLATES=[
  {id:"post-apply",icon:"\u{1F4EC}",name:"Post-Application Follow-Up",desc:"1 week after applying with no response",subject:"Following Up \u2014 [Job Title] Application",body:"Hi [Hiring Manager's Name],\n\nI wanted to follow up on my application for the [Job Title] role at [Company Name], submitted on [date].\n\nI'm very enthusiastic about this opportunity and believe my background in [your key skill] aligns closely with what you're looking for. I'd welcome the chance to discuss how I can contribute to your team.\n\nPlease let me know if you need any additional information. I'm available for a call or interview at your convenience.\n\nKind regards,\n[Your Name]\n[Phone Number]"},
  {id:"post-interview",icon:"\u{1F91D}",name:"Post-Interview Thank You",desc:"Within 24 hours of your interview",subject:"Thank You \u2014 [Job Title] Interview",body:"Hi [Interviewer's Name],\n\nThank you for taking the time to speak with me today about the [Job Title] position at [Company Name].\n\nIt was great to learn more about [something specific from the interview]. Our conversation reinforced my enthusiasm for this role and my confidence that I can make a strong contribution to your team.\n\nI look forward to the next steps and am happy to provide any additional information.\n\nKind regards,\n[Your Name]\n[Phone Number]"},
  {id:"no-response",icon:"\u{1F514}",name:"No Response Follow-Up",desc:"2+ weeks after applying with no reply",subject:"Re: [Job Title] Application \u2014 Checking In",body:"Hi [Hiring Manager's Name],\n\nI hope you're well. I'm reaching out to check on the status of my application for the [Job Title] role at [Company Name], submitted on [date].\n\nI remain very interested in this opportunity and would love to contribute to [Company Name]'s work in [relevant area]. If the role is still open, I'd be keen to connect.\n\nThanks so much for your time.\n\nKind regards,\n[Your Name]\n[Phone Number]"},
  {id:"offer-received",icon:"\u{1F389}",name:"Offer Received \u2014 Request Time",desc:"Buy time to consider an offer professionally",subject:"Re: [Job Title] Offer \u2014 Thank You",body:"Hi [Hiring Manager's Name],\n\nThank you so much for the offer for the [Job Title] position \u2014 I'm genuinely thrilled.\n\nI'd love to take a couple of days to review everything carefully before formally accepting. Would it be possible to have until [specific date] to get back to you?\n\nI'm very excited about the prospect of joining the team.\n\nKind regards,\n[Your Name]"},
  {id:"decline-offer",icon:"\u{1F64F}",name:"Decline an Offer Gracefully",desc:"Keep doors open while saying no",subject:"Re: [Job Title] Offer \u2014 With Thanks",body:"Hi [Hiring Manager's Name],\n\nThank you so much for offering me the [Job Title] position at [Company Name]. I truly appreciate the time invested throughout the process.\n\nAfter careful consideration, I've decided to decline the offer at this stage. This was not an easy decision \u2014 I have a great deal of respect for [Company Name] and the team I met.\n\nI hope our paths cross again in the future.\n\nKind regards,\n[Your Name]"}
];

const SYDNEY_RECRUITER='You are Alex Chen, a senior recruiter with 18 years of experience based in Sydney, Australia. You\'ve placed thousands of candidates across finance, tech, healthcare, government, and professional services in Sydney and across Australia. You know exactly what hiring managers at top Australian companies look for. You write in a direct, warm, and professional Australian tone \u2014 no fluff, no Americanisms. You use Australian spelling (e.g. "organisation", "recognise", "colour"). Your edits are always polished, impactful, and tailored for the Australian job market. Return only the edited document text with no commentary, no preamble, and no markdown formatting.';

const RESUME_EXPERT='You are a world-class professional resume writer and career strategist with 20 years of experience. You have written resumes for executives, senior professionals, and emerging talent across every industry. Your resumes consistently land interviews at top companies.\n\nRESUME WRITING RULES YOU ALWAYS FOLLOW:\n\n1. STRUCTURE: Use a clean, professional structure with clear sections. Always include: Professional Summary (3-4 punchy lines), Key Skills / Core Competencies, Professional Experience (reverse chronological), Education, and optionally Certifications, Awards, or Volunteer Work.\n\n2. PROFESSIONAL SUMMARY: Write a compelling 3-4 line summary that reads like a personal pitch. Lead with years of experience and specialty. Include 2-3 standout achievements or differentiators. End with what the candidate is seeking or their value proposition.\n\n3. ACHIEVEMENTS OVER DUTIES: Never list job duties. Every bullet point must show impact. Use the CAR format (Challenge, Action, Result). Start every bullet with a strong action verb. Quantify results with numbers, percentages, dollar amounts wherever possible (e.g. "Grew revenue 43% YoY to $2.1M" not "Responsible for revenue growth").\n\n4. ACTION VERBS: Use powerful, varied verbs: Spearheaded, Orchestrated, Delivered, Transformed, Championed, Accelerated, Streamlined, Architected, Negotiated, Pioneered. Never repeat the same verb.\n\n5. ATS OPTIMISATION: Include industry-standard keywords naturally. Use standard section headings that ATS systems recognise. Avoid tables, columns, headers/footers, images, or special characters that ATS cannot parse.\n\n6. FORMATTING: Use plain text formatting that looks professional:\n- SECTION HEADERS in ALL CAPS followed by a line of dashes\n- Company Name | Job Title | Dates on one line\n- Bullet points with \u2022 symbol\n- Consistent date format (Mon YYYY \u2013 Mon YYYY or Mon YYYY \u2013 Present)\n- No more than 5-6 bullets per role (most recent), 3-4 for older roles\n\n7. AUSTRALIAN MARKET: Use Australian spelling (organisation, programme, colour). Reference Australian qualifications properly. Understand Australian workplace culture \u2014 direct, outcomes-focused, collaborative.\n\n8. LENGTH: 2 pages maximum for most professionals. 1 page for <5 years experience. Never exceed 2 pages unless executive/academic.\n\n9. TONE: Confident but not arrogant. Professional but human. Every word must earn its place \u2014 cut all filler.\n\nReturn only the resume text. No commentary, no preamble, no markdown code blocks.';

function saveJobs(){storeSet("jt_jobs",JSON.stringify(jobs));fbSaveCollection("jobs",jobs);}
function saveResumes(){storeSet("jt_resumes",JSON.stringify(resumes));fbSaveCollection("resumes",resumes);}
function saveCovers(){storeSet("jt_covers",JSON.stringify(covers));fbSaveCollection("covers",covers);}
function getKey(){return _apiKey;}

async function saveKey(){
  const k=document.getElementById("key-input").value.trim();
  if(!k||k.length<20){document.getElementById("key-error").style.display="block";return;}
  _apiKey=k;
  await storeSet("gemini_key",k);
  document.getElementById("setup-screen").style.display="none";
  document.getElementById("app").style.display="flex";
  renderDashboard();
}
async function updateKey(){
  const k=document.getElementById("new-key-input").value.trim();
  const msg=document.getElementById("key-update-msg");
  if(!k||k.length<20){msg.style.display="block";msg.style.color="var(--red)";msg.textContent="Invalid key.";return;}
  _apiKey=k;
  await storeSet("gemini_key",k);
  msg.style.display="block";msg.style.color="var(--green)";msg.textContent="Key updated!";
  setTimeout(()=>msg.style.display="none",2500);
}

const GEMINI_MODELS=['gemini-2.5-flash','gemini-2.0-flash','gemini-2.0-flash-lite','gemini-1.5-flash'];
let workingModel='';

async function callGemini(prompt,system=""){
  const key=getKey();
  if(!key)throw new Error("No API key. Go to Settings to add one.");
  const body={contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.4}};
  if(system)body.systemInstruction={parts:[{text:system}]};

  // If we already know a working model, try it first
  const modelsToTry=workingModel?[workingModel,...GEMINI_MODELS.filter(m=>m!==workingModel)]:GEMINI_MODELS;

  let lastErr=null;
  for(const model of modelsToTry){
    try{
      const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent?key='+key,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      if(!res.ok){
        const err=await res.json().catch(()=>({}));
        const msg=err?.error?.message||'';
        // If model not found, try next one
        if(msg.includes('not found')||msg.includes('not supported')||res.status===404){lastErr=new Error(msg);continue;}
        throw new Error(msg||'API returned '+res.status);
      }
      const data=await res.json();
      if(data.error)throw new Error(data.error.message||"API error");
      const txt=data.candidates?.[0]?.content?.parts?.[0]?.text;
      if(!txt)throw new Error("Empty response from API");
      // Remember which model worked
      if(model!==workingModel){workingModel=model;storeSet('jt_gemini_model',model);}
      return txt;
    }catch(e){
      if(e.message&&(e.message.includes('not found')||e.message.includes('not supported'))){lastErr=e;continue;}
      if(e.message==='Failed to fetch')throw new Error("Network blocked \u2014 download this file and open it in your browser. The Claude preview sandbox blocks external API calls.");
      throw e;
    }
  }
  throw lastErr||new Error("No compatible Gemini model found. Please check your API key.");
}

function parseJSON(text){
  // Strip markdown code fences that Gemini often wraps around JSON
  let cleaned=text.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim();
  // Try direct parse first
  try{return JSON.parse(cleaned);}catch(e){}
  // Try extracting the outermost JSON object
  const start=cleaned.indexOf("{");
  const end=cleaned.lastIndexOf("}");
  if(start===-1||end===-1||end<=start)throw new Error("No JSON found in response");
  try{return JSON.parse(cleaned.substring(start,end+1));}catch(e){throw new Error("Invalid JSON in response");}
}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function toast(msg,type=""){const t=document.createElement("div");t.className='toast '+type;t.textContent=msg;t.setAttribute("role","alert");t.setAttribute("aria-live","polite");document.body.appendChild(t);setTimeout(()=>t.remove(),3000);}
function setStatus(id,html){const el=document.getElementById(id);if(!el)return;el.innerHTML=html;el.style.display=html?"flex":"none";}
function showErr(id,msg){const el=document.getElementById(id);if(!el)return;el.textContent=msg;el.style.display="block";}
function clearErr(id){const el=document.getElementById(id);if(!el)return;el.textContent="";el.style.display="none";}
function scoreColor(n){return n>=80?"var(--green)":n>=60?"var(--accent)":n>=40?"var(--blue)":"var(--red)";}

function showView(v){
  ["dashboard","analytics","add","cv","resumes","covers","emails","settings"].forEach(n=>{
    document.getElementById("view-"+n).style.display=n===v?"":"none";
    const nb=document.getElementById("nav-"+n);
    if(nb)nb.classList.toggle("active",n===v);
  });
  // Sync mobile nav active state
  const mobMap={dashboard:"mob-dashboard",add:"mob-add",resumes:"mob-resumes",covers:"mob-covers"};
  document.querySelectorAll(".mob-tab").forEach(t=>t.classList.remove("active"));
  if(mobMap[v]){const mt=document.getElementById(mobMap[v]);if(mt)mt.classList.add("active");}
  else{const mm=document.getElementById("mob-more");if(mm)mm.classList.add("active");}
  // Close more menu if open
  const moreMenu=document.getElementById("mob-more-menu");if(moreMenu)moreMenu.classList.remove("open");
  // Scroll to top on view change
  document.querySelector(".main")?.scrollTo(0,0);
  if(v==="dashboard")renderDashboard();
  if(v==="analytics")renderAnalytics();
  if(v==="cv")renderCVJobList();
  if(v==="resumes")renderResumeList();
  if(v==="covers")renderCoverList();
  if(v==="emails")renderEmailTemplates();
}

function mobNav(v){showView(v);}
function toggleMobMore(){document.getElementById("mob-more-menu").classList.toggle("open");}
// Close more menu on outside tap
document.addEventListener("click",function(e){
  const menu=document.getElementById("mob-more-menu");
  const btn=document.getElementById("mob-more");
  if(menu&&btn&&!menu.contains(e.target)&&!btn.contains(e.target))menu.classList.remove("open");
});

function getFiltered(){
  const s=(document.getElementById("search-input")?.value||"").toLowerCase();
  const sort=document.getElementById("sort-select")?.value||"date-desc";
  return [...jobs].filter(j=>(currentFilter==="all"||j.status===currentFilter)&&(!s||j.title.toLowerCase().includes(s)||j.company.toLowerCase().includes(s))).sort((a,b)=>{
    if(sort==="date-desc")return new Date(b.date)-new Date(a.date);
    if(sort==="date-asc")return new Date(a.date)-new Date(b.date);
    if(sort==="company-asc")return a.company.localeCompare(b.company);
    if(sort==="company-desc")return b.company.localeCompare(a.company);
    if(sort==="title-asc")return a.title.localeCompare(b.title);
    if(sort==="status")return STATUS_ORDER.indexOf(a.status)-STATUS_ORDER.indexOf(b.status);
    return 0;
  });
}

function renderDashboard(){
  const counts={};jobs.forEach(j=>{counts[j.status]=(counts[j.status]||0)+1;});
  document.getElementById("filter-bar").innerHTML=["all",...STATUS_ORDER].map(f=>`<button class="filter-btn ${currentFilter===f?"active":""}" onclick="setFilter('${f}')">${f==="all"?'All ('+jobs.length+')':STATUS[f].label+(counts[f]?' ('+counts[f]+')':"")} </button>`).join("")+
    '<div class="view-toggle"><button class="view-btn '+(boardView==="grid"?"active":"")+'" onclick="setView(\'grid\')">Grid</button><button class="view-btn '+(boardView==="kanban"?"active":"")+'" onclick="setView(\'kanban\')">Kanban</button></div>';
  if(boardView==="grid")renderGrid();else renderKanban();
  renderStats();
}

function renderGrid(){
  document.getElementById("jobs-grid").style.display="";
  document.getElementById("kanban-board").style.display="none";
  const f=getFiltered(),g=document.getElementById("jobs-grid");
  if(!f.length){g.innerHTML='<div class="empty"><div class="empty-icon">\u{1F4ED}</div><h3>'+(jobs.length?"No matches":"Start tracking your applications")+'</h3><p style="font-size:12px;margin-top:5px;color:var(--muted);line-height:1.6;">'+(jobs.length?"Try a different filter or search term":"Add a job posting URL or paste a job ad, and let AI analyse it for you.")+'</p>'+(jobs.length?'':'<button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="showView(\'add\')">&#10010; Add Your First Job</button>')+'</div>';return;}
  g.innerHTML=f.map(j=>`<div class="job-card" onclick="openModal(${j.id})">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><div class="card-company">${esc(j.company)}</div><span class="badge badge-${j.status}">${STATUS[j.status].label}</span></div>
    <div class="card-title">${esc(j.title)}</div>
    <div class="card-meta">${j.location!=="N/A"?'<span>\u{1F4CD} '+esc(j.location)+'</span>':""}${j.salary!=="N/A"?'<span>\u{1F4B0} '+esc(j.salary)+'</span>':""}${j.interviewDate?'<span style="color:var(--purple);">\u{1F4C5} Interview: '+new Date(j.interviewDate).toLocaleDateString("en-AU",{day:"numeric",month:"short"})+'</span>':""}</div>
    <div class="card-footer">
      <span class="card-date">${new Date(j.date).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})}</span>
      <div style="display:flex;align-items:center;gap:5px;">
        ${j.matchScore?'<span class="match-pill" style="background:'+scoreColor(j.matchScore)+'22;color:'+scoreColor(j.matchScore)+'">'+j.matchScore+'% match</span>':""}
        <button onclick="quickDelete(${j.id},event)" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;padding:2px 5px;border-radius:5px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'" title="Delete">\u{1F5D1}</button>
      </div>
    </div></div>`).join("");
}

function renderKanban(){
  document.getElementById("jobs-grid").style.display="none";
  document.getElementById("kanban-board").style.display="flex";
  const s=(document.getElementById("search-input")?.value||"").toLowerCase();
  document.getElementById("kanban-board").innerHTML=STATUS_ORDER.map(status=>{
    const col=jobs.filter(j=>j.status===status&&(!s||j.title.toLowerCase().includes(s)||j.company.toLowerCase().includes(s)));
    return `<div class="k-col">
      <div class="k-header"><span class="k-title-label" style="color:${STATUS[status].color}">${STATUS[status].label}</span><span class="k-count">${col.length}</span></div>
      <div class="k-cards">${col.length?col.map(j=>`<div class="k-card" onclick="openModal(${j.id})">
        <div class="k-company">${esc(j.company)}</div><div class="k-title-text">${esc(j.title)}</div>
        <div class="k-footer"><span>${new Date(j.date).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}</span>
          <button onclick="quickDelete(${j.id},event)" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:12px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'">\u{1F5D1}</button>
        </div></div>`).join(""):'<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--muted);opacity:0.5;">Empty</div>'}
      </div></div>`;
  }).join("");
}

function setFilter(f){currentFilter=f;renderDashboard();}
function setView(v){boardView=v;renderDashboard();}
function quickDelete(id,e){e.stopPropagation();if(!confirm("Remove this application?"))return;jobs=jobs.filter(j=>j.id!==id);saveJobs();renderDashboard();toast("Application removed","ok");}
function renderStats(){
  const c={};jobs.forEach(j=>{c[j.status]=(c[j.status]||0)+1;});
  document.getElementById("sidebar-stats").innerHTML=
    '<div class="stat-row"><span class="stat-label">Total</span><strong>'+jobs.length+'</strong></div>'+
    '<div class="stat-row"><span class="stat-label">Applied</span><strong style="color:var(--blue)">'+(c.applied||0)+'</strong></div>'+
    '<div class="stat-row"><span class="stat-label">Interviews</span><strong style="color:var(--purple)">'+(c.interview||0)+'</strong></div>'+
    '<div class="stat-row"><span class="stat-label">Offers</span><strong style="color:var(--green)">'+(c.offer||0)+'</strong></div>'+
    '<div class="stat-row"><span class="stat-label">Resumes</span><strong style="color:var(--accent)">'+resumes.length+'</strong></div>'+
    '<div class="stat-row"><span class="stat-label">Covers</span><strong style="color:var(--muted)">'+covers.length+'</strong></div>';
}

async function analyseJob(){
  const url=document.getElementById("url-input").value.trim();
  if(!url){showErr("add-error","Please enter a URL");return;}
  const btn=document.getElementById("analyse-btn");
  btn.disabled=true;setStatus("add-status","<span class='spinner'></span> Analysing job posting...");clearErr("add-error");
  try{
    const systemMsg='You are a job posting analyser. You MUST respond with ONLY a raw JSON object. No markdown, no backticks, no commentary, no text before or after the JSON.';
    const text=await callGemini('Analyse this job posting URL and extract all available information. If something is not available, use "N/A".\n\nURL: '+url+'\n\nIMPORTANT: Separate the job ad\'s own screening/application questions (like notice period, work rights, availability, salary expectations, licences) from interview preparation questions.\n\nRespond with ONLY this JSON structure:\n{"title":"...","company":"...","location":"...","salary":"...","description":"2-3 sentence summary","requirements":["r1","r2","r3"],"application_questions":[{"question":"screening question from the job ad itself"}],"interview_questions":[{"type":"Behavioral","question":"AI-generated practice question","answer":"A strong 3-4 sentence suggested answer using STAR method where appropriate"},{"type":"Technical","question":"...","answer":"..."},{"type":"Role-Specific","question":"...","answer":"..."},{"type":"Situational","question":"...","answer":"..."},{"type":"Culture Fit","question":"...","answer":"..."}],"company_facts":[{"label":"Industry","value":"..."},{"label":"Size","value":"..."},{"label":"Known For","value":"..."},{"label":"Culture","value":"..."}]}',systemMsg);
    const d=parseJSON(text);
    const job={id:Date.now(),url:url,title:d.title||"Unknown Title",company:d.company||"Unknown Company",location:d.location||"N/A",salary:d.salary||"N/A",description:d.description||"",requirements:d.requirements||[],application_questions:d.application_questions||[],interview_questions:d.interview_questions||[],company_facts:d.company_facts||[],status:"applied",notes:"",date:new Date().toISOString()};
    jobs.unshift(job);saveJobs();
    document.getElementById("url-input").value="";
    setStatus("add-status","");toast("Job added!","ok");showView("dashboard");
  }catch(e){
    setStatus("add-status","");
    showErr("add-error",e.message?.includes("API_KEY")?"Invalid API key. Check Settings.":"Couldn't analyse that URL. Make sure it's a public job posting.");
  }finally{btn.disabled=false;}
}

function setAddMode(mode){
  document.getElementById("add-mode-url").style.display=mode==="url"?"":"none";
  document.getElementById("add-mode-paste").style.display=mode==="paste"?"":"none";
  document.getElementById("add-tab-url").classList.toggle("active",mode==="url");
  document.getElementById("add-tab-paste").classList.toggle("active",mode==="paste");
}

async function analyseJobText(){
  const raw=document.getElementById("paste-input").value.trim();
  if(!raw||raw.length<30){showErr("paste-error","Please paste the full job ad text (at least a few sentences).");return;}
  const btn=document.getElementById("analyse-paste-btn");
  btn.disabled=true;setStatus("paste-status","<span class='spinner'></span> Analysing job ad...");clearErr("paste-error");
  try{
    // Sanitise: collapse whitespace, limit length to avoid token overflow
    const sanitised=raw.replace(/\r\n/g,"\n").substring(0,8000);
    const systemMsg='You are a job posting analyser. You MUST respond with ONLY a raw JSON object. No markdown, no backticks, no commentary, no text before or after the JSON. Just the JSON object.';
    const prompt='Extract structured information from this job advertisement text. If any field is not mentioned in the text, use "N/A" for strings or empty arrays for lists. Infer the company name and other details from context if not explicitly stated.\n\nIMPORTANT: Separate the job ad\'s own screening/application questions (like notice period, work rights, availability, salary expectations, licences) from interview preparation questions you generate to help the applicant practise.\n\nJOB AD TEXT:\n"""\n'+sanitised+'\n"""\n\nRespond with ONLY this JSON structure (no other text):\n{"title":"job title","company":"company name","location":"city or region","salary":"salary if mentioned","description":"2-3 sentence summary of the role","requirements":["requirement 1","requirement 2","requirement 3"],"application_questions":[{"question":"screening question from the job ad itself"}],"interview_questions":[{"type":"Behavioral","question":"AI-generated practice question","answer":"A strong 3-4 sentence suggested answer using STAR method where appropriate"},{"type":"Technical","question":"...","answer":"..."},{"type":"Role-Specific","question":"...","answer":"..."},{"type":"Situational","question":"...","answer":"..."},{"type":"Culture Fit","question":"...","answer":"..."}],"company_facts":[{"label":"Industry","value":"..."},{"label":"Size","value":"..."},{"label":"Known For","value":"..."},{"label":"Culture","value":"..."}]}';
    const text=await callGemini(prompt,systemMsg);
    const d=parseJSON(text);
    const job={id:Date.now(),url:"",title:d.title||"Unknown Title",company:d.company||"Unknown Company",location:d.location||"N/A",salary:d.salary||"N/A",description:d.description||"",requirements:d.requirements||[],application_questions:d.application_questions||[],interview_questions:d.interview_questions||[],company_facts:d.company_facts||[],status:"saved",notes:"",date:new Date().toISOString(),rawText:raw};
    jobs.unshift(job);saveJobs();
    document.getElementById("paste-input").value="";
    setStatus("paste-status","");toast("Job added!","ok");showView("dashboard");
  }catch(e){
    setStatus("paste-status","");
    const msg=e.message||"";
    if(msg.includes("API_KEY")||msg.includes("API key"))showErr("paste-error","Invalid API key. Check Settings.");
    else if(msg.includes("quota")||msg.includes("429"))showErr("paste-error","API rate limit hit. Wait a moment and try again.");
    else showErr("paste-error","Analysis failed: "+msg+". Try pasting a longer or cleaner version of the ad.");
  }finally{btn.disabled=false;}
}

function renderCVJobList(){
  const el=document.getElementById("cv-job-list");
  if(!jobs.length){el.innerHTML='<p style="font-size:13px;color:var(--muted);padding:6px 0;">No jobs added yet.</p>';return;}
  el.innerHTML=jobs.map(j=>`<div class="job-pick ${selectedCvJobId===j.id?"sel":""}" onclick="selCvJob(${j.id})">
    <input type="radio" name="cvj" ${selectedCvJobId===j.id?"checked":""} style="accent-color:var(--accent);width:14px;height:14px;flex-shrink:0;">
    <span style="font-size:13px;"><strong>${esc(j.title)}</strong> <span style="color:var(--muted)">\u2014 ${esc(j.company)}</span></span></div>`).join("");
}
function selCvJob(id){selectedCvJobId=id;renderCVJobList();}

async function analyseCV(){
  if(!selectedCvJobId){showErr("cv-error","Please select a job first.");return;}
  const cv=document.getElementById("cv-text").value.trim();
  if(!cv){showErr("cv-error","Please paste your CV first.");return;}
  const job=jobs.find(j=>j.id===selectedCvJobId);if(!job)return;
  clearErr("cv-error");document.getElementById("cv-btn").disabled=true;document.getElementById("cv-result").innerHTML="";
  setStatus("cv-status","<span class='spinner'></span> Analysing your CV...");
  try{
    const text=await callGemini('Analyse how well this CV matches the job. Return ONLY raw JSON.\nJOB: '+job.title+' at '+job.company+'\nDESCRIPTION: '+job.description+'\nREQUIREMENTS: '+(job.requirements||[]).join(", ")+'\nCV:\n'+cv+'\nReturn exactly:\n{"score":75,"summary":"one sentence","strengths":["s1","s2","s3"],"gaps":["g1","g2","g3"],"skills_match":"brief","experience_match":"brief","recommendation":"one tip"}',"You are an expert recruitment analyst. Return raw JSON only.");
    const d=parseJSON(text);const sc=parseInt(d.score)||0;const col=scoreColor(sc);
    jobs=jobs.map(j=>j.id===selectedCvJobId?{...j,matchScore:sc}:j);saveJobs();
    setStatus("cv-status","");
    document.getElementById("cv-result").innerHTML='<div class="match-result">'+
      '<div style="display:flex;align-items:flex-end;gap:14px;margin-bottom:5px;">'+
        '<div class="score-big" style="color:'+col+'">'+sc+'<span style="font-size:22px;color:var(--muted)">%</span></div>'+
        '<div style="flex:1;padding-bottom:3px;"><p style="font-size:13px;color:var(--muted);margin-bottom:7px;">'+esc(d.summary||"")+'</p>'+
        '<div class="bar-outer"><div class="bar-inner" id="score-bar" style="width:0%;background:'+col+'"></div></div></div>'+
      '</div>'+
      '<div class="match-grid">'+
        '<div class="match-box"><strong>Strengths</strong>'+(d.strengths||[]).map(s=>'<div style="font-size:12px;color:var(--muted);padding:3px 0;border-bottom:1px solid var(--border)">+ '+esc(s)+'</div>').join("")+'</div>'+
        '<div class="match-box"><strong>Gaps</strong>'+(d.gaps||[]).map(g=>'<div style="font-size:12px;color:var(--muted);padding:3px 0;border-bottom:1px solid var(--border)">- '+esc(g)+'</div>').join("")+'</div>'+
        '<div class="match-box"><strong>Skills Match</strong><p style="font-size:12px;color:var(--text);margin-top:4px;">'+esc(d.skills_match||"")+'</p></div>'+
        '<div class="match-box"><strong>Experience Match</strong><p style="font-size:12px;color:var(--text);margin-top:4px;">'+esc(d.experience_match||"")+'</p></div>'+
      '</div>'+
      (d.recommendation?'<div style="margin-top:11px;padding:12px 14px;background:rgba(232,184,75,0.07);border:1px solid rgba(232,184,75,0.2);border-radius:9px;font-size:13px;"><strong>Tip:</strong> '+esc(d.recommendation)+'</div>':"")+
      '<div style="margin-top:9px;font-size:12px;color:var(--green);">Score saved to "'+esc(job.title)+'"</div></div>';
    setTimeout(()=>{const b=document.getElementById("score-bar");if(b)b.style.width=sc+"%";},80);
  }catch(e){
    setStatus("cv-status","");showErr("cv-error","Couldn't analyse CV. Please try again.");
  }finally{document.getElementById("cv-btn").disabled=false;}
}

// -- File Upload: PDF + DOCX + TXT --
function triggerUpload(type){document.getElementById(type+"-file-upload").click();}

async function handleDocUpload(e,type){
  const file=e.target.files[0];if(!file)return;
  const bar=document.getElementById(type+"-upload-bar");
  bar.style.display="block";
  try{
    const ext=file.name.split(".").pop().toLowerCase();
    let text="";
    if(ext==="pdf"){
      text=await extractPDF(file);
      // Also render the PDF visually for resume uploads
      if(type==="resume"){await renderPDFPages(file);}
    }
    else if(ext==="docx"||ext==="doc"){text=await extractDOCX(file);}
    else{text=await readAsText(file);}
    document.getElementById(type+"-textarea").value=text.trim();
    if(!document.getElementById(type+"-name-input").value)
      document.getElementById(type+"-name-input").value=file.name.replace(/\.[^.]+$/,"");
    updateWordCount(type);
    const wc=text.split(/\s+/).filter(Boolean).length;
    toast(file.name+" loaded ("+wc+" words)","ok");
    // Auto-switch to preview after upload to show the formatted version
    setEditorMode(type,'preview');
  }catch(err){toast("Couldn't read file: "+err.message,"err");}
  finally{bar.style.display="none";e.target.value="";}
}

async function renderPDFPages(file){
  const viewer=document.getElementById("resume-pdf-viewer");
  const container=document.getElementById("resume-pdf-pages");
  if(!viewer||!container)return;
  container.innerHTML='<p style="color:var(--muted);font-size:13px;">Rendering pages...</p>';
  viewer.style.display="block";
  try{
    const ab=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:ab}).promise;
    container.innerHTML='';
    const scale=1.0;
    for(let i=1;i<=Math.min(pdf.numPages,5);i++){
      const page=await pdf.getPage(i);
      const vp=page.getViewport({scale:scale});
      const canvas=document.createElement('canvas');
      canvas.width=vp.width;canvas.height=vp.height;
      // Constrain to container width, not 100%
      const maxW=container.clientWidth-8;
      if(vp.width>maxW){canvas.style.width=maxW+'px';canvas.style.height='auto';}
      else{canvas.style.width=vp.width+'px';canvas.style.height='auto';}
      const ctx=canvas.getContext('2d');
      await page.render({canvasContext:ctx,viewport:vp}).promise;
      container.appendChild(canvas);
      if(i===1&&pdf.numPages>1){
        const label=document.createElement('p');
        label.style.cssText='text-align:center;font-size:11px;color:var(--muted);margin:-8px 0 12px;';
        label.textContent='Page '+i+' of '+pdf.numPages;
        container.appendChild(label);
      }
    }
    if(pdf.numPages>5){
      const note=document.createElement('p');
      note.style.cssText='text-align:center;font-size:12px;color:var(--muted);margin-top:8px;';
      note.textContent='Showing first 5 of '+pdf.numPages+' pages';
      container.appendChild(note);
    }
  }catch(err){container.innerHTML='<p style="color:var(--red);font-size:13px;">Could not render PDF preview.</p>';}
}

function readAsText(file){
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=ev=>res(ev.target.result);
    r.onerror=()=>rej(new Error("Could not read file"));
    r.readAsText(file);
  });
}

async function extractPDF(file){
  if(typeof pdfjsLib==="undefined")throw new Error("PDF library not loaded. Please refresh.");
  const ab=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:ab}).promise;
  let full="";
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    full+=content.items.map(it=>it.str).join(" ")+"\n\n";
  }
  if(!full.trim())throw new Error("No text found in PDF (may be a scanned image).");
  return full;
}

async function extractDOCX(file){
  if(typeof mammoth==="undefined")throw new Error("DOCX library not loaded. Please refresh.");
  const ab=await file.arrayBuffer();
  const result=await mammoth.extractRawText({arrayBuffer:ab});
  if(!result.value.trim())throw new Error("No text found in document.");
  return result.value;
}

// -- Documents --
function renderResumeList(){
  document.getElementById("resume-list-view").style.display="";
  document.getElementById("resume-editor-view").style.display="none";
  const el=document.getElementById("resume-list");
  if(!resumes.length){el.innerHTML='<div class="doc-empty">No resumes saved yet.<br><span style="font-size:12px;">Click <strong>New Resume</strong> to paste or upload one, or<br><strong>Generate from Scratch</strong> to have AI build one for you.</span></div>';return;}
  el.innerHTML=resumes.map(r=>'<div class="doc-item">'+
    '<div class="doc-info"><div class="doc-name">'+esc(r.name)+'</div>'+
    '<div class="doc-meta">'+(r.wordCount||0)+' words \u00B7 Last edited '+new Date(r.updated).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})+'</div></div>'+
    '<div class="doc-actions">'+
      '<button class="btn btn-primary btn-sm" onclick="viewDocument(\'resume\','+r.id+')">View</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="editDocument(\'resume\','+r.id+')">Edit</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="duplicateResumeById('+r.id+')">Duplicate</button>'+
      '<button class="btn btn-danger btn-sm" onclick="deleteDocument(\'resume\','+r.id+')">Delete</button>'+
    '</div></div>').join("");
}

function newDocument(type){
  editingDocId[type]=null;
  document.getElementById(type+"-name-input").value="";
  document.getElementById(type+"-textarea").value="";
  updateWordCount(type);
  document.getElementById(type+"-list-view").style.display="none";
  document.getElementById(type+"-editor-view").style.display="";
  if(type==="cover")populateCoverJobSelect();
  if(type==="resume")populateResumeJobSelect();
}

function editDocument(type,id){
  const list=type==="resume"?resumes:covers;
  const doc=list.find(d=>d.id===id);if(!doc)return;
  editingDocId[type]=id;
  document.getElementById(type+"-name-input").value=doc.name;
  document.getElementById(type+"-textarea").value=doc.content;
  updateWordCount(type);
  document.getElementById(type+"-list-view").style.display="none";
  document.getElementById(type+"-editor-view").style.display="";
  if(type==="cover")populateCoverJobSelect();
  if(type==="resume")populateResumeJobSelect();
}

function viewDocument(type,id){
  editDocument(type,id);
  setTimeout(()=>setEditorMode(type,'preview'),50);
}

function saveDocument(type){
  const name=document.getElementById(type+"-name-input").value.trim();
  const content=document.getElementById(type+"-textarea").value.trim();
  if(!name){toast("Please enter a name","err");return;}
  if(!content){toast("Document is empty","err");return;}
  const wordCount=content.split(/\s+/).filter(Boolean).length;
  const now=new Date().toISOString();
  if(type==="resume"){
    if(editingDocId.resume)resumes=resumes.map(r=>r.id===editingDocId.resume?{...r,name:name,content:content,wordCount:wordCount,updated:now}:r);
    else resumes.unshift({id:Date.now(),name:name,content:content,wordCount:wordCount,created:now,updated:now});
    saveResumes();
  }else{
    if(editingDocId.cover)covers=covers.map(c=>c.id===editingDocId.cover?{...c,name:name,content:content,wordCount:wordCount,updated:now}:c);
    else covers.unshift({id:Date.now(),name:name,content:content,wordCount:wordCount,created:now,updated:now});
    saveCovers();
  }
  toast((type==="resume"?"Resume":"Cover letter")+" saved!","ok");
  closeDocEditor(type);
}

function deleteDocument(type,id){
  if(!confirm("Delete this document? This cannot be undone."))return;
  if(type==="resume"){resumes=resumes.filter(r=>r.id!==id);saveResumes();renderResumeList();}
  else{covers=covers.filter(c=>c.id!==id);saveCovers();renderCoverList();}
  toast("Deleted","ok");
}

function closeDocEditor(type){
  document.getElementById(type+"-list-view").style.display="";
  document.getElementById(type+"-editor-view").style.display="none";
  document.getElementById(type+"-ai-panel").style.display="none";
  // Reset to edit mode
  setEditorMode(type,'edit');
  editingDocId[type]=null;
  if(type==="resume")renderResumeList();else renderCoverList();
}

function updateWordCount(type){
  const val=document.getElementById(type+"-textarea")?.value||"";
  const wc=val.split(/\s+/).filter(Boolean).length;
  const el=document.getElementById(type+"-wordcount");
  if(el)el.textContent=wc+" words";
}
["resume","cover"].forEach(t=>{setTimeout(()=>{const ta=document.getElementById(t+"-textarea");if(ta)ta.addEventListener("input",()=>updateWordCount(t));},100);});

function renderCoverList(){
  document.getElementById("cover-list-view").style.display="";
  document.getElementById("cover-editor-view").style.display="none";
  const el=document.getElementById("cover-list");
  if(!covers.length){el.innerHTML='<div class="doc-empty">No cover letters saved yet.<br><span style="font-size:12px;">Click <strong>New Cover Letter</strong> or <strong>Generate from Job</strong> to get started.</span></div>';return;}
  el.innerHTML=covers.map(c=>'<div class="doc-item">'+
    '<div class="doc-info"><div class="doc-name">'+esc(c.name)+'</div>'+
    '<div class="doc-meta">'+(c.wordCount||0)+' words \u00B7 Last edited '+new Date(c.updated).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})+'</div></div>'+
    '<div class="doc-actions">'+
      '<button class="btn btn-primary btn-sm" onclick="viewDocument(\'cover\','+c.id+')">View</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="editDocument(\'cover\','+c.id+')">Edit</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="duplicateCoverById('+c.id+')">Duplicate</button>'+
      '<button class="btn btn-danger btn-sm" onclick="deleteDocument(\'cover\','+c.id+')">Delete</button>'+
    '</div></div>').join("");
}

/* FIX 1: Changed outer quotes from " to ' to avoid collision with value="" */
function populateCoverJobSelect(){
  const sel=document.getElementById("cover-job-select");
  sel.innerHTML='<option value="">No specific job</option>'+jobs.map(j=>'<option value="'+j.id+'">'+esc(j.title)+' \u2014 '+esc(j.company)+'</option>').join("");
  const rsel=document.getElementById("cover-resume-select");
  if(rsel)rsel.innerHTML='<option value="">No resume</option>'+resumes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join("");
}

function duplicateCover(){
  const content=document.getElementById("cover-textarea").value;
  const name=document.getElementById("cover-name-input").value;
  if(!content){toast("Nothing to duplicate","err");return;}
  const now=new Date().toISOString();
  covers.unshift({id:Date.now(),name:"Copy of "+name,content:content,wordCount:content.split(/\s+/).filter(Boolean).length,created:now,updated:now});
  saveCovers();toast("Duplicated!","ok");
}
function duplicateCoverById(id){
  const c=covers.find(x=>x.id===id);if(!c)return;
  const now=new Date().toISOString();
  covers.unshift({id:Date.now(),name:"Copy of "+c.name,content:c.content,wordCount:c.wordCount,created:now,updated:now});
  saveCovers();renderCoverList();toast("Duplicated!","ok");
}

function newDocumentFromJob(){
  if(!jobs.length){toast("Add some jobs first","err");return;}
  document.getElementById("gen-job-select").innerHTML=jobs.map(j=>'<option value="'+j.id+'">'+esc(j.title)+' \u2014 '+esc(j.company)+'</option>').join("");
  /* FIX 2: Changed outer quotes from " to ' */
  document.getElementById("gen-resume-select").innerHTML='<option value="">Paste manually below</option>'+resumes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join("");
  document.getElementById("gen-resume-text").value="";document.getElementById("gen-extra").value="";
  clearErr("gen-error");document.getElementById("gen-status").textContent="";document.getElementById("gen-btn").disabled=false;
  document.getElementById("gen-modal").style.display="flex";
}
function closeGenModal(){document.getElementById("gen-modal").style.display="none";}
function fillResumeFromSaved(){
  const id=parseInt(document.getElementById("gen-resume-select").value);if(!id)return;
  const r=resumes.find(x=>x.id===id);if(r)document.getElementById("gen-resume-text").value=r.content;
}

async function generateCoverLetter(){
  const jobId=parseInt(document.getElementById("gen-job-select").value);
  const job=jobs.find(j=>j.id===jobId);
  const resumeText=document.getElementById("gen-resume-text").value.trim();
  const extra=document.getElementById("gen-extra").value.trim();
  if(!job){showErr("gen-error","Please select a job.");return;}
  if(!resumeText){showErr("gen-error","Please paste or select your resume.");return;}
  clearErr("gen-error");
  const btn=document.getElementById("gen-btn");btn.disabled=true;
  document.getElementById("gen-status").innerHTML="<span class='spinner'></span> Writing your cover letter...";
  try{
    const today=new Date().toLocaleDateString("en-AU",{day:"numeric",month:"long",year:"numeric"});
    const coverText=await callGemini('Write a compelling, tailored cover letter for this job application.\n\nTODAY\'S DATE: '+today+'\nJOB TITLE: '+job.title+'\nCOMPANY: '+job.company+'\nLOCATION: '+job.location+'\nJOB DESCRIPTION: '+job.description+'\nKEY REQUIREMENTS: '+(job.requirements||[]).join(", ")+'\n\nCANDIDATE RESUME:\n'+resumeText+'\n\n'+(extra?"ADDITIONAL INSTRUCTIONS: "+extra+"\n\n":"")+'Write a professional cover letter tailored to this role. Use Australian spelling. Use the date provided above â€” never invent a date. Return only the cover letter text.',SYDNEY_RECRUITER);
    document.getElementById("gen-status").textContent="";closeGenModal();
    // Auto-save immediately
    const now=new Date().toISOString();
    const docName=job.title+' \u2014 '+job.company;
    const content=coverText.trim();
    const wc=content.split(/\s+/).filter(Boolean).length;
    const newDoc={id:Date.now(),name:docName,content:content,wordCount:wc,created:now,updated:now};
    covers.unshift(newDoc);saveCovers();
    // Open in editor
    editDocument('cover',newDoc.id);
    showView("covers");
    // Re-show editor since showView hides it
    document.getElementById("cover-list-view").style.display="none";
    document.getElementById("cover-editor-view").style.display="";
    toast("Cover letter generated and saved!","ok");
    // Auto-show preview so user sees the polished version
    setTimeout(()=>setEditorMode('cover','preview'),100);
  }catch(e){
    document.getElementById("gen-status").textContent="";showErr("gen-error","Generation failed: "+(e.message||"Please try again."));
  }finally{btn.disabled=false;}
}

function toggleAIPanel(type){const panel=document.getElementById(type+"-ai-panel");panel.style.display=panel.style.display==="none"?"":"none";}
function setInstruction(type,text){document.getElementById(type+"-ai-instruction").value=text;}

function setEditorMode(type,mode){
  document.getElementById(type+"-edit-mode").style.display=mode==="edit"?"":"none";
  document.getElementById(type+"-preview-mode").style.display=mode==="preview"?"":"none";
  document.getElementById(type+"-mode-edit").classList.toggle("active",mode==="edit");
  document.getElementById(type+"-mode-preview").classList.toggle("active",mode==="preview");
  if(mode==="preview"){
    refreshPreview(type);
  }
}

function refreshPreview(type){
  const text=document.getElementById(type+"-textarea").value;
  const el=document.getElementById(type+"-preview-content");
  const tpl=type==="resume"?resumeTemplate:coverTemplate;
  el.className='doc-preview tpl-'+tpl;
  if(type==="resume")el.innerHTML=renderResumePreview(text);
  else el.innerHTML=renderCoverPreview(text);
  // Inject per-paragraph TTS buttons
  el.querySelectorAll('p,.summary,.cover-body p,h1,h2,.contact-line,.role-header,.skills-grid,.cover-greeting,.cover-sign,.cover-date').forEach(node=>{
    const txt=node.textContent.trim();
    if(txt.length>2){
      const btn=document.createElement('button');
      btn.className='tts-btn';
      btn.innerHTML='&#128264;';
      btn.title='Read aloud';
      btn.setAttribute('aria-label','Read this section aloud');
      btn.onclick=function(e){e.stopPropagation();ttsSpeak(btn,txt);};
      btn.style.cssText='float:right;margin-top:2px;';
      node.insertBefore(btn,node.firstChild);
    }
  });
}

function setResumeTemplate(tpl){
  resumeTemplate=tpl;storeSet("jt_resume_tpl",tpl);
  ["modern","classic","minimal","executive"].forEach(t=>{
    const btn=document.getElementById("rtpl-"+t);
    if(btn)btn.classList.toggle("active",t===tpl);
  });
  refreshPreview("resume");
}

function setCoverTemplate(tpl){
  coverTemplate=tpl;storeSet("jt_cover_tpl",tpl);
  ["modern","classic","minimal","executive"].forEach(t=>{
    const btn=document.getElementById("ctpl-"+t);
    if(btn)btn.classList.toggle("active",t===tpl);
  });
  refreshPreview("cover");
}

async function downloadDoc(type,format){
  const text=document.getElementById(type+"-textarea").value.trim();
  if(!text){toast("Document is empty","err");return;}
  const docName=(document.getElementById(type+"-name-input").value.trim()||type).replace(/[^a-zA-Z0-9\s\-_]/g,'');
  // Ensure preview is rendered for PDF capture
  const previewEl=document.getElementById(type+"-preview-content");
  if(type==="resume")previewEl.innerHTML=renderResumePreview(text);
  else previewEl.innerHTML=renderCoverPreview(text);

  if(format==="pdf"){
    toast("Generating PDF...","ok");
    const tpl=type==="resume"?resumeTemplate:coverTemplate;
    // Create an off-screen container for capture
    const wrap=document.createElement('div');
    wrap.style.cssText='position:fixed;top:-9999px;left:0;width:794px;background:#fff;padding:52px 56px;font-family:DM Sans,sans-serif;';
    wrap.className='doc-preview tpl-'+tpl;
    wrap.innerHTML=previewEl.innerHTML;
    document.body.appendChild(wrap);
    try{
      const canvas=await html2canvas(wrap,{scale:2,useCORS:true,backgroundColor:'#ffffff',width:794});
      const imgData=canvas.toDataURL('image/jpeg',0.95);
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF('p','mm','a4');
      const pdfW=pdf.internal.pageSize.getWidth();
      const pdfH=pdf.internal.pageSize.getHeight();
      const margin=0;
      const imgW=pdfW-margin*2;
      const imgH=(canvas.height*imgW)/canvas.width;
      // Handle multi-page
      let y=0;
      const pageH=pdfH-margin*2;
      while(y<imgH){
        if(y>0)pdf.addPage();
        pdf.addImage(imgData,'JPEG',margin,-y+margin,imgW,imgH);
        y+=pageH;
      }
      pdf.save(docName+'.pdf');
      toast("PDF downloaded!","ok");
    }catch(e){toast("PDF export failed: "+e.message,"err");}
    finally{document.body.removeChild(wrap);}
  }else if(format==="docx"){
    toast("Generating DOCX...","ok");
    try{
      const htmlContent=buildDocxHTML(type,text);
      const blob=generateDocxBlob(htmlContent);
      const link=document.createElement('a');
      link.href=URL.createObjectURL(blob);
      link.download=docName+'.docx';
      link.click();URL.revokeObjectURL(link.href);
      toast("DOCX downloaded!","ok");
    }catch(e){toast("DOCX export failed: "+e.message,"err");}
  }
}

function buildDocxHTML(type,text){
  const lines=text.split('\n');
  let html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><link rel="stylesheet" href="modules/style.css"></head><body>';

  if(type==="resume"){
    let firstHeading=true;
    for(let i=0;i<lines.length;i++){
      const t=lines[i].trim();
      if(!t)continue;
      const next=(lines[i+1]||'').trim();
      const isAllCaps=t.length>2&&t===t.toUpperCase()&&/[A-Z]/.test(t)&&!/^[\u2022\-\*\d]/.test(t);
      const isDash=/^[-=]{3,}$/.test(next);
      if(isAllCaps||isDash){
        if(firstHeading&&i<3){html+='<h1>'+esc(t)+'</h1>';firstHeading=false;}
        else{html+='<h2>'+esc(t.replace(/[-=:]+$/,'').trim())+'</h2>';}
        if(isDash)i++;continue;
      }
      if(i<5&&(t.includes('|')||t.includes('@'))&&!firstHeading){html+='<p class="contact">'+esc(t)+'</p>';continue;}
      if(/^[\u2022\-\*]\s/.test(t)){html+='<ul><li>'+esc(t.replace(/^[\u2022\-\*]\s*/,''))+'</li></ul>';continue;}
      if(t.includes('|')&&t.split('|').length>=2){
        const parts=t.split('|').map(p=>p.trim());
        const last=parts[parts.length-1];
        if(/\d{4}|present|current/i.test(last)){
          html+='<p class="role-line"><span class="role-title">'+esc(parts.slice(0,-1).join(' â€” '))+'</span> <span class="role-date">'+esc(last)+'</span></p>';
        }else{html+='<h3>'+esc(t)+'</h3>';}
        continue;
      }
      if((t.match(/,/g)||[]).length>=4&&t.length<300){
        html+='<p class="skills">'+t.split(',').map(s=>'<span class="skill">'+esc(s.trim())+'</span>').join(' ')+'</p>';continue;
      }
      if(t.length<60&&!t.includes('.')&&/[A-Z]/.test(t[0])){html+='<h3>'+esc(t)+'</h3>';}
      else{html+='<p>'+esc(t)+'</p>';}
    }
  }else{
    for(const line of lines){
      const t=line.trim();
      if(!t){html+='<br>';continue;}
      html+='<p>'+esc(t)+'</p>';
    }
  }
  html+='</body></html>';
  return html;
}

function generateDocxBlob(htmlContent){
  // Use the HTML-in-MHTML trick for Word-compatible DOCX
  const header='MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="----=_NextPart"\r\n\r\n------=_NextPart\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n';
  const footer='\r\n------=_NextPart--';
  const mhtml=header+htmlContent+footer;
  return new Blob([mhtml],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

function renderResumePreview(text){
  if(!text.trim())return '<p style="color:#999;text-align:center;padding:40px;">Nothing to preview yet.</p>';
  const lines=text.split('\n');
  let html='';
  let firstHeading=true;
  let inList=false;
  let summaryDone=false;
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const trimmed=line.trim();
    if(!trimmed){
      if(inList){html+='</ul>';inList=false;}
      continue;
    }
    // Detect section headers: ALL CAPS lines, or lines followed by dashes/equals
    const nextLine=(lines[i+1]||'').trim();
    const isAllCaps=trimmed.length>2&&trimmed===trimmed.toUpperCase()&&/[A-Z]/.test(trimmed)&&!/^[\u2022\-\*\d]/.test(trimmed);
    const isDashUnderline=/^[-=]{3,}$/.test(nextLine);
    // Also detect lines ending with colon as headers
    const isColonHeader=trimmed.length<50&&trimmed.endsWith(':')&&/[A-Z]/.test(trimmed[0])&&!trimmed.includes(',');
    if(isAllCaps||isDashUnderline||isColonHeader){
      if(inList){html+='</ul>';inList=false;}
      if(firstHeading&&i<3){
        html+='<h1>'+esc(trimmed)+'</h1>';
        firstHeading=false;
      }else{
        const cleaned=trimmed.replace(/[-=:]+$/,'').trim();
        html+='<h2>'+esc(cleaned)+'</h2>';
        // Check if next content looks like a summary/profile paragraph
        if(!summaryDone&&/summary|profile|objective|about/i.test(cleaned)){
          summaryDone=true;
          // Collect paragraph lines after this header
          let summaryLines=[];
          let si=isDashUnderline?i+2:i+1;
          while(si<lines.length&&lines[si].trim()&&!/^[\u2022\-\*]/.test(lines[si].trim())&&!(lines[si].trim()===lines[si].trim().toUpperCase()&&lines[si].trim().length>2)){
            summaryLines.push(lines[si].trim());si++;
          }
          if(summaryLines.length){
            const summaryText=summaryLines.join(' ');
            html+='<div class="summary">'+summaryLines.map(l=>esc(l)).join(' ')+ttsBtnHTML(summaryText)+'</div>';
            i=si-1;if(isDashUnderline)i=Math.max(i,i);
            continue;
          }
        }
      }
      if(isDashUnderline)i++;
      continue;
    }
    // Skip dash-only lines
    if(/^[-=]{3,}$/.test(trimmed)){continue;}
    // Contact info line (near top, contains | or multiple commas or email)
    if(i<6&&(trimmed.includes('|')||trimmed.includes('@')||(trimmed.match(/,/g)||[]).length>=2)&&!firstHeading){
      if(inList){html+='</ul>';inList=false;}
      // Format contact with separators
      const formatted=esc(trimmed).replace(/\s*\|\s*/g,'<span class="sep">\u2022</span>');
      html+='<div class="contact-line">'+formatted+ttsBtnHTML(trimmed)+'</div>';
      continue;
    }
    // Bullet points (including numbered bullets)
    if(/^[\u2022\-\*]\s/.test(trimmed)||/^\d+[\.\)]\s/.test(trimmed)){
      if(!inList){html+='<ul>';inList=true;}
      html+='<li>'+esc(trimmed.replace(/^[\u2022\-\*]\s*|^\d+[\.\)]\s*/,''))+'</li>';
      continue;
    }
    // Role headers: Company | Title | Date patterns, or "Title â€” Company" patterns
    if(trimmed.includes('|')&&trimmed.split('|').length>=2){
      if(inList){html+='</ul>';inList=false;}
      const parts=trimmed.split('|').map(p=>p.trim());
      const lastPart=parts[parts.length-1];
      const hasDate=/\d{4}|present|current/i.test(lastPart);
      if(hasDate&&parts.length>=2){
        html+='<div class="role-header"><span class="role-title">'+esc(parts.slice(0,-1).join(' \u2014 '))+'</span><span class="role-date">'+esc(lastPart)+'</span></div>';
      }else{
        html+='<h3>'+esc(trimmed)+'</h3>';
      }
      continue;
    }
    // Detect date ranges on their own line or role-date patterns
    if(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b/i.test(trimmed)&&/\d{4}/.test(trimmed)&&trimmed.length<60){
      if(inList){html+='</ul>';inList=false;}
      html+='<div style="font-size:12px;color:#999;margin:2px 0;letter-spacing:0.3px;">'+esc(trimmed)+'</div>';
      continue;
    }
    // Skills lists (comma-separated, many items)
    if((trimmed.match(/,/g)||[]).length>=4&&trimmed.length<400){
      if(inList){html+='</ul>';inList=false;}
      const skills=trimmed.split(',').map(s=>s.trim()).filter(Boolean);
      html+='<div class="skills-grid">'+skills.map(s=>'<span class="skill-tag">'+esc(s)+'</span>').join('')+'</div>';
      continue;
    }
    // Default: paragraph or sub-header
    if(inList){html+='</ul>';inList=false;}
    if(trimmed.length<60&&!trimmed.includes('.')&&/[A-Z]/.test(trimmed[0])&&!/^(I |A |The |An |My |In |At |To |For |With )/.test(trimmed)){
      html+='<h3>'+esc(trimmed)+'</h3>';
    }else{
      html+='<p>'+esc(trimmed)+ttsBtnHTML(trimmed)+'</p>';
    }
  }
  if(inList)html+='</ul>';
  return html;
}

function renderCoverPreview(text){
  if(!text.trim())return '<p style="color:#999;text-align:center;padding:40px;">Nothing to preview yet.</p>';
  const lines=text.split('\n');
  let html='';
  let bodyStarted=false;
  let headerLines=[];
  let greetingFound=false;

  // First pass: collect pre-greeting header lines
  for(let i=0;i<lines.length;i++){
    const trimmed=lines[i].trim();
    if(!trimmed)continue;
    if(/^(dear|hi|hello|to whom|attention)/i.test(trimmed)){greetingFound=true;break;}
    headerLines.push({line:trimmed,index:i});
  }

  // Render header block if we have pre-greeting content
  if(headerLines.length>0){
    html+='<div class="cover-header-block">';
    for(const h of headerLines){
      const t=h.line;
      if(t.includes('@')||t.includes('|')){
        const formatted=esc(t).replace(/\s*\|\s*/g,'<span style="color:#2ec4b6;margin:0 8px;">\u2022</span>');
        html+='<div style="font-size:12px;color:#666;letter-spacing:0.3px;">'+formatted+'</div>';
      }else if(h===headerLines[0]&&!t.includes(',')&&t.length<60){
        html+='<h1 style="font-size:22px;margin-bottom:2px;">'+esc(t)+'</h1>';
      }else{
        html+='<div style="font-size:13px;color:#555;">'+esc(t)+'</div>';
      }
    }
    html+='</div>';
  }

  // Second pass: render body
  for(let i=0;i<lines.length;i++){
    const trimmed=lines[i].trim();
    if(!trimmed){
      if(bodyStarted)html+='';
      continue;
    }
    // Skip lines already rendered in header
    if(!bodyStarted&&headerLines.some(h=>h.index===i))continue;

    // Detect date line
    if(!bodyStarted&&/\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4}/.test(trimmed)){
      html+='<div class="cover-date">'+esc(trimmed)+'</div>';
      continue;
    }
    // Addressee lines before greeting
    if(!bodyStarted&&!greetingFound){continue;}
    // Greeting
    if(!bodyStarted&&/^(dear|hi|hello|to whom|attention)/i.test(trimmed)){
      html+='<div class="cover-greeting">'+esc(trimmed)+'</div><div class="cover-body">';
      bodyStarted=true;
      continue;
    }
    // Sign-off lines
    if(bodyStarted&&/^(kind regards|regards|sincerely|yours|best|cheers|thank you|thanks|warm regards|warmly)/i.test(trimmed)){
      html+='</div><div class="cover-sign">';
      for(let j=i;j<lines.length;j++){
        const sl=lines[j].trim();
        if(!sl){html+='<br>';continue;}
        if(j===i)html+='<div style="margin-bottom:4px;font-weight:500;">'+esc(sl)+'</div>';
        else if(sl.includes('@')||sl.includes('|'))html+='<div style="font-size:12px;color:#888;">'+esc(sl)+'</div>';
        else html+='<div>'+esc(sl)+'</div>';
      }
      html+='</div>';
      return html;
    }
    if(bodyStarted){
      html+='<p>'+esc(trimmed)+ttsBtnHTML(trimmed)+'</p>';
    }
  }
  if(bodyStarted)html+='</div>';
  // If no greeting was found, just render all as body text
  if(!bodyStarted){
    html='<div class="cover-body">';
    for(const line of lines){
      const t=line.trim();
      if(!t){html+='<br>';continue;}
      html+='<p>'+esc(t)+ttsBtnHTML(t)+'</p>';
    }
    html+='</div>';
  }
  return html;
}

async function aiEditDocument(type){
  const content=document.getElementById(type+"-textarea").value.trim();
  const instruction=document.getElementById(type+"-ai-instruction").value.trim();
  if(!content){toast("Document is empty","err");return;}
  if(!instruction){toast("Please enter an instruction","err");return;}
  let jobContext="";
  let resumeContext="";
  // Both resume and cover letter can target a specific job
  const jobSelectId=type==="resume"?"resume-job-select":"cover-job-select";
  const jobSel=document.getElementById(jobSelectId);
  if(jobSel){
    const jobId=parseInt(jobSel.value);
    if(jobId){const job=jobs.find(j=>j.id===jobId);if(job)jobContext='\n\nTARGET JOB: '+job.title+' at '+job.company+'\nJOB DESCRIPTION: '+job.description+'\nKEY REQUIREMENTS: '+(job.requirements||[]).join(", ");}
  }
  // Cover letters can reference a stored resume
  if(type==="cover"){
    const rsel=document.getElementById("cover-resume-select");
    if(rsel){
      const rid=parseInt(rsel.value);
      if(rid){const r=resumes.find(x=>x.id===rid);if(r)resumeContext='\n\nCANDIDATE RESUME:\n'+r.content;}
    }
  }
  const btn=document.getElementById(type+"-ai-btn");const statusEl=document.getElementById(type+"-ai-status");
  btn.disabled=true;statusEl.innerHTML="<span class='spinner'></span> Rewriting...";
  try{
    const dt=type==="resume"?"resume":"cover letter";
    const systemPrompt=type==="resume"?RESUME_EXPERT:SYDNEY_RECRUITER;
    const rewritten=await callGemini('The candidate has the following '+dt+':\n\n'+content+jobContext+resumeContext+'\n\nYour task: '+instruction+'\n\nReturn only the rewritten '+dt+' text. No commentary, no explanation.',systemPrompt);
    document.getElementById(type+"-textarea").value=rewritten.trim();updateWordCount(type);
    statusEl.textContent="Done!";setTimeout(()=>statusEl.textContent="",2500);
    // Auto-show preview to see the polished result
    setTimeout(()=>setEditorMode(type,'preview'),150);
  }catch(e){statusEl.textContent="Failed. Try again.";setTimeout(()=>statusEl.textContent="",3000);}
  finally{btn.disabled=false;}
}

// -- Resume Generator --
function openResumeGenerator(){
  document.getElementById("rgen-name").value="";
  document.getElementById("rgen-target").value="";
  document.getElementById("rgen-background").value="";
  document.getElementById("rgen-extra").value="";
  document.getElementById("rgen-job-select").innerHTML='<option value="">General resume \u2014 no specific job</option>'+jobs.map(j=>'<option value="'+j.id+'">'+esc(j.title)+' \u2014 '+esc(j.company)+'</option>').join("");
  clearErr("rgen-error");document.getElementById("rgen-status").textContent="";document.getElementById("rgen-btn").disabled=false;
  document.getElementById("resume-gen-modal").style.display="flex";
}

function closeResumeGenModal(){document.getElementById("resume-gen-modal").style.display="none";}

async function generateResume(){
  const name=document.getElementById("rgen-name").value.trim();
  const target=document.getElementById("rgen-target").value.trim();
  const background=document.getElementById("rgen-background").value.trim();
  const extra=document.getElementById("rgen-extra").value.trim();
  if(!background||background.length<50){showErr("rgen-error","Please provide more detail about your background (at least a paragraph).");return;}
  clearErr("rgen-error");
  const btn=document.getElementById("rgen-btn");btn.disabled=true;
  document.getElementById("rgen-status").innerHTML="<span class='spinner'></span> Crafting your resume...";

  let jobContext="";
  const jobId=parseInt(document.getElementById("rgen-job-select").value);
  if(jobId){const job=jobs.find(j=>j.id===jobId);if(job)jobContext='\n\nTARGET JOB TO TAILOR FOR:\nTitle: '+job.title+'\nCompany: '+job.company+'\nDescription: '+job.description+'\nKey Requirements: '+(job.requirements||[]).join(", ");}

  try{
    const prompt='Generate a complete, professional resume from the following information. Create a polished, ready-to-use resume with proper structure and formatting.\n\n'+(name?'CANDIDATE NAME & CONTACT:\n'+name+'\n\n':'')+(target?'TARGET ROLE / INDUSTRY:\n'+target+'\n\n':'')+'BACKGROUND & EXPERIENCE:\n'+background+jobContext+(extra?'\n\nADDITIONAL INSTRUCTIONS: '+extra:'')+'\n\nGenerate the full resume text now. Include all standard sections. Make every bullet achievement-focused with metrics where possible. Return only the resume text.';
    const resumeText=await callGemini(prompt,RESUME_EXPERT);
    document.getElementById("rgen-status").textContent="";closeResumeGenModal();
    // Auto-save immediately
    const now=new Date().toISOString();
    const resumeName=target||(name?name.split("|")[0].trim()+" Resume":"New Resume");
    const content=resumeText.trim();
    const wc=content.split(/\s+/).filter(Boolean).length;
    const newDoc={id:Date.now(),name:resumeName,content:content,wordCount:wc,created:now,updated:now};
    resumes.unshift(newDoc);saveResumes();
    // Open in editor
    editDocument('resume',newDoc.id);
    showView("resumes");
    // Re-show editor since showView hides it
    document.getElementById("resume-list-view").style.display="none";
    document.getElementById("resume-editor-view").style.display="";
    toast("Resume generated and saved!","ok");
    // Auto-show preview so user sees the polished version
    setTimeout(()=>setEditorMode('resume','preview'),100);
  }catch(e){
    document.getElementById("rgen-status").textContent="";showErr("rgen-error","Generation failed: "+(e.message||"Please try again."));
  }finally{btn.disabled=false;}
}

function duplicateResume(){
  const content=document.getElementById("resume-textarea").value;
  const name=document.getElementById("resume-name-input").value;
  if(!content){toast("Nothing to duplicate","err");return;}
  const now=new Date().toISOString();
  resumes.unshift({id:Date.now(),name:"Copy of "+name,content:content,wordCount:content.split(/\s+/).filter(Boolean).length,created:now,updated:now});
  saveResumes();toast("Duplicated!","ok");
}

function duplicateResumeById(id){
  const r=resumes.find(x=>x.id===id);if(!r)return;
  const now=new Date().toISOString();
  resumes.unshift({id:Date.now(),name:"Copy of "+r.name,content:r.content,wordCount:r.wordCount,created:now,updated:now});
  saveResumes();renderResumeList();toast("Duplicated!","ok");
}

function populateResumeJobSelect(){
  const sel=document.getElementById("resume-job-select");
  if(sel)sel.innerHTML='<option value="">General \u2014 no specific job</option>'+jobs.map(j=>'<option value="'+j.id+'">'+esc(j.title)+' \u2014 '+esc(j.company)+'</option>').join("");
}

// -- Email Templates --
function renderEmailTemplates(){
  document.getElementById("tpl-grid").innerHTML=EMAIL_TEMPLATES.map(t=>
    '<div class="tpl-card '+(activeTemplate===t.id?"sel":"")+'" onclick="selectTemplate(\''+t.id+'\')">'+
      '<div class="tpl-icon">'+t.icon+'</div>'+
      '<div class="tpl-name">'+t.name+'</div>'+
      '<div class="tpl-desc">'+t.desc+'</div>'+
    '</div>').join("");
  /* FIX 3: Changed outer quotes from " to ' */
  const sel=document.getElementById("email-job-select");
  sel.innerHTML='<option value="">Select a saved job...</option>'+jobs.map(j=>'<option value="'+j.id+'">'+esc(j.title)+' \u2014 '+esc(j.company)+'</option>').join("");
  if(activeTemplate)document.getElementById("email-preview").style.display="";
}

function selectTemplate(id){
  activeTemplate=id;
  const tpl=EMAIL_TEMPLATES.find(t=>t.id===id);if(!tpl)return;
  document.getElementById("email-subject").value=tpl.subject;
  document.getElementById("email-body").value=tpl.body;
  updateEmailWC();
  document.getElementById("email-preview").style.display="";
  document.querySelectorAll(".tpl-card").forEach((c,i)=>c.classList.toggle("sel",EMAIL_TEMPLATES[i]?.id===id));
}

function updateEmailWC(){
  const body=document.getElementById("email-body")?.value||"";
  const el=document.getElementById("email-wordcount");
  if(el)el.textContent=body.split(/\s+/).filter(Boolean).length+" words";
}

async function generateEmailFromJob(){
  const jobId=parseInt(document.getElementById("email-job-select").value);
  if(!jobId){toast("Select a job first","err");return;}
  if(!activeTemplate){toast("Select an email type first","err");return;}
  const job=jobs.find(j=>j.id===jobId);
  const tpl=EMAIL_TEMPLATES.find(t=>t.id===activeTemplate);
  if(!job||!tpl)return;
  const btn=document.getElementById("gen-email-btn");const statusEl=document.getElementById("email-gen-status");
  btn.disabled=true;statusEl.innerHTML="<span class='spinner'></span> Generating...";
  try{
    const result=await callGemini('Write a professional follow-up email.\n\nEMAIL TYPE: '+tpl.name+'\nJOB TITLE: '+job.title+'\nCOMPANY: '+job.company+'\n\nReturn raw JSON only with two fields: {"subject":"email subject","body":"full email body"}',SYDNEY_RECRUITER);
    const data=parseJSON(result);
    document.getElementById("email-subject").value=data.subject||tpl.subject;
    document.getElementById("email-body").value=data.body||tpl.body;
    updateEmailWC();document.getElementById("email-preview").style.display="";
    statusEl.textContent="Done!";setTimeout(()=>statusEl.textContent="",2500);
  }catch(e){statusEl.textContent="Failed. Try again.";setTimeout(()=>statusEl.textContent="",3000);}
  finally{btn.disabled=false;}
}

function copyEmail(){
  const subject=document.getElementById("email-subject").value;
  const body=document.getElementById("email-body").value;
  navigator.clipboard.writeText("Subject: "+subject+"\n\n"+body).then(()=>toast("Copied!","ok")).catch(()=>toast("Please select and copy manually","err"));
}

function saveEmailAsCover(){
  const name=document.getElementById("email-subject").value||"Follow-up Email";
  const content=document.getElementById("email-body").value.trim();
  if(!content){toast("Email is empty","err");return;}
  const now=new Date().toISOString();
  covers.unshift({id:Date.now(),name:name,content:content,wordCount:content.split(/\s+/).filter(Boolean).length,created:now,updated:now});
  saveCovers();toast("Saved to Cover Letters!","ok");
}

document.addEventListener("DOMContentLoaded",()=>{
  const eb=document.getElementById("email-body");
  if(eb)eb.addEventListener("input",updateEmailWC);
});

// -- Modal --
function openModal(id){
  const j=jobs.find(x=>x.id===id);if(!j)return;
  currentJobId=id;
  document.getElementById("m-company").textContent=j.company;
  document.getElementById("m-title").textContent=j.title;
  document.getElementById("m-meta").innerHTML=[
    j.location!=="N/A"?mi("\u{1F4CD}","Location",j.location):"",
    j.salary!=="N/A"?mi("\u{1F4B0}","Salary",j.salary):"",
    mi("\u{1F4C5}","Added",new Date(j.date).toLocaleDateString()),
    j.url?'<div class="meta-item"><span style="font-size:14px">\u{1F517}</span><div><div class="meta-label">Posting</div><div class="meta-val"><a href="'+j.url+'" target="_blank" style="color:var(--accent);text-decoration:none;">View Job</a></div></div></div>':"",
    j.matchScore?'<div class="meta-item"><span style="font-size:14px">\u{1F3AF}</span><div><div class="meta-label">CV Match</div><div class="meta-val" style="color:'+scoreColor(j.matchScore)+';font-weight:700;">'+j.matchScore+'%</div></div></div>':""
  ].join("");
  document.getElementById("m-status").innerHTML=STATUS_ORDER.map(s=>{const m=STATUS[s];const a=j.status===s;return '<button class="status-opt" style="'+(a?'color:'+m.color+';border-color:'+m.color+';background:'+m.color+'18':"")+'" onclick="updateStatus(\''+s+'\')">'+m.label+'</button>';}).join("");
  if(j.description){document.getElementById("m-desc").innerHTML='<p>'+esc(j.description)+ttsBtnHTML(j.description)+'</p>'+((j.requirements||[]).length?'<ul style="padding-left:17px;margin-top:9px;">'+(j.requirements||[]).map(r=>'<li style="font-size:13px;color:var(--muted);margin-bottom:2px;">'+esc(r)+'</li>').join("")+'</ul>':"");document.getElementById("m-desc-sec").style.display="";}
  else document.getElementById("m-desc-sec").style.display="none";
  // Application Questions (screening from job ad)
  if(j.application_questions?.length){document.getElementById("m-app-questions").innerHTML=j.application_questions.map(q=>'<div class="aq-item"><span class="aq-type">Application Question</span>'+esc(q.question)+ttsBtnHTML(q.question)+'</div>').join("");document.getElementById("m-aq-sec").style.display="";}
  else document.getElementById("m-aq-sec").style.display="none";
  // Interview Prep Questions (AI-generated)
  if(j.interview_questions?.length){document.getElementById("m-questions").innerHTML=j.interview_questions.map((q,i)=>'<div class="q-item"><span class="q-type">'+esc(q.type)+'</span>'+esc(q.question)+ttsBtnHTML(q.question)+(q.answer?'<button class="q-toggle" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\';this.textContent=this.nextElementSibling.style.display===\'none\'?\'Show Answer\':\'Hide Answer\'">Show Answer</button><div class="q-answer" style="display:none;">'+esc(q.answer)+ttsBtnHTML(q.answer)+'</div>':'')+'</div>').join("");document.getElementById("m-q-sec").style.display="";}
  else document.getElementById("m-q-sec").style.display="none";
  if(j.company_facts?.length){document.getElementById("m-facts").innerHTML=j.company_facts.map(f=>'<div class="fact-item"><span class="fact-label">'+esc(f.label)+'</span>'+esc(f.value)+ttsBtnHTML(f.label+': '+f.value)+'</div>').join("");document.getElementById("m-facts-sec").style.display="";}
  else document.getElementById("m-facts-sec").style.display="none";
  document.getElementById("m-notes").value=j.notes||"";
  // Interview tracking
  const isec=document.getElementById("m-interview-sec");
  if(j.status==="interview"||j.interviewDate||j.interviewType){
    isec.style.display="";
    document.getElementById("m-interview-date").value=j.interviewDate||"";
    document.getElementById("m-interview-type").value=j.interviewType||"";
    const istat=document.getElementById("m-interview-status");
    if(j.interviewDate){
      const d=new Date(j.interviewDate);const now=new Date();
      if(d>now)istat.innerHTML='<span style="color:var(--purple);">\u{1F4C5} Interview in '+Math.ceil((d-now)/(1000*60*60*24))+' days</span>';
      else istat.innerHTML='<span style="color:var(--green);">\u2705 Interview completed</span>';
    }else istat.textContent="";
  }else{isec.style.display="none";}
  document.getElementById("m-actions").innerHTML=
    '<button class="btn btn-primary" onclick="saveNotes()">Save Notes</button>'+
    (j.url?'<a href="'+j.url+'" target="_blank" class="btn btn-ghost">Open Job</a>':'')+
    '<button class="btn btn-ghost btn-sm" onclick="quickGenCoverFromModal('+j.id+')">Write Cover Letter</button>'+
    (resumes.length?'<button class="btn btn-ghost btn-sm" onclick="autoTailorResume('+j.id+')">&#9997; Tailor Resume</button>':'')+
    '<button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="deleteFromModal()">Delete</button>';
  // Render timeline
  renderTimeline(j);
  // Render checklist
  renderChecklist(j);
  document.getElementById("modal").style.display="flex";
}

function mi(icon,label,val){return '<div class="meta-item"><span style="font-size:14px">'+icon+'</span><div><div class="meta-label">'+label+'</div><div class="meta-val">'+esc(val)+'</div></div></div>';}
function updateStatus(s){
  const j=jobs.find(x=>x.id===currentJobId);if(!j)return;
  j.status=s;
  // Track status change timestamps for timeline
  if(s==="applied"&&!j.appliedDate)j.appliedDate=new Date().toISOString();
  if(s==="interview"&&!j.interviewStatusDate)j.interviewStatusDate=new Date().toISOString();
  if(s==="offer"&&!j.offerDate)j.offerDate=new Date().toISOString();
  if(s==="rejected"&&!j.rejectedDate)j.rejectedDate=new Date().toISOString();
  saveJobs();
  document.getElementById("m-status").innerHTML=STATUS_ORDER.map(st=>{const m=STATUS[st];const a=j.status===st;return '<button class="status-opt" style="'+(a?'color:'+m.color+';border-color:'+m.color+';background:'+m.color+'18':"")+'" onclick="updateStatus(\''+st+'\')">'+m.label+'</button>';}).join("");
  // Show/hide interview section
  const isec=document.getElementById("m-interview-sec");
  if(s==="interview"){
    isec.style.display="";
    if(!j.interviewDate){document.getElementById("m-interview-date").value="";document.getElementById("m-interview-type").value="";document.getElementById("m-interview-status").textContent="";}
  }
  // Refresh timeline
  renderTimeline(j);
  renderDashboard();
}
function saveInterviewDate(){const j=jobs.find(x=>x.id===currentJobId);if(!j)return;j.interviewDate=document.getElementById("m-interview-date").value;saveJobs();
  const istat=document.getElementById("m-interview-status");
  if(j.interviewDate){const d=new Date(j.interviewDate);const now=new Date();
    if(d>now)istat.innerHTML='<span style="color:var(--purple);">\u{1F4C5} Interview in '+Math.ceil((d-now)/(1000*60*60*24))+' days</span>';
    else istat.innerHTML='<span style="color:var(--green);">\u2705 Interview completed</span>';
  }else istat.textContent="";
  toast("Interview date saved","ok");
}
function saveInterviewType(){const j=jobs.find(x=>x.id===currentJobId);if(!j)return;j.interviewType=document.getElementById("m-interview-type").value;saveJobs();toast("Interview type saved","ok");}
function saveNotes(){const j=jobs.find(x=>x.id===currentJobId);if(!j)return;j.notes=document.getElementById("m-notes").value;saveJobs();toast("Notes saved","ok");}
function deleteFromModal(){if(!confirm("Remove this application?"))return;jobs=jobs.filter(j=>j.id!==currentJobId);saveJobs();closeModal();renderDashboard();toast("Application removed","ok");}
function closeModal(){document.getElementById("modal").style.display="none";currentJobId=null;document.removeEventListener('keydown',_modalKeyHandler);}

// -- Modal Focus Trapping & Keyboard --
function _modalKeyHandler(e){
  if(e.key==='Escape'){closeModal();return;}
  if(e.key==='Tab'){
    const modal=document.querySelector('#modal .modal');
    if(!modal)return;
    const focusable=modal.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
}

// Attach keyboard handler when modal opens
(function(){
  const origOpen=openModal;
  openModal=function(id){
    origOpen(id);
    document.addEventListener('keydown',_modalKeyHandler);
    // Focus first interactive element in modal
    setTimeout(()=>{const f=document.querySelector('#modal .modal button, #modal .modal input');if(f)f.focus();},100);
  };
})();

function quickGenCoverFromModal(jobId){
  closeModal();
  document.getElementById("gen-job-select").innerHTML=jobs.map(j=>'<option value="'+j.id+'"'+(j.id===jobId?' selected':'')+'>'+esc(j.title)+' \u2014 '+esc(j.company)+'</option>').join("");
  /* FIX 4: Changed outer quotes from " to ' */
  document.getElementById("gen-resume-select").innerHTML='<option value="">Paste manually below</option>'+resumes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join("");
  document.getElementById("gen-resume-text").value="";document.getElementById("gen-extra").value="";
  clearErr("gen-error");document.getElementById("gen-status").textContent="";document.getElementById("gen-btn").disabled=false;
  document.getElementById("gen-modal").style.display="flex";showView("covers");
}

function clearAllData(){if(!confirm("Delete ALL jobs, resumes and cover letters? Cannot be undone."))return;jobs=[];resumes=[];covers=[];saveJobs();saveResumes();saveCovers();renderDashboard();toast("All data cleared","ok");}

// -- Timeline --
function renderTimeline(j){
  const el=document.getElementById("m-timeline");
  const events=[];
  events.push({label:"Application Saved",date:j.date,done:true});
  if(j.status!=="saved")events.push({label:"Applied",date:j.appliedDate||j.date,done:true});
  if(j.interviewDate)events.push({label:"Interview"+(j.interviewType?" ("+j.interviewType+")":""),date:j.interviewDate,done:new Date(j.interviewDate)<=new Date()});
  if(j.status==="offer")events.push({label:"Offer Received",date:j.offerDate||"",done:true});
  if(j.status==="rejected")events.push({label:"Rejected",date:j.rejectedDate||"",done:true});
  // Add pending milestones
  if(j.status==="applied"&&!j.interviewDate)events.push({label:"Awaiting Response",date:"",done:false});
  if(j.status==="interview"&&j.interviewDate&&new Date(j.interviewDate)>new Date())events.push({label:"Interview Upcoming",date:"",done:false});
  el.innerHTML=events.map(e=>{
    const cls=e.done?"tl-item done":"tl-item";
    const dt=e.date?'<div class="tl-date">'+new Date(e.date).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})+'</div>':'';
    return '<div class="'+cls+'">'+dt+'<div class="tl-label">'+esc(e.label)+'</div></div>';
  }).join("");
}

// -- Checklist --
const CHECKLIST_ITEMS=[
  {key:"resume_sent",label:"Resume uploaded / sent"},
  {key:"cover_written",label:"Cover letter written"},
  {key:"refs_ready",label:"References prepared"},
  {key:"portfolio",label:"Portfolio / work samples ready"},
  {key:"linkedin",label:"LinkedIn profile updated"},
  {key:"follow_up",label:"Follow-up email drafted"},
  {key:"interview_prep",label:"Interview prep done"},
  {key:"thank_you",label:"Thank-you note sent"}
];

function renderChecklist(j){
  if(!j.checklist)j.checklist={};
  const el=document.getElementById("m-checklist");
  el.innerHTML=CHECKLIST_ITEMS.map(item=>{
    const checked=j.checklist[item.key]?"checked":"";
    return '<div class="cl-item '+checked+'" onclick="toggleChecklistItem(\''+item.key+'\')"><div class="cl-check">\u2713</div><span class="cl-label">'+esc(item.label)+'</span></div>';
  }).join("");
}

function toggleChecklistItem(key){
  const j=jobs.find(x=>x.id===currentJobId);if(!j)return;
  if(!j.checklist)j.checklist={};
  j.checklist[key]=!j.checklist[key];
  saveJobs();renderChecklist(j);
}

// -- Auto-Tailor Resume --
async function autoTailorResume(jobId){
  const j=jobs.find(x=>x.id===jobId);if(!j)return;
  if(!resumes.length){toast("No resumes saved yet","err");return;}
  // Pick the first resume or let user choose if multiple
  let src=resumes[0];
  if(resumes.length>1){
    const pick=prompt("Which resume to tailor? Enter number:\n"+resumes.map((r,i)=>(i+1)+". "+r.name).join("\n"));
    if(!pick)return;
    const idx=parseInt(pick)-1;
    if(idx>=0&&idx<resumes.length)src=resumes[idx];
    else{toast("Invalid selection","err");return;}
  }
  toast("Tailoring resume for "+j.title+"...","ok");
  try{
    const prompt='You have this resume:\n\n'+src.content+'\n\nTailor it specifically for this job:\nTitle: '+j.title+'\nCompany: '+j.company+'\nDescription: '+(j.description||"N/A")+'\nRequirements: '+(j.requirements||[]).join(", ")+'\n\nRewrite the resume to emphasise relevant experience, match key requirements, and use keywords from the job posting. Keep the same structure but tailor every bullet point. Return only the rewritten resume text.';
    const result=await callGemini(prompt,RESUME_EXPERT);
    const now=new Date().toISOString();
    const wc=result.split(/\s+/).filter(Boolean).length;
    const newDoc={id:Date.now(),name:src.name+" \u2014 "+j.company,content:result.trim(),wordCount:wc,created:now,updated:now};
    resumes.unshift(newDoc);saveResumes();
    toast("Tailored resume created!","ok");
    closeModal();
    editDocument('resume',newDoc.id);showView("resumes");
    document.getElementById("resume-list-view").style.display="none";
    document.getElementById("resume-editor-view").style.display="";
    setTimeout(()=>setEditorMode('resume','preview'),100);
  }catch(e){toast("Tailoring failed: "+e.message,"err");}
}

// -- Export / Import --
function exportAllData(){
  const data={version:1,exported:new Date().toISOString(),jobs:jobs,resumes:resumes,covers:covers};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const link=document.createElement("a");
  link.href=URL.createObjectURL(blob);
  link.download="JobTrack_Backup_"+new Date().toISOString().slice(0,10)+".json";
  link.click();URL.revokeObjectURL(link.href);
  toast("Backup exported!","ok");
}

function importAllData(e){
  const file=e.target.files[0];if(!file)return;
  const msg=document.getElementById("import-msg");
  const reader=new FileReader();
  reader.onload=function(ev){
    try{
      const data=JSON.parse(ev.target.result);
      if(!data.jobs&&!data.resumes&&!data.covers)throw new Error("Invalid backup file");
      const existingJobIds=new Set(jobs.map(j=>j.id));
      const existingResumeIds=new Set(resumes.map(r=>r.id));
      const existingCoverIds=new Set(covers.map(c=>c.id));
      let added={j:0,r:0,c:0};
      if(data.jobs)(data.jobs).forEach(j=>{if(!existingJobIds.has(j.id)){jobs.unshift(j);added.j++;}});
      if(data.resumes)(data.resumes).forEach(r=>{if(!existingResumeIds.has(r.id)){resumes.unshift(r);added.r++;}});
      if(data.covers)(data.covers).forEach(c=>{if(!existingCoverIds.has(c.id)){covers.unshift(c);added.c++;}});
      saveJobs();saveResumes();saveCovers();
      msg.style.display="block";msg.style.color="var(--green)";
      msg.textContent="Imported: "+added.j+" jobs, "+added.r+" resumes, "+added.c+" covers";
      renderDashboard();
      setTimeout(()=>msg.style.display="none",4000);
    }catch(err){
      msg.style.display="block";msg.style.color="var(--red)";
      msg.textContent="Import failed: "+err.message;
    }
  };
  reader.readAsText(file);
  e.target.value="";
}

// -- Analytics --
function renderAnalytics(){
  const total=jobs.length;
  const counts={};STATUS_ORDER.forEach(s=>counts[s]=0);
  jobs.forEach(j=>counts[j.status]=(counts[j.status]||0)+1);
  const interviewRate=total>0?Math.round(((counts.interview||0)+(counts.offer||0))/total*100):0;
  const offerRate=total>0?Math.round((counts.offer||0)/total*100):0;
  // Jobs with interviews that have dates
  const withInterviewDates=jobs.filter(j=>j.interviewDate&&j.date);
  let avgDays="â€”";
  if(withInterviewDates.length){
    const totalDays=withInterviewDates.reduce((sum,j)=>{
      return sum+Math.abs(Math.round((new Date(j.interviewDate)-new Date(j.date))/(1000*60*60*24)));
    },0);
    avgDays=Math.round(totalDays/withInterviewDates.length)+" days";
  }
  // Checklist completion
  let checkTotal=0,checkDone=0;
  jobs.forEach(j=>{if(j.checklist){CHECKLIST_ITEMS.forEach(item=>{checkTotal++;if(j.checklist[item.key])checkDone++;});}});
  const checkPct=checkTotal>0?Math.round(checkDone/checkTotal*100):0;

  // KPIs
  document.getElementById("analytics-kpis").innerHTML=
    '<div class="kpi-card"><div class="kpi-val">'+total+'</div><div class="kpi-label">Total Apps</div></div>'+
    '<div class="kpi-card"><div class="kpi-val" style="color:var(--accent)">'+interviewRate+'%</div><div class="kpi-label">Interview Rate</div></div>'+
    '<div class="kpi-card"><div class="kpi-val" style="color:var(--green)">'+offerRate+'%</div><div class="kpi-label">Offer Rate</div></div>'+
    '<div class="kpi-card"><div class="kpi-val" style="color:var(--blue)">'+avgDays+'</div><div class="kpi-label">Avg to Interview</div></div>'+
    '<div class="kpi-card"><div class="kpi-val" style="color:var(--purple)">'+checkPct+'%</div><div class="kpi-label">Checklist Done</div></div>';

  // Timeline chart (applications per week)
  renderTimelineChart();
  // Status bar chart
  renderStatusChart();
  // Funnel
  renderFunnel(total,counts);
  // Company breakdown
  renderCompanyChart();
}

function renderTimelineChart(){
  const canvas=document.getElementById("chart-timeline");
  const ctx=canvas.getContext("2d");
  const w=canvas.width=canvas.parentElement.clientWidth-32;
  const h=canvas.height=180;
  ctx.clearRect(0,0,w,h);
  if(!jobs.length){ctx.fillStyle="#7b8c9a";ctx.font="13px DM Sans";ctx.fillText("No data yet",w/2-30,h/2);return;}
  // Group by week
  const weeks={};
  jobs.forEach(j=>{
    const d=new Date(j.date);
    const weekStart=new Date(d);weekStart.setDate(d.getDate()-d.getDay());
    const key=weekStart.toISOString().slice(0,10);
    weeks[key]=(weeks[key]||0)+1;
  });
  const keys=Object.keys(weeks).sort();
  if(!keys.length)return;
  const vals=keys.map(k=>weeks[k]);
  const maxVal=Math.max(...vals,1);
  const barW=Math.max(12,Math.min(40,(w-40)/keys.length-4));
  const chartH=h-40;
  const startX=(w-(keys.length*(barW+4)))/2;
  keys.forEach((k,i)=>{
    const x=startX+i*(barW+4);
    const barH=(vals[i]/maxVal)*chartH;
    const y=h-24-barH;
    // Bar
    ctx.fillStyle="rgba(46,196,182,0.7)";
    ctx.beginPath();ctx.roundRect(x,y,barW,barH,3);ctx.fill();
    // Value
    ctx.fillStyle="#e8ecf0";ctx.font="bold 10px DM Sans";ctx.textAlign="center";
    ctx.fillText(vals[i],x+barW/2,y-4);
    // Label
    ctx.fillStyle="#7b8c9a";ctx.font="9px DM Sans";
    const label=new Date(k).toLocaleDateString("en-AU",{day:"numeric",month:"short"});
    if(keys.length<=12||i%Math.ceil(keys.length/10)===0)ctx.fillText(label,x+barW/2,h-6);
  });
}

function renderStatusChart(){
  const canvas=document.getElementById("chart-status");
  const ctx=canvas.getContext("2d");
  const w=canvas.width=canvas.parentElement.clientWidth-32;
  const h=canvas.height=180;
  ctx.clearRect(0,0,w,h);
  if(!jobs.length){ctx.fillStyle="#7b8c9a";ctx.font="13px DM Sans";ctx.fillText("No data yet",w/2-30,h/2);return;}
  const counts={};STATUS_ORDER.forEach(s=>counts[s]=0);
  jobs.forEach(j=>counts[j.status]=(counts[j.status]||0)+1);
  const colors={"saved":"#2ec4b6","applied":"#56b4f9","interview":"#9d8df1","offer":"#2ed573","rejected":"#ff6b81"};
  const barH=24;const gap=8;const chartW=w-120;const maxVal=Math.max(...Object.values(counts),1);
  STATUS_ORDER.forEach((s,i)=>{
    const y=20+i*(barH+gap);
    const bw=Math.max(4,(counts[s]/maxVal)*chartW);
    // Label
    ctx.fillStyle="#7b8c9a";ctx.font="12px DM Sans";ctx.textAlign="right";
    ctx.fillText(STATUS[s].label,90,y+barH/2+4);
    // Bar
    ctx.fillStyle=colors[s]||"#2ec4b6";
    ctx.beginPath();ctx.roundRect(100,y,bw,barH,4);ctx.fill();
    // Count
    ctx.fillStyle="#e8ecf0";ctx.font="bold 11px DM Sans";ctx.textAlign="left";
    ctx.fillText(counts[s],104+bw,y+barH/2+4);
  });
}

function renderFunnel(total,counts){
  const el=document.getElementById("chart-funnel");
  if(!total){el.innerHTML='<p style="color:var(--muted);font-size:13px;">No data yet</p>';return;}
  const stages=[
    {label:"Applied",count:total,color:"var(--blue)"},
    {label:"Got Interview",count:(counts.interview||0)+(counts.offer||0),color:"var(--purple)"},
    {label:"Received Offer",count:counts.offer||0,color:"var(--green)"}
  ];
  el.innerHTML=stages.map(s=>{
    const pct=Math.max(8,Math.round(s.count/total*100));
    return '<div class="funnel-bar"><div class="funnel-fill" style="width:'+pct+'%;background:'+s.color+';">'+s.count+'</div><div class="funnel-label">'+s.label+' ('+Math.round(s.count/total*100)+'%)</div></div>';
  }).join("");
}

function renderCompanyChart(){
  const el=document.getElementById("chart-companies");
  if(!jobs.length){el.innerHTML='<p style="color:var(--muted);font-size:13px;">No data yet</p>';return;}
  const counts={};
  jobs.forEach(j=>{counts[j.company]=(counts[j.company]||0)+1;});
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,15);
  const max=sorted[0]?sorted[0][1]:1;
  el.innerHTML=sorted.map(([name,count])=>{
    const pct=Math.round(count/max*100);
    return '<div class="company-bar"><span style="min-width:100px;text-align:right;color:var(--text);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(name)+'</span><div class="company-bar-fill" style="width:'+pct+'%;"></div><span style="color:var(--muted);font-size:11px;">'+count+'</span></div>';
  }).join("");
}


// ============================================================
// ACCESSIBILITY â€” TTS, Voice Input, Toolbar, Easy Read
// ============================================================

// -- Text-to-Speech Engine --
let _ttsUtterance=null;
let _ttsSpeed=1;
let _ttsSpeaking=false;
const TTS_SPEEDS=[0.75,1,1.25,1.5];

function ttsBtnHTML(text){
  const safe=text.replace(/'/g,"&#39;").replace(/"/g,"&quot;");
  return ' <button class="tts-btn" onclick="event.stopPropagation();ttsSpeak(this,\''+safe.substring(0,2000)+'\')" title="Read aloud" aria-label="Read this section aloud">&#128264;</button>';
}

function ttsSpeak(btn,text){
  if(!window.speechSynthesis){toast("Text-to-speech not supported in this browser","err");return;}
  // If same button clicked while speaking, stop
  if(_ttsSpeaking&&btn&&btn.classList.contains('speaking')){ttsStop();return;}
  ttsStop();
  // Clean text for speech
  const clean=text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
  if(!clean)return;
  _ttsUtterance=new SpeechSynthesisUtterance(clean);
  _ttsUtterance.rate=_ttsSpeed;
  _ttsUtterance.lang='en-AU';
  _ttsSpeaking=true;
  // Update UI
  document.querySelectorAll('.tts-btn.speaking').forEach(b=>b.classList.remove('speaking'));
  if(btn)btn.classList.add('speaking');
  const player=document.getElementById('tts-player');
  player.classList.add('active');
  document.getElementById('tts-player-label').textContent='Reading...';
  document.getElementById('tts-pause-btn').textContent='â¸';
  _ttsUtterance.onend=function(){ttsCleanup(btn);};
  _ttsUtterance.onerror=function(){ttsCleanup(btn);};
  speechSynthesis.speak(_ttsUtterance);
}

function ttsCleanup(btn){
  _ttsSpeaking=false;
  if(btn)btn.classList.remove('speaking');
  document.querySelectorAll('.tts-btn.speaking').forEach(b=>b.classList.remove('speaking'));
  document.getElementById('tts-player').classList.remove('active');
}

function ttsPause(){
  if(!speechSynthesis)return;
  if(speechSynthesis.paused){speechSynthesis.resume();document.getElementById('tts-pause-btn').textContent='â¸';}
  else{speechSynthesis.pause();document.getElementById('tts-pause-btn').textContent='â–¶';}
}

function ttsStop(){
  if(speechSynthesis)speechSynthesis.cancel();
  _ttsSpeaking=false;
  document.querySelectorAll('.tts-btn.speaking').forEach(b=>b.classList.remove('speaking'));
  document.getElementById('tts-player').classList.remove('active');
}

function ttsCycleSpeed(){
  const idx=TTS_SPEEDS.indexOf(_ttsSpeed);
  _ttsSpeed=TTS_SPEEDS[(idx+1)%TTS_SPEEDS.length];
  document.getElementById('tts-speed-btn').textContent=_ttsSpeed+'x';
  if(_ttsUtterance)_ttsUtterance.rate=_ttsSpeed;
}

// -- Voice Input --
let _voiceRecognition=null;
let _voiceTarget=null;

function startVoiceInput(btn,targetId){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast("Voice input not supported in this browser. Try Chrome or Edge.","err");return;}
  if(_voiceRecognition){_voiceRecognition.stop();_voiceRecognition=null;btn.classList.remove('recording');return;}
  const target=document.getElementById(targetId);
  if(!target)return;
  _voiceTarget=target;
  _voiceRecognition=new SR();
  _voiceRecognition.lang='en-AU';
  _voiceRecognition.continuous=true;
  _voiceRecognition.interimResults=true;
  btn.classList.add('recording');
  let finalTranscript=target.value;
  _voiceRecognition.onresult=function(e){
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      if(e.results[i].isFinal)finalTranscript+=(finalTranscript?' ':'')+e.results[i][0].transcript;
      else interim+=e.results[i][0].transcript;
    }
    target.value=finalTranscript+(interim?' '+interim:'');
    // Trigger input event for search etc
    target.dispatchEvent(new Event('input',{bubbles:true}));
  };
  _voiceRecognition.onerror=function(e){
    if(e.error==='not-allowed')toast("Microphone access denied. Please allow microphone access.","err");
    btn.classList.remove('recording');_voiceRecognition=null;
  };
  _voiceRecognition.onend=function(){btn.classList.remove('recording');_voiceRecognition=null;};
  _voiceRecognition.start();
}

// -- Accessibility Toolbar --
let _a11yPrefs={easyread:false,contrast:false,dyslexia:false,motion:false,textSize:'sm',lineSpacing:'normal'};

function toggleA11yPanel(){document.getElementById('a11y-panel').classList.toggle('open');}

function toggleA11y(key){
  _a11yPrefs[key]=!_a11yPrefs[key];
  const btn=document.getElementById('a11y-'+key);
  if(btn)btn.classList.toggle('on',_a11yPrefs[key]);
  applyA11yPrefs();
  saveA11yPrefs();
}

function setTextSize(size){
  _a11yPrefs.textSize=size;
  document.querySelectorAll('.a11y-size-btn').forEach(b=>b.classList.toggle('active',b.dataset.size===size));
  applyA11yPrefs();
  saveA11yPrefs();
}

function setLineSpacing(spacing){
  _a11yPrefs.lineSpacing=spacing;
  document.querySelectorAll('.a11y-spacing-btn').forEach(b=>b.classList.toggle('active',b.dataset.spacing===spacing));
  applyA11yPrefs();
  saveA11yPrefs();
}

function applyA11yPrefs(){
  const b=document.body;
  b.classList.toggle('easy-read',_a11yPrefs.easyread);
  b.classList.toggle('high-contrast',_a11yPrefs.contrast);
  b.classList.toggle('dyslexia-font',_a11yPrefs.dyslexia);
  b.classList.toggle('reduce-motion',_a11yPrefs.motion);
  // Text size
  b.classList.remove('text-sm','text-md','text-lg','text-xl');
  if(_a11yPrefs.textSize!=='sm')b.classList.add('text-'+_a11yPrefs.textSize);
  // Line spacing
  b.classList.remove('line-wide','line-xwide');
  if(_a11yPrefs.lineSpacing!=='normal')b.classList.add('line-'+_a11yPrefs.lineSpacing);
  // Update toggles UI
  ['easyread','contrast','dyslexia','motion'].forEach(k=>{
    const btn=document.getElementById('a11y-'+k);
    if(btn)btn.classList.toggle('on',_a11yPrefs[k]);
  });
  // Apply Easy Read labels
  if(_a11yPrefs.easyread)applyEasyReadLabels();
  else restoreOriginalLabels();
}

function saveA11yPrefs(){storeSet('jt_a11y',JSON.stringify(_a11yPrefs));}

async function loadA11yPrefs(){
  try{
    const raw=await storeGet('jt_a11y');
    if(raw){_a11yPrefs={..._a11yPrefs,...JSON.parse(raw)};applyA11yPrefs();
      document.querySelectorAll('.a11y-size-btn').forEach(b=>b.classList.toggle('active',b.dataset.size===_a11yPrefs.textSize));
      document.querySelectorAll('.a11y-spacing-btn').forEach(b=>b.classList.toggle('active',b.dataset.spacing===_a11yPrefs.lineSpacing));
    }
  }catch(e){}
}

// -- Easy Read Labels --
const EASY_LABELS={
  'Dashboard':'My Jobs','Analytics':'How Am I Going','Add Job':'Add a New Job','CV Match':'Check My Resume',
  'Resumes':'My Resumes','Cover Letters':'My Letters','Email Templates':'Email Help','Settings':'Settings',
  'Interview Prep Questions':'Practice Questions for Your Interview','Application Questions':'Questions to Answer When You Apply',
  'Key Company Facts':'About This Company','Job Description':'About This Job','My Notes':'My Notes',
  'Application Timeline':'What Has Happened','Quick-Apply Checklist':'Things to Do Before You Apply',
  'Export Data':'Save a Copy','Import Data':'Load a Copy','Clear All Data':'Delete Everything',
  'Gemini API Key':'Your AI Key','Account & Cloud Sync':'Your Account',
  'Generate':'Make It','Generate from Job':'Write a Letter for This Job','Generate from Scratch':'Make a New Resume',
  'New Resume':'Make a New Resume','New Cover Letter':'Write a New Letter',
  'Analyse Job':'Look at This Job','Search...':'Search your jobs...',
  'Edit':'Change It','View':'Look At It','Delete':'Remove It','Duplicate':'Make a Copy','Save':'Save It',
  'TEMPLATE:':'Style:','Modern':'Clean','Classic':'Traditional','Minimal':'Simple','Executive':'Formal'
};
let _originalLabels={};

function applyEasyReadLabels(){
  document.querySelectorAll('.section-title,.page-title span,.nav-label,.card h3,.btn,.btn-sm,.tpl-pick,.filter-btn').forEach(el=>{
    const txt=el.textContent.trim();
    if(EASY_LABELS[txt]&&!_originalLabels[el]){
      _originalLabels.set?_originalLabels.set(el,txt):(_originalLabels=new Map(),_originalLabels.set(el,txt));
      el.textContent=EASY_LABELS[txt];
    }
  });
}

function restoreOriginalLabels(){
  if(_originalLabels instanceof Map){
    _originalLabels.forEach((orig,el)=>{el.textContent=orig;});
    _originalLabels=new Map();
  }
}
_originalLabels=new Map();

// -- Text Size CSS classes --
// Added via style tag for text size overrides
(function(){
  const s=document.createElement('style');
  s.textContent=`
    body.text-md{font-size:15px;}body.text-md .page-title{font-size:28px;}body.text-md .card h3{font-size:15px;}body.text-md .btn{font-size:14px;}body.text-md .section-title{font-size:11px;}body.text-md .nav-btn{font-size:14px;}
    body.text-lg{font-size:17px;}body.text-lg .page-title{font-size:32px;}body.text-lg .card h3{font-size:17px;}body.text-lg .btn{font-size:16px;}body.text-lg .section-title{font-size:12px;}body.text-lg .nav-btn{font-size:16px;}body.text-lg .field{font-size:16px;min-height:44px;}
    body.text-xl{font-size:20px;}body.text-xl .page-title{font-size:36px;}body.text-xl .card h3{font-size:20px;}body.text-xl .btn{font-size:18px;padding:12px 22px;min-height:48px;}body.text-xl .section-title{font-size:14px;}body.text-xl .nav-btn{font-size:18px;padding:14px 16px;}body.text-xl .field{font-size:18px;padding:14px;min-height:48px;}
  `;
  document.head.appendChild(s);
})();

// Add voice input buttons to key fields after DOM ready
function addVoiceButtons(){
  const fields=[
    {id:'url-input',label:'Voice input for job URL'},
    {id:'paste-input',label:'Voice input for job text'},
    {id:'search-input',label:'Voice input for search'},
    {id:'m-notes',label:'Voice input for notes'},
    {id:'new-key-input',label:'Voice input for API key'}
  ];
  fields.forEach(f=>{
    const el=document.getElementById(f.id);
    if(!el||el.parentElement.querySelector('.voice-btn'))return;
    const wrap=el.parentElement;
    if(wrap)wrap.style.position='relative';
    const btn=document.createElement('button');
    btn.className='voice-btn';
    btn.type='button';
    btn.innerHTML='&#127908;';
    btn.title=f.label;
    btn.setAttribute('aria-label',f.label);
    btn.onclick=function(e){e.preventDefault();startVoiceInput(btn,f.id);};
    if(wrap)wrap.appendChild(btn);
  });
}


// Initialize app
loadAllData();
loadA11yPrefs();
setTimeout(addVoiceButtons,500);
