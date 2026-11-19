import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Maximize2, X } from "lucide-react";

/* ───────── shared click-to-enlarge viewer ───────── */

type Zoom = { src: string; alt: string; cap?: string } | null;
const ZoomCtx = createContext<(z: Zoom) => void>(() => {});
export const useZoom = () => useContext(ZoomCtx);

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [zoom, setZoom] = useState<Zoom>(null);
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [zoom]);
  return (
    <ZoomCtx.Provider value={setZoom}>
      {children}
      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={() => setZoom(null)}>
          <button className="lightbox-close" aria-label="关闭" onClick={() => setZoom(null)}><X size={22} /></button>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={zoom.src} alt={zoom.alt} />
            {zoom.cap && <figcaption>{zoom.cap}</figcaption>}
          </figure>
        </div>
      )}
    </ZoomCtx.Provider>
  );
}

/** An image that opens in the shared viewer. */
export function ZoomImg({ src, alt, cap, className }: { src: string; alt: string; cap?: string; className?: string }) {
  const open = useZoom();
  return (
    <button type="button" className={`zoom-img ${className ?? ""}`} onClick={() => open({ src, alt, cap })} aria-label={`放大查看：${alt}`}>
      <img src={src} alt={alt} loading="lazy" />
      <span className="zoom-hint" aria-hidden="true"><Maximize2 size={14} /></span>
    </button>
  );
}

/* ───────── annotated case console ───────── */

type Pin = { x: number; y: number; t: string; d: string };
type View = {
  id: string; sector: string; tab: string; title: string; src: string; alt: string; ratio: string;
  meta: [string, string][]; pins: Pin[]; link?: { href: string; label: string };
};

const VIEWS: View[] = [
  {
    id: "tower", sector: "角钢输电塔", tab: "三维展厅", title: "输电铁塔 · 构件级三维重建",
    src: "/images/cases/tower-hall.webp", alt: "铁塔三维展厅：按模块着色的构件级结构", ratio: "820 / 647",
    meta: [["输入", "多页工程图纸 + 物料表"], ["输出", "构件级三维装配"], ["核验", "图纸 ⇄ 三维 对照"]],
    pins: [
      { x: 50, y: 15, t: "塔头与横担", d: "跨页图纸中的分段，统一装配为一个整体" },
      { x: 50, y: 55, t: "构件可选中", d: "每根杆件都能回溯到图纸位置与物料表" },
      { x: 50, y: 89, t: "多种观察方式", d: "实体、结构线、剖切与多视角切换" },
    ],
    link: { href: "/explore/index.html", label: "打开结构漫游" },
  },
  {
    id: "valve", sector: "阀门与装备制造", tab: "闸阀 · 整机", title: "闸阀 · 由二维图纸重建的整机模型",
    src: "/images/cases/valve-assembled.webp", alt: "由图纸重建的闸阀三维整机模型", ratio: "1400 / 1032",
    meta: [["输入", "装配图 + 零件图"], ["输出", "参数化三维装配 + 零件清单"], ["核验", "尺寸逐项回到图纸出处"]],
    pins: [
      { x: 50, y: 9, t: "手轮与阀杆", d: "传动部件按装配关系完整建模" },
      { x: 50, y: 45, t: "中法兰螺栓连接", d: "阀盖与阀体的连接件逐一生成" },
      { x: 66, y: 71, t: "端法兰与通径", d: "连接尺寸可直接用于工艺与报价" },
    ],
  },
  {
    id: "valve-cut", sector: "阀门与装备制造", tab: "闸阀 · 剖切", title: "闸阀 · 剖切视图看清内部结构",
    src: "/images/cases/valve-section.webp", alt: "闸阀三维剖切视图", ratio: "1400 / 996",
    meta: [["输入", "装配图 + 零件图"], ["输出", "可剖切的三维模型"], ["核验", "内部尺寸链与配合关系"]],
    pins: [
      { x: 50, y: 25, t: "阀杆与填料结构", d: "密封与导向部件的层次一目了然" },
      { x: 50, y: 50, t: "阀腔内部", d: "剖切面展示壁厚与腔体形状" },
      { x: 49, y: 80, t: "闸板与阀座", d: "密封面位置与配合关系可核对" },
    ],
  },
  {
    id: "road", sector: "交通工程", tab: "数字孪生", title: "公路工程 · 从工可报告到三维数字孪生",
    src: "/images/cases/road-twin.webp", alt: "公路三维数字孪生：线位、桥梁、曲线要素与纵断面", ratio: "1482 / 929",
    meta: [["输入", "工可报告 + 设计图纸"], ["输出", "道路三维孪生 + 纵断面"], ["核验", "曲线要素逐项对照规范"]],
    pins: [
      { x: 17, y: 5, t: "多视图切换", d: "总览、隐患、地形透视与驾驶视角" },
      { x: 55, y: 42, t: "线位落在真实地形上", d: "桥梁、平交口与河流同场呈现" },
      { x: 96, y: 22, t: "曲线要素与规范检查", d: "半径、缓和曲线等逐项对照规范值" },
      { x: 40, y: 88, t: "纵断面", d: "设计线、地面线与隧道位置联动" },
    ],
  },
  {
    id: "review", sector: "交通工程", tab: "设计安全审查", title: "公路工程 · 设计安全审查看板",
    src: "/images/cases/road-review.webp", alt: "设计安全审查看板：曲线半径对照规范值与隐患登记", ratio: "1600 / 1093",
    meta: [["输入", "三维孪生 + 规范条文"], ["输出", "隐患统计 + 登记表"], ["核验", "每条注明条款与来源"]],
    pins: [
      { x: 22, y: 30, t: "半径 vs 规范值", d: "每条曲线对照极限值与一般值" },
      { x: 74, y: 21, t: "按类别统计", d: "隐患按类别与严重度分段" },
      { x: 4, y: 80, t: "隐患登记表", d: "条款、设计值、要求与来源文件并列" },
    ],
  },
];

export function viewsFor(sector?: string) {
  return sector ? VIEWS.filter((x) => x.sector === sector) : VIEWS;
}

export function CaseConsole({ sector }: { sector?: string }) {
  const list = viewsFor(sector);
  const [i, setI] = useState(() => {
    const want = new URLSearchParams(window.location.search).get("case");
    const idx = list.findIndex((x) => x.id === want);
    return idx >= 0 ? idx : 0;
  });
  const [hot, setHot] = useState<number | null>(null);
  const open = useZoom();
  const v = list[i];
  const select = useCallback((idx: number) => { setI(idx); setHot(null); }, []);
  const groups = Array.from(new Set(list.map((x) => x.sector)));

  return (
    <div className="console">
      <div className="console-tabs" role="tablist" aria-label="案例视图">
        {sector ? (
          <div className="console-group">
            <span className="mono-label">切换视图</span>
            <div>
              {list.map((x, idx) => (
                <button key={x.id} role="tab" aria-selected={idx === i} className={idx === i ? "is-active" : ""} onClick={() => select(idx)}>{x.tab}</button>
              ))}
            </div>
          </div>
        ) : groups.map((sec) => (
          <div className="console-group" key={sec}>
            <h4 className="industry-name"><small>{String(groups.indexOf(sec) + 1).padStart(2, "0")}</small>{sec}</h4>
            <div>
              {list.map((x, idx) => x.sector === sec && (
                <button key={x.id} role="tab" aria-selected={idx === i} className={idx === i ? "is-active" : ""} onClick={() => select(idx)}>{x.tab}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="console-body" role="tabpanel" key={v.id}>
        <div className="console-stage">
          <div className="console-frame" style={{ aspectRatio: v.ratio }}>
            <span className="hud-corner tl" /><span className="hud-corner tr" /><span className="hud-corner bl" /><span className="hud-corner br" />
            <button type="button" className="console-img" onClick={() => open({ src: v.src, alt: v.alt, cap: v.title })} aria-label={`放大查看：${v.alt}`}>
              <img src={v.src} alt={v.alt} />
            </button>
            {v.pins.map((p, k) => (
              <button
                key={p.t}
                type="button"
                className={`pin ${hot === k ? "is-hot" : ""}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onMouseEnter={() => setHot(k)} onMouseLeave={() => setHot(null)} onFocus={() => setHot(k)} onBlur={() => setHot(null)}
                aria-label={`${k + 1}. ${p.t}：${p.d}`}
              >{k + 1}</button>
            ))}
            <span className="console-expand" aria-hidden="true"><Maximize2 size={14} /> 点击放大</span>
          </div>
        </div>
        <aside className="console-side">
          <span className="mono-label">{v.title}</span>
          <dl className="console-meta">{v.meta.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
          <ol className="console-notes">
            {v.pins.map((p, k) => (
              <li key={p.t} className={hot === k ? "is-hot" : ""} onMouseEnter={() => setHot(k)} onMouseLeave={() => setHot(null)}>
                <span>{k + 1}</span><div><strong>{p.t}</strong><p>{p.d}</p></div>
              </li>
            ))}
          </ol>
          {v.link && <a className="btn btn-ghost console-link" href={v.link.href}>{v.link.label} <ArrowRight size={15} /></a>}
        </aside>
      </div>
      <p className="fine console-foot">演示案例，用于展示方法与能力；校核与审查结果用于辅助工程判断，不替代正式评价或制造、施工依据。</p>
    </div>
  );
}
