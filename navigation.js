export function setupNavigation({isAdminLogin = false} = {}) {
  const application=document.getElementById('applicationViews');
  const rules=document.getElementById('rulesView');
  const root=new URL('./',document.baseURI);
  let baseElement=document.querySelector('base');
  if(!baseElement){baseElement=document.createElement('base');document.head.prepend(baseElement);}
  baseElement.href=root.href;
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  const rulesURL=new URL('pravidla/',root);
  const overviewURL=new URL(isAdminLogin?'admin/':'./',root);
  const scrollPositions={overview:0,rules:0};
  let activeRoute;
  let pendingRules;
  let transition=0;
  const rulesPath=path=>path.replace(/\/index\.html$/,'/').replace(/\/$/,'')===rulesURL.pathname.replace(/\/$/,'');
  async function loadRules() {
    if (rules.children.length) return;
    if (!pendingRules) pendingRules=fetch(rulesURL.href).then(response=>{
      if(!response.ok) throw new Error('rules-load-failed');
      return response.text();
    }).then(html=>{
      const page=new DOMParser().parseFromString(html,'text/html');
      const content=page.getElementById('rulesView');
      if(!content) throw new Error('rules-content-missing');
      rules.replaceChildren(...Array.from(content.childNodes).map(node=>document.importNode(node,true)));
    }).catch(error=>{pendingRules=null;throw error;});
    return pendingRules;
  }
  function apply(url, restore = true) {
    const route=rulesPath(url.pathname)?'rules':'overview';
    activeRoute=route;
    application.hidden=route==='rules';rules.hidden=route!=='rules';
    document.title=route==='rules'?'Pravidl\u00e1 \u00b7 Doxbeh':isAdminLogin?'Admin \u00b7 Doxbeh':'Doxbeh';
    document.querySelectorAll('[data-app-route]').forEach(link=>{
      const selected=link.dataset.appRoute===route;
      link.classList.toggle('active',selected);
      if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
      if(link.dataset.appRoute==='overview')link.href=overviewURL.href;
    });
    if(restore)requestAnimationFrame(()=>{
      const anchor=url.hash?document.getElementById(decodeURIComponent(url.hash.slice(1))):null;
      if(anchor)anchor.scrollIntoView({behavior:'instant',block:'start'});
      else window.scrollTo({top:scrollPositions[route],left:0,behavior:'instant'});
    });
  }
  async function navigate(url,{replace=false,saveScroll=true}={}) {
    const ticket=++transition;
    if(saveScroll && activeRoute)scrollPositions[activeRoute]=window.scrollY;
    if(rulesPath(url.pathname))await loadRules();
    if(ticket!==transition)return;
    if(url.href!==location.href)history[replace?'replaceState':'pushState'](null,'',url.href);
    apply(url);
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest('a[href]');
    if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
    const url=new URL(link.href,document.baseURI);
    if(url.origin!==root.origin)return;
    const overviewPaths=[root.pathname,new URL('index.html',root).pathname,overviewURL.pathname];
    const toRules=rulesPath(url.pathname);
    if(!toRules&&!overviewPaths.includes(url.pathname))return;
    if(toRules&&activeRoute==='rules'&&url.hash)return;
    if(!toRules)url.pathname=overviewURL.pathname;
    event.preventDefault();
    navigate(url).catch(()=>location.assign(url.href));
  });
  window.addEventListener('popstate',()=>{
    const url=new URL(location.href);
    navigate(url,{saveScroll:false}).catch(()=>location.reload());
  });
  apply(new URL(location.href),false);
  if(!rules.children.length)loadRules().catch(()=>{});
  return {showOverview:()=>navigate(overviewURL)};
}
