import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  Database,
  ExternalLink,
  Factory,
  HardHat,
  Menu,
  RefreshCw,
  Ruler,
  ShieldCheck,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { jobs } from "./jobs";
import { GridField } from "./GridField";
import { CaseConsole, viewsFor, ZoomImg, ZoomProvider } from "./CaseConsole";

const EXPLORER_URL = "/explore/index.html";
const MAIL = "chenwy1@getui.com";

const TowerModelViewer = lazy(() =>
  import("./TowerModelViewer").then((module) => ({ default: module.TowerModelViewer })),
);
const LongContextTowerViewer = lazy(() =>
  import("./LongContextTowerViewer").then((module) => ({ default: module.LongContextTowerViewer })),
);

/* ───────────────────────── helpers ───────────────────────── */

/** Keeps a failing 3D viewer (e.g. no WebGL) from taking down the whole page. */
class ViewerBoundary extends Component<{ className: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn("3D viewer unavailable:", error); }
  render() {
    if (this.state.failed) return <div className={this.props.className}><div className="viewer-status">三维模型暂时无法在此浏览器中显示</div></div>;
    return this.props.children;
  }
}

function DeferredViewer({ children, className }: { children: ReactNode; className: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let nearViewport = false;
    let timer = 0;
    let mounted = false;
    const scheduleMount = () => {
      window.clearTimeout(timer);
      if (!nearViewport || mounted) return;
      timer = window.setTimeout(() => {
        mounted = true;
        setReady(true);
        observer.disconnect();
        window.removeEventListener("scroll", scheduleMount);
      }, 160);
    };
    const observer = new IntersectionObserver(([entry]) => {
      nearViewport = entry.isIntersecting;
      scheduleMount();
    }, { rootMargin: "200px 0px" });
    observer.observe(host);
    window.addEventListener("scroll", scheduleMount, { passive: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("scroll", scheduleMount);
    };
  }, []);
  const placeholder = <div className={className}><div className="viewer-status">三维模型将在靠近时载入</div></div>;
  return <div ref={hostRef} className="deferred-viewer">{ready ? <ViewerBoundary className={className}><Suspense fallback={placeholder}>{children}</Suspense></ViewerBoundary> : placeholder}</div>;
}

/** Adds `.is-in` to every `.reveal` element as it enters the viewport. */
function useReveal(dep: unknown) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));
    if (!("IntersectionObserver" in window)) { nodes.forEach((n) => n.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [dep]);
}

function SectionHead({ index, title, lead, id }: { index: string; title: ReactNode; lead?: ReactNode; id?: string }) {
  return (
    <div className="section-head reveal">
      <p className="tag"><i />{index}</p>
      <h2 id={id}>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

/* ───────────────────────── data ───────────────────────── */


const sectors: {
  id: string; icon: LucideIcon; name: string; en: string; role: string; headline: string; summary: string;
  items: { label: string; text: string }[]; outputs: string[]; media: { src: string; alt: string; cap: string }[];
}[] = [
  {
    id: "power",
    icon: Zap,
    name: "角钢输电塔",
    en: "ANGLE-STEEL TRANSMISSION TOWER",
    role: "核心方向",
    headline: "从多页塔图，到可核验的构件级三维结构。",
    summary: "我们的核心方向。角钢输电塔图纸多页、编号重复、投影重合、分段装配，是检验工程 AI 的高难度场景。我们在这里把图纸重建、证据链与核验做深做透。",
    items: [
      { label: "图纸 → 三维", text: "由多页图纸重建整塔，保留构件身份与跨视图关系。" },
      { label: "物料表交叉核验", text: "构件规格、数量、编号与 BOM 逐项对账。" },
      { label: "参数化，依赖联动", text: "我们的塔是参数化、带依赖关系的模型：改一处，相关尺寸、用钢量与校核随之更新。方案调整更快，前后一致，也更容易核对。" },
      { label: "结构完整性核验", text: "连接与装配关系持续核验，结果如实标注验证状态。" },
    ],
    outputs: ["三维模型 / STEP", "构件清单", "证据链"],
    media: [{ src: "/images/cases/tower-hall.webp", alt: "铁塔三维展厅", cap: "三维展厅" }],
  },
  {
    id: "mfg",
    icon: Factory,
    name: "阀门与装备制造",
    en: "VALVES & EQUIPMENT",
    role: "扩展方向",
    headline: "以阀门设计为先，延伸到电气设备与电机配件。",
    summary: "制造的难点不在“画出来”，而在“按要求造得出来”。我们把铁塔上验证过的重建与核验方法带到阀门：结合行业要求与企业工艺，评估结构可行性，再落到制造输出。",
    items: [
      { label: "阀门", text: "由二维图纸重建闸阀三维模型：整机、剖切与零件清单，尺寸可回溯到图纸。" },
      { label: "电气设备", text: "柜体、母线、开关设备的结构与电气间隙、爬电距离校核。" },
      { label: "电机配件", text: "端盖、轴、机座等零件的公差配合与加工工艺约束。" },
      { label: "定制工艺库", text: "沉淀企业自有的制造习惯与例外规则，让 AI 按“你的做法”输出。" },
    ],
    outputs: ["参数化 CAD", "BOM / 工艺卡", "DFM 评审意见", "报价依据"],
    media: [{ src: "/images/cases/valve-assembled.webp", alt: "由图纸重建的闸阀三维模型", cap: "闸阀 · 整机" }, { src: "/images/cases/valve-section.webp", alt: "闸阀三维剖切视图", cap: "闸阀 · 剖切" }],
  },
  {
    id: "civil",
    icon: HardHat,
    name: "交通工程",
    en: "TRANSPORTATION",
    role: "扩展方向",
    headline: "以交通安全设计审查为先，延伸到造价审计与报价。",
    summary: "公路、桥隧等交通工程资料量大、版本多、依据分散。我们把工可报告与图纸变成三维数字孪生与可追溯的隐患台账，帮助审查人员把精力放在真正需要判断的地方。",
    items: [
      { label: "交通工程数字孪生", text: "由工可报告与图纸生成道路三维孪生，并开展设计校核。" },
      { label: "设计安全审查", text: "按规范逐项校核，每条隐患都可追溯出处。" },
      { label: "施工造价审计", text: "工程量与清单、图纸、签证交叉核对，定位差异。" },
      { label: "智能报价", text: "由图纸直接提取工程量，结合企业定额生成可追溯报价。" },
    ],
    outputs: ["数字孪生", "隐患台账", "工程量清单", "审计底稿"],
    media: [{ src: "/images/cases/road-twin.webp", alt: "公路三维数字孪生界面", cap: "交通建模 · 数字孪生" }, { src: "/images/cases/road-review.webp", alt: "设计安全审查看板", cap: "设计安全审查" }],
  },
];

const stages: { key: string; name: string; en: string; input: string; does: string; output: string; human: string }[] = [
  {
    key: "01", name: "接入", en: "INGEST",
    input: "扫描图 · PDF · DWG/DXF · 报告 · 标准 · 企业工艺文件",
    does: "解析并保留文件、版本与原始位置；把行业规范与客户要求整理为可检索、可引用的规则。",
    output: "带出处的资料库",
    human: "确认资料范围与版本",
  },
  {
    key: "02", name: "编译", en: "COMPILE",
    input: "资料库 + 行业协议 + 定制工艺",
    does: "读取尺寸、标注与构件关系，形成结构化中间表示：几何、拓扑、约束、依据。",
    output: "语义 IR（可计算的工程表达）",
    human: "抽检关键标注",
  },
  {
    key: "03", name: "可行性评估", en: "FEASIBILITY",
    input: "语义 IR + 行业规则",
    does: "对结构做规则校核与求解：几何闭合、尺寸链、强度与间隙、可制造性与成本。",
    output: "候选方案 + 通过 / 风险 / 阻塞清单",
    human: "评审风险项，选择方案",
  },
  {
    key: "04", name: "核验", en: "VALIDATE",
    input: "候选模型 + 评估结果",
    does: "让用户在三维与图纸间对照检查；每个结论可回溯到图纸位置与依据。",
    output: "已核验模型 + 差异记录",
    human: "工程师签认关门",
  },
  {
    key: "05", name: "落地", en: "DEPLOY",
    input: "已核验模型",
    does: "输出制造或施工可用的成果，并接入客户的 CAD、PLM、ERP 与 MES 工作流。",
    output: "BOM · 工艺卡 · 报价 · 施工清单",
    human: "试制 / 试点反馈回流",
  },
];

const gates = [
  { name: "几何闭合", note: "结构无悬空构件，装配关系自洽", state: "pass" },
  { name: "行业要求", note: "逐项对照行业规范与客户要求", state: "pass" },
  { name: "尺寸链与公差", note: "累计公差在配合要求内", state: "warn" },
  { name: "可制造性 DFM", note: "加工、焊接、装配可行", state: "warn" },
  { name: "成本与交期", note: "BOM、工时与报价可追溯", state: "pending" },
  { name: "证据可回溯", note: "每个结论指回图纸位置", state: "pass" },
] as const;

const audiences = [
  {
    key: "CUSTOMERS", label: "制造与工程企业", title: "工厂、设计院、施工方",
    help: "把你的图纸、行业要求与自家工艺编译成 AI 能遵循的规则，让每位工程师都能更快完成审图、算量与出图。",
    imagine: "客户图纸进来，当天就拿到带依据的评审意见。",
    cta: "看行业方案", to: "solutions" as const,
  },
  {
    key: "CLIENTS", label: "业主、集成商与平台", title: "甲方与工业软件团队",
    help: "我们交付的每个构件与结论都带证据和验证状态，可直接进入你的 CAD、PLM 或数字孪生系统。",
    imagine: "验收供应商模型时，每一处都能点回图纸出处。",
    cta: "了解方案", to: "solutions" as const,
  },
  {
    key: "INVESTORS", label: "投资人", title: "关注工业与工程 AI",
    help: "从最难的铁塔图纸起步，把方法沉淀为可复用底座，再扩展到制造与土木工程，行业数据越积越深。",
    imagine: "一套底座，逐个行业复制可验收的落地闭环。",
    cta: "与我们交流", to: "about" as const,
  },
];

const cycle: { t: string; d: string; icon: LucideIcon }[] = [
  { t: "行业规则与工艺", d: "标准、客户要求与企业做法，沉淀为可复用的规则", icon: BookOpen },
  { t: "可核验的工程数据", d: "每条数据都能回到图纸与依据", icon: Database },
  { t: "工程师确认", d: "结果经人核验签认，才进入下一步", icon: BadgeCheck },
  { t: "进入制造与施工", d: "通过验证的结果用于真实生产与交付", icon: Factory },
  { t: "反馈回流，规则更准", d: "现场与交付的经验，回到规则库", icon: RefreshCw },
];

const pillars = [
  { t: "理解空间结构", d: "从二维表达恢复构件、连接与空间关系" },
  { t: "保留工程依据", d: "每个结果都能回到图纸、读数与判断来源" },
  { t: "连接工业系统", d: "进入 CAD、数字孪生、PLM 与工业 AI" },
];

const serviceModes = [
  { en: "PUBLIC CLOUD", t: "公有云服务", d: "开箱即用，上传资料即可开始，适合快速验证与轻量使用。" },
  { en: "PRIVATE DEPLOYMENT", t: "私有化部署", d: "部署在企业内部，数据不出域，并与现有系统深度集成。" },
  { en: "CO-CREATION", t: "深度共创", d: "与行业伙伴共同沉淀标准、工艺与数据，打造行业专属能力。" },
];

const pilotSteps = [
  { title: "资料与场景对齐", english: "ALIGN", description: "了解现有图纸、标准、工艺与业务流程，明确优先解决的真实问题。" },
  { title: "交付标准定义", english: "DEFINE", description: "共同确认数据范围、质量标准、输出格式与工程验收方式。" },
  { title: "联合验证", english: "VALIDATE", description: "选取代表性资料完成交付闭环，用真实工程结果验证能力与边界。" },
  { title: "批量落地", english: "SCALE", description: "在验收基础上扩大规模与图纸类型，接入客户现有系统。" },
];

const researchAreas = [
  { label: "MULTIMODAL UNDERSTANDING", title: "工业多模态理解", description: "联合理解工程图像、文本、表格与文档。" },
  { label: "GEOMETRY & RELATIONS", title: "几何、拓扑与工程关系", description: "恢复构件、连接、约束与跨视图关系。" },
  { label: "STANDARDS & PROTOCOLS", title: "标准与协议的形式化", description: "把条文、协议与企业工艺转成可检索、可校核的规则。" },
  { label: "FEASIBILITY & SOLVERS", title: "结构可行性评估", description: "以求解器与规则评估几何、强度、可制造性与成本。" },
  { label: "ENGINEERING AGENT HARNESS", title: "工程 Agent Harness", description: "编排模型、领域 Skills、工具与验证流程。" },
  { label: "DATA & EVALUATION", title: "数据构造与可靠评测", description: "用真实失败案例建设数据与评测体系。" },
];

type PageId = "home" | "solutions" | "research" | "about" | "careers";
const PAGES: PageId[] = ["solutions", "research", "about", "careers"];
const pageFromHash = (): PageId => {
  const raw = window.location.hash.replace("#/", "");
  const route = (raw === "product" ? "solutions" : raw) as PageId; // old 产品介绍 links
  return PAGES.includes(route) ? route : "home";
};
const PAGE_NAME: Record<Exclude<PageId, "home">, string> = { solutions: "行业方案", research: "技术研究", about: "关于我们", careers: "加入我们" };

/* ───────────────────────── shared blocks ───────────────────────── */

function ContactBand() {
  return (
    <section className="contact reveal" aria-labelledby="contact-title">
      <div className="wrap contact-inner">
        <div>
          <p className="tag"><i />START A PILOT</p>
          <h2 id="contact-title">带上你的图纸、标准与工艺，<br />我们一起跑通第一个闭环。</h2>
          <p className="lead">告诉我们行业与场景，一起确认数据范围、验证方式与落地目标。</p>
        </div>
        <div className="contact-actions">
          <a className="btn btn-primary" href={`mailto:${MAIL}?subject=仝心圆%20试点合作`}>联系合作 <ArrowRight size={17} /></a>
          <a className="mail-link" href={`mailto:${MAIL}`}>{MAIL}</a>
        </div>
      </div>
    </section>
  );
}



function IndustryExplorer() {
  const initial = (() => {
    const want = new URLSearchParams(window.location.search).get("case");
    const v = viewsFor().find((x) => x.id === want);
    return v ? Math.max(0, sectors.findIndex((x) => x.name === v.sector)) : 0;
  })();
  const [active, setActive] = useState(initial);
  const s = sectors[active];
  const Icon = s.icon;
  const all = sectors.flatMap((x) => x.items);
  return (
    <div className="sector-explorer reveal">
      <div className="sector-tabs" role="tablist" aria-label="行业方向">
        {sectors.map((item, i) => {
          const TabIcon = item.icon;
          return (
            <button key={item.id} role="tab" aria-selected={i === active} className={i === active ? "is-active" : ""} onClick={() => setActive(i)}>
              <TabIcon size={20} strokeWidth={1.6} />
              <span><strong>{item.name}</strong><small>{item.role}</small></span>
            </button>
          );
        })}
      </div>
      <div className="sector-panel panel" role="tabpanel" key={s.id}>
        <div className="sector-main">
          <div className="sector-icon"><Icon size={28} strokeWidth={1.4} /></div>
          <h3>{s.headline}</h3>
          <p>{s.summary}</p>
          <ul className="capability-list">
            {s.items.map((it, i) => (
              <li key={it.label}>
                <span className="cap-index">{String(i + 1).padStart(2, "0")}</span>
                <div><strong>{it.label}</strong><p>{it.text}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="sector-foot">
          <span className="mono-label">典型产出</span>
          <ul className="chips">{s.outputs.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
      </div>
      <div className="sector-cases">
        <span className="mono-label">案例 · {s.name}</span>
        <CaseConsole key={s.name} sector={s.name} />
      </div>
    </div>
  );
}

function PipelineStepper() {
  const [i, setI] = useState(0);
  const st = stages[i];
  return (
    <div className="pipeline reveal">
      <ol className="pipeline-rail" aria-label="从图纸到制造的五个阶段">
        {stages.map((s, idx) => (
          <li key={s.key}>
            <button className={`${idx === i ? "is-active" : ""} ${idx < i ? "is-done" : ""}`} onClick={() => setI(idx)} aria-current={idx === i ? "step" : undefined}>
              <span className="node">{s.key}</span>
              <strong>{s.name}</strong>
              <small>{s.en}</small>
            </button>
          </li>
        ))}
      </ol>
      <div className="pipeline-detail panel" key={st.key}>
        <div className="pd-col"><span className="mono-label">输入</span><p>{st.input}</p></div>
        <div className="pd-arrow" aria-hidden="true"><ArrowRight size={20} /></div>
        <div className="pd-col pd-core"><span className="mono-label">我们做什么</span><p>{st.does}</p></div>
        <div className="pd-arrow" aria-hidden="true"><ArrowRight size={20} /></div>
        <div className="pd-col"><span className="mono-label">产出</span><p>{st.output}</p></div>
        <div className="pd-human"><ShieldCheck size={16} /><span>人工把关</span><strong>{st.human}</strong></div>
      </div>
    </div>
  );
}

function GatePanel() {
  return (
    <div className="gate-panel panel reveal" aria-label="验证关口示例">
      <div className="gate-head"><span className="mono-label">VALIDATION GATES</span><span className="gate-demo">示意 · 非真实项目结果</span></div>
      <ul>
        {gates.map((g) => (
          <li key={g.name} className={`gate-${g.state}`}>
            <span className="gate-dot" aria-hidden="true" />
            <div><strong>{g.name}</strong><small>{g.note}</small></div>
            <em>{g.state === "pass" ? "通过" : g.state === "warn" ? "需复核" : "待评估"}</em>
          </li>
        ))}
      </ul>
      <div className="gate-foot"><Ruler size={15} /> 未全部通过，不进入“落地”。</div>
    </div>
  );
}

/* ───────────────────────── pages ───────────────────────── */

function HomePage({ navigate }: { navigate: (page: PageId) => void }) {
  return (
    <main>
      <section className="hero" id="top">
        <GridField />
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <p className="tag"><i />INDUSTRIAL SPATIAL INTELLIGENCE · 工业空间智能</p>
            <h1>
              <span className="hero-line">可核验，才可信；</span>
              <span className="hero-line grad">可信，才可用。</span>
            </h1>
            <p className="hero-sub">工业空间智能的核心，是可信、可核验的数据。仝心圆让 AI 生成的每个构件、尺寸与结论，都能回到图纸与依据，经工程师核验签认，再进入制造与施工。</p>
            <p className="trace" aria-label="证据链"><span>构件</span><i>→</i><span>图纸位置</span><i>→</i><span>判断依据</span><i>→</i><span className="trace-end">工程师签认</span></p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#/solutions" onClick={(e) => { e.preventDefault(); navigate("solutions"); }}>查看行业方案 <ArrowRight size={17} /></a>
              <a className="btn btn-ghost" href={EXPLORER_URL}>打开结构漫游 <ArrowRight size={17} /></a>
            </div>
            <ul className="hero-pillars">{pillars.map((p) => <li key={p.t}><b>{p.t}</b><span>{p.d}</span></li>)}</ul>
          </div>
          <a className="hud" href={EXPLORER_URL} aria-label="打开铁塔三维漫游">
            <span className="hud-corner tl" /><span className="hud-corner tr" /><span className="hud-corner bl" /><span className="hud-corner br" />
            <div className="hud-top"><span><i className="live-dot" />LIVE MODEL</span><span>输电铁塔</span></div>
            <img src="/explore/tower-preview-v26.webp" alt="由图纸重建的输电铁塔三维模型" />
            <div className="hud-scan" aria-hidden="true" />
            <div className="hud-bottom">
              <div><small>证据链</small><b>可回溯</b></div>
              <div><small>核验</small><b>工程师签认</b></div>
              <div><small>进入</small><b>结构漫游 ↗</b></div>
            </div>
          </a>
        </div>
        <nav className="wrap home-index" aria-label="本页目录">
          {[["who", "01", "我们帮助谁"], ["sectors", "02", "行业方案与案例"], ["method", "03", "工作方法"], ["modes", "04", "合作方式"], ["trust", "05", "信任循环"]].map(([id, n, t]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}><span>{n}</span>{t}</a>
          ))}
        </nav>
      </section>

      <section className="block" id="who" aria-labelledby="who-title">
        <div className="wrap">
          <SectionHead index="01 · 我们帮助谁" id="who-title" title="你在哪个位置，我们就从那里帮你。" />
          <div className="who">
            {audiences.map((a) => (
              <article className="who-card panel reveal" key={a.key}>
                <header><span className="mono-label">{a.key} · {a.label}</span><h3>{a.title}</h3></header>
                <p className="who-help">{a.help}</p>
                <p className="who-imagine"><small>想象一下</small>{a.imagine}</p>
                <button className="btn btn-ghost" onClick={() => navigate(a.to)}>{a.cta} <ArrowRight size={15} /></button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="block block-alt" id="sectors" aria-labelledby="sector-title">
        <div className="wrap">
          <SectionHead index="02 · 行业方案与案例" id="sector-title" title="三个行业，同一条工程链路，每个案例都可核验。" lead="以角钢输电塔为核心，向阀门制造与交通工程扩展。下方数字来自当前能力清单，状态如实标注每项能力所处阶段。" />
          <IndustryExplorer />
        </div>
      </section>

      <section className="block" id="method" aria-labelledby="method-title">
        <div className="wrap">
          <SectionHead index="03 · 工作方法" id="method-title" title="从图纸，到真正造得出来。" lead={<>核心思路：<strong className="warm">把工程师读图时建立的关系留下来</strong>。AI 的输出经过行业要求、可行性评估与人的核验，才进入制造与施工。</>} />
          <PipelineStepper />
        </div>
      </section>

      <section className="block" id="modes" aria-labelledby="modes-title">
        <div className="wrap">
          <SectionHead index="04 · 合作方式" id="modes-title" title="三种方式，按你的需要组合。" />
          <div className="triple">
            {serviceModes.map((m) => <article className="panel reveal" key={m.t}><span className="mono-label">{m.en}</span><h3>{m.t}</h3><p>{m.d}</p></article>)}
          </div>
        </div>
      </section>

      <section className="block block-alt" id="trust" aria-labelledby="trust-title">
        <div className="wrap">
          <SectionHead index="05 · 信任循环" id="trust-title" title="每一轮交付，都让下一轮更可靠。" lead="行业规则、可核验的数据、工程师确认、落地与反馈，首尾相接，每转一圈都更可靠。" />
          <div className="cycle reveal" aria-label="信任循环：行业规则、可核验数据、工程师确认、落地制造、反馈回流">
            <div className="cycle-grid" aria-hidden="true" />
            <svg className="cycle-ring" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <linearGradient id="cycleGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4bdc9b" />
                  <stop offset="55%" stopColor="#78c8ff" />
                  <stop offset="100%" stopColor="#f28c3b" />
                </linearGradient>
              </defs>
              <circle className="cycle-track" cx="50" cy="50" r="36" />
              <circle className="cycle-flow" cx="50" cy="50" r="36" pathLength="100" />
              <circle className="cycle-dot" cx="50" cy="14" r="1.5" />
              <circle className="cycle-dot cycle-dot-2" cx="50" cy="14" r="1" />
            </svg>
            <div className="cycle-core">
              <span className="cycle-core-ring" aria-hidden="true" />
              <span>可信</span><strong>才可用</strong>
            </div>
            {cycle.map((c, k) => {
              const a = ((-90 + k * 72) * Math.PI) / 180;
              const Icon = c.icon;
              return (
                <div key={c.t} className="cycle-node" style={{ left: `${50 + 36 * Math.cos(a)}%`, top: `${50 + 36 * Math.sin(a)}%`, animationDelay: `${k * 0.8}s` }}>
                  <span className="cn-icon"><Icon size={18} strokeWidth={1.6} /></span>
                  <strong>{c.t}</strong>
                  <small>{c.d}</small>
                </div>
              );
            })}
            <div className="cycle-loop" aria-hidden="true"><RefreshCw size={14} strokeWidth={1.6} /><span>回到行业规则，下一轮更可靠</span></div>
          </div>
          <p className="fine reveal" style={{ marginTop: 22 }}>每一轮交付，都让规则更准、下一轮更快。我们从行业龙头的真实图纸与工程场景起步。</p>
        </div>
      </section>
      <ContactBand />
    </main>
  );
}

function SectorBlock({ s, index, alt }: { s: (typeof sectors)[number]; index: string; alt?: boolean }) {
  const Icon = s.icon;
  return (
    <section className={`block ${alt ? "block-alt" : ""}`} id={s.id}>
      <div className="wrap sector-detail">
        <div className="reveal">
          <p className="tag"><i />{index} · {s.role}</p>
          <div className="sector-title-row"><div className="sector-icon"><Icon size={26} strokeWidth={1.4} /></div><div><span className="mono-label">{s.en}</span><h2>{s.name}</h2></div></div>
          <h3 className="sector-headline">{s.headline}</h3>
          <p className="lead">{s.summary}</p>
          <div className="chip-rows"><div><span className="mono-label">典型产出</span><ul className="chips">{s.outputs.map((o) => <li key={o}>{o}</li>)}</ul></div></div>
        </div>
        <div className="sector-right">
          {s.media.length > 0 && <div className="shot-pair reveal">{s.media.map((m) => <figure key={m.src}><ZoomImg src={m.src} alt={m.alt} cap={m.cap} /><figcaption>{m.cap}</figcaption></figure>)}</div>}
          <ul className="capability-list panel reveal">
            {s.items.map((it) => (
              <li key={it.label}><div><strong>{it.label}</strong><p>{it.text}</p></div></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SolutionsPage() {
  const [tower, valve, road] = sectors;
  const jump = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <p className="tag"><i />SOLUTIONS · 行业方案</p>
          <h1>从角钢输电塔出发，<br /><span className="grad">走进更多工程行业。</span></h1>
          <p className="hero-sub">我们先在最难的角钢输电塔上，把图纸重建、证据链与核验做深做透；再把同一套方法带到阀门设计制造、交通安全设计等行业。</p>
          <nav className="route-map" aria-label="方案目录">
            <a href="#power" onClick={jump("power")} className="is-core"><span>01 · 核心方向</span><strong>角钢输电塔</strong><small>图纸 → 构件级三维 → 核验</small></a>
            <i aria-hidden="true">→</i>
            <a href="#mfg" onClick={jump("mfg")}><span>02 · 扩展方向</span><strong>阀门与装备制造</strong><small>重建 → 可行性 → 制造输出</small></a>
            <a href="#civil" onClick={jump("civil")}><span>03 · 扩展方向</span><strong>交通工程</strong><small>孪生 → 安全审查 → 算量</small></a>
          </nav>
        </div>
      </section>

      <SectorBlock s={tower} index="01" />

      <section className="block block-alt" aria-labelledby="model-title">
        <div className="wrap">
          <SectionHead index="01 · 角钢输电塔 · 从二维到三维" id="model-title" title="从二维视图，查看三维几何。" lead="多模态 AI 与工程 Agent 读取尺寸、标注与构件关系，交叉核对物料表，并通过几何求解确保结果精确、可核验。" />
          <div className="viewer-frame reveal"><DeferredViewer className="tower-viewer"><TowerModelViewer /></DeferredViewer></div>
          <div className="triple reveal">
            <article className="panel"><span className="mono-label">DRAWING READINGS</span><h3>图纸读数</h3><p>读取尺寸、标注、构件编号与跨视图对应关系。</p></article>
            <article className="panel"><span className="mono-label">BOM CROSS-CHECK</span><h3>物料表核验</h3><p>交叉核对构件规格、数量、编号与工程资料。</p></article>
            <article className="panel"><span className="mono-label">GEOMETRY VALIDATION</span><h3>几何求解验证</h3><p>检查拓扑连接、几何约束、结构闭合与工程一致性。</p></article>
          </div>
        </div>
      </section>

      <section className="block" aria-labelledby="long-context-title">
        <div className="wrap">
          <SectionHead index="01 · 角钢输电塔 · 长链条重建" id="long-context-title" title="多张图纸，一个结构。" lead="面对跨页图纸、重复编号、投影重合与分段装配，系统持续保留构件身份、跨视图关系与模块依赖。" />
          <div className="split">
            <div className="steps reveal">
              {[
                ["01", "跨页证据连续", "Multi-page evidence", "图纸页码、视图区域、标注和版本进入同一条证据链。"],
                ["02", "跨视图身份一致", "Cross-view identity", "正视、侧视、剖面与局部大样共同指向同一个物理构件。"],
                ["03", "跨模块装配闭合", "Multi-module assembly", "分段连接、共享节点和依赖状态在整体模型中保持一致。"],
              ].map(([n, t, e, d]) => <div className="step" key={n}><span>{n}</span><div><strong>{t}</strong><small>{e}</small><p>{d}</p></div></div>)}
            </div>
            <div className="viewer-frame reveal"><DeferredViewer className="long-context-viewer"><LongContextTowerViewer /></DeferredViewer></div>
          </div>
          <div className="explorer-cta panel reveal">
            <div>
              <p className="tag"><i />INTERACTIVE CASE</p>
              <h3>亲手体验：输电铁塔结构漫游</h3>
              <p className="lead">从整塔进入模块，选中构件查看细节，在三维空间里探索每一处连接。</p>
            </div>
            <div className="stack-actions">
              <a className="btn btn-primary" href={EXPLORER_URL}>进入结构漫游 <ArrowRight size={17} /></a>
              <a className="btn btn-ghost" href="/explore/film/index.html">观看建模影片 <ArrowRight size={17} /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="block block-alt branch-intro" aria-labelledby="branch-title">
        <div className="wrap">
          <SectionHead index="BRANCHING OUT · 扩展方向" id="branch-title" title="同一套方法，带到更多行业。" lead="铁塔上验证过的能力——读懂图纸、重建结构、保留证据、逐项核验——正在进入阀门制造与交通工程。" />
        </div>
      </section>
      <SectorBlock s={valve} index="02" />
      <SectorBlock s={road} index="03" alt />

      <section className="block" aria-labelledby="loop-title">
        <div className="wrap">
          <SectionHead index="SHARED LOOP · 通用闭环" id="loop-title" title="每个行业，都走同一条闭环。" lead="AI 的输出不是终点。只有通过核验的模型，才会被送去制造、施工或报价。" />
          <PipelineStepper />
          <div className="split gate-row">
            <div className="reveal">
              <p className="tag"><i />VALIDATION · 验证关口</p>
              <h3 className="gate-title">没有通过关口的模型，不会被送去制造。</h3>
              <p className="lead">每个候选模型依次通过几何、行业要求、尺寸链、可制造性与成本等关口，并保留证据。未通过的项会被明确标出。</p>
            </div>
            <GatePanel />
          </div>
        </div>
      </section>

      <section className="block block-alt" aria-labelledby="pilot-title">
        <div className="wrap">
          <SectionHead index="HOW WE WORK · 合作路径" id="pilot-title" title="合作，从真实工程资料开始。" lead="围绕一个明确场景，共同定义数据边界、交付结果与验收标准，再把验证过的能力带入更大规模的工程流程。" />
          <div className="quad">{pilotSteps.map((p, i) => <article className="panel reveal" key={p.title}><span className="mono-label">{String(i + 1).padStart(2, "0")} · {p.english}</span><h3>{p.title}</h3><p>{p.description}</p></article>)}</div>
        </div>
      </section>
      <ContactBand />
    </main>
  );
}

function AboutPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <p className="tag"><i />ABOUT · 关于仝心圆</p>
          <h1>关于仝心圆</h1>
          <p className="hero-sub">我们是一家工业空间智能公司。我们相信，工业 AI 的核心是可信、可核验的数据：理解空间结构，保留工程依据，并连接工业系统。</p>
        </div>
      </section>
      <section className="block" aria-labelledby="backing-title">
        <div className="wrap split">
          <div className="reveal">
            <p className="tag"><i />INDUSTRY ECOSYSTEM</p>
            <h2 id="backing-title">扎根数据智能与产业创新生态</h2>
            <p className="lead">MRTT 聚焦工业与工程存量资料的数据智能化，把复杂、分散的图纸、标准与工艺经验，转化为可验证、能进入真实业务流程的工程上下文。</p>
          </div>
          <div className="affiliations reveal" aria-label="关联品牌与企业">
            <a className="panel" href="https://ge.cn/" target="_blank" rel="noreferrer">每日互动 <ExternalLink size={16} /></a>
            <a className="panel" href="https://www.getui.com/" target="_blank" rel="noreferrer">个推 <ExternalLink size={16} /></a>
            <a className="panel" href="https://www.taichang.com/m/" target="_blank" rel="noreferrer">泰昌集团 <ExternalLink size={16} /></a>
          </div>
        </div>
      </section>
      <section className="block block-alt">
        <div className="wrap">
          <SectionHead index="DIRECTION · 方向" title="从铁塔出发，走进制造与土木工程" lead="电力铁塔是我们的压力测试。经过验证的数据能力，正被带向阀门、电气设备、电机配件，以及交通、造价审计与报价。" />
          <div className="triple">
            <article className="panel reveal"><h3>吃透每个行业</h3><p>围绕标准、协议与定制工艺，建立真实可验收的数据标准与交付闭环。</p></article>
            <article className="panel reveal"><h3>让数据越用越好</h3><p>持续积累标准、行业知识与现场反馈，让每次交付提升后续能力。</p></article>
            <article className="panel reveal"><h3>接入更多系统</h3><p>服务 CAD、PLM、ERP/MES、数字孪生与 AI Agent，成为可靠的工程数据来源。</p></article>
          </div>
        </div>
      </section>
      <section className="block">
        <div className="wrap team panel reveal">
          <div><p className="tag"><i />TEAM</p><h2>跨越 AI 与工程行业</h2><p className="lead">团队结合垂直领域 AI、复杂数据工程与制造、电力、土木等行业经验，共同定义数据标准和交付结果。</p></div>
          <div className="team-statement"><strong>DATA ENGINEERING<br />FOR THE PHYSICAL WORLD</strong><p>让行业知识成为可持续使用的数据</p></div>
        </div>
      </section>
      <ContactBand />
    </main>
  );
}

function ResearchPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="wrap hero-split">
          <div>
            <p className="tag"><i />RESEARCH · 仝心圆研究</p>
            <h1>技术研究</h1>
            <p className="hero-sub">聚焦多模态理解、几何与拓扑、标准协议的形式化、结构可行性评估与工程 Agent Harness。</p>
          </div>
          <figure className="hero-picture panel"><img src="/images/research-hero-lab-v1.webp" alt="工程实验室配图" /></figure>
        </div>
      </section>
      <section className="block" aria-labelledby="research-title">
        <div className="wrap">
          <SectionHead index="RESEARCH DIRECTIONS" id="research-title" title="工程数据编译的关键问题" lead="研究成果必须可复现、可评测，并进入产品。" />
          <div className="triple">
            {researchAreas.map((a) => <article className="panel reveal" key={a.title}><span className="mono-label">{a.label}</span><h3>{a.title}</h3><p>{a.description}</p></article>)}
          </div>
        </div>
      </section>
      <section className="block block-alt" aria-labelledby="problem-title">
        <div className="wrap">
          <SectionHead index="WHY ENGINEERING AGENTS" id="problem-title" title="从图纸细节，理解结构。" lead="工程 Agent 结合基座模型、专业规则与工具，逐步核验几何和连接关系，让每个工程解释都有据可查。" />
          <div className="reasons">
            {[
              { img: "projection", t: "一张投影，多种空间解释", p: "二维图纸中的深度与遮挡，需要更多证据。", alt: "三维钢框架投影为二维矩形，深度信息不再可见" },
              { img: "constraints", t: "把工程经验变成约束", p: "把基准与制图约定，变成可执行的规则。", alt: "手绘支架转为带基准线、尺寸与直角约束的模型" },
              { img: "connections", t: "外观相似，连接未必相同", p: "连接或前后错开，让图纸证据给出答案。", alt: "同一交叉投影可对应连接在一起或前后错开的钢构件" },
            ].map((r) => (
              <article className="reason panel reveal" key={r.img}>
                <figure><img src={`/images/engineering/${r.img}.webp`} width="1536" height="1024" loading="lazy" alt={r.alt} /></figure>
                <div><h3>{r.t}</h3><p>{r.p}</p></div>
              </article>
            ))}
          </div>
          <figure className="loop panel reveal">
            <img src="/images/engineering/verification-loop.webp" width="2172" height="724" loading="lazy" alt="工程 Agent 核验闭环：提出解释，保留候选，调用工具，依据修订" />
            <figcaption><ol><li>提出解释</li><li>保留候选</li><li>调用工具</li><li>依据修订</li></ol></figcaption>
          </figure>
        </div>
      </section>
      <section className="block" aria-labelledby="neube-title">
        <div className="wrap neube">
          <div className="reveal">
            <p className="tag"><i />OPEN SOURCE / NEUBE SR</p>
            <h2 id="neube-title">从角钢塔开始，<br />重构工程 AI 的方法。</h2>
            <p className="lead">NeuBE-Structural-Rebuild 是一套完全开源、可 Fork 的 AI Agent Skill 基座，把图纸、观察、假设、语义、约束与复核组织成可追溯的结构重构流程。</p>
            <a className="btn btn-ghost" href="/neube-sr-showcase/index.html">查看重建方法 <ArrowRight size={17} /></a>
          </div>
          <a className="neube-visual panel reveal" href="/neube-sr-showcase/index.html" aria-label="打开重建方法">
            <img src="/images/neube-sr-complete-tower.png" alt="NeuBE SR 重构的完整彩色角钢塔" loading="lazy" />
            <span className="neube-src"><small>从原始图纸出发</small><img src="/images/complete-tower-head-drawing.png" alt="原始塔头图纸" loading="lazy" /></span>
          </a>
        </div>
      </section>
      <section className="block block-alt" aria-labelledby="harness-title">
        <div className="wrap">
          <SectionHead index="AGENT HARNESS" id="harness-title" title="让 AI 在工程约束下完成复杂任务" lead="用 Agent Harness 组织模型、领域 Skills、专业工具与验证器，从高约束任务中建立可靠工作流。" />
          <div className="quad">
            <article className="panel reveal"><span className="mono-label">TASK SCAFFOLD</span><h3>任务骨架</h3><p>将复杂工程目标拆解为有状态、可观测的处理阶段。</p></article>
            <article className="panel reveal"><span className="mono-label">DOMAIN SKILLS</span><h3>领域 Skills</h3><p>沉淀专业任务所需的知识边界、输入要求与能力模块。</p></article>
            <article className="panel reveal"><span className="mono-label">TOOLS & SOLVERS</span><h3>工具与求解器</h3><p>连接解析、几何、规则与 CAD 工具，处理需要确定性的环节。</p></article>
            <article className="panel reveal"><span className="mono-label">VERIFICATION</span><h3>验证与复核</h3><p>通过评测、验证器与专家判断管理错误、歧义与结果质量。</p></article>
          </div>
        </div>
      </section>
      <section className="block" aria-labelledby="values-title">
        <div className="wrap">
          <SectionHead index="HOW WE RESEARCH" id="values-title" title="从真实数据出发，用工程结果回答" lead="模型、规则、工具和专家判断，共同对结果负责。" />
          <div className="triple">
            <article className="panel reveal"><h3>真实问题</h3><p>从企业资料与实际工作流中定义任务，持续面对噪声、缺失与长尾情况。</p></article>
            <article className="panel reveal"><h3>可靠评测</h3><p>建设独立数据集、失败分析与端到端验收，不以少量展示样例判断能力。</p></article>
            <article className="panel reveal"><h3>研究进入产品</h3><p>将实验结果沉淀为数据标准、工具、工作流与可持续迭代的产品模块。</p></article>
          </div>
        </div>
      </section>
      <section className="block block-alt">
        <div className="wrap split reveal">
          <div><p className="tag"><i />WORK WITH US</p><h2>和我们一起，把开放问题做成真实能力</h2></div>
          <div><p className="lead">欢迎有 Agent 实践成果，以及 AI4Science、AI4Industry 与工程数据背景的研究者和工程师。</p><a className="btn btn-ghost" href="#/careers">查看开放岗位 <ArrowRight size={17} /></a></div>
        </div>
      </section>
      <ContactBand />
    </main>
  );
}

function CareersPage({ openJob, setOpenJob }: { openJob: number | null; setOpenJob: (value: number | null) => void }) {
  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <p className="tag"><i />AI4INDUSTRY · BUILD WITH US</p>
          <h1>加入仝心圆</h1>
          <p className="hero-sub">欢迎 Builder 加入复杂工业场景的 AI 攻关。从工程图纸与专业数据出发，让多模态模型、专业算法与工具协同求解，让执行反馈持续推动能力进化。一起迈出 AI4Industry 深入复杂垂域的第一步，构建能够自主推进任务、持续学习的异构 AI 系统。</p>
          <ul className="chips hero-chips"><li>多模型协同</li><li>专业工具求解</li><li>数据驱动进化</li></ul>
        </div>
      </section>
      <section className="block" aria-label="招聘基本信息">
        <div className="wrap quad facts">
          <div className="panel"><span className="mono-label">LOCATION</span><strong>杭州</strong></div>
          <div className="panel"><span className="mono-label">EMPLOYMENT</span><strong>实习 · 应届 · 全职<br />顾问 · 兼职共创</strong></div>
          <div className="panel"><span className="mono-label">STAGE</span><strong>龙头制造业公司和上市科技企业合资新创业公司</strong></div>
          <div className="panel"><span className="mono-label">COMPENSATION</span><strong>市场竞争力薪资和潜在股权激励</strong></div>
        </div>
      </section>
      <section className="block block-alt" aria-labelledby="careers-title">
        <div className="wrap">
          <SectionHead index="OPEN ROLES" id="careers-title" title="开放岗位" lead="Agent 工程与模型算法两个方向。点击岗位查看详情，不以工作年限为主要定薪依据。" />
          <div className="job-list">
            {jobs.map((job, index) => {
              const isOpen = openJob === index;
              return (
                <article className={`job panel ${isOpen ? "is-open" : ""}`} key={job.title}>
                  <button onClick={() => setOpenJob(isOpen ? null : index)} aria-expanded={isOpen} aria-controls={`job-details-${index}`}>
                    <span className="job-title"><strong>{job.title}</strong><small>{job.english}</small></span>
                    <span className="job-type">杭州 · 实习 / 应届 / 全职 / 顾问 / 兼职共创</span>
                    <ChevronDown size={22} />
                  </button>
                  <div className="job-details" id={`job-details-${index}`} aria-hidden={!isOpen}>
                    <div className="job-details-inner">
                      {job.summary.split("\n\n").map((p) => <p key={p}>{p}</p>)}
                      <h3>你将做的事</h3>
                      {job.context.split("\n\n").map((p) => p.startsWith("- ") ? <ul key={p}>{p.split("\n").map((i) => <li key={i}>{i.replace(/^- /, "")}</li>)}</ul> : <p key={p}>{p}</p>)}
                      <div className="two-col">
                        <section><h3>我们希望你</h3><ul>{job.requirements.map((i) => <li key={i}>{i}</li>)}</ul></section>
                        <section><h3>加分项（不要求全部具备）</h3><ul>{job.preferred.map((i) => <li key={i}>{i}</li>)}</ul></section>
                      </div>
                      {job.background && <p>{job.background}</p>}
                      <div className="two-col">
                        <section><h3>在校生说明</h3><p>{job.internship}</p></section>
                        <section><h3>你将获得</h3><ul>{job.benefits.map((i) => <li key={i}>{i}</li>)}</ul></section>
                      </div>
                      <h3>投递方式</h3>
                      <p>{job.applicationIntro}</p>
                      <ol>{job.applicationQuestions.map((q) => <li key={q}>{q}</li>)}</ol>
                      <p>{job.applicationNote}</p>
                      <div className="job-actions">
                        <a className="btn btn-primary" href={`mailto:${MAIL}?subject=MRTT%20${encodeURIComponent(job.title)}%20申请`}>申请这个岗位 <ArrowRight size={16} /></a>
                        <a className="mail-link" href={`mailto:${MAIL}`}>{MAIL}</a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="block" aria-labelledby="application-title">
        <div className="wrap split reveal">
          <div><p className="tag"><i />APPLICATION</p><h2 id="application-title">用你最真实的作品和我们聊聊</h2></div>
          <div>
            <p className="lead">欢迎发送简历与代表项目，邮件主题注明申请岗位。具体投递说明可展开对应岗位查看。</p>
            <div className="job-actions">
              <a className="btn btn-primary" href={`mailto:${MAIL}?subject=MRTT%20岗位申请`}>投递简历 <ArrowRight size={17} /></a>
              <a className="mail-link" href={`mailto:${MAIL}`}>{MAIL}</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────────────────────── shell ───────────────────────── */

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openJob, setOpenJob] = useState<number | null>(null);
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onHashChange = () => { setPage(pageFromHash()); setOpenJob(null); window.scrollTo({ top: 0, behavior: "instant" }); };
    const onResize = () => { if (window.innerWidth > 900) setMobileOpen(false); };
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("hashchange", onHashChange); window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onScroll); };
  }, []);

  useReveal(page);

  useEffect(() => {
    const titles: Record<PageId, string> = {
      home: "仝心圆 | 工业空间智能 · 可核验，才可信",
      solutions: "行业方案：角钢输电塔、阀门制造与交通工程 | 仝心圆",
      research: "技术研究 | 仝心圆",
      about: "关于我们 | 仝心圆",
      careers: "加入我们 | 仝心圆",
    };
    const descriptions: Record<PageId, string> = {
      home: "仝心圆把行业协议、标准与定制工艺，与工程图纸一起编译为可计算的模型，评估结构可行性、供用户核验，并落地到制造与施工。",
      solutions: "以角钢输电塔为核心，把图纸重建、证据链与核验能力扩展到阀门制造与交通安全设计等行业。",
      research: "了解 MRTT 在工业多模态理解、标准协议形式化、结构可行性评估、Agent Harness 与可靠评测方向的研究。",
      about: "了解仝心圆背后的 MRTT 公司、产业生态与工程数据能力。",
      careers: "加入 MRTT，建设面向复杂工程任务的 Agent 系统，探索工程设计、建模、仿真与制造协同。",
    };
    document.title = titles[page];
    document.querySelector('meta[name="description"]')?.setAttribute("content", descriptions[page]);
  }, [page]);

  const navigate = (nextPage: PageId) => {
    setMobileOpen(false);
    if (nextPage === page) { window.scrollTo({ top: 0, behavior: "instant" }); return; }
    window.location.hash = nextPage === "home" ? "#/" : `#/${nextPage}`;
  };

  return (
    <ZoomProvider>
    <div className="site-shell">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <button className="wordmark" onClick={() => navigate("home")} aria-label="返回首页">
          <span className="brand-emblem" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" /><circle cx="20" cy="20" r="6" /><path d="M20 2v5m0 26v5M2 20h5m26 0h5" /></svg></span>
          <span className="brand-lockup"><strong>仝心圆</strong><small>MRTT · 工程 AI</small></span>
        </button>
        <nav className={`main-nav ${mobileOpen ? "is-open" : ""}`} aria-label="主导航">
          <button className={page === "home" ? "current" : ""} aria-current={page === "home" ? "page" : undefined} onClick={() => navigate("home")}>首页</button>
          <button className={page === "solutions" ? "current" : ""} aria-current={page === "solutions" ? "page" : undefined} onClick={() => navigate("solutions")}>行业方案</button>
          <a className="nav-explore" href={EXPLORER_URL}>结构漫游 <ArrowRight size={14} /></a>
          <details className="site-more" key={page}>
            <summary>了解 MRTT <ChevronDown size={13} /></summary>
            <div className="site-more-menu">
              <button onClick={() => navigate("about")}>关于我们<span>团队与产业方向</span></button>
              <button onClick={() => navigate("research")}>技术研究<span>工程 AI 与开源方法</span></button>
              <button onClick={() => navigate("careers")}>加入我们<span>岗位与合作机会</span></button>
            </div>
          </details>
        </nav>
        <a className="header-contact" href={`mailto:${MAIL}?subject=仝心圆%20合作咨询`}>联系合作 <ArrowRight size={16} /></a>
        <button className="menu-button" onClick={() => setMobileOpen((v) => !v)} aria-label={mobileOpen ? "关闭菜单" : "打开菜单"} aria-expanded={mobileOpen}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </header>
      {page !== "home" && (
        <div className="crumbs"><nav aria-label="当前位置"><a href="#/">官网首页</a><span>/</span><strong>{PAGE_NAME[page]}</strong></nav></div>
      )}
      <div id="main">
        {page === "home" && <HomePage navigate={navigate} />}
        {page === "solutions" && <SolutionsPage />}
        {page === "research" && <ResearchPage />}
        {page === "about" && <AboutPage />}
        {page === "careers" && <CareersPage openJob={openJob} setOpenJob={setOpenJob} />}
      </div>
      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div><strong className="footer-wordmark">MRTT</strong><p>工业与工程数据 AI 公司 · 产品：仝心圆</p></div>
          <div className="footer-links">
            <a href={EXPLORER_URL}>结构漫游</a>
            <button onClick={() => navigate("solutions")}>行业方案</button>
            <button onClick={() => navigate("research")}>技术研究</button>
            <a href="/neube-sr-showcase/index.html">开源重建方法</a>
            <button onClick={() => navigate("about")}>关于我们</button>
            <button onClick={() => navigate("careers")}>加入我们</button>
          </div>
          <div className="footer-meta">
            <span>CHINA / 2026</span>
            <span>Copyright © 2026</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2026098545号-1</a>
            <span>浙江每日仝泰科技有限公司</span>
            <span>浙江每日互动研究院有限公司</span>
          </div>
        </div>
      </footer>
    </div>
    </ZoomProvider>
  );
}

export default App;
