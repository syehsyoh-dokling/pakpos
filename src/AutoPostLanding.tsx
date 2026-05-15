import "./autopost-landing.css";

type LandingLang = "en" | "id";
type LandingStep = "import" | "split" | "review" | "media" | "schedule" | "analytics";

type AutoPostLandingProps = {
  lang?: LandingLang;
  isAuthenticated?: boolean;
  onStart?: () => void;
  onDemo?: () => void;
  onLogin?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  onLanguageChange?: (lang: LandingLang) => void;
  onMenuSelect?: (step: LandingStep) => void;
  userName?: string;
  userEmail?: string;
};

const copyByLang = {
  en: {
    navSub: "Content Splitter & Social Scheduler",
    login: "Login",
    setting: "Setting",
    logout: "Logout",
    userTag: "Logged in",
    visitorTag: "Welcome",
    visitorName: "Auto POST Guest",
    visitorEmail: "Log in to save your content workflow",
    sidebarLabel: "Main Menu",
    eyebrow: "Viral Content Automation",
    titleLine1: "Turn PDFs, Articles &",
    titleLine2: "Messy Text into",
    titleLime: "Viral Posts",
    titleSky: "Auto-Scheduled.",
    desc:
      "Upload PDF, Word, URL, or paste long text. Auto POST extracts, cleans, and formats it into social content that is ready to publish. Add AI image and video generation, then schedule at the best time.",
    features: [
      "Extract from PDF, DOCX, URL, or long pasted text",
      "Format content into high-engagement social captions",
      "Create or import image and video assets per post",
      "Schedule posts into a clear publishing workflow",
    ],
    start: "Start Creating",
    demo: "Watch Demo",
    scrollHint: "Scroll down to preview the content creation flow",
    stepLabel: "Step 01",
    stepTitle: "Import Your Content",
    stepDesc: "Upload PDF/DOCX, paste article URL, or insert long text. The app will extract and prepare it.",
    uploadMain: "Click or drag a file here",
    uploadSub: "PDF is readable, DOCX is ready, TXT is instant",
    previewTitle: "No content imported yet",
    previewBadge: "Waiting for upload...",
    emptyTitle: "Content will appear here",
    emptyDesc: "After import succeeds, extracted text will be shown and ready to split into social captions.",
    stats: ["Faster content prep", "Posts scheduled at once", "Guided workflow"],
  },
  id: {
    navSub: "Content Splitter & Social Scheduler",
    login: "Login",
    setting: "Setting",
    logout: "Logout",
    userTag: "Logged in",
    visitorTag: "Selamat datang",
    visitorName: "Auto POST Guest",
    visitorEmail: "Login untuk menyimpan workflow konten",
    sidebarLabel: "Menu Utama",
    eyebrow: "Viral Content Automation",
    titleLine1: "Ubah PDF, Artikel &",
    titleLine2: "Teks Berantakan jadi",
    titleLime: "Postingan Viral",
    titleSky: "Auto-Terjadwal.",
    desc:
      "Upload PDF, Word, URL, atau paste teks panjang. Auto POST mengekstrak, membersihkan, dan memformatnya jadi konten sosial media yang siap dipublish. Tambahkan gambar/video AI, lalu jadwalkan di waktu terbaik.",
    features: [
      "Ekstrak otomatis dari PDF, DOCX, URL, atau paste teks panjang",
      "Format ulang jadi caption sosmed yang high-engagement",
      "Buat atau impor image dan video untuk setiap posting",
      "Jadwalkan posting dalam workflow yang rapi",
    ],
    start: "Mulai Membuat Konten",
    demo: "Lihat Demo",
    scrollHint: "Scroll ke bawah untuk melihat alur pembuatan konten",
    stepLabel: "Step 01",
    stepTitle: "Import Kontenmu",
    stepDesc: "Upload file PDF/DOCX, tempel URL artikel, atau paste teks panjang. Aplikasi akan mengekstrak dan menyiapkannya.",
    uploadMain: "Klik atau seret file ke sini",
    uploadSub: "PDF dibaca langsung, DOCX siap diproses, TXT instan",
    previewTitle: "Belum ada konten yang diimport",
    previewBadge: "Menunggu upload...",
    emptyTitle: "Konten akan muncul di sini",
    emptyDesc: "Setelah import berhasil, teks hasil ekstraksi akan tampil dan siap di-split jadi caption sosmed.",
    stats: ["Lebih cepat buat konten", "Post terjadwal sekaligus", "Workflow terpandu"],
  },
};

export default function AutoPostLanding({
  lang = "id",
  isAuthenticated = false,
  onStart,
  onDemo,
  onLogin,
  onSettings,
  onLogout,
  onLanguageChange,
  onMenuSelect,
  userName,
  userEmail,
}: AutoPostLandingProps) {
  const copy = copyByLang[lang];
  const menuItems: Array<[string, string, string, LandingStep]> = [
    ["01", "Create Content", lang === "en" ? "Import file, URL, or paste" : "Import file, URL, atau paste", "import"],
    ["02", "Split File", lang === "en" ? "Choose split method" : "Pilih cara split konten", "split"],
    ["03", "Split Results", lang === "en" ? "Edit generated chunks" : "Edit hasil chunk baru", "review"],
    ["04", "Media Studio", lang === "en" ? "Prepare image and video" : "Siapkan gambar dan video", "media"],
    ["05", "Schedule / Publish", lang === "en" ? "Schedule publishing queue" : "Jadwalkan antrean publish", "schedule"],
    ["06", "Analytics", lang === "en" ? "View performance simulation" : "Simulasi performa posting", "analytics"],
  ];

  return (
    <div className="apx-page">
      <nav className="apx-nav">
        <div className="apx-navBrand">
          <div className="apx-navLogo">AP</div>
          <div>
            <div className="apx-navTitle">Auto POST</div>
            <div className="apx-navSub">{copy.navSub}</div>
          </div>
        </div>

        <div className="apx-navRight">
          <button className={lang === "en" ? "apx-lang active" : "apx-lang"} type="button" onClick={() => onLanguageChange?.("en")}>
            EN
          </button>
          <button className={lang === "id" ? "apx-lang active" : "apx-lang"} type="button" onClick={() => onLanguageChange?.("id")}>
            ID
          </button>

          {isAuthenticated ? (
            <>
              <button className="apx-navBtn" type="button" onClick={onSettings}>
                {copy.setting}
              </button>
              <button className="apx-logoutBtn" type="button" onClick={onLogout}>
                {copy.logout}
              </button>
            </>
          ) : (
            <button className="apx-navBtn" type="button" onClick={onLogin}>
              {copy.login}
            </button>
          )}
        </div>
      </nav>

      <div className="apx-mainWrap">
        <aside className="apx-sidebar">
          <div className="apx-userCard">
            <div className="apx-userTag">
              <span className="apx-glowDot" />
              {isAuthenticated ? copy.userTag : copy.visitorTag}
            </div>
            <div className="apx-userName">{userName || copy.visitorName}</div>
            <div className="apx-userEmail">{userEmail || copy.visitorEmail}</div>
          </div>

          <div className="apx-sidebarLabel">{copy.sidebarLabel}</div>
          <div className="apx-sidebarMenu">
            {menuItems.map((item, index) => (
              <button key={item[1]} type="button" className={index === 0 ? "apx-menuItem active" : "apx-menuItem"} onClick={() => onMenuSelect?.(item[3])}>
                <span className="apx-menuIcon">{item[0]}</span>
                <span className="apx-menuText">
                  <span className="apx-menuTitle">{item[1]}</span>
                  <span className="apx-menuDesc">{item[2]}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="apx-contentArea">
          <section className="apx-hero">
            <div className="apx-heroLeft">
              <div className="apx-eyebrow">{copy.eyebrow}</div>

              <h1 className="apx-heroTitle">
                {copy.titleLine1}<br />
                {copy.titleLine2}<br />
                <span className="lime">{copy.titleLime}</span><br />
                <span className="sky">{copy.titleSky}</span>
              </h1>

              <p className="apx-heroDesc">{copy.desc}</p>

              <div className="apx-features">
                {copy.features.map((text) => (
                  <div className="apx-feature" key={text}>
                    <span className="apx-check">✓</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="apx-cta">
                <button className="apx-primaryBtn" type="button" onClick={onStart}>
                  {copy.start}
                </button>
                <button className="apx-secondaryBtn" type="button" onClick={onDemo}>
                  {copy.demo}
                </button>
              </div>
            </div>

            <div className="apx-videoCard">
              <div className="apx-videoHeader">
                <div className="apx-channel">
                  <div className="apx-avatar">AP</div>
                  <div>
                    <div className="apx-channelName">AutoPost Video Intro</div>
                    <div className="apx-channelSub">Syeh Saifuddin Syeh</div>
                  </div>
                </div>
                <div className="apx-videoTopControls">
                  <button type="button">Mute</button>
                  <button type="button">CC</button>
                  <button type="button">Set</button>
                </div>
              </div>

              <div className="apx-videoThumb">
                <div className="apx-badge">AUTO POST</div>
                <button className="apx-playBtn" type="button" onClick={onDemo}>▶</button>
                <div className="apx-videoLabel">
                  <h3>Content <span>Automation</span>,<br />Made Simple</h3>
                </div>
              </div>

              <div className="apx-progress">
                <div className="apx-progressBar"><div /></div>
                <div className="apx-progressTime"><span>0:00</span><span>0:08</span></div>
              </div>

              <div className="apx-videoActions">
                <button className="primary" type="button" onClick={onDemo}>Play</button>
                <button type="button">Speaker</button>
                <button type="button">Next</button>
                <button type="button">Pause</button>
                <span className="apx-youtube">YouTube</span>
              </div>
            </div>
          </section>

          <section className="apx-mainSection apx-statsSection">
            <div className="apx-statsRow">
              <div className="apx-statCard">
                <div>⚡</div>
                <strong>10x</strong>
                <span>{copy.stats[0]}</span>
              </div>
              <div className="apx-statCard">
                <div>📅</div>
                <strong>30+</strong>
                <span>{copy.stats[1]}</span>
              </div>
              <div className="apx-statCard">
                <div>🔥</div>
                <strong>97%</strong>
                <span>{copy.stats[2]}</span>
              </div>
            </div>
          </section>

          <section className="apx-mainSection">
            <div className="apx-stepLabel">{copy.stepLabel}</div>
            <h2 className="apx-stepTitle">{copy.stepTitle}</h2>
            <p className="apx-stepDesc">{copy.stepDesc}</p>

            <div className="apx-tabs">
              <button className="active" type="button">File</button>
              <button type="button">URL</button>
              <button type="button">Paste</button>
            </div>

            <div className="apx-uploadZone" role="button" tabIndex={0} onClick={onStart}>
              <div className="apx-uploadIcon">↑</div>
              <div className="apx-uploadMain">{copy.uploadMain}</div>
              <div className="apx-uploadSub">{copy.uploadSub}</div>
              <div className="apx-formatBadges">
                <span className="pdf">PDF</span>
                <span className="docx">DOCX / Word</span>
                <span className="txt">TXT</span>
                <span className="url">URL</span>
              </div>
            </div>

            <div className="apx-preview">
              <div className="apx-previewHeader">
                <div>
                  <div className="apx-previewEyebrow">Source Preview</div>
                  <div className="apx-previewTitle">{copy.previewTitle}</div>
                </div>
                <div className="apx-previewBadge"><span />{copy.previewBadge}</div>
              </div>
              <div className="apx-empty">
                <div>□</div>
                <strong>{copy.emptyTitle}</strong>
                <p>{copy.emptyDesc}</p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <div className="apx-scrollHint">
        <span className="apx-glowDot" />
        {copy.scrollHint}
      </div>
    </div>
  );
}
